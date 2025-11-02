import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { UiMarket } from "../types";

interface MarketCardProps {
  market: UiMarket;
  onSelect?: (market: UiMarket) => void;
  isActive?: boolean;
  disableNavigation?: boolean;
}

export const MarketCard = ({ market, onSelect, isActive, disableNavigation }: MarketCardProps) => {
  const pctToBond = Math.min(100, (market.volume / Math.max(1, market.bondVolumeTarget)) * 100);
  const chance = useMemo(() => {
    const base = market.basePrice ? Math.min(95, Math.max(5, (market.basePrice % 100))) : 50;
    const adj = Math.min(30, Math.floor(Math.log10(Math.max(1, market.hypeScore + 1)) * 10));
    return Math.min(95, Math.max(5, base + adj - 10));
  }, [market.basePrice, market.hypeScore]);
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    onSelect?.(market);
    if (!disableNavigation) {
      navigate(`/markets/${market.address}`);
    }
  }, [disableNavigation, market, navigate, onSelect]);

  return (
    <motion.button
      whileHover={{ y: -2, scale: 1.002 }}
      whileTap={{ scale: 0.998 }}
      onClick={handleClick}
      className={`group card flex h-full w-full flex-col gap-3 p-4 text-left transition ${
        isActive ? "ring-1 ring-white/30" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-white/90 whitespace-normal break-words">{market.metadata.title}</h3>
        <span className="rounded-md border border-white/12 bg-white/5 px-2 py-0.5 text-[11px] uppercase tracking-widest text-white/60">
          {market.state}
        </span>
      </div>

      <div className="grid grid-cols-3 items-end gap-3">
        <div className="col-span-2">
          <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-widest text-white/40">
            <TrendingUp className="h-3.5 w-3.5" /> Outcomes
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="chip chip--yes">Yes {chance}%</span>
            <span className="chip chip--no">No {100 - chance}%</span>
          </div>
          <div className="progress mt-2"><span style={{ width: `${pctToBond}%` }} /></div>
        </div>
        <div className="text-right">
          <div className="font-display text-2xl text-white">{pctToBond.toFixed(0)}%</div>
        </div>
      </div>

      <div className="mt-1 flex items-center justify-between text-xs text-white/60">
        <span>Vol ${ (market.volume / 1_000_000).toFixed(2) }M</span>
        <span>Trades { market.trades.toLocaleString() }</span>
      </div>
    </motion.button>
  );
};

