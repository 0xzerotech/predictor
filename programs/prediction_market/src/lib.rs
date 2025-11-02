use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_program;

declare_id!("92H1K6RZg4zcxbDaAQ3jq7dV2er1t8NX8rzS9os6aouo");

#[program]
pub mod prediction_market {
    use super::*;

    pub fn create_market(ctx: Context<CreateMarket>, resolver: Pubkey) -> Result<()> {
        let market = &mut ctx.accounts.market;
        market.creator = *ctx.accounts.creator.key;
        market.resolver = resolver;
        market.status = MarketStatus::Unbonded;
        market.yes_pool = 500_000_000; // 0.5 SOL in lamports
        market.no_pool = 500_000_000; // 0.5 SOL in lamports
        market.created_at = Clock::get()?.unix_timestamp;

        // Transfer initial liquidity
        **ctx.accounts
            .yes_vault
            .to_account_info()
            .try_borrow_mut_lamports()? += market.yes_pool;
        **ctx.accounts
            .no_vault
            .to_account_info()
            .try_borrow_mut_lamports()? += market.no_pool;
        **ctx
            .accounts
            .creator
            .try_borrow_mut_lamports()? -= market.yes_pool + market.no_pool;

        Ok(())
    }

    pub fn buy_side(ctx: Context<BuySide>, side: Side, amount: u64) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let position = &mut ctx.accounts.user_position;
        let fee = amount / 50; // 2% fee
        let net_amount = amount - fee;

        match side {
            Side::Yes => {
                market.yes_pool += net_amount;
                position.yes_shares += compute_shares(market.no_pool, market.yes_pool, net_amount);
                **ctx
                    .accounts
                    .yes_vault
                    .to_account_info()
                    .try_borrow_mut_lamports()? += net_amount;
            }
            Side::No => {
                market.no_pool += net_amount;
                position.no_shares += compute_shares(market.yes_pool, market.no_pool, net_amount);
                **ctx
                    .accounts
                    .no_vault
                    .to_account_info()
                    .try_borrow_mut_lamports()? += net_amount;
            }
        }

        **ctx.accounts.buyer.try_borrow_mut_lamports()? -= amount;
        **ctx
            .accounts
            .protocol_fee
            .to_account_info()
            .try_borrow_mut_lamports()? += fee;

        Ok(())
    }

    pub fn sell_shares(ctx: Context<SellShares>, side: Side, shares: u64) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let position = &mut ctx.accounts.user_position;
        let user = &mut ctx.accounts.user;
        let fee_rate = 50; // 2%

        let (pool, opp_pool, vault) = match side {
            Side::Yes => (&mut market.yes_pool, &mut market.no_pool, &ctx.accounts.yes_vault),
            Side::No => (&mut market.no_pool, &mut market.yes_pool, &ctx.accounts.no_vault),
        };

        let payout = compute_sell_return(*opp_pool, *pool, shares);
        let fee = payout / fee_rate;
        let net_payout = payout - fee;

        match side {
            Side::Yes => position.yes_shares -= shares,
            Side::No => position.no_shares -= shares,
        }

        **vault.to_account_info().try_borrow_mut_lamports()? -= net_payout;
        **user.try_borrow_mut_lamports()? += net_payout;
        **ctx
            .accounts
            .protocol_fee
            .to_account_info()
            .try_borrow_mut_lamports()? += fee;
        *pool -= net_payout;

        Ok(())
    }

    pub fn resolve_market(ctx: Context<ResolveMarket>, winning_side: Side) -> Result<()> {
        let market = &mut ctx.accounts.market;
        require!(market.status != MarketStatus::Resolved, ErrorCode::AlreadyResolved);
        require!(ctx.accounts.resolver.key() == market.resolver, ErrorCode::Unauthorized);

        market.winning_side = Some(winning_side);
        market.status = MarketStatus::Resolved;
        Ok(())
    }

    pub fn claim(ctx: Context<Claim>) -> Result<()> {
        let market = &ctx.accounts.market;
        let position = &mut ctx.accounts.user_position;
        require!(market.status == MarketStatus::Resolved, ErrorCode::Unresolved);
        require!(!position.has_claimed, ErrorCode::AlreadyClaimed);

        let payout = match market.winning_side {
            Some(Side::Yes) => {
                let total_yes = market.yes_pool;
                let total_no = market.no_pool;
                (position.yes_shares as u128 * total_no as u128 / total_yes as u128) as u64
            }
            Some(Side::No) => {
                let total_yes = market.yes_pool;
                let total_no = market.no_pool;
                (position.no_shares as u128 * total_yes as u128 / total_no as u128) as u64
            }
            _ => return Err(ErrorCode::Unresolved.into()),
        };

        let vault = match market.winning_side {
            Some(Side::Yes) => &ctx.accounts.no_vault,
            Some(Side::No) => &ctx.accounts.yes_vault,
            _ => return Err(ErrorCode::Unresolved.into()),
        };

        **vault.to_account_info().try_borrow_mut_lamports()? -= payout;
        **ctx.accounts.claimer.try_borrow_mut_lamports()? += payout;
        position.has_claimed = true;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateMarket<'info> {
    #[account(init, payer = creator, space = 8 + MarketAccount::LEN)]
    pub market: Account<'info, MarketAccount>,
    #[account(mut)]
    pub creator: Signer<'info>,
    /// CHECK: just a vault
    #[account(mut)]
    pub yes_vault: UncheckedAccount<'info>,
    /// CHECK: just a vault
    #[account(mut)]
    pub no_vault: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuySide<'info> {
    #[account(mut)]
    pub market: Account<'info, MarketAccount>,
    #[account(
        init_if_needed,
        payer = buyer,
        space = 8 + UserPositionAccount::LEN,
        seeds = [b"pos", market.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPositionAccount>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    /// CHECK: vault owned by program
    #[account(mut)]
    pub yes_vault: UncheckedAccount<'info>,
    /// CHECK: vault owned by program
    #[account(mut)]
    pub no_vault: UncheckedAccount<'info>,
    /// CHECK: treasury
    #[account(mut)]
    pub protocol_fee: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SellShares<'info> {
    #[account(mut)]
    pub market: Account<'info, MarketAccount>,
    #[account(mut)]
    pub user_position: Account<'info, UserPositionAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: vault
    #[account(mut)]
    pub yes_vault: UncheckedAccount<'info>,
    /// CHECK: vault
    #[account(mut)]
    pub no_vault: UncheckedAccount<'info>,
    /// CHECK: protocol treasury
    #[account(mut)]
    pub protocol_fee: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, MarketAccount>,
    pub resolver: Signer<'info>,
}

#[derive(Accounts)]
pub struct Claim<'info> {
    #[account(mut)]
    pub market: Account<'info, MarketAccount>,
    #[account(mut)]
    pub user_position: Account<'info, UserPositionAccount>,
    #[account(mut)]
    pub claimer: Signer<'info>,
    /// CHECK:
    #[account(mut)]
    pub yes_vault: UncheckedAccount<'info>,
    /// CHECK:
    #[account(mut)]
    pub no_vault: UncheckedAccount<'info>,
}

#[account]
pub struct MarketAccount {
    pub creator: Pubkey,
    pub resolver: Pubkey,
    pub yes_pool: u64,
    pub no_pool: u64,
    pub status: MarketStatus,
    pub winning_side: Option<Side>,
    pub created_at: i64,
}

impl MarketAccount {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 1 + 2 + 8;
}

#[account]
pub struct UserPositionAccount {
    pub user: Pubkey,
    pub market: Pubkey,
    pub yes_shares: u64,
    pub no_shares: u64,
    pub has_claimed: bool,
}

impl UserPositionAccount {
    pub const LEN: usize = 32 + 32 + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Side {
    Yes,
    No,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketStatus {
    Unbonded,
    Bonded,
    Resolved,
}

fn compute_shares(opposite_pool: u64, current_pool: u64, amount: u64) -> u64 {
    let k = opposite_pool.checked_mul(current_pool).unwrap_or(0);
    let new_pool = current_pool + amount;
    let new_opposite = if new_pool > 0 { k / new_pool } else { 0 };
    let delta = opposite_pool.saturating_sub(new_opposite);
    delta
}

fn compute_sell_return(opposite_pool: u64, current_pool: u64, shares: u64) -> u64 {
    let k = opposite_pool.checked_mul(current_pool).unwrap_or(0);
    let new_opposite = opposite_pool + shares;
    let new_pool = if new_opposite > 0 { k / new_opposite } else { 0 };
    let delta = current_pool.saturating_sub(new_pool);
    delta
}

#[error_code]
pub enum ErrorCode {
    #[msg("Market already resolved")] AlreadyResolved,
    #[msg("Only the resolver can resolve this market")] Unauthorized,
    #[msg("Market has not been resolved")] Unresolved,
    #[msg("Already claimed")] AlreadyClaimed,
}


