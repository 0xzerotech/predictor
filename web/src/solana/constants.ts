import { Cluster, PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey("HypePred111111111111111111111111111111111111");

export const GLOBAL_SEED = Buffer.from("global");
export const MARKET_SEED = Buffer.from("market");
export const CURVE_SEED = Buffer.from("curve");
export const QUOTE_VAULT_SEED = Buffer.from("quote");
export const ATTENTION_VAULT_SEED = Buffer.from("attention");
export const RESOLUTION_SEED = Buffer.from("resolution");

export const DEFAULT_ENDPOINT = process.env.ANCHOR_PROVIDER_URL || "http://127.0.0.1:8899";
export const DEFAULT_CLUSTER = (process.env.SOLANA_CLUSTER as Cluster) || "localnet";

