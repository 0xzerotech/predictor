use anchor_lang::prelude::*;
use anchor_spl::token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer};
use anchor_lang::solana_program::{self, system_program};

declare_id!("HypePred111111111111111111111111111111111111");

pub const GLOBAL_SEED: &[u8] = b"global";
pub const MARKET_SEED: &[u8] = b"market";
pub const CURVE_SEED: &[u8] = b"curve";
pub const QUOTE_VAULT_SEED: &[u8] = b"quote";
pub const ATTENTION_VAULT_SEED: &[u8] = b"attention";
pub const RESOLUTION_SEED: &[u8] = b"resolution";

pub const MAX_SUPPLY_LIMIT: u64 = 100_000_000_000;
pub const ATTN_REWARD_RATIO: u64 = 10;

#[program]
pub mod hyper_prediction {
    use super::*;

    pub fn initialize_global(
        ctx: Context<InitializeGlobal>,
        attention_fee_bps: u16,
        creator_fee_bps: u16,
        treasury_fee_bps: u16,
        bond_volume_target: u64,
        bond_liquidity_target: u64,
    ) -> Result<()> {
        require!(attention_fee_bps <= 10_000, HyperError::InvalidFee);
        require!(creator_fee_bps <= 10_000, HyperError::InvalidFee);
        require!(treasury_fee_bps <= 10_000, HyperError::InvalidFee);
        require!(
            attention_fee_bps + creator_fee_bps + treasury_fee_bps <= 10_000,
            HyperError::InvalidFee
        );

        let global = &mut ctx.accounts.global_state;
        global.authority = ctx.accounts.authority.key();
        global.attention_mint = ctx.accounts.attention_mint.key();
        global.attention_vault = ctx.accounts.global_attention_vault.key();
        global.quote_mint = ctx.accounts.quote_mint.key();
        global.treasury = ctx.accounts.treasury.key();
        global.attention_fee_bps = attention_fee_bps;
        global.creator_fee_bps = creator_fee_bps;
        global.treasury_fee_bps = treasury_fee_bps;
        global.bond_volume_target = bond_volume_target;
        global.bond_liquidity_target = bond_liquidity_target;
        global.bump = *ctx.bumps.get("global_state").ok_or(HyperError::BumpMissing)?;
        global.attention_vault_bump = *ctx
            .bumps
            .get("global_attention_vault")
            .ok_or(HyperError::BumpMissing)?;
        global.created_ts = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn create_market(ctx: Context<CreateMarket>, args: MarketCreationArgs) -> Result<()> {
        let global = &ctx.accounts.global_state;
        require!(args.max_supply > 0, HyperError::InvalidSupply);
        require!(args.base_price > 0, HyperError::InvalidPrice);
        require!(args.slope_bps > 0, HyperError::InvalidSlope);
        require!(args.max_supply <= MAX_SUPPLY_LIMIT, HyperError::SupplyCapExceeded);
        require!(args.metadata.len() <= Market::MAX_METADATA_LEN, HyperError::MetadataTooLong);

        let market = &mut ctx.accounts.market;
        market.global = global.key();
        market.authority = ctx.accounts.market_creator.key();
        market.market_mint = ctx.accounts.market_mint.key();
        market.quote_vault = ctx.accounts.market_quote_vault.key();
        market.attention_vault = ctx.accounts.market_attention_vault.key();
        market.state = MarketState::Discovery;
        market.supply = 0;
        market.volume = 0;
        market.trades = 0;
        market.hype_score = 0;
        market.base_price = args.base_price;
        market.slope_bps = args.slope_bps;
        market.curvature_bps = args.curvature_bps;
        market.max_supply = args.max_supply;
        market.bond_volume_target = args
            .bond_volume_override
            .unwrap_or(global.bond_volume_target);
        market.bond_liquidity_target = args
            .bond_liquidity_override
            .unwrap_or(global.bond_liquidity_target);
        market.metadata = args.metadata;
        market.created_ts = Clock::get()?.unix_timestamp;
        market.bonded_ts = 0;
        market.bump = *ctx.bumps.get("market").ok_or(HyperError::BumpMissing)?;
        market.quote_vault_bump = *ctx
            .bumps
            .get("market_quote_vault")
            .ok_or(HyperError::BumpMissing)?;
        market.attention_vault_bump = *ctx
            .bumps
            .get("market_attention_vault")
            .ok_or(HyperError::BumpMissing)?;

        let curve = &mut ctx.accounts.curve;
        curve.market = market.key();
        curve.base_price = market.base_price;
        curve.slope_bps = market.slope_bps;
        curve.curvature_bps = market.curvature_bps;
        curve.supply = 0;
        curve.volume = 0;
        curve.bump = *ctx.bumps.get("curve").ok_or(HyperError::BumpMissing)?;

        Ok(())
    }

    pub fn trade_curve(ctx: Context<TradeCurve>, args: TradeArgs) -> Result<()> {
        let global = &ctx.accounts.global_state;
        let market = &mut ctx.accounts.market;
        let curve = &mut ctx.accounts.curve;

        require!(market.state == MarketState::Discovery, HyperError::MarketBonded);

        let global_key = global.key();
        let market_mint_key = market.market_mint;
        let market_bump = [market.bump];
        let market_seeds: [&[u8]; 4] = [
            MARKET_SEED,
            global_key.as_ref(),
            market_mint_key.as_ref(),
            &market_bump,
        ];
        let signer = &[&market_seeds[..]];

        match args.direction {
            TradeDirection::Buy => {
                require!(args.quantity > 0, HyperError::InvalidAmount);
                let remaining_supply = market
                    .max_supply
                    .checked_sub(curve.supply)
                    .ok_or(HyperError::MathOverflow)?;
                require!(args.quantity <= remaining_supply, HyperError::SupplyCapExceeded);

                let cost = curve
                    .quote_for_purchase(args.quantity)
                    .ok_or(HyperError::MathOverflow)?;
                let fees = FeeSplit::new(cost, global)?;
                let total_cost = cost
                    .checked_add(fees.total())
                    .ok_or(HyperError::MathOverflow)?;
                require!(total_cost <= args.max_spend, HyperError::SlippageExceeded);

                token::transfer(ctx.accounts.user_to_market_vault(), cost)?;

                if fees.attention_fee > 0 {
                    token::transfer(
                        ctx.accounts.user_to_market_attention(),
                        fees.attention_fee,
                    )?;
                }

                if fees.creator_fee > 0 {
                    token::transfer(
                        ctx.accounts.user_to_creator_fee(),
                        fees.creator_fee,
                    )?;
                }

                if fees.treasury_fee > 0 {
                    token::transfer(
                        ctx.accounts.user_to_treasury_fee(),
                        fees.treasury_fee,
                    )?;
                }

                token::mint_to(
                    ctx.accounts.market_mint_to_user().with_signer(signer),
                    args.quantity,
                )?;

                curve.supply = curve
                    .supply
                    .checked_add(args.quantity)
                    .ok_or(HyperError::MathOverflow)?;
                curve.volume = curve
                    .volume
                    .checked_add(cost as u128)
                    .ok_or(HyperError::MathOverflow)?;
                market.supply = curve.supply;
                market.volume = market
                    .volume
                    .checked_add(cost as u128)
                    .ok_or(HyperError::MathOverflow)?;
                market.trades = market.trades.checked_add(1).ok_or(HyperError::MathOverflow)?;
            }
            TradeDirection::Sell => {
                require!(args.quantity > 0, HyperError::InvalidAmount);
                require!(curve.supply >= args.quantity, HyperError::InsufficientLiquidity);

                let payout = curve
                    .quote_for_sale(args.quantity)
                    .ok_or(HyperError::MathOverflow)?;
                let fees = FeeSplit::new(payout, global)?;
                let net_payout = payout
                    .checked_sub(fees.total())
                    .ok_or(HyperError::MathOverflow)?;
                require!(net_payout >= args.min_receive, HyperError::SlippageExceeded);

                token::burn(ctx.accounts.user_burns_shares(), args.quantity)?;

                if net_payout > 0 {
                    token::transfer(
                        ctx.accounts.market_vault_to_user().with_signer(signer),
                        net_payout,
                    )?;
                }

                if fees.attention_fee > 0 {
                    token::transfer(
                        ctx
                            .accounts
                            .market_vault_to_market_attention()
                            .with_signer(signer),
                        fees.attention_fee,
                    )?;
                }

                if fees.creator_fee > 0 {
                    token::transfer(
                        ctx.accounts.market_vault_to_creator().with_signer(signer),
                        fees.creator_fee,
                    )?;
                }

                if fees.treasury_fee > 0 {
                    token::transfer(
                        ctx.accounts.market_vault_to_treasury().with_signer(signer),
                        fees.treasury_fee,
                    )?;
                }

                curve.supply = curve
                    .supply
                    .checked_sub(args.quantity)
                    .ok_or(HyperError::MathOverflow)?;
                curve.volume = curve
                    .volume
                    .checked_add(payout as u128)
                    .ok_or(HyperError::MathOverflow)?;
                market.supply = curve.supply;
                market.volume = market
                    .volume
                    .checked_add(payout as u128)
                    .ok_or(HyperError::MathOverflow)?;
                market.trades = market.trades.checked_add(1).ok_or(HyperError::MathOverflow)?;
            }
        }

        Ok(())
    }

    pub fn bond_market(ctx: Context<BondMarket>) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.state == MarketState::Discovery, HyperError::MarketBonded);
        require!(market.volume >= market.bond_volume_target as u128, HyperError::BondThresholdNotMet);
        require!(
            ctx.accounts.market_quote_vault.amount >= market.bond_liquidity_target,
            HyperError::BondThresholdNotMet
        );

        market.state = MarketState::Bonded;
        market.bonded_ts = Clock::get()?.unix_timestamp;

        let resolution = &mut ctx.accounts.resolution;
        resolution.market = market.key();
        resolution.resolver = ctx.accounts.resolver.key();
        resolution.state = ResolutionState::Pending;
        resolution.outcome = Outcome::Undecided;
        resolution.settlement_price = 0;
        resolution.created_ts = Clock::get()?.unix_timestamp;
        resolution.resolved_ts = 0;
        resolution.bump = *ctx.bumps.get("resolution").ok_or(HyperError::BumpMissing)?;

        Ok(())
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        outcome: Outcome,
        settlement_price: u64,
    ) -> Result<()> {
        let market = &ctx.accounts.market;
        let resolution = &mut ctx.accounts.resolution;

        require!(market.state == MarketState::Bonded, HyperError::MarketNotBonded);
        require!(resolution.state == ResolutionState::Pending, HyperError::ResolutionFinal);
        require!(outcome != Outcome::Undecided, HyperError::InvalidOutcome);

        resolution.state = ResolutionState::Finalized;
        resolution.outcome = outcome;
        resolution.settlement_price = settlement_price;
        resolution.resolved_ts = Clock::get()?.unix_timestamp;

        Ok(())
    }

    pub fn redeem(ctx: Context<Redeem>, quantity: u64) -> Result<()> {
        require!(quantity > 0, HyperError::InvalidAmount);
        let resolution = &ctx.accounts.resolution;
        require!(resolution.state == ResolutionState::Finalized, HyperError::ResolutionPending);

        let market = &ctx.accounts.market;
        let global = &ctx.accounts.global_state;
        let market_mint_key = market.market_mint;
        let market_bump = [market.bump];
        let market_seeds: [&[u8]; 4] = [
            MARKET_SEED,
            global.key().as_ref(),
            market_mint_key.as_ref(),
            &market_bump,
        ];
        let signer = &[&market_seeds[..]];

        match resolution.outcome {
            Outcome::Yes => {
                let payout = resolution
                    .settlement_price
                    .checked_mul(quantity)
                    .ok_or(HyperError::MathOverflow)?;
                token::burn(ctx.accounts.user_burn_redeem(), quantity)?;
                if payout > 0 {
                    token::transfer(
                        ctx.accounts.market_vault_to_user().with_signer(signer),
                        payout,
                    )?;
                }
            }
            Outcome::No => {
                token::burn(ctx.accounts.user_burn_redeem(), quantity)?;
            }
            Outcome::Undecided => return Err(HyperError::InvalidOutcome.into()),
        }

        Ok(())
    }

    pub fn harvest_attention(ctx: Context<HarvestAttention>) -> Result<()> {
        let global = &ctx.accounts.global_state;
        let market = &mut ctx.accounts.market;

        let balance = ctx.accounts.market_attention_vault.amount;
        require!(balance > 0, HyperError::NothingToHarvest);

        let market_mint_key = market.market_mint;
        let market_bump = [market.bump];
        let market_seeds: [&[u8]; 4] = [
            MARKET_SEED,
            global.key().as_ref(),
            market_mint_key.as_ref(),
            &market_bump,
        ];
        let market_signer = &[&market_seeds[..]];

        token::transfer(
            ctx.accounts
                .market_attention_to_global()
                .with_signer(market_signer),
            balance,
        )?;

        let attn_to_mint = balance
            .checked_mul(ATTN_REWARD_RATIO)
            .ok_or(HyperError::MathOverflow)?;
        if attn_to_mint > 0 {
            let global_bump = [global.bump];
            let global_seeds: [&[u8]; 2] = [GLOBAL_SEED, &global_bump];
            token::mint_to(
                ctx.accounts
                    .mint_attention_to_caller()
                    .with_signer(&[&global_seeds[..]]),
                attn_to_mint,
            )?;
        }

        market.hype_score = market
            .hype_score
            .checked_add(balance as u128)
            .ok_or(HyperError::MathOverflow)?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeGlobal<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = GlobalState::LEN,
        seeds = [GLOBAL_SEED],
        bump
    )]
    pub global_state: Account<'info, GlobalState>,
    #[account(
        init,
        payer = authority,
        mint::decimals = 6,
        mint::authority = global_state,
        mint::freeze_authority = global_state
    )]
    pub attention_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = authority,
        token::mint = attention_mint,
        token::authority = global_state,
        seeds = [GLOBAL_SEED, b"attn"],
        bump
    )]
    pub global_attention_vault: Account<'info, TokenAccount>,
    pub quote_mint: Account<'info, Mint>,
    /// CHECK: Governance-controlled treasury account
    pub treasury: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CreateMarket<'info> {
    pub global_state: Account<'info, GlobalState>,
    #[account(mut)]
    pub market_creator: Signer<'info>,
    #[account(
        init,
        payer = market_creator,
        space = Market::LEN,
        seeds = [
            MARKET_SEED,
            global_state.key().as_ref(),
            market_mint.key().as_ref()
        ],
        bump
    )]
    pub market: Account<'info, Market>,
    #[account(
        init,
        payer = market_creator,
        mint::decimals = 6,
        mint::authority = market,
        mint::freeze_authority = market
    )]
    pub market_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = market_creator,
        token::mint = global_state.quote_mint,
        token::authority = market,
        seeds = [QUOTE_VAULT_SEED, market.key().as_ref()],
        bump
    )]
    pub market_quote_vault: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = market_creator,
        token::mint = global_state.quote_mint,
        token::authority = market,
        seeds = [ATTENTION_VAULT_SEED, market.key().as_ref()],
        bump
    )]
    pub market_attention_vault: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = market_creator,
        space = BondingCurve::LEN,
        seeds = [CURVE_SEED, market.key().as_ref()],
        bump
    )]
    pub curve: Account<'info, BondingCurve>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct TradeCurve<'info> {
    pub global_state: Account<'info, GlobalState>,
    #[account(mut, constraint = market.global == global_state.key())]
    pub market: Account<'info, Market>,
    #[account(mut, has_one = market)]
    pub curve: Account<'info, BondingCurve>,
    #[account(mut, constraint = market.market_mint == market_mint.key())]
    pub market_mint: Account<'info, Mint>,
    #[account(
        mut,
        seeds = [QUOTE_VAULT_SEED, market.key().as_ref()],
        bump = market.quote_vault_bump
    )]
    pub market_quote_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [ATTENTION_VAULT_SEED, market.key().as_ref()],
        bump = market.attention_vault_bump
    )]
    pub market_attention_vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = user_quote.mint == global_state.quote_mint)]
    pub user_quote: Account<'info, TokenAccount>,
    #[account(mut, constraint = user_shares.mint == market.market_mint)]
    pub user_shares: Account<'info, TokenAccount>,
    #[account(mut, constraint = creator_fee_destination.mint == global_state.quote_mint)]
    pub creator_fee_destination: Account<'info, TokenAccount>,
    #[account(mut, constraint = treasury_fee_destination.mint == global_state.quote_mint)]
    pub treasury_fee_destination: Account<'info, TokenAccount>,
    /// CHECK: stored for analytics, no access
    pub market_creator: UncheckedAccount<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BondMarket<'info> {
    pub global_state: Account<'info, GlobalState>,
    #[account(mut, constraint = market.global == global_state.key())]
    pub market: Account<'info, Market>,
    #[account(
        mut,
        seeds = [QUOTE_VAULT_SEED, market.key().as_ref()],
        bump = market.quote_vault_bump
    )]
    pub market_quote_vault: Account<'info, TokenAccount>,
    #[account(
        init,
        payer = resolver,
        space = Resolution::LEN,
        seeds = [RESOLUTION_SEED, market.key().as_ref()],
        bump
    )]
    pub resolution: Account<'info, Resolution>,
    #[account(mut)]
    pub resolver: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    pub global_state: Account<'info, GlobalState>,
    #[account(mut, constraint = market.global == global_state.key())]
    pub market: Account<'info, Market>,
    #[account(mut, has_one = market)]
    pub resolution: Account<'info, Resolution>,
    pub resolver: Signer<'info>,
}

#[derive(Accounts)]
pub struct Redeem<'info> {
    pub global_state: Account<'info, GlobalState>,
    #[account(mut, constraint = market.global == global_state.key())]
    pub market: Account<'info, Market>,
    #[account(mut, has_one = market)]
    pub resolution: Account<'info, Resolution>,
    #[account(
        mut,
        seeds = [QUOTE_VAULT_SEED, market.key().as_ref()],
        bump = market.quote_vault_bump
    )]
    pub market_quote_vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = user_quote.mint == global_state.quote_mint)]
    pub user_quote: Account<'info, TokenAccount>,
    #[account(mut, constraint = user_shares.mint == market.market_mint)]
    pub user_shares: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, constraint = market_mint.key() == market.market_mint)]
    pub market_mint: Account<'info, Mint>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct HarvestAttention<'info> {
    pub global_state: Account<'info, GlobalState>,
    #[account(mut, constraint = market.global == global_state.key())]
    pub market: Account<'info, Market>,
    #[account(
        mut,
        seeds = [ATTENTION_VAULT_SEED, market.key().as_ref()],
        bump = market.attention_vault_bump
    )]
    pub market_attention_vault: Account<'info, TokenAccount>,
    #[account(
        mut,
        seeds = [GLOBAL_SEED, b"attn"],
        bump = global_state.attention_vault_bump
    )]
    pub global_attention_vault: Account<'info, TokenAccount>,
    #[account(mut, constraint = attention_mint.key() == global_state.attention_mint)]
    pub attention_mint: Account<'info, Mint>,
    #[account(mut, constraint = attn_destination.mint == global_state.attention_mint)]
    pub attn_destination: Account<'info, TokenAccount>,
    #[account(mut)]
    pub caller: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketState {
    Discovery,
    Bonded,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ResolutionState {
    Pending,
    Finalized,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Outcome {
    Undecided,
    Yes,
    No,
}

#[account]
pub struct GlobalState {
    pub authority: Pubkey,
    pub attention_mint: Pubkey,
    pub attention_vault: Pubkey,
    pub quote_mint: Pubkey,
    pub treasury: Pubkey,
    pub attention_fee_bps: u16,
    pub creator_fee_bps: u16,
    pub treasury_fee_bps: u16,
    pub bond_volume_target: u64,
    pub bond_liquidity_target: u64,
    pub created_ts: i64,
    pub bump: u8,
    pub attention_vault_bump: u8,
}

impl GlobalState {
    pub const LEN: usize = 8 + 32 * 5 + 2 * 3 + 8 * 2 + 8 + 1 + 1;
}

#[account]
pub struct Market {
    pub global: Pubkey,
    pub authority: Pubkey,
    pub market_mint: Pubkey,
    pub quote_vault: Pubkey,
    pub attention_vault: Pubkey,
    pub state: MarketState,
    pub supply: u64,
    pub volume: u128,
    pub trades: u64,
    pub hype_score: u128,
    pub base_price: u64,
    pub slope_bps: u64,
    pub curvature_bps: u64,
    pub max_supply: u64,
    pub bond_volume_target: u64,
    pub bond_liquidity_target: u64,
    pub metadata: Vec<u8>,
    pub created_ts: i64,
    pub bonded_ts: i64,
    pub bump: u8,
    pub quote_vault_bump: u8,
    pub attention_vault_bump: u8,
}

impl Market {
    pub const MAX_METADATA_LEN: usize = 192;
    pub const LEN: usize = 8
        + 32 * 5
        + 1
        + 8
        + 16
        + 8
        + 16
        + 8 * 6
        + 4
        + Self::MAX_METADATA_LEN
        + 8
        + 8
        + 1
        + 1
        + 1;
}

#[account]
pub struct BondingCurve {
    pub market: Pubkey,
    pub base_price: u64,
    pub slope_bps: u64,
    pub curvature_bps: u64,
    pub supply: u64,
    pub volume: u128,
    pub bump: u8,
}

impl BondingCurve {
    pub const LEN: usize = 8 + 32 + 8 * 3 + 8 + 16 + 1;

    pub fn quote_for_purchase(&self, quantity: u64) -> Option<u64> {
        price_integral_buy(
            self.base_price,
            self.slope_bps,
            self.curvature_bps,
            self.supply,
            quantity,
        )
    }

    pub fn quote_for_sale(&self, quantity: u64) -> Option<u64> {
        price_integral_sell(
            self.base_price,
            self.slope_bps,
            self.curvature_bps,
            self.supply,
            quantity,
        )
    }
}

#[account]
pub struct Resolution {
    pub market: Pubkey,
    pub resolver: Pubkey,
    pub state: ResolutionState,
    pub outcome: Outcome,
    pub settlement_price: u64,
    pub created_ts: i64,
    pub resolved_ts: i64,
    pub bump: u8,
}

impl Resolution {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 1 + 8 + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MarketCreationArgs {
    pub base_price: u64,
    pub slope_bps: u64,
    pub curvature_bps: u64,
    pub max_supply: u64,
    pub metadata: Vec<u8>,
    pub bond_volume_override: Option<u64>,
    pub bond_liquidity_override: Option<u64>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TradeArgs {
    pub direction: TradeDirection,
    pub quantity: u64,
    pub max_spend: u64,
    pub min_receive: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum TradeDirection {
    Buy,
    Sell,
}

pub struct FeeSplit {
    pub attention_fee: u64,
    pub creator_fee: u64,
    pub treasury_fee: u64,
}

impl FeeSplit {
    pub fn new(amount: u64, global: &GlobalState) -> Result<Self> {
        let attention_fee = amount
            .checked_mul(global.attention_fee_bps as u64)
            .ok_or(HyperError::MathOverflow)?
            / 10_000;
        let creator_fee = amount
            .checked_mul(global.creator_fee_bps as u64)
            .ok_or(HyperError::MathOverflow)?
            / 10_000;
        let treasury_fee = amount
            .checked_mul(global.treasury_fee_bps as u64)
            .ok_or(HyperError::MathOverflow)?
            / 10_000;

        Ok(Self {
            attention_fee,
            creator_fee,
            treasury_fee,
        })
    }

    pub fn total(&self) -> u64 {
        self.attention_fee + self.creator_fee + self.treasury_fee
    }
}

#[error_code]
pub enum HyperError {
    #[msg("Provided fee configuration is invalid")]
    InvalidFee,
    #[msg("Bump missing for PDA")]
    BumpMissing,
    #[msg("Market already bonded")]
    MarketBonded,
    #[msg("Market is not bonded")]
    MarketNotBonded,
    #[msg("Bond thresholds not met")]
    BondThresholdNotMet,
    #[msg("Metadata length exceeds limit")]
    MetadataTooLong,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Invalid supply value")]
    InvalidSupply,
    #[msg("Invalid price value")]
    InvalidPrice,
    #[msg("Invalid slope value")]
    InvalidSlope,
    #[msg("Supply cap exceeded")]
    SupplyCapExceeded,
    #[msg("Slippage exceeded limits")]
    SlippageExceeded,
    #[msg("Invalid trade amount")]
    InvalidAmount,
    #[msg("Insufficient liquidity in curve")]
    InsufficientLiquidity,
    #[msg("Resolution already finalized")]
    ResolutionFinal,
    #[msg("Resolution still pending")]
    ResolutionPending,
    #[msg("Invalid outcome")]
    InvalidOutcome,
    #[msg("Nothing to harvest")]
    NothingToHarvest,
}

fn price_integral_buy(
    base_price: u64,
    slope_bps: u64,
    curvature_bps: u64,
    current_supply: u64,
    quantity: u64,
) -> Option<u64> {
    let base_price = base_price as u128;
    let slope = slope_bps as u128;
    let curvature = curvature_bps as u128;
    let supply = current_supply as u128;
    let qty = quantity as u128;

    let linear_term = qty
        .checked_mul(base_price.checked_add(slope.checked_mul(supply)? / 10_000)?)?;

    let slope_component = slope
        .checked_mul(qty.checked_mul(qty.checked_sub(1)?)? / 2)?
        / 10_000;

    let curvature_component = curvature
        .checked_mul(qty.checked_mul(qty.checked_sub(1)?)?.checked_mul(
            supply.checked_mul(2)?.checked_add(qty.checked_sub(1)?)?,
        )?)?
        / 1_000_000_000;

    let total = linear_term
        .checked_add(slope_component)?
        .checked_add(curvature_component)?;

    u64::try_from(total).ok()
}

fn price_integral_sell(
    base_price: u64,
    slope_bps: u64,
    curvature_bps: u64,
    current_supply: u64,
    quantity: u64,
) -> Option<u64> {
    if quantity > current_supply {
        return None;
    }
    let base_price = base_price as u128;
    let slope = slope_bps as u128;
    let curvature = curvature_bps as u128;
    let supply = current_supply as u128;
    let qty = quantity as u128;

    let new_supply = supply.checked_sub(qty)?;

    let linear_term = qty
        .checked_mul(base_price.checked_add(slope.checked_mul(new_supply)? / 10_000)?)?;

    let slope_component = slope
        .checked_mul(qty.checked_mul(qty.checked_sub(1)?)? / 2)?
        / 10_000;

    let curvature_component = curvature
        .checked_mul(qty.checked_mul(qty.checked_sub(1)?)?.checked_mul(
            new_supply.checked_mul(2)?.checked_add(qty.checked_sub(1)?)?,
        )?)?
        / 1_000_000_000;

    let total = linear_term
        .checked_add(slope_component)?
        .checked_add(curvature_component)?;

    u64::try_from(total).ok()
}

impl<'info> TradeCurve<'info> {
    fn user_to_market_vault(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.user_quote.to_account_info(),
                to: self.market_quote_vault.to_account_info(),
                authority: self.user.to_account_info(),
            },
        )
    }

    fn user_to_market_attention(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.user_quote.to_account_info(),
                to: self.market_attention_vault.to_account_info(),
                authority: self.user.to_account_info(),
            },
        )
    }

    fn user_to_creator_fee(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.user_quote.to_account_info(),
                to: self.creator_fee_destination.to_account_info(),
                authority: self.user.to_account_info(),
            },
        )
    }

    fn user_to_treasury_fee(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.user_quote.to_account_info(),
                to: self.treasury_fee_destination.to_account_info(),
                authority: self.user.to_account_info(),
            },
        )
    }

    fn market_mint_to_user(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            MintTo {
                mint: self.market_mint.to_account_info(),
                to: self.user_shares.to_account_info(),
                authority: self.market.to_account_info(),
            },
        )
    }

    fn user_burns_shares(&self) -> CpiContext<'_, '_, '_, 'info, Burn<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Burn {
                mint: self.market_mint.to_account_info(),
                from: self.user_shares.to_account_info(),
                authority: self.user.to_account_info(),
            },
        )
    }

    fn market_vault_to_user(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.market_quote_vault.to_account_info(),
                to: self.user_quote.to_account_info(),
                authority: self.market.to_account_info(),
            },
        )
    }

    fn market_vault_to_market_attention(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.market_quote_vault.to_account_info(),
                to: self.market_attention_vault.to_account_info(),
                authority: self.market.to_account_info(),
            },
        )
    }

    fn market_vault_to_creator(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.market_quote_vault.to_account_info(),
                to: self.creator_fee_destination.to_account_info(),
                authority: self.market.to_account_info(),
            },
        )
    }

    fn market_vault_to_treasury(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.market_quote_vault.to_account_info(),
                to: self.treasury_fee_destination.to_account_info(),
                authority: self.market.to_account_info(),
            },
        )
    }
}

impl<'info> Redeem<'info> {
    fn user_burn_redeem(&self) -> CpiContext<'_, '_, '_, 'info, Burn<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Burn {
                mint: self.market_mint.to_account_info(),
                from: self.user_shares.to_account_info(),
                authority: self.user.to_account_info(),
            },
        )
    }

    fn market_vault_to_user(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.market_quote_vault.to_account_info(),
                to: self.user_quote.to_account_info(),
                authority: self.market.to_account_info(),
            },
        )
    }
}

impl<'info> HarvestAttention<'info> {
    fn market_attention_to_global(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            Transfer {
                from: self.market_attention_vault.to_account_info(),
                to: self.global_attention_vault.to_account_info(),
                authority: self.market.to_account_info(),
            },
        )
    }

    fn mint_attention_to_caller(&self) -> CpiContext<'_, '_, '_, 'info, MintTo<'info>> {
        CpiContext::new(
            self.token_program.to_account_info(),
            MintTo {
                mint: self.attention_mint.to_account_info(),
                to: self.attn_destination.to_account_info(),
                authority: self.global_state.to_account_info(),
            },
        )
    }
}

// ==========================
// Simple binary market (SOL vaults, internal accounting)
// Step 1 skeleton: create_market_simple, buy_side_simple, resolve_market_simple
// ==========================

#[program]
pub mod simple_prediction {
    use super::*;

    pub fn create_market_simple(
        ctx: Context<CreateMarketSimple>,
        resolver: Pubkey,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.creator = ctx.accounts.creator.key();
        market.resolver = resolver;
        market.status = SimpleMarketStatus::Unbonded;
        market.yes_pool = 500_000_000; // 0.5 SOL
        market.no_pool = 500_000_000; // 0.5 SOL
        market.created_at = Clock::get()?.unix_timestamp;
        market.yes_vault_bump = *ctx.bumps.get("yes_vault").ok_or(ErrorCodeSimple::BumpMissing)?;
        market.no_vault_bump = *ctx.bumps.get("no_vault").ok_or(ErrorCodeSimple::BumpMissing)?;

        // Fund vaults from creator
        sol_transfer(
            &ctx.accounts.creator.to_account_info(),
            &ctx.accounts.yes_vault.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
            market.yes_pool,
        )?;
        sol_transfer(
            &ctx.accounts.creator.to_account_info(),
            &ctx.accounts.no_vault.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
            market.no_pool,
        )?;

        Ok(())
    }

    pub fn buy_side_simple(
        ctx: Context<BuySideSimple>,
        side: BinarySide,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, ErrorCodeSimple::InvalidAmount);
        let market = &mut ctx.accounts.market;
        let position = &mut ctx.accounts.user_position;
        if position.user == Pubkey::default() {
            position.user = ctx.accounts.buyer.key();
            position.market = market.key();
        }
        let fee = amount / 50; // 2%
        let net = amount.checked_sub(fee).ok_or(ErrorCodeSimple::MathOverflow)?;

        match side {
            BinarySide::Yes => {
                let shares = compute_shares_simple(market.no_pool, market.yes_pool, net);
                market.yes_pool = market.yes_pool.checked_add(net).ok_or(ErrorCodeSimple::MathOverflow)?;
                position.yes_shares = position.yes_shares.checked_add(shares).ok_or(ErrorCodeSimple::MathOverflow)?;
                sol_transfer(
                    &ctx.accounts.buyer.to_account_info(),
                    &ctx.accounts.yes_vault.to_account_info(),
                    &ctx.accounts.system_program.to_account_info(),
                    net,
                )?;
            }
            BinarySide::No => {
                let shares = compute_shares_simple(market.yes_pool, market.no_pool, net);
                market.no_pool = market.no_pool.checked_add(net).ok_or(ErrorCodeSimple::MathOverflow)?;
                position.no_shares = position.no_shares.checked_add(shares).ok_or(ErrorCodeSimple::MathOverflow)?;
                sol_transfer(
                    &ctx.accounts.buyer.to_account_info(),
                    &ctx.accounts.no_vault.to_account_info(),
                    &ctx.accounts.system_program.to_account_info(),
                    net,
                )?;
            }
        }

        // protocol fee to treasury
        sol_transfer(
            &ctx.accounts.buyer.to_account_info(),
            &ctx.accounts.protocol_fee.to_account_info(),
            &ctx.accounts.system_program.to_account_info(),
            fee,
        )?;

        Ok(())
    }

    pub fn resolve_market_simple(
        ctx: Context<ResolveMarketSimple>,
        winning: BinarySide,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.status != SimpleMarketStatus::Resolved, ErrorCodeSimple::AlreadyResolved);
        require!(ctx.accounts.resolver.key() == market.resolver, ErrorCodeSimple::Unauthorized);
        market.winning_side = Some(winning);
        market.status = SimpleMarketStatus::Resolved;
        Ok(())
    }
}

fn sol_transfer(from: &AccountInfo, to: &AccountInfo, system: &AccountInfo, lamports: u64) -> Result<()> {
    let ix = solana_program::system_instruction::transfer(from.key, to.key, lamports);
    let accounts = [from.clone(), to.clone(), system.clone()];
    solana_program::program::invoke(&ix, &accounts).map_err(Into::into)
}

#[derive(Accounts)]
pub struct CreateMarketSimple<'info> {
    #[account(init, payer = creator, space = 8 + SimpleMarketAccount::LEN)]
    pub market: Account<'info, SimpleMarketAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = 0,
        seeds = [b"yes_vault", market.key().as_ref()],
        bump
    )]
    pub yes_vault: SystemAccount<'info>,
    #[account(
        init,
        payer = creator,
        space = 0,
        seeds = [b"no_vault", market.key().as_ref()],
        bump
    )]
    pub no_vault: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuySideSimple<'info> {
    #[account(mut)]
    pub market: Account<'info, SimpleMarketAccount>,
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + UserPositionSimple::LEN,
        seeds = [b"pos", market.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPositionSimple>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut, seeds = [b"yes_vault", market.key().as_ref()], bump = market.yes_vault_bump)]
    pub yes_vault: SystemAccount<'info>,
    #[account(mut, seeds = [b"no_vault", market.key().as_ref()], bump = market.no_vault_bump)]
    pub no_vault: SystemAccount<'info>,
    /// CHECK: protocol treasury
    #[account(mut)]
    pub protocol_fee: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarketSimple<'info> {
    #[account(mut)]
    pub market: Account<'info, SimpleMarketAccount>,
    pub resolver: Signer<'info>,
}

#[account]
pub struct SimpleMarketAccount {
    pub creator: Pubkey,
    pub resolver: Pubkey,
    pub yes_pool: u64,
    pub no_pool: u64,
    pub status: SimpleMarketStatus,
    pub winning_side: Option<BinarySide>,
    pub created_at: i64,
    pub yes_vault_bump: u8,
    pub no_vault_bump: u8,
}

impl SimpleMarketAccount {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 1 + 2 + 8 + 1 + 1;
}

#[account]
pub struct UserPositionSimple {
    pub user: Pubkey,
    pub market: Pubkey,
    pub yes_shares: u64,
    pub no_shares: u64,
    pub has_claimed: bool,
}

impl UserPositionSimple {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum BinarySide {
    Yes,
    No,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum SimpleMarketStatus {
    Unbonded,
    Bonded,
    Resolved,
}

fn compute_shares_simple(opposite_pool: u64, current_pool: u64, amount: u64) -> u64 {
    let k = (opposite_pool as u128).saturating_mul(current_pool as u128);
    let new_pool = (current_pool as u128).saturating_add(amount as u128);
    if new_pool == 0 { return 0; }
    let new_opposite = k / new_pool;
    let delta = (opposite_pool as u128).saturating_sub(new_opposite);
    delta as u64
}

#[error_code]
pub enum ErrorCodeSimple {
    #[msg("Invalid amount")] InvalidAmount,
    #[msg("Math overflow")] MathOverflow,
    #[msg("Market already resolved")] AlreadyResolved,
    #[msg("Only resolver authorized")] Unauthorized,
    #[msg("Bump missing for PDA")] BumpMissing,
}

