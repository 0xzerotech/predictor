import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { useMarketsContext } from "../context/MarketsContext";
import { UiMarket } from "../types";

const pctToBond = (m: UiMarket) => Math.min(100, (m.volume / Math.max(1, m.bondVolumeTarget)) * 100);

const Row = ({ market }: { market: UiMarket }) => {
  const yes = Math.min(95, Math.max(5, Math.floor(Math.log10(Math.max(1, market.hypeScore + 1)) * 10 + 40)));
  const no = 100 - yes;
  return (
    <Link
      to={`/markets/${market.address}`}
      className="group grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-white/10 bg-black/30 p-3 hover:bg-white/5"
    >
      <div className="min-w-0">
        <div className="truncate text-sm text-white/80">{market.metadata.title}</div>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-white/50">
          <span className="rounded-sm border border-white/15 bg-white/5 px-1.5 py-0.5 text-white">Yes {yes}%</span>
          <span className="rounded-sm border border-white/15 bg-white/5 px-1.5 py-0.5">No {no}%</span>
          <span>Vol ${ (market.volume/1_000_000).toFixed(2) }M</span>
          <span>Tr { market.trades.toLocaleString() }</span>
        </div>
      </div>
      <div className="text-right text-xs text-white/60 w-20">{pctToBond(market).toFixed(0)}%</div>
    </Link>
  );
};

export const BoardPage = () => {
  const { markets } = useMarketsContext();
  const now = Math.floor(Date.now() / 1000);

  const { newPairs, finalStretch, migrated } = useMemo(() => {
    const sorted = [...markets];
    const newPairs = sorted.filter((m) => now - m.createdTs < 2 * 86400).slice(0, 20);
    const finalStretch = sorted
      .filter((m) => pctToBond(m) >= 70 && m.state === "Discovery")
      .sort((a, b) => pctToBond(b) - pctToBond(a))
      .slice(0, 20);
    const migrated = sorted.filter((m) => m.state === "Bonded").slice(0, 20);
    return { newPairs, finalStretch, migrated };
  }, [markets, now]);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-xl font-semibold text-white/90">Board</h1>
        <Link to="/markets" className="inline-flex items-center gap-2 text-xs text-white/70 hover:text-white">
          Markets <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="text-xs text-white/50">New</div>
          {newPairs.map((m) => (
            <Row key={m.address} market={m} />
          ))}
          {!newPairs.length && <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-white/50">No new markets.</div>}
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="space-y-3">
          <div className="text-xs text-white/50">Final stretch</div>
          {finalStretch.map((m) => (
            <Row key={m.address} market={m} />
          ))}
          {!finalStretch.length && (
            <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-white/50">No markets near bonding.</div>
          )}
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
          <div className="text-xs text-white/50">Bonded</div>
          {migrated.map((m) => (
            <Row key={m.address} market={m} />
          ))}
          {!migrated.length && (
            <div className="rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-white/50">No bonded markets yet.</div>
          )}
        </motion.section>
      </div>
    </div>
  );
};

export default BoardPage;


