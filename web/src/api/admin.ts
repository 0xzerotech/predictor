import { apiGet, apiPost } from "./client";

export const fetchPendingMarkets = () => apiGet("/admin/markets/pending", { auth: true });

export const resolveMarket = (marketId: string, outcome: "YES" | "NO" | "VOID") =>
  apiPost(`/admin/markets/${marketId}/resolve`, { outcome }, { auth: true });

export const fetchWithdrawals = () => apiGet("/admin/withdrawals", { auth: true });

export const processWithdrawal = (id: string, approved: boolean, notes?: string) =>
  apiPost(`/admin/withdrawals/${id}/process`, { approved, notes }, { auth: true });
