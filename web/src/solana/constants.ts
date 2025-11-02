import { Cluster, PublicKey } from "@solana/web3.js";
import hyperIdl from "../idl/hyper_prediction.json";

export const getProgramId = (): PublicKey | null => {
  const idStr = (hyperIdl as any)?.metadata?.address || (import.meta as any)?.env?.VITE_PROGRAM_ID || "";
  try {
    return new PublicKey(idStr);
  } catch {
    return null;
  }
};

export const PROGRAM_ID = getProgramId();

const te = new TextEncoder();
export const GLOBAL_SEED = te.encode("global");
export const MARKET_SEED = te.encode("market");
export const CURVE_SEED = te.encode("curve");
export const QUOTE_VAULT_SEED = te.encode("quote");
export const ATTENTION_VAULT_SEED = te.encode("attention");
export const RESOLUTION_SEED = te.encode("resolution");

export const DEFAULT_ENDPOINT = process.env.ANCHOR_PROVIDER_URL || "http://127.0.0.1:8899";
export const DEFAULT_CLUSTER = (process.env.SOLANA_CLUSTER as Cluster) || "localnet";

