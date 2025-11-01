import { useState, useEffect } from "react";
import { motion } from "framer-motion";

import { Hero } from "./components/Hero";
import { MarketGrid } from "./components/MarketGrid";
import { AttentionStream } from "./components/AttentionStream";
import { TradePanel } from "./components/TradePanel";
import { useMarkets } from "./hooks/useMarkets";
import { UiMarket } from "./types";

function App() {
  const { markets, aggregate, program, global, mutate, isLoading } = useMarkets();
  const [selectedMarket, setSelectedMarket] = useState<UiMarket | null>(null);

  useEffect(() => {
    if (!selectedMarket && markets.length) {
      setSelectedMarket(markets[0]);
    }
  }, [markets, selectedMarket]);

  return (
    <div className="relative mx-auto max-w-7xl space-y-16 px-6 pb-16 pt-12 sm:px-10 lg:px-12">
      <div className="aurora-noise" />
      <Hero
        totalVolume={aggregate.totalVolume}
        discovery={aggregate.discovery}
        bonded={aggregate.bonded}
        attentionFlow={aggregate.attentionFlow}
      />

      <section id="markets" className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-3xl text-white">Markets in Motion</h2>
          {program && (
            <button
              onClick={() => mutate()}
              className="glass-button border-white/20 bg-white/10 px-5 py-2 text-xs uppercase tracking-[0.3rem] text-white/70"
            >
              Refresh
            </button>
          )}
        </div>
        {isLoading ? (
          <div className="glass-panel flex h-56 items-center justify-center text-white/60">Loading curve state?</div>
        ) : (
          <MarketGrid markets={markets} activeMarket={selectedMarket ?? undefined} onSelect={setSelectedMarket} />
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
        <AttentionStream markets={markets} />
        <TradePanel market={selectedMarket} global={global ?? undefined} onExecuted={mutate} />
      </div>

      <motion.footer
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/50"
      >
        Hyper Prediction Markets ? built with Anchor v0.30 on Solana. Each discovery trade drives the ATTN flywheel, auto-mints
        hype, and births bonded markets when collective conviction arrives.
      </motion.footer>
    </div>
  );
}

export default App;

