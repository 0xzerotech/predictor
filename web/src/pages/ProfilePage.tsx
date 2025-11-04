import { useEffect, useState } from "react";

import { useAuth } from "../context/AuthContext";
import { fetchBalance, fetchTransactions, deposit, withdraw } from "../api/user";
import { UserBalance, TransactionRecord } from "../types/api";

export const ProfilePage = () => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState("100");
  const [pendingAction, setPendingAction] = useState<"deposit" | "withdraw" | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [bal, txs] = await Promise.all([fetchBalance(), fetchTransactions()]);
        setBalance(bal);
        setTransactions(txs);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleDeposit = async () => {
    setPendingAction("deposit");
    try {
      await deposit(Number(amount));
      const bal = await fetchBalance();
      setBalance(bal);
    } catch (err: any) {
      setError(err?.message ?? "Deposit failed");
    } finally {
      setPendingAction(null);
    }
  };

  const handleWithdraw = async () => {
    setPendingAction("withdraw");
    try {
      await withdraw(Number(amount));
      const bal = await fetchBalance();
      setBalance(bal);
    } catch (err: any) {
      setError(err?.message ?? "Withdrawal failed");
    } finally {
      setPendingAction(null);
    }
  };

  if (!user) {
    return <p className="text-white/70">Sign in to view your profile.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="text-sm text-white/60">{user.email}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
          <h2 className="text-lg font-semibold text-white">Account balance</h2>
          {loading ? (
            <p className="mt-4 text-sm text-white/60">Loading...</p>
          ) : balance ? (
            <div className="mt-4 space-y-2 text-sm text-white/70">
              <div className="flex items-center justify-between">
                <span>Available</span>
                <span className="font-semibold text-white">${Number(balance.available).toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Locked</span>
                <span className="font-semibold text-white">${Number(balance.locked).toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-red-400">{error ?? "Balance unavailable"}</p>
          )}

          <div className="mt-6 space-y-3">
            <label className="block text-sm text-white/70">
              Amount
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
              />
            </label>
            <div className="flex gap-3">
              <button
                onClick={handleDeposit}
                disabled={pendingAction === "deposit"}
                className="flex-1 rounded-md bg-neon px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50"
              >
                {pendingAction === "deposit" ? "Depositing..." : "Deposit"}
              </button>
              <button
                onClick={handleWithdraw}
                disabled={pendingAction === "withdraw"}
                className="flex-1 rounded-md border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 disabled:opacity-50"
              >
                {pendingAction === "withdraw" ? "Withdrawing..." : "Withdraw"}
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
          <h2 className="text-lg font-semibold text-white">Recent activity</h2>
          <div className="mt-4 space-y-3 text-sm text-white/70">
            {transactions.length ? (
              transactions.slice(0, 10).map((tx) => (
                <div key={tx.id} className="rounded-lg border border-white/10 bg-black/40 p-3">
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span>{new Date(tx.createdAt).toLocaleString()}</span>
                    <span>{tx.type}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-white">${Number(tx.amount).toFixed(2)}</span>
                    <span className="text-white/60">{tx.direction}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-white/60">No transactions yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
