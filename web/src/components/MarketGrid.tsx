import { UiMarket } from "../types";
import { MarketCard } from "./MarketCard";

interface MarketGridProps {
  markets: UiMarket[];
  onSelect: (market: UiMarket) => void;
  activeMarket?: UiMarket | null;
}

export const MarketGrid = ({ markets, onSelect, activeMarket }: MarketGridProps) => {
  if (!markets.length) {
    return (
      <div className="glass-panel relative flex h-64 items-center justify-center">
        <span className="text-white/60">No markets deployed yet. Be the first to ignite the curve.</span>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
      {markets.map((market) => (
        <MarketCard
          key={market.publicKey.toBase58()}
          market={market}
          onSelect={onSelect}
          isActive={activeMarket?.publicKey.equals(market.publicKey)}
        />
      ))}
    </div>
  );
};

