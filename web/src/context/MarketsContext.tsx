import { createContext, useContext, ReactNode } from "react";

import { useMarkets } from "../hooks/useMarkets";

type MarketsContextValue = ReturnType<typeof useMarkets>;

const MarketsContext = createContext<MarketsContextValue | null>(null);

export const MarketsProvider = ({ children }: { children: ReactNode }) => {
  const marketsState = useMarkets();

  return <MarketsContext.Provider value={marketsState}>{children}</MarketsContext.Provider>;
};

export const useMarketsContext = () => {
  const context = useContext(MarketsContext);
  if (!context) {
    throw new Error("useMarketsContext must be used within a MarketsProvider");
  }
  return context;
};

