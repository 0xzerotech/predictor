import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, ArrowRight, SignalHigh } from "lucide-react";

import { AttentionStream } from "../components/AttentionStream";
import { useMarketsContext } from "../context/MarketsContext";

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "n/a";
  const hours = seconds / 3600;
  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }
  const days = hours / 24;
  if (days < 7) {
    return `${days.toFixed(1)}d`;
  }
  return `${(days / 7).toFixed(1)}w`;
};

export const TelemetryPage = () => {
  const { markets, aggregate } = useMarketsContext();

  const stats = useMemo(() => {
    const discovery = markets.filter((market) => market.state === "Discovery");
    const bonded = markets.filter((market) => market.state === "Bonded");
    const bondDurations = bonded
      .filter((market) => market.bondedTs && market.createdTs && market.bondedTs > market.createdTs)
      .map((market) => market.bondedTs - market.createdTs);

    const avgBondSeconds = bondDurations.length
      ? bondDurations.reduce((total, value) => total + value, 0) / bondDurations.length
      : 0;

    const hottestDiscovery = discovery
      .slice()
      .sort((a, b) => b.hypeScore - a.hypeScore)
      .slice(0, 4);

    return {
      discoveryCount: discovery.length,
      bondedCount: bonded.length,
      avgBondSeconds,
      hottestDiscovery,
      attentionPerMarket:
        aggregate.discovery + aggregate.bonded > 0
          ? aggregate.attentionFlow / (aggregate.discovery + aggregate.bonded)
          : 0,
    };
  }, [aggregate.attentionFlow, aggregate.bonded, aggregate.discovery, markets]);

  const topVelocity = useMemo(() => {
    return markets
      .slice()
      .sort((a, b) => {
        const aRate = a.trades / Math.max(1, a.volume);
        const bRate = b.trades / Math.max(1, b.volume);
        return bRate - aRate;
      })
      .slice(0, 5);
  }, [markets]);

  return (
    <div className="space-y-12">
      <section className="space-y-6">
        <p className="text-xs uppercase tracking-[0.35rem] text-neon/70">Protocol telemetry</p>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="glass-panel space-y-5 p-8"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-3">
                <h1 className="font-display text-4xl text-white sm:text-5xl">Live market intelligence console</h1>
                <p className="text-sm text-white/60 sm:text-base">
                  Monitor attention velocity, slippage pressure, and curve graduation without leaving the command center. Every
                  trade reroutes the global hype lattice.
                </p>
              </div>
              <Link
                to={aggregate.topMarket ? `/markets/${aggregate.topMarket.address}` : "/markets"}
                className="glass-button inline-flex items-center gap-2 text-xs text-white/80 hover:text-neon"
              >
                Jump to hottest market
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <TelemetryStat label="Discovery phase" value={stats.discoveryCount.toString()} caption="Markets gathering conviction" />
              <TelemetryStat label="Bonded markets" value={stats.bondedCount.toString()} caption="Resolved intelligence surfaces" />
              <TelemetryStat
                label="Avg bond speed"
                value={formatDuration(stats.avgBondSeconds)}
                caption="From discovery to bonded"
              />
              <TelemetryStat
                label="Attention per market"
                value={stats.attentionPerMarket.toFixed(0)}
                caption="Mean hype credits"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="glass-panel h-full space-y-4 p-6"
          >
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3rem] text-white/50">
              <SignalHigh className="h-4 w-4 text-neon" /> Live signal feed
            </div>
            <p className="text-sm text-white/60">
              Real-time hype capture totals {aggregate.attentionFlow.toLocaleString()} with {aggregate.totalTrades.toLocaleString()} trades
              executed across all curves.
            </p>
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/60">
              <p className="uppercase tracking-[0.3rem] text-white/40">Top discovery pulses</p>
              <ul className="mt-3 space-y-3">
                {stats.hottestDiscovery.map((market) => (
                  <li key={market.address} className="flex items-center justify-between gap-3">
                    <span className="text-white/70">{market.metadata.title}</span>
                    <span className="text-xs uppercase tracking-[0.3rem] text-neon">{market.hypeScore.toLocaleString()} hype</span>
                  </li>
                ))}
                {!stats.hottestDiscovery.length && (
                  <li className="text-xs text-white/40">No discovery markets live yet. Deploy one to spark attention.</li>
                )}
              </ul>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35rem] text-neon/70">Attention atlas</p>
            <h2 className="font-display text-3xl text-white sm:text-4xl">Observe hype propagation</h2>
          </div>
          <p className="max-w-xl text-xs text-white/50 sm:text-sm">
            Metrics refresh automatically when new trades execute. Fade, swell, and sparkline intensities map directly to live curve
            activity.
          </p>
        </div>

        <AttentionStream markets={markets} />
      </section>

      <section className="glass-panel space-y-6 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-xs uppercase tracking-[0.3rem] text-white/40">
            <BarChart3 className="h-4 w-4" /> Trade velocity ranking
          </div>
          <Link to="/markets" className="glass-button inline-flex items-center gap-2 text-xs text-white/80 hover:text-neon">
            Go to explorer
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/70">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.3rem] text-white/40">
              <tr>
                <th className="px-4 py-3">Market</th>
                <th className="px-4 py-3">Trades</th>
                <th className="px-4 py-3">Volume</th>
                <th className="px-4 py-3">Trades / liquidity</th>
                <th className="px-4 py-3">State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {topVelocity.map((market) => {
                const tradeVelocity = market.trades / Math.max(1, market.volume);
                return (
                  <tr key={market.address} className="hover:bg-white/5">
                    <td className="px-4 py-3">
                      <Link to={`/markets/${market.address}`} className="text-white/80 hover:text-neon">
                        {market.metadata.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{market.trades.toLocaleString()}</td>
                    <td className="px-4 py-3">{"$" + (market.volume / 1_000_000).toFixed(2) + "M"}</td>
                    <td className="px-4 py-3">{tradeVelocity.toFixed(4)}</td>
                    <td className="px-4 py-3">{market.state}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

const TelemetryStat = ({ label, value, caption }: { label: string; value: string; caption: string }) => (
  <div className="rounded-2xl border border-white/10 bg-black/25 p-5">
    <p className="text-xs uppercase tracking-[0.3rem] text-white/40">{label}</p>
    <p className="font-display text-3xl text-white">{value}</p>
    <p className="text-xs text-white/50">{caption}</p>
  </div>
);

export default TelemetryPage;

