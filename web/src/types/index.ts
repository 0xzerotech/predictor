export type MarketPhase = "Discovery" | "Bonded";

export interface MarketMetadata {
  title: string;
  description?: string;
  tags?: string[];
}

export interface UiMarket {
  id: string;
  address: string;
  state: MarketPhase;
  status: "OPEN" | "CLOSED" | "RESOLVED";
  volume: number;
  trades: number;
  hypeScore: number;
  basePrice: number;
  bondVolumeTarget: number;
  bondLiquidityTarget: number;
  slopeBps: number;
  curvatureBps: number;
  maxSupply: number;
  supply: number;
  createdTs: number;
  bondedTs: number;
  metadata: MarketMetadata;
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

