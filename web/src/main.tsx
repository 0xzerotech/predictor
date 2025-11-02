import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter, SolflareWalletAdapter } from "@solana/wallet-adapter-wallets";

import App from "./App";
import { WalletDebug } from "./components/WalletDebug";
import "modern-normalize/modern-normalize.css";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./index.css";

const endpoint = (import.meta as any).env?.VITE_RPC_URL || "https://api.devnet.solana.com";

const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter({ network: "devnet" })];

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ConnectionProvider endpoint={endpoint} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletDebug />
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </React.StrictMode>
);

