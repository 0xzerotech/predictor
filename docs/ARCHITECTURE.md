## Hyper Aesthetic Solana Prediction Flywheel

### Core Concepts
- **Fusion Markets**: Each prediction market launches as a bonding-curve SPL token. The token supply and price evolve as participants buy and sell during the discovery phase.
- **Attention Token (`ATTN`)**: Single global SPL token capturing hype. A portion of every trade fees into an on-chain buy of `ATTN`, creating sustained demand and serving as a hype metric.
- **Bond Event**: Once a market clears configured liquidity and volume thresholds, it graduates into a fully fledged prediction market with a fixed share supply, oracle resolution, and redemption logic.
- **Flywheel Loop**: Trading generates fees → fees auto-buy `ATTN` → `ATTN` price signals hype → high `ATTN` markets attract liquidity → liquidity unlocks new Bond Events.

### Accounts Overview
- `GlobalState`: Authority, fee configuration, bonding thresholds, references to the `ATTN` mint and vaults.
- `Market`: One per question. Stores metadata, bonding state (`Discovery` or `Bonded`), supply counters, cumulative volume, fee vault, and links to share mint and vaults.
- `BondingCurve`: Derived PDA holding slope/offset parameters, outstanding supply, invariant caches, and temporary vaults used during the discovery phase.
- `AttentionVault`: PDA escrow where trade fees accumulate before being routed to the `ATTN` auto-buy worker.
- `Resolution`: Created once a market bonds, storing oracle authority, resolution time, outcome enum, and redemption factors.

### Program Instructions
1. `initialize_global`: Seeds the global config, creates the `ATTN` mint, and prepares the master attention vault.
2. `create_market`: Registers a new market in discovery mode, mints a fresh share SPL mint, initializes bonding parameters, and configures metadata URIs for the hyper aesthetic front-end.
3. `trade_curve`: Unified buy/sell bonding-curve handler. Applies slippage-checked quotes, transfers SOL/USDC in, updates the curve, and diverts a fee slice into the attention vault.
4. `bond_market`: Callable once cumulative volume/supply exceeds thresholds. Freezes the bonding curve, migrates liquidity into a CPMM-style pool, and prints a commemorative NFT receipt.
5. `resolve_market`: After the bond event, authorized resolvers set the winning outcome and load payout ratios.
6. `redeem`: Holders of bonded market shares redeem against the finalized payouts, with losers burning their tokens.
7. `harvest_attention`: Executes the auto-buy loop for `ATTN`, swapping the accumulated fees via the on-chain router and distributing booster rewards to callers.

### On-Chain Math
- Bonding curve uses a quadratic bonding curve `price = a + b * supply + c * supply^2`, integrated analytically for deterministic costs.
- Attention fee is split: 60% auto-buy `ATTN`, 20% market creator reward, 20% protocol treasury.
- Bond threshold measured on volume (in basis points of quote token) and `ATTN` weighted hype index to prevent inorganic manipulation.

### Off-Chain Services
- **Attention Oracle**: Optional service to publish social metrics into the program via `push_attention_signal` instruction, weighting markets with high off-chain buzz.
- **Resolution Sub-DAO**: Multisig orchestrating market resolution and verification once bonded.

### Front-End Experience
- Cinematic landing with animated bonding curves and real-time hype tickers.
- Market cards show live curve state, attention pressure, and proximity to bond threshold.
- Trading modal integrates wallet adapters, slippage controls, and gradient-heavy aesthetic design system.
- Bonded markets surface outcome probabilities, resolution timeline, and redemption tools.

### Development Environments
- **Program**: Anchor framework, Rust stable, Solana v1.18 compatible.
- **Tests**: Anchor Mocha suite covering happy paths, curve math, bonding transition, and redemption.
- **App**: Next.js + Tailwind + Framer Motion with Solana wallet adapter and custom chart components.

