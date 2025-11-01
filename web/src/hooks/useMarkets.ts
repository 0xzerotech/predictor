import { useMemo } from "react";
import useSWR from "swr";
import { PublicKey } from "@solana/web3.js";

import { useProgramClient, BN } from "../solana/useProgramClient";
import { UiMarket, MarketMetadata } from "../types";

const decodeMetadata = (bytes: number[]): MarketMetadata => {
  try {
    const json = Buffer.from(bytes).toString("utf8").replace(/\0+$/, "");
    if (!json.trim()) {
      return { title: "Untitled Market", description: "" };
    }
    return JSON.parse(json);
  } catch (e) {
    return {
      title: "Mystery Market",
      description: "Metadata failed to parse, but the hype is still real.",
    };
  }
};

const toNumber = (bn: BN, decimals = 0) => {
  if (decimals === 0) {
    return Number(bn.toString());
  }
  const divisor = 10 ** decimals;
  return Number(bn.toString()) / divisor;
};

const fetchMarkets = async (program: ReturnType<typeof useProgramClient>) => {
  if (!program) return null;
  const provider = program.provider as any;
  const globals = await program.account.globalState.all();
  if (!globals.length) {
    return {
      global: null,
      markets: [],
      provider,
    };
  }
  const [globalState] = globals;
  const marketsRaw = await program.account.market.all();

  const markets: UiMarket[] = marketsRaw.map(({ account, publicKey }) => {
    const metadata = decodeMetadata(account.metadata as number[]);

    return {
      publicKey,
      marketMint: account.marketMint as PublicKey,
      quoteVault: account.quoteVault as PublicKey,
      attentionVault: account.attentionVault as PublicKey,
      global: account.global as PublicKey,
      authority: account.authority as PublicKey,
      state: "bonded" in account.state ? "Bonded" : "Discovery",
      supply: toNumber(new BN(account.supply.toString()), 6),
      volume: Number(account.volume.toString()),
      trades: Number(account.trades),
      hypeScore: Number(account.hypeScore.toString()),
      basePrice: Number(account.basePrice),
      slopeBps: Number(account.slopeBps),
      curvatureBps: Number(account.curvatureBps),
      maxSupply: Number(account.maxSupply),
      bondVolumeTarget: Number(account.bondVolumeTarget),
      bondLiquidityTarget: Number(account.bondLiquidityTarget),
      createdTs: Number(account.createdTs),
      bondedTs: Number(account.bondedTs),
      metadata,
      quoteVaultBump: account.quoteVaultBump,
      attentionVaultBump: account.attentionVaultBump,
    } as UiMarket;
  });

  return {
    global: {
      publicKey: globalState.publicKey as PublicKey,
      account: globalState.account,
    },
    markets,
    provider,
  };
};

export const useMarkets = () => {
  const program = useProgramClient();

  const { data, error, isLoading, mutate } = useSWR(program ? "hyper-markets" : null, () => fetchMarkets(program));

  const aggregate = useMemo(() => {
    if (!data?.markets) {
      return {
        totalVolume: 0,
        discovery: 0,
        bonded: 0,
        attentionFlow: 0,
      };
    }
    return data.markets.reduce(
      (acc, market) => {
        acc.totalVolume += market.volume;
        if (market.state === "Discovery") {
          acc.discovery += 1;
        } else {
          acc.bonded += 1;
        }
        acc.attentionFlow += market.hypeScore;
        return acc;
      },
      { totalVolume: 0, discovery: 0, bonded: 0, attentionFlow: 0 }
    );
  }, [data]);

  return {
    program,
    global: data?.global,
    markets: data?.markets ?? [],
    aggregate,
    mutate,
    isLoading,
    error,
  };
};

