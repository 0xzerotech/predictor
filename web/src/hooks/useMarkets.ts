import { useMemo } from "react";
import useSWR from "swr";
import { PublicKey } from "@solana/web3.js";

import { useProgramClient, BN } from "../solana/useProgramClient";
import { UiMarket, MarketMetadata } from "../types";

const decodeMetadata = (bytes: number[]): MarketMetadata => {
  try {
    const decoder = new TextDecoder("utf-8");
    const json = decoder.decode(Uint8Array.from(bytes)).replace(/\0+$/, "");
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

const generateDemoMarkets = (): UiMarket[] => {
  const mkKey = (seed: number) => new PublicKey(new Uint8Array(32).fill(seed));
  const now = Math.floor(Date.now() / 1000);
  const demo: UiMarket[] = [
    {
      publicKey: mkKey(11),
      address: mkKey(11).toBase58(),
      marketMint: mkKey(21),
      quoteVault: mkKey(31),
      attentionVault: mkKey(41),
      global: mkKey(51),
      authority: mkKey(61),
      state: "Discovery",
      supply: 125_000,
      volume: 3_400_000,
      trades: 842,
      hypeScore: 18200,
      basePrice: 120,
      slopeBps: 80,
      curvatureBps: 12,
      maxSupply: 1_000_000,
      bondVolumeTarget: 5_000_000,
      bondLiquidityTarget: 900_000,
      createdTs: now - 86_400 * 2,
      bondedTs: 0,
      metadata: { title: "Will BTC close above $80k this month?", description: "Macro momentum vs ETF flows.", tags: ["btc","macro"] },
      quoteVaultBump: 255,
      attentionVaultBump: 254,
    },
    {
      publicKey: mkKey(12),
      address: mkKey(12).toBase58(),
      marketMint: mkKey(22),
      quoteVault: mkKey(32),
      attentionVault: mkKey(42),
      global: mkKey(52),
      authority: mkKey(62),
      state: "Bonded",
      supply: 520_500,
      volume: 12_800_000,
      trades: 3_921,
      hypeScore: 49210,
      basePrice: 240,
      slopeBps: 65,
      curvatureBps: 9,
      maxSupply: 2_000_000,
      bondVolumeTarget: 10_000_000,
      bondLiquidityTarget: 1_500_000,
      createdTs: now - 86_400 * 8,
      bondedTs: now - 86_400 * 3,
      metadata: { title: "Solana flips Ethereum TVL in 2025?", description: "Throughput meets liquidity routing.", tags: ["sol","eth"] },
      quoteVaultBump: 253,
      attentionVaultBump: 252,
    },
    {
      publicKey: mkKey(13),
      address: mkKey(13).toBase58(),
      marketMint: mkKey(23),
      quoteVault: mkKey(33),
      attentionVault: mkKey(43),
      global: mkKey(53),
      authority: mkKey(63),
      state: "Discovery",
      supply: 45_300,
      volume: 1_250_000,
      trades: 612,
      hypeScore: 8800,
      basePrice: 60,
      slopeBps: 110,
      curvatureBps: 16,
      maxSupply: 1_200_000,
      bondVolumeTarget: 2_000_000,
      bondLiquidityTarget: 350_000,
      createdTs: now - 86_400,
      bondedTs: 0,
      metadata: { title: "Will ETH gas fall below 5 gwei for a week?", description: "Danksharding runway.", tags: ["eth","gas"] },
      quoteVaultBump: 251,
      attentionVaultBump: 250,
    },
  ];
  return demo;
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
      address: publicKey.toBase58(),
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

  const fallbackMarkets = useMemo(() => (!program ? generateDemoMarkets() : []), [program]);

  const aggregate = useMemo(() => {
    const markets = data?.markets ?? fallbackMarkets;
    if (!markets || markets.length === 0) {
      return {
        totalVolume: 0,
        discovery: 0,
        bonded: 0,
        attentionFlow: 0,
        totalTrades: 0,
        topMarket: null as UiMarket | null,
        attentionLeader: null as UiMarket | null,
      };
    }
    return markets.reduce(
      (acc, market) => {
        acc.totalVolume += market.volume;
        acc.totalTrades += market.trades;

        if (market.state === "Discovery") {
          acc.discovery += 1;
        } else {
          acc.bonded += 1;
        }

        acc.attentionFlow += market.hypeScore;

        if (!acc.topMarket || market.volume > acc.topMarket.volume) {
          acc.topMarket = market;
        }

        if (!acc.attentionLeader || market.hypeScore > acc.attentionLeader.hypeScore) {
          acc.attentionLeader = market;
        }

        return acc;
      },
      {
        totalVolume: 0,
        discovery: 0,
        bonded: 0,
        attentionFlow: 0,
        totalTrades: 0,
        topMarket: null as UiMarket | null,
        attentionLeader: null as UiMarket | null,
      }
    );
  }, [data, fallbackMarkets]);

  return {
    program,
    global: data?.global,
    markets: data?.markets ?? fallbackMarkets,
    aggregate,
    mutate,
    isLoading: !!program && isLoading,
    error,
  };
};

