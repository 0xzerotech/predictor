import { Routes, Route } from "react-router-dom";

import { MarketsProvider } from "./context/MarketsContext";
import { AppShell } from "./layout/AppShell";
import { HomePage } from "./pages/HomePage";
import { MarketsPage } from "./pages/MarketsPage";
import { MarketDetailPage } from "./pages/MarketDetailPage";
import { TelemetryPage } from "./pages/TelemetryPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function App() {
  return (
    <MarketsProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="markets" element={<MarketsPage />} />
          <Route path="markets/:marketId" element={<MarketDetailPage />} />
          <Route path="telemetry" element={<TelemetryPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </MarketsProvider>
  );
}

export default App;

