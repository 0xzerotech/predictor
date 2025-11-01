import React from "react";
import ReactDOM from "react-dom/client";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";

import App from "./App";
import "modern-normalize/modern-normalize.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./index.css";

const endpoint = process.env.ANCHOR_PROVIDER_URL || "http://127.0.0.1:8899";

const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network: "mainnet-beta" })];

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <App />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </React.StrictMode>
);

