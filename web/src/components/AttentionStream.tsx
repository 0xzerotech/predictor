import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { UiMarket } from "../types";
import { useAttention } from "../hooks/useAttention";

interface AttentionStreamProps {
  markets: UiMarket[];
}

export const AttentionStream = ({ markets }: AttentionStreamProps) => {
  const { spotlight, pulses, sparkline, totalHype } = useAttention(markets);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(4,0,15,0.35)]">
      <div className="absolute inset-0 bg-gradient-to-br from-plasma/10 via-aurora/10 to-neon/10 opacity-60" />
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row">
        <div className="lg:w-2/5">
          <div className="flex items-center gap-2 text-sm uppercase tracking-widest text-neon">
            <Sparkles className="h-4 w-4" /> Attention Flywheel
          </div>
          {spotlight ? (
            <div className="mt-4 space-y-4">
              <h2 className="font-display text-2xl text-white">{spotlight.metadata.title}</h2>
              <p className="text-sm text-white/70">{spotlight.metadata.description}</p>
              <div className="flex items-center gap-4 text-sm text-white/60">
                <span>Live Hype: {spotlight.hypeScore.toLocaleString()}</span>
                <span>Volume: ${(spotlight.volume / 1_000_000).toFixed(2)}M</span>
              </div>
            </div>
          ) : (
            <p className="mt-6 text-white/60">Attention is dormant. Trade to awaken the ATTN flow.</p>
          )}
          <div className="mt-6 text-xs uppercase tracking-[0.3rem] text-white/40">
            Total Attention Pressure ? {Math.round(totalHype).toLocaleString()}
          </div>
        </div>
        <div className="grid flex-1 gap-4 sm:grid-cols-2">
          {pulses.map((pulse) => (
            <motion.div
              key={pulse.market.address}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: pulse.delay / 1000, duration: 0.6 }}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4"
            >
              <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100">
                <div className="absolute inset-0 bg-gradient-to-br from-aurora/20 via-neon/20 to-plasma/20" />
              </div>
              <div className="relative space-y-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-widest text-white/50">
                  <span>{pulse.market.metadata.title}</span>
                  <span>{(pulse.normalized * 100).toFixed(1)}%</span>
                </div>
                <div className="h-16 w-full overflow-hidden rounded-xl bg-black/30">
                  <motion.div
                    className="h-full bg-gradient-to-r from-aurora via-neon to-plasma"
                    animate={{ width: `${Math.min(100, pulse.normalized * 120)}%` }}
                    transition={{ repeat: Infinity, duration: 4, repeatType: "reverse" }}
                  />
                </div>
                <div className="text-xs text-white/60">
                  <span className="font-semibold text-neon">{pulse.market.hypeScore.toLocaleString()}</span> attn credits ?
                  {pulse.market.trades} trades
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      <div className="relative mt-6 grid gap-2 rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="text-xs uppercase tracking-[0.4rem] text-white/50">Hype Sparks</div>
        <div className="grid gap-4 sm:grid-cols-3">
          {sparkline.map((series) => (
            <div key={series.id} className="space-y-2">
              <div className="text-sm text-white/70">{series.label}</div>
              <div className="flex items-end gap-1">
                {series.values.map((value, idx) => (
                  <div
                    key={idx}
                    style={{ height: `${Math.max(2, value * 18)}px` }}
                    className="w-2 rounded-full bg-gradient-to-b from-plasma to-neon/70"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

