<div align="center">

# Hyper Aesthetic Solana Prediction Flywheel

<img src="web/public/hyper.svg" alt="Hyper Prediction" width="120" />

Speculation meets truth-seeking. Each discovery market launches as a Pump.fun-inspired bonding-curve token that auto-feeds an
attention token. When hype and liquidity crest, the market bonds into full-resolution mode with verifiable payouts.

</div>

## Architecture Overview

- **Anchor Program** (`programs/hyper_prediction`)
  - `initialize_global` seeds protocol config, boots the attention token mint, and records fee splits.
  - `create_market` mints a brand-new share SPL token, prepares quote + attention vaults, and stores bonding-curve parameters.
  - `trade_curve` executes buy/sell actions on a quadratic bonding curve, streams fees into attention, creator, and treasury
    vaults, and mints/burns shares.
  - `bond_market` promotes a discovery market into bonded resolution once volume + liquidity thresholds hit configured targets.
  - `resolve_market` and `redeem` finalize outcomes and let holders cash out winning shares.
  - `harvest_attention` drains market-level hype fees into the global attention vault and mints fresh `ATTN` rewards to the
    caller.
- **Front-End** (`web`) ? Vite + React + Tailwind + Framer Motion
  - Cinematic hero + attention stream visualising hype pulses across markets
  - Bonding curve trading compositor that auto-derives PDAs and ATAs for buys/sells
  - Wallet Adapter integration (Phantom, Solflare) with reactive data via SWR + Anchor client
- **Tests** (`tests/hyper_prediction.ts`) ? Anchor + Mocha
  - Boots quote mint, performs full life-cycle (trade ? harvest ? bond ? resolve ? redeem)

Read the detailed flow in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Getting Started

### Prerequisites

- Node 18+
- Yarn or npm
- Rust (stable) + Anchor CLI `0.30.x`
- Solana CLI `>=1.18`

### 1. Configure Local Validators

```bash
solana config set --url localhost
solana-test-validator --reset
```

### 2. Build + Deploy Program

```bash
anchor build
anchor deploy
```

The declared program ID is `HypePred111111111111111111111111111111111111`. Update wallets as needed in `Anchor.toml` before
deploying to devnet/mainnet.

### 3. Run Tests

```bash
npm install
anchor test
```

The test suite orchestrates a full flywheel cycle, ensuring bonding curve mechanics, attention harvest, bonding promotion, and
resolution payouts behave as expected.

### 4. Launch the Hyper UI

```bash
cd web
npm install
npm run dev
```

Visit `http://localhost:5173` (default Vite port). Supply an RPC endpoint via `ANCHOR_PROVIDER_URL` env var for remote clusters.

### 5. Trading Workflow

1. **Create Discovery Market** ? Call `create_market` with JSON metadata including optional fee destination overrides. The UI
   surfaces metadata instantly via `useMarkets` hook.
2. **Trade the Curve** ? Connect wallet, pick direction (buy/sell), specify quantities in micro shares, and submit. The panel
   auto-mints ATAs and streams fees into attention + reward vaults.
3. **Harvest Attention** ? Any user can trigger fee rolling into the global attention vault (`harvest_attention`). Callers earn
   fresh `ATTN` minted at a 10:1 ratio.
4. **Bond & Resolve** ? Once thresholds are satisfied, markets upgrade via `bond_market`. Authorised resolvers finalize with
   `resolve_market`, and holders redeem via `redeem`.

## Key Design Choices

- **Quadratic Bonding Curve** ? `price = a + b?s + c?s?` integrated analytically for exact token accounting. Encourages early
  entrants while still allowing graceful exit.
- **Attention Token Flywheel** ? Every trade diverts fees to an ATTN vault. Harvesters swap vault funds, minting new ATTN that
  acts as an on-chain hype metric bridging markets. High attention -> more liquidity -> faster bonding.
- **Metadata-Driven UX** ? Market metadata is stored as UTF-8 JSON, enabling fee destination overrides, imagery, and tags to be
  resolved entirely on-chain.
- **Cinematic Front-End** ? Tailwind + Framer Motion orchestrate fluid gradients, shimmering cards, and hype sparklines that
  visualise the attention stream.

## Repository Structure

```
??? Anchor.toml
??? Cargo.toml
??? README.md
??? docs/
?   ??? ARCHITECTURE.md
?   ??? media/
??? programs/
?   ??? hyper_prediction/
?       ??? Cargo.toml
?       ??? src/lib.rs
??? tests/
?   ??? hyper_prediction.ts
??? web/
?   ??? package.json
?   ??? src/
?   ?   ??? App.tsx
?   ?   ??? components/
?   ?   ??? hooks/
?   ?   ??? solana/
?   ??? public/hyper.svg
??? package.json
```

## Deployment Playbook

1. Run CI: `anchor test` (program) + `npm run build` (web).
2. Deploy program to devnet: `anchor deploy --provider.cluster devnet`.
3. Update `web/.env` with `VITE_CLUSTER=devnet` + RPC URL.
4. Configure market creators to set metadata JSON with fee destinations (`creatorQuoteDestination`, `treasuryQuoteDestination`).
5. Ship static front-end: `npm run build` emits `dist/` ready for Vercel/Cloudflare.

## Security Considerations

- PDA seeds are deterministic; review collisions before multi-tenant deployment.
- Resolution authority must be a governed multisig; integrate with Realms or Squads for production.
- The `trade_curve` instruction expects pre-created fee destination ATAs; creators should publish them via metadata.
- Add rate limits + attention decay to mitigate inorganic hype manipulation on mainnet.

## Roadmap Ideas

- Integrate Jupiter routing to auto-swap attention vault fees into $ATTN via on-chain DEX.
- Build oracle adapters for UMA / Switchboard to autopilot resolution data.
- Add dynamic slope adjustments based on ATTN momentum graphs.
- Ship cross-market baskets and curated hype indexes.

---

**Made for maximum vibe velocity ??**

