import { UiMarket } from "../types";
import { MarketCard } from "./MarketCard";

interface MarketGridProps {
  markets: UiMarket[];
  onSelect?: (market: UiMarket) => void;
  activeMarket?: UiMarket | null;
  disableNavigation?: boolean;
}

export const MarketGrid = ({ markets, onSelect, activeMarket, disableNavigation }: MarketGridProps) => {
  if (!markets.length) {
    return (
      <div className="glass-panel relative flex h-64 items-center justify-center">
        <span className="text-white/60">No markets deployed yet. Be the first to ignite the curve.</span>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
      {markets.map((market) => (
        <MarketCard
          key={market.address}
          market={market}
          onSelect={onSelect}
          isActive={activeMarket?.address === market.address}
          disableNavigation={disableNavigation}
        />
      ))}
    </div>
  );
};

