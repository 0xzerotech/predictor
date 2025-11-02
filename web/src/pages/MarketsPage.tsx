import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Filter, ArrowRight, ArrowUpWideNarrow, Sparkle, Search } from "lucide-react";

import { MarketGrid } from "../components/MarketGrid";
import { MarketRow } from "../components/MarketRow";
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
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h1 className="text-xl font-semibold text-white/90">Markets</h1>
        <div className="text-xs text-white/50">{markets.length} total • {discoveryCount} discovery • {bondedCount} bonded</div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
            <span className="hidden items-center gap-1 sm:inline-flex"><Filter className="h-4 w-4" /> Filters</span>
            <span>Discovery {discoveryCount.toString().padStart(2, "0")}</span>
            <span>Bonded {bondedCount.toString().padStart(2, "0")}</span>
            <span>Total {markets.length.toString().padStart(2, "0")}</span>
          </div>
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-white/30" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search markets"
              className="w-full rounded-md border border-white/10 bg-black/30 py-2 pl-9 pr-4 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-[2fr_3fr] lg:grid-cols-[1fr_1fr_1fr]">
          {(["all", "Discovery", "Bonded"] as MarketPhaseFilter[]).map((value) => (
            <button
              key={value}
              onClick={() => setPhase(value)}
              className={`rounded-md border px-3 py-2 text-xs transition ${
                phase === value ? "border-white/30 bg-white/10 text-white" : "border-white/10 bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              {value === "all" ? "All" : value}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <ArrowUpWideNarrow className="h-4 w-4" /> Sort
            <div className="flex items-center gap-2">
              {(["hype", "volume", "recent"] as MarketSort[]).map((value) => (
                <button
                  key={value}
                  onClick={() => setSortKey(value)}
                  className={`rounded-md border px-3 py-1 text-[11px] transition ${
                    sortKey === value ? "border-white/30 text-white" : "border-white/10 text-white/50 hover:text-white"
                  }`}
                >
                  {value === "hype" ? "Hype" : value === "volume" ? "Volume" : "Recent"}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-white/50">{filteredMarkets.length} visible</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_1.2fr]">
        <div>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-12 rounded-lg border border-white/10 bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filteredMarkets.length ? (
            <div className="card">
              <div className="grid grid-cols-[minmax(240px,1fr)_auto_auto_auto_auto_auto] gap-3 px-4 py-2 text-[11px] text-white/40 border-b border-white/10">
                <div>Market</div>
                <div>Yes</div>
                <div>No</div>
                <div>Volume</div>
                <div>Trades</div>
                <div>Bond</div>
                <div>State</div>
              </div>
              <div className="divide-y divide-white/10">
                {filteredMarkets.map((m) => (
                  <MarketRow key={m.address} market={m} />
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-60 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-black/30 text-center text-white/60">
              <Sparkle className="h-6 w-6 text-neon" />
              <p>No markets match the current filters.</p>
              <button
                onClick={() => {
                  setPhase("all");
                  setSortKey("hype");
                  setSearchTerm("");
                }}
                className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80 hover:text-white"
              >
                Reset filters
              </button>
            </div>
          )}
        </div>
        <motion.aside initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs text-white/50">Network</p>
            <div className="mt-3 space-y-2 text-sm text-white/70">
              <div className="flex items-center justify-between"><span>Volume</span><span className="text-white">{"$" + (aggregate.totalVolume / 1_000_000).toFixed(2) + "M"}</span></div>
              <div className="flex items-center justify-between"><span>Attention</span><span className="text-white">{aggregate.attentionFlow.toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span>Trades</span><span className="text-white">{aggregate.totalTrades.toLocaleString()}</span></div>
            </div>
          </div>
          {aggregate.topMarket ? (
            <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
              <p className="text-xs text-white/50">Top liquidity</p>
              <h3 className="mt-2 line-clamp-2 font-medium text-white/90">{aggregate.topMarket.metadata.title}</h3>
              <div className="mt-3 flex items-center justify-between text-xs text-white/60">
                <span>Vol</span>
                <span className="text-white">{"$" + (aggregate.topMarket.volume / 1_000_000).toFixed(2) + "M"}</span>
              </div>
              <Link to={`/markets/${aggregate.topMarket.address}`} className="mt-3 inline-block rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/80 hover:text-white">Open</Link>
            </div>
          ) : null}
        </motion.aside>
      </div>
    </div>
  );
};

export default MarketsPage;

