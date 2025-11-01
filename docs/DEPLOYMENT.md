## Deployment Guide

### 1. Environment Variables

| Variable | Description |
| --- | --- |
| `ANCHOR_PROVIDER_URL` | RPC URL used by both Anchor tests and the front-end (default: `http://127.0.0.1:8899`). |
| `ANCHOR_WALLET` | Path to the authority keypair used for deployments (`~/.config/solana/id.json`). |
| `VITE_CLUSTER` | Optional front-end override for wallet adapter cluster (`localnet`, `devnet`, `mainnet-beta`). |

### 2. Program Deployment

```bash
anchor keys list
anchor build
anchor deploy --provider.cluster devnet # or mainnet-beta
```

The deploy step emits the upgraded program ID. Ensure it matches the hard-coded ID in `Anchor.toml`, `programs/hyper_prediction/src/lib.rs`, and `web/src/solana/constants.ts` before publishing the UI.

### 3. Bootstrap Global State

Use the `initialize_global` instruction once per environment.

```bash
anchor run initialize-global \
  --attention-fee-bps 600 \
  --creator-fee-bps 200 \
  --treasury-fee-bps 100 \
  --bond-volume-target 1000000000 \
  --bond-liquidity-target 500000000
```

Alternatively, craft a JSON RPC request using the generated IDL and Anchor client.

### 4. Market Launch Checklist

- Choose a quote mint (USDC, BONK, etc.) and ensure the global authority owns the treasury ATA.
- Prepare metadata JSON with optional fee ATA overrides:

```json
{
  "title": "Will Starship reach orbit thrice in 2025?",
  "description": "Bonding-curve hype loop for Starship cadence",
  "image": "https://.../starship.png",
  "creator": "@hyper",
  "creatorQuoteDestination": "7n8Q...",
  "treasuryQuoteDestination": "4kcF...",
  "tags": ["space", "hardware", "elon"]
}
```

- Call `create_market` with desired curve parameters. The front-end will surface the market instantly.

### 5. Monitoring

- Run `anchor test --skip-build` in CI to validate regression-free program changes.
- Use `solana logs` to tail bonding curve interactions and resolution events.
- The front-end pulls live account data via Anchor; for observability add Grafana dashboards tracking vault balances and ATTN supply.

### 6. Front-End Build & Release

```bash
cd web
npm install
npm run build
```

Deploy `web/dist` to Vercel, Cloudflare Pages, or Netlify. Provide environment variables (`VITE_CLUSTER`, `ANCHOR_PROVIDER_URL`) via the hosting platform to point at devnet/mainnet RPCs.

### 7. Governance & Safety

- Use a multisig for the global authority to adjust fee splits.
- Consider adding a timelock for `bond_market` to give observers time to respond to unexpected hype spikes.
- Add a dispute/resolution buffer around `resolve_market` to enable community review before final payouts.

