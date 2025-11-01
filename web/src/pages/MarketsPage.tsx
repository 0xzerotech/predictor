import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Filter, ArrowRight, ArrowUpWideNarrow, Sparkle, Search } from "lucide-react";

import { MarketGrid } from "../components/MarketGrid";
import { useMarketsContext } from "../context/MarketsContext";

type MarketPhaseFilter = "all" | "Discovery" | "Bonded";
type MarketSort = "hype" | "volume" | "recent";

export const MarketsPage = () => {
  const { markets, aggregate, isLoading } = useMarketsContext();
  const [phase, setPhase] = useState<MarketPhaseFilter>("all");
  const [sortKey, setSortKey] = useState<MarketSort>("hype");
  const [searchTerm, setSearchTerm] = useState("");

  const discoveryCount = markets.filter((market) => market.state === "Discovery").length;
  const bondedCount = markets.filter((market) => market.state === "Bonded").length;

  const filteredMarkets = useMemo(() => {
    return markets
      .filter((market) => {
        if (phase !== "all" && market.state !== phase) {
          return false;
        }
        if (!searchTerm.trim()) {
          return true;
        }
        const term = searchTerm.trim().toLowerCase();
        const haystack = [market.metadata.title, market.metadata.description, ...(market.metadata.tags ?? [])]
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => {
        switch (sortKey) {
          case "volume":
            return b.volume - a.volume;
          case "recent":
            return b.createdTs - a.createdTs;
          case "hype":
          default:
            return b.hypeScore - a.hypeScore || b.volume - a.volume;
        }
      });
  }, [markets, phase, sortKey, searchTerm]);

  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <p className="text-xs uppercase tracking-[0.35rem] text-neon/70">Market explorer</p>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <h1 className="font-display text-4xl text-white sm:text-5xl">Navigate discovery and bonded truths</h1>
            <p className="text-sm text-white/60 sm:text-base">
              Deploy new markets, monitor hype amplification, and graduate discovery theses into bonded intelligence primitives.
              Filter by conviction phase, surface the highest attention flows, and drill into every curve.
            </p>
          </div>
          <Link
            to={aggregate.topMarket ? `/markets/${aggregate.topMarket.address}` : "/markets"}
            className="glass-button inline-flex items-center gap-2 text-xs text-white/80 hover:text-neon"
          >
            {aggregate.topMarket ? `Open ${aggregate.topMarket.metadata.title}` : "Protocol overview"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="glass-panel space-y-6 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3rem] text-white/50">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1">
              <Filter className="h-4 w-4" />
              Filters active
            </span>
            <span>Discovery {discoveryCount.toString().padStart(2, "0")}</span>
            <span>Bonded {bondedCount.toString().padStart(2, "0")}</span>
            <span>Total {markets.length.toString().padStart(2, "0")}</span>
          </div>
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-white/30" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search markets by thesis, tag, or creator"
              className="w-full rounded-full border border-white/10 bg-black/30 py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/40 focus:border-neon/60 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[2fr_3fr] lg:grid-cols-[1fr_1fr_1fr]">
          {(["all", "Discovery", "Bonded"] as MarketPhaseFilter[]).map((value) => (
            <button
              key={value}
              onClick={() => setPhase(value)}
              className={`rounded-2xl border px-4 py-3 text-xs uppercase tracking-[0.3rem] transition ${
                phase === value ? "border-neon bg-neon/10 text-neon" : "border-white/10 bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              {value === "all" ? "All phases" : `${value} only`}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3rem] text-white/40">
            <ArrowUpWideNarrow className="h-4 w-4" /> Sort by
            <div className="flex items-center gap-2">
              {(["hype", "volume", "recent"] as MarketSort[]).map((value) => (
                <button
                  key={value}
                  onClick={() => setSortKey(value)}
                  className={`rounded-full border px-4 py-1 text-[11px] uppercase tracking-[0.3rem] transition ${
                    sortKey === value ? "border-neon text-neon" : "border-white/10 text-white/50 hover:text-white"
                  }`}
                >
                  {value === "hype" ? "Attention" : value === "volume" ? "Liquidity" : "New"}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-white/40">
            {filteredMarkets.length} markets visible after filters ? {searchTerm ? "Search applied" : "All theses"}
          </p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[3fr_1.2fr]">
        <div>
          {isLoading ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="h-64 rounded-3xl border border-white/10 bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filteredMarkets.length ? (
            <MarketGrid markets={filteredMarkets} />
          ) : (
            <div className="glass-panel flex h-60 flex-col items-center justify-center gap-3 text-center text-white/60">
              <Sparkle className="h-6 w-6 text-neon" />
              <p>No markets match the current filters.</p>
              <button
                onClick={() => {
                  setPhase("all");
                  setSortKey("hype");
                  setSearchTerm("");
                }}
                className="glass-button text-xs text-white/80 hover:text-neon"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>

        <motion.aside
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="space-y-6"
        >
          <div className="glass-panel space-y-4 p-6">
            <p className="text-xs uppercase tracking-[0.35rem] text-white/40">Network summary</p>
            <div className="space-y-3 text-sm text-white/60">
              <div className="flex items-center justify-between">
                <span>Total volume</span>
                <span className="font-display text-base text-white">
                  {"$" + (aggregate.totalVolume / 1_000_000).toFixed(2) + "M"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Attention flow</span>
                <span className="font-display text-base text-white">{aggregate.attentionFlow.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Trades executed</span>
                <span className="font-display text-base text-white">{aggregate.totalTrades.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {aggregate.topMarket ? (
            <div className="glass-panel space-y-4 p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.35rem] text-white/40">Top liquidity</p>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.3rem] text-white/50">
                  {aggregate.topMarket.state}
                </span>
              </div>
              <div className="space-y-2">
                <h3 className="font-display text-xl text-white">{aggregate.topMarket.metadata.title}</h3>
                <p className="text-sm text-white/60 line-clamp-3">{aggregate.topMarket.metadata.description}</p>
              </div>
              <div className="space-y-1 text-xs uppercase tracking-[0.25rem] text-white/40">
                <div className="flex items-center justify-between text-white/60">
                  <span>Volume</span>
                  <span className="text-white">{"$" + (aggregate.topMarket.volume / 1_000_000).toFixed(2) + "M"}</span>
                </div>
                <div className="flex items-center justify-between text-white/60">
                  <span>Attention</span>
                  <span className="text-white">{aggregate.topMarket.hypeScore.toLocaleString()}</span>
                </div>
              </div>
              <Link
                to={`/markets/${aggregate.topMarket.address}`}
                className="glass-button inline-flex items-center gap-2 text-xs text-white/80 hover:text-neon"
              >
                Open market
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : null}
        </motion.aside>
      </div>
    </div>
  );
};

export default MarketsPage;

