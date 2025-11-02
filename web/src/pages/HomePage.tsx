import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Flame, Zap, BarChart3 } from "lucide-react";
import { MarketGrid } from "../components/MarketGrid";
import { useMarketsContext } from "../context/MarketsContext";

const mainTabs = ["Trending", "Breaking", "New"] as const;
const categories = ["All", "Politics", "Sports", "Finance", "Crypto", "Geopolitics", "Earnings"] as const;

export const HomePage = () => {
  const { markets } = useMarketsContext();
  const [activeTab, setActiveTab] = useState<typeof mainTabs[number]>("Trending");
  const [activeCat, setActiveCat] = useState<typeof categories[number]>("All");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return markets
      .filter((m) => m.state === "Bonded")
      .filter((m) => (activeCat === "All" ? true : m.metadata.tags?.join(" ").toLowerCase().includes(activeCat.toLowerCase())))
      .filter((m) => (q ? (m.metadata.title + " " + (m.metadata.description || "")).toLowerCase().includes(q) : true))
      .slice(0, 24);
  }, [markets, activeCat, query]);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      {/* Left sidebar */}
      <aside className="hidden lg:block">
        <nav className="card divide-y divide-white/10">
          <div className="px-4 py-3 text-xs text-white/60">Games</div>
          {[
            "New Releases",
            "Trending",
            "Only on Hyper",
            "Live Markets",
            "Sports",
            "Crypto",
            "Politics",
          ].map((item) => (
            <Link key={item} to="/" className="block px-4 py-2 text-sm text-white/70 hover:bg-white/[0.03]">
              {item}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <section className="space-y-4">
        {/* Toolbar */}
        <div className="card px-3 py-2">
          <div className="flex items-center gap-2">
            {mainTabs.map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className={`btn ${activeTab === t ? "btn-primary" : ""}`}
              >
                {t}
              </button>
            ))}
            <div className="ml-auto relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search markets"
                className="w-full rounded-md border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
              />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {categories.map((c) => (
              <button key={c} onClick={() => setActiveCat(c)} className={`btn ${activeCat === c ? "btn-primary" : ""}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="card p-3 text-sm text-white/70 flex items-center gap-2"><Flame className="h-4 w-4" /> Live</div>
          <div className="card p-3 text-sm text-white/70 flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Top volume</div>
          <div className="card p-3 text-sm text-white/70 flex items-center gap-2"><Zap className="h-4 w-4" /> Attention</div>
        </div>

        {/* Market cards */}
        <div className="card p-3">
          <MarketGrid markets={filtered} />
        </div>
      </section>
    </div>
  );
};

export default HomePage;

