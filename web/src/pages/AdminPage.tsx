import { useEffect, useState } from "react";

import { fetchPendingMarkets, resolveMarket, fetchWithdrawals, processWithdrawal } from "../api/admin";
import { useAuth } from "../context/AuthContext";

interface PendingMarket {
  id: string;
  question: string;
  status: string;
  closesAt?: string | null;
}

interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: string;
  type: string;
  createdAt: string;
}

export const AdminPage = () => {
  const { user } = useAuth();
  const [markets, setMarkets] = useState<PendingMarket[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "ADMIN") {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "ADMIN") return;
    const load = async () => {
      try {
        setLoading(true);
        const [pending, requests] = await Promise.all([
          fetchPendingMarkets(),
          fetchWithdrawals(),
        ]);
        setMarkets(pending as PendingMarket[]);
        setWithdrawals(requests as WithdrawalRequest[]);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const handleResolve = async (marketId: string, outcome: "YES" | "NO" | "VOID") => {
    if (!user || user.role !== "ADMIN") return;
    try {
      await resolveMarket(marketId, outcome);
      setMarkets((prev) => prev.filter((m) => m.id !== marketId));
    } catch (err: any) {
      setError(err?.message ?? "Resolution failed");
    }
  };

  const handleWithdrawal = async (id: string, approved: boolean) => {
    if (!user || user.role !== "ADMIN") return;
    try {
      await processWithdrawal(id, approved);
      setWithdrawals((prev) => prev.filter((w) => w.id !== id));
    } catch (err: any) {
      setError(err?.message ?? "Withdrawal update failed");
    }
  };

  if (!user || user.role !== "ADMIN") {
    return <p className="text-white/70">Admin access required.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
        <h1 className="text-2xl font-semibold text-white">Admin dashboard</h1>
        <p className="text-sm text-white/60">Resolve markets and process withdrawal requests.</p>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
        <h2 className="text-lg font-semibold text-white">Pending markets</h2>
        {loading ? (
          <p className="mt-4 text-sm text-white/60">Loading...</p>
        ) : markets.length ? (
          <div className="mt-4 space-y-3 text-sm text-white/70">
            {markets.map((market) => (
              <div key={market.id} className="rounded-lg border border-white/10 bg-black/40 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{market.question}</p>
                    <p className="text-xs text-white/50">Status: {market.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResolve(market.id, "YES")}
                      className="rounded-md bg-neon px-3 py-1 text-xs font-semibold text-black"
                    >
                      Resolve YES
                    </button>
                    <button
                      onClick={() => handleResolve(market.id, "NO")}
                      className="rounded-md border border-white/15 bg-white/10 px-3 py-1 text-xs text-white"
                    >
                      Resolve NO
                    </button>
                    <button
                      onClick={() => handleResolve(market.id, "VOID")}
                      className="rounded-md border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70"
                    >
                      Void
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/60">No pending markets.</p>
        )}
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/30 p-6">
        <h2 className="text-lg font-semibold text-white">Withdrawal requests</h2>
        {withdrawals.length ? (
          <div className="mt-4 space-y-3 text-sm text-white/70">
            {withdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="rounded-lg border border-white/10 bg-black/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">${Number(withdrawal.amount).toFixed(2)}</p>
                    <p className="text-xs text-white/50">User {withdrawal.userId}</p>
                    <p className="text-xs text-white/40">{new Date(withdrawal.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleWithdrawal(withdrawal.id, true)}
                      className="rounded-md bg-neon px-3 py-1 text-xs font-semibold text-black"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleWithdrawal(withdrawal.id, false)}
                      className="rounded-md border border-white/15 bg-white/10 px-3 py-1 text-xs text-white"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-white/60">No withdrawal requests.</p>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
