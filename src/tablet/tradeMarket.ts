import { getLeagues } from "../api";
import type { TabletFilter } from "./recommended";

/**
 * 서판 시세는 GitHub Actions(scripts/collect-tablet-prices.mjs)가 1시간마다 경매장에서 모아
 * 저장소 data 브랜치에 올린 JSON을 읽는다. 경매장이 Vercel 서버 IP를 막아서 사이트에서 직접 조회할 수 없다.
 */
const PRICES_URL = "https://raw.githubusercontent.com/GitDevWorld/poe2-utility/data/tablet-prices.json";
const CACHE_MS = 5 * 60 * 1000;
const STORAGE_LEAGUE = "poe2-exchange.league";

export type TradeRarity = "magic" | "rare";

export type PriceStats = {
  lowestEx: number;
  /** 즉시 구매 최저가 매물 최대 10개의 중간값 */
  medianEx?: number;
  /** 검색된 매물 수 (경매장 표시 상한 10000) */
  listings?: number;
};

export type ModTradePrices = {
  magic?: PriceStats;
  rare?: PriceStats;
};

export type TabletTradeSnapshot = {
  league: string;
  updatedAt: number;
  prices: Record<string, ModTradePrices>;
  progress?: { done: number; total: number };
  /** 시세가 없거나 리그가 다를 때 안내 */
  emptyHint?: string;
};

type CollectedPrices = {
  schema: number;
  league: string;
  updatedAt: number;
  prices: Record<string, ModTradePrices>;
  /** 수집 중이면 done < total — 그동안 모은 옵션만 새 값이고 나머지는 이전 값 */
  progress?: { done: number; total: number };
};

let cache: { at: number; data: CollectedPrices } | null = null;

async function loadCollected(force: boolean): Promise<CollectedPrices> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  // raw.githubusercontent.com 은 5분 캐시라 분 단위 쿼리로 새 파일을 받는다.
  const response = await fetch(`${PRICES_URL}?v=${Math.floor(Date.now() / 60_000)}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`시세 파일 HTTP ${response.status}`);
  const data = (await response.json()) as CollectedPrices;
  cache = { at: Date.now(), data };
  return data;
}

async function selectedLeague(): Promise<string | undefined> {
  try {
    const stored = localStorage.getItem(STORAGE_LEAGUE);
    if (!stored) return undefined;
    const { data } = await getLeagues();
    return data.some((item) => item.name === stored) ? stored : undefined;
  } catch {
    return undefined;
  }
}

export async function fetchTabletTradePrices(_filter: TabletFilter, force = false): Promise<TabletTradeSnapshot> {
  const collected = await loadCollected(force);
  const league = await selectedLeague();
  const priced = Object.values(collected.prices).filter((p) => p.magic || p.rare).length;

  let emptyHint: string | undefined;
  if (priced === 0) emptyHint = "아직 수집된 시세가 없습니다.";
  else if (league && league !== collected.league) emptyHint = `시세는 ${collected.league} 리그 기준입니다.`;

  return {
    league: collected.league,
    updatedAt: collected.updatedAt,
    prices: collected.prices,
    progress: collected.progress,
    emptyHint,
  };
}

export function formatLowestPrice(stats?: PriceStats): string {
  if (!stats) return "—";
  return `${stats.lowestEx}ex`;
}
