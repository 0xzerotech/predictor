import { apiGet, apiPost } from "./client";
import { UserBalance, TransactionRecord } from "../types/api";

export const fetchBalance = () => apiGet<UserBalance>("/user/balance", { auth: true });
export const fetchTransactions = () => apiGet<TransactionRecord[]>("/user/transactions", { auth: true });

export const deposit = (amount: number) => apiPost("/user/deposit", { amount }, { auth: true });
export const withdraw = (amount: number, destination?: string) =>
  apiPost("/user/withdraw", { amount, destination }, { auth: true });
