import { useMemo } from "react";
import { Link } from "react-router-dom";
import { UiMarket } from "../types";

interface MarketRowProps {
  market: UiMarket;
}

export const MarketRow = ({ market }: MarketRowProps) => {
  const yes = useMemo(() => {
    const base = market.basePrice ? Math.min(95, Math.max(5, market.basePrice % 100)) : 50;
    const adj = Math.min(30, Math.floor(Math.log10(Math.max(1, market.hypeScore + 1)) * 10));
    return Math.min(95, Math.max(5, base + adj - 10));
  }, [market.basePrice, market.hypeScore]);
  const no = 100 - yes;
  const bondPct = Math.min(100, (market.volume / Math.max(1, market.bondVolumeTarget)) * 100);

  return (
    <Link
      to={`/markets/${market.address}`}
      className="grid grid-cols-[minmax(240px,1fr)_auto_auto_auto_auto_auto] items-center gap-3 px-4 py-3 border-b border-white/10 hover:bg-white/[0.03]"
    >
      <div className="min-w-0 truncate text-sm text-white/90">{market.metadata.title}</div>
      <div className="chip text-white">Yes {yes}%</div>
      <div className="chip">No {no}%</div>
      <div className="text-xs text-white/70">${(market.volume / 1_000_000).toFixed(2)}M</div>
      <div className="text-xs text-white/60">{market.trades.toLocaleString()}</div>
      <div className="w-24">
        <div className="progress"><span style={{ width: `${bondPct}%` }} /></div>
      </div>
      <div className="text-xs text-white/50">{market.state}</div>
    </Link>
  );
};

export default MarketRow;


