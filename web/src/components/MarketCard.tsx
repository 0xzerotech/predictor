import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Flame, TrendingUp, Zap } from "lucide-react";
import { UiMarket } from "../types";

interface MarketCardProps {
  market: UiMarket;
  onSelect?: (market: UiMarket) => void;
  isActive?: boolean;
  disableNavigation?: boolean;
}

export const MarketCard = ({ market, onSelect, isActive, disableNavigation }: MarketCardProps) => {
  const pctToBond = Math.min(100, (market.volume / Math.max(1, market.bondVolumeTarget)) * 100);
  const hypeBadge = market.hypeScore > 0 ? Math.log10(market.hypeScore + 1).toFixed(2) : "0.00";
  const navigate = useNavigate();

  const handleClick = useCallback(() => {
    onSelect?.(market);
    if (!disableNavigation) {
      navigate(`/markets/${market.address}`);
    }
  }, [disableNavigation, market, navigate, onSelect]);

  return (
    <motion.button
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.995 }}
      onClick={handleClick}
      className={`group relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 text-left transition backdrop-blur-xl ${
        isActive ? "ring-2 ring-neon/70" : ""
      }`}
    >
      <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-br from-plasma/20 via-aurora/20 to-neon/20 blur-2xl" />
      </div>
      <div className="relative z-10 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2rem] text-white/70">
              {market.state === "Discovery" ? (
                <>
                  <Flame className="h-3.5 w-3.5 text-aurora" /> Discovery Phase
                </>
              ) : (
                <>
                  <TrendingUp className="h-3.5 w-3.5 text-neon" /> Bonded
                </>
              )}
            </span>
            <h3 className="font-display text-2xl text-white">{market.metadata.title}</h3>
            <p className="line-clamp-2 text-sm text-white/70">{market.metadata.description}</p>
          </div>
          {market.metadata.image ? (
            <img
              src={market.metadata.image}
              alt="market visual"
              className="h-20 w-20 rounded-2xl object-cover shadow-lg"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/10 text-white/60">
              <Zap className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-6 text-sm text-white/60">
          <span>Supply: {market.supply.toFixed(2)}</span>
          <span>Volume: ${(market.volume / 1_000_000).toFixed(2)}M</span>
          <span>Trades: {market.trades}</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/50">
            <span>Bond threshold</span>
            <span>{pctToBond.toFixed(1)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full bg-gradient-to-r from-aurora via-neon to-plasma"
              initial={{ width: "0%" }}
              animate={{ width: `${pctToBond}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-4 text-sm">
          <div className="flex items-center gap-2 text-neon">
            <span className="font-semibold">Hype Index</span>
            <span className="rounded-full bg-neon/10 px-3 py-1 text-xs text-neon/90">{hypeBadge}</span>
          </div>
          <div className="flex items-center gap-2 text-white/60">
            <span>Curve</span>
            <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs">
              {`${(market.basePrice / 1_000_000).toFixed(2)} base - ${(market.slopeBps / 100).toFixed(2)}% slope`}
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
};

