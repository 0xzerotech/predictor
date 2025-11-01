import { useMemo } from "react";
import { UiMarket } from "../types";

export const useAttention = (markets: UiMarket[]) => {
  return useMemo(() => {
    const sorted = [...markets].sort((a, b) => b.hypeScore - a.hypeScore).slice(0, 6);
    const totalHype = sorted.reduce((acc, market) => acc + market.hypeScore, 0);
    const pulses = sorted.map((market, index) => ({
      market,
      intensity: market.hypeScore,
      normalized: totalHype ? market.hypeScore / totalHype : 0,
      delay: index * 120,
    }));

    const spotlight = sorted[0];

    const sparkline = sorted.map((market) => ({
      id: market.publicKey.toBase58(),
      label: market.metadata.title,
      values: Array.from({ length: 12 }, (_, idx) => {
        const noise = Math.sin((idx + 1) * 1.1 + market.volume / 1_000_000) * 0.4;
        const trend = market.hypeScore ? Math.log10(market.hypeScore + 1) : 0;
        return Math.max(0, trend + noise);
      }),
    }));

    return {
      spotlight,
      pulses,
      sparkline,
      totalHype,
    };
  }, [markets]);
};

