import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { AnchorProvider, Idl, Program, BN } from "@coral-xyz/anchor";
import { useMemo } from "react";

import hyperIdl from "../idl/hyper_prediction.json";
import { PROGRAM_ID } from "./constants";

export type HyperPredictionIdl = typeof hyperIdl & Idl;

export const useProgramClient = () => {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) {
      return null;
    }
    const provider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    return new Program<HyperPredictionIdl>(hyperIdl as HyperPredictionIdl, PROGRAM_ID, provider);
  }, [connection, wallet]);
};

export { BN };

