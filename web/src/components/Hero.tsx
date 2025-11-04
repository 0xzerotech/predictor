import { motion } from "framer-motion";

import { UiMarket } from "../types";

interface HeroProps {
  totalVolume: number;
  discovery: number;
  bonded: number;
  attentionFlow: number;
  totalTrades: number;
  topMarket?: UiMarket | null;
}

const formatMillions = (value: number) => {
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
};

export const Hero = ({
  totalVolume,
  discovery,
  bonded,
  attentionFlow,
  totalTrades,
  topMarket,
}: HeroProps) => {
  const marketsCount = Math.max(discovery + bonded, 0);
  const volumeMillions = totalVolume / 1_000_000;
  const averageVolumePerMarket = marketsCount ? totalVolume / marketsCount / 1_000_000 : 0;
  const avgAttention = marketsCount ? attentionFlow / marketsCount : 0;
  const tradesPerMarket = marketsCount ? totalTrades / marketsCount : 0;

  const metrics = [
    {
      label: "Protocol Liquidity",
      value: `$${formatMillions(volumeMillions)}M`,
      detail: `~$${formatMillions(averageVolumePerMarket)}M per market`,
    },
    {
      label: "Markets Online",
      value: marketsCount.toString().padStart(2, "0"),
      detail: `${discovery} discovery ? ${bonded} bonded`,
    },
    {
      label: "Attention Flux",
      value: `${avgAttention >= 1_000 ? (avgAttention / 1_000).toFixed(1) + "k" : avgAttention.toFixed(0)}`,
      detail: "Average hype per market",
    },
    {
      label: "Total Trades",
      value: totalTrades.toLocaleString(),
      detail: `${Math.round(tradesPerMarket).toLocaleString()} per market`,
    },
  ];

  const highlightBondPct = topMarket
    ? Math.min(100, (topMarket.volume / Math.max(1, topMarket.bondVolumeTarget)) * 100)
    : 0;

  const highlightStats = topMarket
    ? [
        {
          label: "Volume",
          value: `$${formatMillions(topMarket.volume / 1_000_000)}M`,
          detail: "Cumulative liquidity",
        },
        {
          label: "Hype Index",
          value: topMarket.hypeScore.toLocaleString(),
          detail: "Attention credits minted",
        },
        {
          label: "Trades",
          value: topMarket.trades.toLocaleString(),
          detail: "Curve interactions",
        },
        {
          label: "Supply",
          value: topMarket.supply.toFixed(2),
          detail: "Active bonded shares",
        },
      ]
    : [];

  return (
    <section className="relative overflow-hidden rounded-[56px] border border-white/10 bg-white/[0.04] px-8 py-12 shadow-[0_55px_140px_rgba(8,0,28,0.55)] hero-veil sm:px-12 sm:py-14 lg:px-16">
      <div className="pointer-events-none absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-plasma/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-12 bottom-[-8rem] h-[560px] w-[560px] rounded-full bg-aurora/20 blur-[140px]" />
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <div className="grid-overlay" />
      </div>

      <div className="relative z-10 grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="max-w-2xl space-y-8">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3rem] text-neon"
          >
            Hyper Prediction Protocol OS
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="font-display text-5xl leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl"
          >
            Markets that crystallize <span className="text-neon">collective conviction</span> into on-chain truth.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-lg text-white/70 lg:text-xl"
          >
            Co-create programmable attention economies where every trade orchestrates liquidity, amplifies hype pressure, and
            graduates discovery markets into bonded, self-resolving intelligence surfaces.
          </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-wrap items-center gap-4"
            >
              <a
                href="#markets"
                className="glass-button bg-gradient-to-r from-plasma/70 via-neon/70 to-aurora/70 text-sm font-semibold text-white shadow-lg shadow-neon/10"
              >
                Explore Live Markets
              </a>
              <a
                href="#telemetry"
                className="glass-button border-neon/40 bg-white/5 text-sm text-white/80 hover:text-neon"
              >
                View Protocol Telemetry
              </a>
            </motion.div>

          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.1, delayChildren: 0.55 } },
            }}
            className="grid gap-4 sm:grid-cols-2"
          >
            {metrics.map((metric) => (
              <motion.div
                key={metric.label}
                variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
                className="relative overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-5 backdrop-blur-xl"
              >
                <div className="pointer-events-none absolute inset-0 opacity-40">
                  <div className="hero-mesh" />
                </div>
                <div className="relative z-10 space-y-2">
                  <span className="text-xs uppercase tracking-[0.3rem] text-white/50">{metric.label}</span>
                  <div className="font-display text-3xl text-white sm:text-4xl">{metric.value}</div>
                  <p className="text-xs text-white/50">{metric.detail}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 36 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.55, duration: 0.7 }}
          className="relative overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-8 backdrop-blur-2xl"
        >
          <div className="pointer-events-none absolute inset-0 opacity-60">
            <div className="hero-mesh" />
          </div>
          <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-neon/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 bottom-8 h-64 w-64 rounded-full bg-aurora/25 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.35rem] text-white/50">Signal Focus</span>
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3rem] text-white/60">
                {topMarket ? topMarket.state : "Awaiting"}
              </span>
            </div>

            {topMarket ? (
              <>
                <div className="space-y-3">
                  <h3 className="font-display text-2xl text-white sm:text-3xl">{topMarket.metadata.title}</h3>
                  <p className="text-sm text-white/60 line-clamp-3">{topMarket.metadata.description}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {highlightStats.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/60 backdrop-blur-xl"
                    >
                      <p className="text-xs uppercase tracking-[0.25rem] text-white/40">{stat.label}</p>
                      <p className="mt-1 font-display text-2xl text-white">{stat.value}</p>
                      <p className="text-[11px] uppercase tracking-[0.25rem] text-white/30">{stat.detail}</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.3rem] text-white/50">
                    <span>Bond Completion</span>
                    <span>{highlightBondPct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-neon via-plasma to-aurora"
                      initial={{ width: "0%" }}
                      animate={{ width: `${highlightBondPct}%` }}
                      transition={{ duration: 1.4, ease: "easeOut" }}
                    />
                  </div>
                </div>

                {topMarket.metadata.tags?.length ? (
                  <div className="flex flex-wrap gap-2 text-xs text-white/60">
                    {topMarket.metadata.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <div className="min-h-[180px] rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-sm text-white/60">
                Markets are standing by. Deploy the first discovery curve to initialise the protocol spotlight.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

