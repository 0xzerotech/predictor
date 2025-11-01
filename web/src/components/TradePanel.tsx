import { useState, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { motion } from "framer-motion";
import { ArrowRightLeft, Loader2 } from "lucide-react";

import { UiMarket } from "../types";
import { useProgramClient, BN } from "../solana/useProgramClient";
import { CURVE_SEED } from "../solana/constants";

interface TradePanelProps {
  market: UiMarket | null;
  global?: { publicKey: PublicKey; account: any } | null;
  onExecuted?: () => Promise<void> | void;
}

export const TradePanel = ({ market, global, onExecuted }: TradePanelProps) => {
  const program = useProgramClient();
  const { publicKey } = useWallet();
  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [quantity, setQuantity] = useState("100");
  const [limit, setLimit] = useState("1000");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const quoteMint = global ? new PublicKey(global.account.quoteMint) : null;
  const treasury = global ? new PublicKey(global.account.treasury) : null;

  const defaultCreator = useMemo(() => {
    if (!market) return null;
    if (market.metadata.creatorQuoteDestination) {
      try {
        return new PublicKey(market.metadata.creatorQuoteDestination);
      } catch (err) {
        console.warn("invalid creator destination", err);
      }
    }
    return null;
  }, [market]);

  const defaultTreasury = useMemo(() => {
    if (!market || !global) return null;
    if (market.metadata.treasuryQuoteDestination) {
      try {
        return new PublicKey(market.metadata.treasuryQuoteDestination);
      } catch (err) {
        console.warn("invalid treasury destination", err);
      }
    }
    return null;
  }, [market, global]);

  const ensureAta = async (mint: PublicKey, owner: PublicKey) => {
    if (!program) throw new Error("program unavailable");
    const provider = program.provider;
    const ata = await getAssociatedTokenAddress(mint, owner);
    const info = await provider.connection.getAccountInfo(ata);
    if (!info) {
      const ix = createAssociatedTokenAccountInstruction(provider.wallet.publicKey, ata, owner, mint);
      const tx = new Transaction().add(ix);
      await provider.sendAndConfirm(tx, [], { commitment: "confirmed" });
    }
    return ata;
  };

  const submit = async () => {
    if (!program || !market || !global || !publicKey || !quoteMint || !treasury) {
      setFeedback("Connect your wallet and select a market to trade.");
      return;
    }
    const quantityNum = Number(quantity);
    const limitNum = Number(limit);
    if (!Number.isFinite(quantityNum) || quantityNum <= 0) {
      setFeedback("Quantity must be a positive number.");
      return;
    }
    if (!Number.isFinite(limitNum) || limitNum <= 0) {
      setFeedback("Provide a positive slippage guard.");
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const userQuoteAta = await ensureAta(quoteMint, publicKey);
      const userShareAta = await ensureAta(market.marketMint, publicKey);

      const creatorDestination = defaultCreator
        ? defaultCreator
        : await getAssociatedTokenAddress(quoteMint, market.authority);
      const treasuryDestination = defaultTreasury
        ? defaultTreasury
        : await getAssociatedTokenAddress(quoteMint, treasury);

      const [curveAddress] = await PublicKey.findProgramAddress(
        [CURVE_SEED, market.publicKey.toBuffer()],
        program.programId
      );

      const quantityBn = new BN(Math.floor(quantityNum * 1_000_000));
      const limitBn = new BN(Math.floor(limitNum * 1_000_000));

      const tradeArgs = {
        direction: direction === "buy" ? { buy: {} } : { sell: {} },
        quantity: quantityBn,
        maxSpend: direction === "buy" ? limitBn : new BN(0),
        minReceive: direction === "sell" ? limitBn : new BN(0),
      };

      const txSig = await program.methods
        .tradeCurve(tradeArgs)
        .accounts({
          globalState: global.publicKey,
          market: market.publicKey,
          curve: curveAddress,
          marketMint: market.marketMint,
          marketQuoteVault: market.quoteVault,
          marketAttentionVault: market.attentionVault,
          userQuote: userQuoteAta,
          userShares: userShareAta,
          creatorFeeDestination: creatorDestination,
          treasuryFeeDestination: treasuryDestination,
          marketCreator: market.authority,
          user: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      setFeedback(`Trade executed ? ${txSig}`);
      setQuantity("100");
      if (onExecuted) {
        await onExecuted();
      }
    } catch (error: any) {
      console.error(error);
      setFeedback(error?.message ?? "Trade failed. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  if (!market) {
    return (
      <div className="glass-panel flex h-full min-h-[380px] flex-col items-center justify-center gap-4 p-10 text-center text-white/60">
        <ArrowRightLeft className="h-12 w-12 text-white/30" />
        <p>Select a market on the left to compose a trade curve interaction.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel space-y-6 p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl text-white">{market.metadata.title}</h3>
          <p className="text-sm text-white/60">Manage bonding-curve exposure and feed the attention token.</p>
        </div>
        <div className="rounded-full border border-white/10 bg-white/10 px-4 py-1 text-xs uppercase tracking-[0.25rem] text-white/60">
          {market.state}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-white/70">
          Direction
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDirection("buy")}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                direction === "buy" ? "border-neon text-neon" : "border-white/10 text-white/60"
              }`}
            >
              Buy (Join Curve)
            </button>
            <button
              onClick={() => setDirection("sell")}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                direction === "sell" ? "border-aurora text-aurora" : "border-white/10 text-white/60"
              }`}
            >
              Sell (Exit Curve)
            </button>
          </div>
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/70">
          Quantity (micro shares)
          <input
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white focus:border-neon/60 focus:outline-none"
            placeholder="100"
          />
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/70">
          {direction === "buy" ? "Max spend (quote)" : "Min receive (quote)"}
          <input
            value={limit}
            onChange={(event) => setLimit(event.target.value)}
            className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white focus:border-neon/60 focus:outline-none"
            placeholder="1000"
          />
        </label>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/60">
          <p className="mb-2 text-white/70">Bonding Curve Stats</p>
          <div className="grid gap-1 text-xs uppercase tracking-[0.2rem]">
            <span>Base Price ? {market.basePrice / 1_000_000} ?</span>
            <span>Slope ? {(market.slopeBps / 100).toFixed(2)} %</span>
            <span>Curvature ? {(market.curvatureBps / 100).toFixed(2)} %</span>
          </div>
        </div>
      </div>

      <motion.button
        whileTap={{ scale: 0.98 }}
        disabled={loading}
        onClick={submit}
        className="glass-button w-full bg-gradient-to-r from-neon/60 via-plasma/70 to-aurora/70 py-3 text-base font-semibold text-white"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Broadcasting
          </span>
        ) : (
          <>Execute {direction === "buy" ? "Bond Buy" : "Exit Sell"}</>
        )}
      </motion.button>

      {feedback && (
        <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/70">{feedback}</div>
      )}
    </div>
  );
};

