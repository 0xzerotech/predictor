import { useMemo } from "react";
import useSWR from "swr";

import { apiGet } from "../api/client";
import { ApiMarket, BetSide } from "../types/api";
import { UiMarket } from "../types";

const computeProbabilities = (yesVolume: number, noVolume: number) => {
  const total = yesVolume + noVolume;
  if (total === 0) {
    return { yes: 0.5, no: 0.5 };
  }
  return { yes: yesVolume / total, no: noVolume / total };
};

const mapMarket = (market: ApiMarket): UiMarket => {
  const bets = market.bets ?? [];
  const yesVolume = bets
    .filter((bet) => bet.side === ("YES" as BetSide))
    .reduce((acc, bet) => acc + Number(bet.amount), 0);
  const noVolume = bets
    .filter((bet) => bet.side === ("NO" as BetSide))
    .reduce((acc, bet) => acc + Number(bet.amount), 0);
  const { yes } = computeProbabilities(yesVolume, noVolume);

  return {
    id: market.id,
    address: market.id,
    state: market.status === "OPEN" ? "Discovery" : "Bonded",
    status: market.status,
    volume: yesVolume + noVolume,
    trades: bets.length,
    hypeScore: Math.round(yes * 1000 + (yesVolume + noVolume) / 100),
    basePrice: yes * 100,
    bondVolumeTarget: Math.max(1000, yesVolume + noVolume * 2),
    bondLiquidityTarget: Math.max(500, (yesVolume + noVolume) * 0.5),
    slopeBps: 150,
    curvatureBps: 85,
    maxSupply: Math.max(1000, (yesVolume + noVolume) * 1.5),
    supply: yesVolume + noVolume,
    createdTs: new Date(market.createdAt).getTime() / 1000,
    bondedTs: market.updatedAt ? new Date(market.updatedAt).getTime() / 1000 : 0,
    metadata: {
      title: market.question,
      description: market.description ?? "",
      tags: [market.status.toLowerCase()],
    },
  };
};

const fetchMarkets = async (): Promise<UiMarket[]> => {
  const response = await apiGet<ApiMarket[]>("/markets");
  return response.map(mapMarket);
};

export const useMarkets = () => {
  const { data, error, isLoading, mutate } = useSWR("markets", fetchMarkets, {
    refreshInterval: 30_000,
  });

  const aggregate = useMemo(() => {
    const markets = data ?? [];
    if (!markets.length) {
      return {
        totalVolume: 0,
        open: 0,
        resolved: 0,
        discovery: 0,
        bonded: 0,
        attentionFlow: 0,
        totalTrades: 0,
        topMarket: null as UiMarket | null,
      };
    }

    return markets.reduce(
      (acc, market) => {
        acc.totalVolume += market.volume;
        acc.totalTrades += market.trades;
        acc.attentionFlow += market.hypeScore;
        if (market.state === "Discovery") acc.discovery += 1;
        if (market.state === "Bonded") acc.bonded += 1;
        if (market.status === "OPEN") acc.open += 1;
        if (market.status === "RESOLVED") acc.resolved += 1;
        if (!acc.topMarket || market.volume > acc.topMarket.volume) {
          acc.topMarket = market;
        }
        return acc;
      },
      {
        totalVolume: 0,
        open: 0,
        resolved: 0,
        discovery: 0,
        bonded: 0,
        attentionFlow: 0,
        totalTrades: 0,
        topMarket: null as UiMarket | null,
      }
    );
  }, [data]);

  return {
    markets: data ?? [],
    aggregate,
    mutate,
    isLoading,
    error,
  };
};

