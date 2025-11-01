import { useCallback } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { motion } from "framer-motion";
import { RefreshCw, Orbit, Sparkles, GaugeCircle } from "lucide-react";

import { useMarketsContext } from "../context/MarketsContext";

const navItems = [
  { label: "Home", to: "/" },
  { label: "Markets", to: "/markets" },
  { label: "Telemetry", to: "/telemetry" },
];

export const AppShell = () => {
  const { aggregate, mutate, program } = useMarketsContext();
  const location = useLocation();

  const handleRefresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-void text-white">
      <div className="aurora-noise" />
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute left-1/2 top-10 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-plasma/30 blur-[180px]" />
        <div className="absolute -left-32 bottom-[-140px] h-[520px] w-[520px] rounded-full bg-aurora/25 blur-[160px]" />
        <div className="absolute right-[-220px] top-[240px] h-[420px] w-[420px] rounded-full bg-neon/20 blur-[120px]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-40 py-6">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 sm:px-10 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="glass-panel flex w-full items-center justify-between gap-6 bg-white/8 px-6 py-4 shadow-[0_25px_60px_rgba(4,0,20,0.35)]"
          >
            <Link to="/" className="flex items-center gap-3 text-left">
              <div className="relative">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-plasma via-neon to-aurora blur-md" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/40">
                  <Orbit className="h-5 w-5 text-neon" />
                </div>
              </div>
              <div className="leading-tight">
                <span className="text-sm uppercase tracking-[0.35rem] text-white/50">Hyper</span>
                <p className="font-display text-xl text-white">Prediction OS</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-6 text-sm font-medium text-white/60 md:flex">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `relative px-3 py-2 uppercase tracking-[0.25rem] transition ${
                      isActive ? "text-white" : "text-white/60 hover:text-white"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span>{item.label}</span>
                      {isActive && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-x-1 -bottom-1 h-px bg-gradient-to-r from-transparent via-neon to-transparent"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              {program ? (
                <button
                  onClick={handleRefresh}
                  className="glass-button hidden items-center gap-2 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3rem] text-white/70 hover:text-neon sm:flex"
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync Data
                </button>
              ) : null}
              <WalletMultiButton className="glass-button !px-5 !py-2 text-xs" />
            </div>
          </motion.div>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-7xl px-6 pb-20 pt-40 sm:px-10 lg:px-12">
        <Outlet />
      </main>

      <footer className="relative mx-auto w-full max-w-7xl px-6 pb-12 sm:px-10 lg:px-12">
        <div className="glass-panel flex flex-col gap-6 bg-white/5 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-left">
            <div className="rounded-full border border-white/10 bg-white/10 p-2">
              <Sparkles className="h-5 w-5 text-aurora" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.35rem] text-white/40">Protocol Pulse</p>
              <p className="text-white/70">{location.pathname === "/telemetry" ? "Live telemetry feed" : "Navigation synced to on-chain state"}</p>
            </div>
          </div>

          <div className="grid gap-4 text-sm text-white/70 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.35rem] text-white/40">Volume</p>
              <p className="font-display text-xl text-white">
                {"$" + (aggregate.totalVolume / 1_000_000).toFixed(2) + "M"}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35rem] text-white/40">Markets</p>
              <p className="font-display text-xl text-white">{(aggregate.discovery + aggregate.bonded).toString().padStart(2, "0")}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35rem] text-white/40">Attention</p>
              <p className="font-display text-xl text-white">{aggregate.attentionFlow.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 text-xs uppercase tracking-[0.3rem] text-white/40">
          <span className="flex items-center gap-2">
            <GaugeCircle className="h-4 w-4" /> Hyper Prediction Markets
          </span>
          <span>Built on Anchor v0.30 ? Solana mainnet ready</span>
        </div>
      </footer>
    </div>
  );
};

