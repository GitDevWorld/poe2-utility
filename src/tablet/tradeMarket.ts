import { getLeagues } from "../api";
import { modRefKey, prefixOptions, suffixesForFilter, type ModRef } from "./data";
import type { TabletFilter } from "./recommended";
import { isSharedSnapshotComplete, loadSharedMarket, scheduleSharedMarketSave } from "./sharedMarketCache";
import { tradeApiUrl } from "./tradeApiPath";
import tradeMap from "./tabletTradeMap.json";

const TRADE_HEADERS: HeadersInit = {
  Accept: "application/json",
  "Content-Type": "application/json",
};

const SAMPLE_LISTINGS = 1;
const REQUEST_GAP_MS = 1200;
const MAX_RETRIES = 4;
const CACHE_MS = 30 * 60 * 1000;
const STORAGE_LEAGUE = "poe2-exchange.league";

export type TradeRarity = "magic" | "rare";

export type PriceStats = {
  lowestEx: number;
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
  /** 조회는 끝났지만 샘플이 하나도 없을 때 */
  emptyHint?: string;
  /** 공유 캐시에서 불러옴 */
  fromShared?: boolean;
};

type TradeJob = {
  ref: ModRef;
  statId: string;
  tabletType?: string;
};

type SearchResponse = {
  id: string;
  result: string[];
  total: number;
};

type FetchResponse = {
  result: Array<{
    listing?: {
      price?: { type?: string; amount?: number; currency?: string };
    };
  }>;
};

const cache = new Map<string, { at: number; data: TabletTradeSnapshot }>();
let divineExRate = 150;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function lowestFromSamples(values: number[]): PriceStats | undefined {
  if (!values.length) return undefined;
  return { lowestEx: Math.min(...values) };
}

/** 대략 환산 — 검색은 exalt 최저가 필터, fetch는 혼합 화폐 대비 */
const EXALT_PER: Record<string, number> = {
  chaos: 1 / 90,
  regal: 0.25,
  alchemy: 0.005,
  transmute: 0.001,
  chance: 0.002,
};

function priceToExalt(price: { amount?: number; currency?: string } | undefined): number | undefined {
  if (!price?.amount || !price.currency) return undefined;
  if (price.currency === "exalted") return price.amount;
  if (price.currency === "divine") return price.amount * divineExRate;
  const rate = EXALT_PER[price.currency];
  if (rate == null) return undefined;
  return Math.round(price.amount * rate * 100) / 100;
}

function buildSearchBody(statId: string, rarity: TradeRarity, tabletType?: string) {
  const query: Record<string, unknown> = {
    status: { option: "online" },
    filters: {
      type_filters: {
        filters: {
          category: { option: "map.tablet" },
          rarity: { option: rarity },
        },
      },
      trade_filters: {
        filters: {
          price: { min: 1, option: "exalted" },
        },
      },
    },
    stats: [
      {
        type: "and",
        filters: [{ id: statId, value: { min: 1 }, disabled: false }],
      },
    ],
  };
  if (tabletType) query.type = tabletType;
  return { query, sort: { price: "asc" } };
}

type TradeApiError = { error?: { code?: number; message?: string } };

async function tradeFetch<T>(url: string, init?: RequestInit, attempt = 0): Promise<T> {
  const response = await fetch(url, init);
  const json = (await response.json()) as T & TradeApiError;
  if (json?.error?.message) {
    const rateLimited = /rate limit/i.test(json.error.message) || response.status === 429;
    if (rateLimited && attempt < MAX_RETRIES) {
      const waitMs = 2000 * (attempt + 1);
      await sleep(waitMs);
      return tradeFetch<T>(url, init, attempt + 1);
    }
    throw new Error(json.error.message);
  }
  if (!response.ok) throw new Error(`경매장 HTTP ${response.status}`);
  return json as T;
}

async function tradePost<T>(relativePath: string, body: unknown): Promise<T> {
  return tradeFetch<T>(tradeApiUrl(relativePath), {
    method: "POST",
    headers: TRADE_HEADERS,
    body: JSON.stringify(body),
  });
}

async function tradeGet<T>(relativePath: string, query: Record<string, string>): Promise<T> {
  return tradeFetch<T>(tradeApiUrl(relativePath, query), {
    headers: { Accept: "application/json" },
  });
}

async function searchWithListings(
  league: string,
  statId: string,
  rarity: TradeRarity,
  tabletType?: string,
): Promise<SearchResponse | null> {
  const leaguePath = `search/poe2/${encodeURIComponent(league)}`;
  let search = await tradePost<SearchResponse>(leaguePath, buildSearchBody(statId, rarity, tabletType));
  if (!search.result?.length && tabletType) {
    search = await tradePost<SearchResponse>(leaguePath, buildSearchBody(statId, rarity, undefined));
  }
  return search.result?.length ? search : null;
}

async function samplePricesForQuery(
  league: string,
  statId: string,
  rarity: TradeRarity,
  tabletType?: string,
): Promise<number[]> {
  const search = await searchWithListings(league, statId, rarity, tabletType);
  if (!search) return [];

  const ids = search.result.slice(0, SAMPLE_LISTINGS);
  const fetchRes = await tradeGet<FetchResponse>(`fetch/${ids.join(",")}`, {
    query: search.id,
  });

  const values: number[] = [];
  for (const row of fetchRes.result ?? []) {
    const ex = priceToExalt(row.listing?.price);
    if (ex != null && ex > 0) values.push(ex);
  }
  return values;
}

export function tradeJobsForFilter(filter: TabletFilter): TradeJob[] {
  const { tradeStatByRef, tabletTypeTrade } = tradeMap as {
    tradeStatByRef: Record<string, string>;
    tabletTypeTrade: Record<string, string>;
  };

  const mods = [...prefixOptions, ...suffixesForFilter(filter)];
  const jobs: TradeJob[] = [];
  const seen = new Set<string>();

  for (const mod of mods) {
    const ref: ModRef = { slot: mod.type, id: mod.id };
    const key = modRefKey(ref);
    if (seen.has(key)) continue;
    const statId = tradeStatByRef[key];
    if (!statId) continue;
    seen.add(key);

    const typeId = mod.tablet_type_id ?? (filter !== "all" ? filter : undefined);
    const tabletType = typeId != null ? tabletTypeTrade[String(typeId)] : undefined;
    jobs.push({ ref, statId, tabletType });
  }
  return jobs;
}

async function resolveLeague(): Promise<string> {
  const { data } = await getLeagues();
  const stored = localStorage.getItem(STORAGE_LEAGUE);
  if (stored && data.some((item) => item.name === stored)) return stored;
  const preferred = data.find((item) => /rites|abyssal|standard/i.test(item.name) && !/hardcore|ruthless/i.test(item.name));
  return preferred?.name ?? data[0]?.name ?? "Forbidden Rites";
}

export type TradeLoadCallbacks = {
  onProgress?: (done: number, total: number) => void;
  onPartial?: (snapshot: TabletTradeSnapshot) => void;
};

export async function fetchTabletTradePrices(
  filter: TabletFilter,
  force = false,
  callbacks: TradeLoadCallbacks = {},
): Promise<TabletTradeSnapshot> {
  const league = await resolveLeague();
  const cacheKey = `${league}:${filter}`;
  const hit = cache.get(cacheKey);
  if (!force && hit && Date.now() - hit.at < CACHE_MS) {
    return hit.data;
  }

  let sharedSeed: TabletTradeSnapshot | null = null;
  if (!force) {
    sharedSeed = await loadSharedMarket(league, filter);
    if (
      sharedSeed &&
      Date.now() - sharedSeed.updatedAt < CACHE_MS &&
      Object.keys(sharedSeed.prices).length > 0
    ) {
      const snapshot: TabletTradeSnapshot = { ...sharedSeed, fromShared: true };
      cache.set(cacheKey, { at: Date.now(), data: snapshot });
      callbacks.onPartial?.(snapshot);
      if (isSharedSnapshotComplete(sharedSeed)) return snapshot;
    }
  }

  const jobs = tradeJobsForFilter(filter);
  const totalSteps = jobs.length * 2;
  const prices: Record<string, ModTradePrices> = { ...(sharedSeed?.prices ?? {}) };
  let done = sharedSeed?.progress?.done ?? 0;
  let sampleHits = 0;
  let lastError = "";

  if (!jobs.length) {
    return {
      league,
      updatedAt: Date.now(),
      prices: {},
      progress: { done: 0, total: 0 },
      emptyHint: "경매장 stat 매핑된 옵션이 없습니다. tabletTradeMap.json 갱신이 필요합니다.",
    };
  }

  const pushPartial = () => {
    const snapshot: TabletTradeSnapshot = {
      league,
      updatedAt: Date.now(),
      prices: { ...prices },
      progress: { done, total: totalSteps },
    };
    callbacks.onPartial?.(snapshot);
    scheduleSharedMarketSave(snapshot, filter);
    return snapshot;
  };

  pushPartial();

  for (const job of jobs) {
    const key = modRefKey(job.ref);
    const entry: ModTradePrices = { ...(prices[key] ?? {}) };

    for (const rarity of ["magic", "rare"] as const) {
      if (entry[rarity]) {
        done += 1;
        continue;
      }
      try {
        const samples = await samplePricesForQuery(league, job.statId, rarity, job.tabletType);
        const stats = lowestFromSamples(samples);
        if (stats) {
          entry[rarity] = stats;
          sampleHits += 1;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : "조회 실패";
      }
      done += 1;
      prices[key] = { ...entry };
      callbacks.onProgress?.(done, totalSteps);
      pushPartial();
      await sleep(REQUEST_GAP_MS);
    }
  }

  const data: TabletTradeSnapshot = {
    league,
    updatedAt: Date.now(),
    prices,
    progress: { done: totalSteps, total: totalSteps },
    emptyHint:
      sampleHits === 0
        ? lastError.includes("Rate limit")
          ? "경매장 요청 한도 초과입니다. 잠시 후 새로고침하세요."
          : lastError
            ? `시세 샘플 없음 (${lastError})`
            : "매물이 없거나 stat 매핑이 맞지 않습니다."
        : undefined,
  };
  cache.set(cacheKey, { at: Date.now(), data });
  scheduleSharedMarketSave(data, filter);
  return data;
}

export function refsAboveThreshold(
  snapshot: TabletTradeSnapshot,
  filter: TabletFilter,
  magicMin: number,
  rareMin: number,
): ModRef[] {
  const jobs = tradeJobsForFilter(filter);
  const refs: ModRef[] = [];
  for (const job of jobs) {
    const band = snapshot.prices[modRefKey(job.ref)];
    if (!band) continue;
    const magicOk = band.magic && band.magic.lowestEx >= magicMin;
    const rareOk = band.rare && band.rare.lowestEx >= rareMin;
    if (magicOk || rareOk) refs.push(job.ref);
  }
  return refs;
}

export function formatLowestPrice(stats?: PriceStats): string {
  if (!stats) return "—";
  return `${stats.lowestEx}ex`;
}
