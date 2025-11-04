import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Share2, Tag, Clock, Flame, TrendingUp } from "lucide-react";

import { useMarketsContext } from "../context/MarketsContext";
import { TradePanel } from "../components/TradePanel";
import { CurvePreview } from "../components/charts/CurvePreview";
import { MarketGrid } from "../components/MarketGrid";

export const MarketDetailPage = () => {
  const { marketId } = useParams<{ marketId: string }>();
  const { markets, mutate, aggregate } = useMarketsContext();

  const market = markets.find((entry) => entry.address === marketId);

  const related = useMemo(() => {
    return markets
      .filter((entry) => entry.address !== market?.address)
      .sort((a, b) => b.hypeScore - a.hypeScore)
      .slice(0, 3);
  }, [market?.address, markets]);

  if (!market) {
    return (
      <div className="space-y-6">
        <Link to="/markets" className="btn inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to markets
        </Link>
        <div className="glass-panel p-10 text-center text-white/70">
          This market could not be located. It may have been archived or the address is incorrect.
        </div>
      </div>
    );
  }

  const createdDate = market.createdTs ? new Date(market.createdTs * 1000) : null;
  const bondedDate = market.bondedTs ? new Date(market.bondedTs * 1000) : null;
  const bondCompletion = Math.min(100, (market.volume / Math.max(1, market.bondVolumeTarget)) * 100);
  const yes = Math.min(95, Math.max(5, Math.floor(Math.log10(Math.max(1, market.hypeScore + 1)) * 10 + 40)));
  const no = 100 - yes;

  const shareMarket = async () => {
    const payload = {
      title: market.metadata.title,
      text: market.metadata.description,
      url: window.location.href,
    };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch (error) {
        console.warn("Share cancelled", error);
      }
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(payload.url);
      } catch (error) {
        console.warn("Clipboard copy failed", error);
      }
    }
  };

  return (
    <div className="space-y-12">
      <Link to="/markets" className="glass-button inline-flex items-center gap-2 text-xs text-white/80 hover:text-neon">
        <ArrowLeft className="h-4 w-4" />
        Back to markets
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="rounded-2xl border border-white/10 bg-black/30 p-6"
          >
            <div className="space-y-3">
              <h1 className="font-display text-3xl text-white">{market.metadata.title}</h1>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="rounded-sm border border-white/15 bg-white/5 px-2 py-0.5 text-white">Yes {yes}%</span>
                <span className="rounded-sm border border-white/15 bg-white/5 px-2 py-0.5">No {no}%</span>
                <span className="rounded-sm border border-white/15 bg-white/5 px-2 py-0.5">{market.state}</span>
                <span className="text-white/60">Bond {bondCompletion.toFixed(0)}%</span>
              </div>
              {market.metadata.description ? (
                <p className="text-sm text-white/70">{market.metadata.description}</p>
              ) : null}
            </div>
            {market.metadata.tags?.length ? (
              <div className="flex flex-wrap gap-2 text-xs text-white/60">
                {market.metadata.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-3 py-1">
                    <Tag className="h-3 w-3 text-neon" />#{tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="grid gap-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:grid-cols-3">
              <div className="space-y-1 text-xs uppercase tracking-[0.3rem] text-white/40">
                <p>Volume</p>
                <p className="font-display text-2xl text-white">{"$" + (market.volume / 1_000_000).toFixed(2) + "M"}</p>
                <p className="text-white/50">Liquidity</p>
              </div>
              <div className="space-y-1 text-xs uppercase tracking-[0.3rem] text-white/40">
                <p>Attention</p>
                <p className="font-display text-2xl text-white">{market.hypeScore.toLocaleString()}</p>
                <p className="text-white/50">Hype credits</p>
              </div>
              <div className="space-y-1 text-xs uppercase tracking-[0.3rem] text-white/40">
                <p>Supply minted</p>
                <p className="font-display text-2xl text-white">{market.supply.toFixed(2)}</p>
                <p className="text-white/50">Shares</p>
              </div>
            </div>
          </motion.div>
          <CurvePreview market={market} />
        </div>

        <div className="space-y-6">
            <TradePanel market={market} onExecuted={mutate} />

          <div className="card space-y-4 p-6">
            <p className="text-xs uppercase tracking-[0.35rem] text-white/40">Bond threshold</p>
            <div className="space-y-3 text-sm text-white/60">
              <div className="flex items-center justify-between">
                <span>Target volume</span>
                <span className="font-display text-base text-white">{"$" + (market.bondVolumeTarget / 1_000_000).toFixed(2) + "M"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Liquidity goal</span>
                <span className="font-display text-base text-white">{"$" + (market.bondLiquidityTarget / 1_000_000).toFixed(2) + "M"}</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3rem]">
                  <span className="text-white/40">Progress</span>
                  <span className="text-white/70">{bondCompletion.toFixed(1)}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-neon via-plasma to-aurora"
                    initial={{ width: 0 }}
                    animate={{ width: `${bondCompletion}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {related.length ? (
            <div className="card space-y-4 p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.35rem] text-white/40">Related markets</p>
                <Link to="/markets" className="btn text-xs">
                  View explorer
                </Link>
              </div>
              <MarketGrid markets={related} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const TimelineEvent = ({ label, date, description }: { label: string; date: string; description: string }) => (
  <div className="rounded-3xl border border-white/10 bg-black/25 p-5">
    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3rem] text-white/40">
      <Clock className="h-4 w-4" /> {label}
    </div>
    <p className="mt-2 font-display text-lg text-white">{date}</p>
    <p className="text-sm text-white/60">{description}</p>
  </div>
);

export default MarketDetailPage;

