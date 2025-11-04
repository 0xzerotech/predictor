import { apiGet, apiPost } from "./client";
import { ApiMarket, ApiBet } from "../types/api";

export const fetchMarkets = () => apiGet<ApiMarket[]>("/markets");
export const fetchMarket = (id: string) => apiGet<ApiMarket>(`/markets/${id}`);
export const fetchMarketBets = (id: string) => apiGet<ApiBet[]>(`/markets/${id}/bets`);
export const fetchMarketOrderbook = (id: string) => apiGet(`/markets/${id}/book`);

interface PlaceBetPayload {
  side: "YES" | "NO";
  amount: number;
}

export const placeBet = (marketId: string, payload: PlaceBetPayload) =>
  apiPost(`/markets/${marketId}/bet`, payload, { auth: true });
