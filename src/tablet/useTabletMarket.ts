import { useCallback, useEffect, useRef, useState } from "react";
import type { TabletFilter } from "./recommended";
import { fetchTabletTradePrices, type TabletTradeSnapshot } from "./tradeMarket";

export function useTabletMarket(tabletFilter: TabletFilter) {
  const [market, setMarket] = useState<TabletTradeSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const loadId = useRef(0);

  const load = useCallback(
    async (force = false) => {
      const id = ++loadId.current;
      setLoading(true);
      setError("");
      setMarket({ league: "", updatedAt: Date.now(), prices: {}, progress: { done: 0, total: 0 } });
      try {
        await fetchTabletTradePrices(tabletFilter, force, {
          onPartial: (partial) => {
            if (id !== loadId.current) return;
            setMarket(partial);
            if (partial.progress && partial.progress.done > 0) {
              setLoading(false);
            }
          },
        }).then((final) => {
          if (id !== loadId.current) return;
          setMarket(final);
        });
      } catch {
        if (id !== loadId.current) return;
        setError("경매장 시세를 불러오지 못했습니다.");
        setMarket(null);
      } finally {
        if (id === loadId.current) setLoading(false);
      }
    },
    [tabletFilter],
  );

  useEffect(() => {
    void load();
  }, [load]);

  return { market, loading, error, reload: () => load(true) };
}

export function formatMarketAgo(unixMs: number): string {
  const diff = Math.max(0, Math.floor((Date.now() - unixMs) / 1000));
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}
