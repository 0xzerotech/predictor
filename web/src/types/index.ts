import { PublicKey } from "@solana/web3.js";

export type MarketPhase = "Discovery" | "Bonded";

export interface UiMarket {
  publicKey: PublicKey;
  address: string;
  marketMint: PublicKey;
  quoteVault: PublicKey;
  attentionVault: PublicKey;
  global: PublicKey;
  authority: PublicKey;
  state: MarketPhase;
  supply: number;
  volume: number;
  trades: number;
  hypeScore: number;
  basePrice: number;
  slopeBps: number;
  curvatureBps: number;
  maxSupply: number;
  bondVolumeTarget: number;
  bondLiquidityTarget: number;
  createdTs: number;
  bondedTs: number;
  metadata: MarketMetadata;
  quoteVaultBump: number;
  attentionVaultBump: number;
}

export interface MarketMetadata {
  title: string;
  description: string;
  image?: string;
  sentiment?: string;
  creator?: string;
  creatorQuoteDestination?: string;
  treasuryQuoteDestination?: string;
  tags?: string[];
}

export interface AttentionPulse {
  market: UiMarket;
  timestamp: number;
  intensity: number;
  fees: number;
}

export interface TradeDraft {
  direction: "buy" | "sell";
  quantity: number;
  maxSpend?: number;
  minReceive?: number;
}

