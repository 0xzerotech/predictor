import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      buffer: "buffer",
    },
  },
  define: {
    "process.env.ANCHOR_PROVIDER_URL": JSON.stringify(process.env.ANCHOR_PROVIDER_URL || ""),
    "process.env.SOLANA_CLUSTER": JSON.stringify(process.env.SOLANA_CLUSTER || "localnet"),
    global: "globalThis",
  },
  optimizeDeps: {
    include: ["buffer"],
  },
});

