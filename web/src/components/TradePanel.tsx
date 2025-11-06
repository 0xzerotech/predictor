import { useState } from "react";

import { UiMarket } from "../types";
import { placeBet } from "../api/markets";

interface TradePanelProps {
  market: UiMarket | null;
  onExecuted?: () => Promise<void> | void;
}

export const TradePanel = ({ market, onExecuted }: TradePanelProps) => {
  const [side, setSide] = useState<"YES" | "NO">("YES");
  const [amount, setAmount] = useState("100");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const submit = async () => {
    if (!market) return;
    const stake = Number(amount);
    if (!Number.isFinite(stake) || stake <= 0) {
      setFeedback("Amount must be positive");
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      await placeBet(market.id, { side, amount: stake });
      setFeedback("Bet placed successfully");
      if (onExecuted) {
        await onExecuted();
      }
    } catch (err: any) {
      setFeedback(err?.message ?? "Bet failed");
    } finally {
      setLoading(false);
    }
  };

  if (!market) {
    return (
      <div className="glass-panel flex h-full min-h-[260px] flex-col items-center justify-center gap-4 p-6 text-center text-white/60">
        <p>Select a market to place a bet.</p>
      </div>
    );
  }

  return (
    <div className="card space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">{market.metadata.title}</h3>
          <p className="text-xs text-white/60">Enter a stake and choose an outcome.</p>
        </div>
        <span className="chip">{market.state}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-white/70">
          Outcome
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSide("YES")}
              className={`rounded-md border px-4 py-2 text-sm transition ${
                side === "YES" ? "border-white/40 text-white" : "border-white/10 text-white/60"
              }`}
            >
              YES
            </button>
            <button
              onClick={() => setSide("NO")}
              className={`rounded-md border px-4 py-2 text-sm transition ${
                side === "NO" ? "border-white/40 text-white" : "border-white/10 text-white/60"
              }`}
            >
              NO
            </button>
          </div>
        </label>
        <label className="flex flex-col gap-2 text-sm text-white/70">
          Stake
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="rounded-md border border-white/10 bg-black/20 px-4 py-3 text-white focus:border-white/30 focus:outline-none"
            placeholder="100"
          />
        </label>
      </div>

      <button
        onClick={submit}
        disabled={loading}
        className="btn btn-primary flex w-full items-center justify-center gap-2"
      >
        {loading ? "Submitting..." : `Place ${side} bet`}
      </button>

      {feedback ? <p className="text-xs text-white/60">{feedback}</p> : null}
    </div>
  );
};

