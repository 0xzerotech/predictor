import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Radar, Cpu, Command } from "lucide-react";

import { Hero } from "../components/Hero";
import { MarketGrid } from "../components/MarketGrid";
import { AttentionStream } from "../components/AttentionStream";
import { useMarketsContext } from "../context/MarketsContext";

const experienceLayers = [
  {
    title: "Adaptive Liquidity Mesh",
    description:
      "Dynamic bonding curves with live feedback loops. Liquidity swarms around conviction spikes, ensuring every thesis gets priced instantly.",
    icon: Radar,
    metrics: ["Programmable curves", "Real-time slippage guards", "Multi-asset routing"],
  },
  {
    title: "Autonomous Signal Engine",
    description:
      "Telemetry-grade attention analytics transform social signals into on-chain payloads. Markets self-heal as sentiment shifts.",
    icon: Cpu,
    metrics: ["Attention scoring", "Sentiment fusion", "Predictive heuristics"],
  },
  {
    title: "TradeOps Command Center",
    description:
      "Power operators with composable trade scripts, automated bonding triggers, and programmable fee choreography.",
    icon: Command,
    metrics: ["Composable automation", "Custom fee rails", "Multi-role permissions"],
  },
];

export const HomePage = () => {
  const { markets, aggregate, isLoading } = useMarketsContext();

  const trendingMarkets = useMemo(() => {
    if (!markets.length) return [];
    return [...markets]
      .sort((a, b) => b.hypeScore - a.hypeScore || b.volume - a.volume)
      .slice(0, Math.min(6, markets.length));
  }, [markets]);

  return (
    <div className="space-y-20">
      <Hero
        totalVolume={aggregate.totalVolume}
        discovery={aggregate.discovery}
        bonded={aggregate.bonded}
        attentionFlow={aggregate.attentionFlow}
        totalTrades={aggregate.totalTrades}
        topMarket={aggregate.topMarket}
      />

      <section id="experience" className="space-y-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs uppercase tracking-[0.35rem] text-neon/70">Protocol Layers</p>
            <h2 className="font-display text-3xl text-white sm:text-4xl">A full-stack prediction operations cockpit</h2>
            <p className="text-sm text-white/60 sm:text-base">
              Every interaction fans the hype field, across liquidity, attention, and curve automation. Design your own market OS on
              top of Hyper.
            </p>
          </div>
          <Link
            to="/telemetry"
            className="glass-button inline-flex items-center gap-2 text-xs text-white/80 hover:text-neon"
          >
            Explore telemetry
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {experienceLayers.map(({ title, description, icon: Icon, metrics }) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true, amount: 0.4 }}
              className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl"
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-plasma/10 blur-3xl" />
              <div className="relative flex h-full flex-col gap-5">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10">
                  <Icon className="h-5 w-5 text-neon" />
                </div>
                <div className="space-y-3">
                  <h3 className="font-display text-xl text-white">{title}</h3>
                  <p className="text-sm text-white/60">{description}</p>
                </div>
                <div className="mt-auto space-y-2 text-xs uppercase tracking-[0.25rem] text-white/40">
                  {metrics.map((metric) => (
                    <div key={metric} className="flex items-center gap-2 text-white/60">
                      <span className="h-1.5 w-1.5 rounded-full bg-neon" />
                      {metric}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="markets" className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35rem] text-neon/70">Trending markets</p>
            <h2 className="font-display text-3xl text-white sm:text-4xl">Conviction streams in motion</h2>
          </div>
          <Link to="/markets" className="glass-button inline-flex items-center gap-2 text-xs text-white/80 hover:text-neon">
            View all markets
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-64 rounded-3xl border border-white/10 bg-white/5 animate-pulse bg-gradient-to-br from-white/10 via-transparent to-white/5"
              />
            ))}
          </div>
        ) : (
          <MarketGrid markets={trendingMarkets} />
        )}
      </section>

      <section id="telemetry" className="space-y-8">
        <div className="flex flex-col gap-3">
          <p className="text-xs uppercase tracking-[0.35rem] text-neon/70">Attention analytics</p>
          <h2 className="font-display text-3xl text-white sm:text-4xl">The hype field visualized</h2>
          <p className="max-w-3xl text-sm text-white/60 sm:text-base">
            Watch capital routes, attention pulses, and sparkline signatures cascade across every active curve. Precision telemetry
            engineered for the modern market operator.
          </p>
        </div>

        <AttentionStream markets={markets} />

        <div className="grid gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:grid-cols-3">
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-[0.35rem] text-white/40">Total trades processed</span>
            <p className="font-display text-3xl text-white">{aggregate.totalTrades.toLocaleString()}</p>
            <p className="text-xs text-white/50">Executed across discovery and bonded phases.</p>
          </div>
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-[0.35rem] text-white/40">Avg attention per market</span>
            <p className="font-display text-3xl text-white">
              {((aggregate.attentionFlow || 0) / Math.max(1, aggregate.discovery + aggregate.bonded)).toFixed(0)}
            </p>
            <p className="text-xs text-white/50">Hype pressure distributed across the network.</p>
          </div>
          <div className="space-y-2">
            <span className="text-xs uppercase tracking-[0.35rem] text-white/40">Bonded graduation rate</span>
            <p className="font-display text-3xl text-white">
              {aggregate.discovery + aggregate.bonded === 0
                ? "0%"
                : `${Math.round((aggregate.bonded / Math.max(1, aggregate.discovery + aggregate.bonded)) * 100)}%`}
            </p>
            <p className="text-xs text-white/50">Discovery markets promoted into fully bonded truth primitives.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

