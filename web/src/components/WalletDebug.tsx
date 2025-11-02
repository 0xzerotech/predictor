import { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export const WalletDebug = () => {
  const { publicKey, signMessage } = useWallet();

  useEffect(() => {
    if (publicKey) {
      // Log pubkey whenever wallet connects
      console.log("[wallet] connected:", publicKey.toBase58());
    }
  }, [publicKey]);

  useEffect(() => {
    (window as any).walletDebug = {
      get pubkey() {
        return publicKey?.toBase58();
      },
      async signTest() {
        if (!signMessage) {
          console.warn("signMessage not available for this wallet");
          return;
        }
        const data = new TextEncoder().encode("Hello from Hyper");
        const sig = await signMessage(data);
        const hex = Array.from(new Uint8Array(sig))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        console.log("[wallet] signed message hex:", hex);
      },
    };
  }, [publicKey, signMessage]);

  return null;
};

export default WalletDebug;


