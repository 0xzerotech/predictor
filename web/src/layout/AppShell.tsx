import { useCallback } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { RefreshCw, Orbit, Search } from "lucide-react";

import { useMarketsContext } from "../context/MarketsContext";
import { useAuth } from "../context/AuthContext";

export const AppShell = () => {
  const { mutate } = useMarketsContext();
  const { user, logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { label: "Home", to: "/" },
    { label: "Markets", to: "/markets" },
    { label: "Board", to: "/board" },
    { label: "Telemetry", to: "/telemetry" },
    { label: "Profile", to: "/profile" },
    ...(user?.role === "ADMIN" ? [{ label: "Admin", to: "/admin" }] : []),
  ];

  const handleRefresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return (
    <div className="min-h-screen bg-void text-white">
      <header className="sticky top-0 z-40 border-b border-white/10" style={{ background: "var(--surface)" }}>
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 sm:px-6 lg:px-10">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50">
              <Orbit className="h-4 w-4 text-white/80" />
            </div>
            <span className="hidden text-sm font-semibold text-white/80 sm:inline">Hyper</span>
          </Link>

          <nav className="hidden items-center gap-2 text-sm sm:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded-md px-3 py-1.5 ${isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="relative ml-auto hidden w-full max-w-md items-center sm:flex">
            <Search className="pointer-events-none absolute left-3 h-4 w-4 text-white/30" />
            <input
              placeholder="Search markets"
              className="w-full rounded-md border border-white/10 bg-black/30 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
            />
          </div>

            <button
              onClick={handleRefresh}
              className="hidden items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/70 hover:text-white sm:flex"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-white/70">{user.email}</span>
                <button
                  onClick={logout}
                  className="rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs text-white/70 hover:text-white"
                >
                  Logout
                </button>
              </div>
            ) : (
              <NavLink
                to="/login"
                className={({ isActive }) =>
                  `rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs ${
                    isActive ? "text-white" : "text-white/70 hover:text-white"
                  }`
                }
              >
                Login
              </NavLink>
            )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10">
        <Outlet />
      </main>
    </div>
  );
};

