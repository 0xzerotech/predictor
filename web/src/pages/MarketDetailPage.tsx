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
  const { markets, global, mutate, aggregate } = useMarketsContext();

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
        <Link to="/markets" className="glass-button inline-flex items-center gap-2 text-xs text-white/80 hover:text-neon">
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

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="glass-panel space-y-6 p-8"
          >
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.3rem] text-white/50">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-white/70">
                {market.state === "Discovery" ? <Flame className="h-4 w-4 text-aurora" /> : <TrendingUp className="h-4 w-4 text-neon" />}
                {market.state}
              </span>
              <span>Bond completion {bondCompletion.toFixed(1)}%</span>
              <span>Trades {market.trades.toLocaleString()}</span>
            </div>
            <div className="space-y-4">
              <h1 className="font-display text-4xl text-white sm:text-5xl">{market.metadata.title}</h1>
              <p className="text-sm text-white/70 sm:text-base">{market.metadata.description}</p>
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

            <div className="grid gap-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:grid-cols-3">
              <div className="space-y-1 text-xs uppercase tracking-[0.3rem] text-white/40">
                <p>Volume</p>
                <p className="font-display text-2xl text-white">{"$" + (market.volume / 1_000_000).toFixed(2) + "M"}</p>
                <p className="text-white/50">Bonded liquidity</p>
              </div>
              <div className="space-y-1 text-xs uppercase tracking-[0.3rem] text-white/40">
                <p>Attention index</p>
                <p className="font-display text-2xl text-white">{market.hypeScore.toLocaleString()}</p>
                <p className="text-white/50">Live hype credits</p>
              </div>
              <div className="space-y-1 text-xs uppercase tracking-[0.3rem] text-white/40">
                <p>Supply minted</p>
                <p className="font-display text-2xl text-white">{market.supply.toFixed(2)}</p>
                <p className="text-white/50">Micro shares circulating</p>
              </div>
            </div>
          </motion.div>

          <CurvePreview market={market} />

          <div className="glass-panel space-y-6 p-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs uppercase tracking-[0.35rem] text-white/40">Market timeline</p>
              <button className="glass-button inline-flex items-center gap-2 text-xs text-white/80 hover:text-neon" onClick={shareMarket}>
                <Share2 className="h-4 w-4" /> Share snapshot
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TimelineEvent
                label="Discovery initiated"
                date={createdDate?.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) ?? "Pending"}
                description="Market registered and attention feed activated."
              />
              <TimelineEvent
                label="Bond graduation"
                date={bondedDate ? bondedDate.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "Awaiting"}
                description="Curve crosses liquidity threshold and locks in resolution rules."
              />
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/30 p-6">
              <p className="text-xs uppercase tracking-[0.3rem] text-white/40">Protocol network</p>
              <p className="mt-2 text-sm text-white/60">
                Hyper currently orchestrates {(aggregate.discovery + aggregate.bonded).toString().padStart(2, "0")} markets with a
                cumulative attention flow of {aggregate.attentionFlow.toLocaleString()}. Each trade in this curve feeds the global
                ATTN flywheel.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <TradePanel market={market} global={global ?? undefined} onExecuted={mutate} />

          <div className="glass-panel space-y-4 p-6">
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
            <div className="glass-panel space-y-4 p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.35rem] text-white/40">Related markets</p>
                <Link to="/markets" className="text-xs uppercase tracking-[0.3rem] text-neon hover:text-white">
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

