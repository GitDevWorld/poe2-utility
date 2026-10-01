import { modRefKey, tabletTypes, type ModRef } from "./data";
import { catalogTextToRef, findModByCatalogText } from "./matchModText";
import type { TabletFilter } from "./recommended";

export const COLding_BASE_TO_TABLET_ID: Record<string, number> = {
  "사원 서판": 1,
  "균열 서판": 2,
  "탐험 서판": 3,
  "환영 서판": 4,
  "의식 서판": 5,
  "감독관 서판": 6,
  "심연 서판": 13,
};

export type ColdingCatalogMod = {
  id: string;
  base: string;
  affix: "prefix" | "suffix";
  text: string;
  keys: string[];
};

type ColdingCatalog = {
  schema: number;
  league: string;
  mods: ColdingCatalogMod[];
};

type PriceTuple = [number, number, number, number, number, string];

export type ColdingPrices = {
  schema: number;
  league: string;
  catalog: string;
  publishedAt: number;
  updatedAt: number;
  rates: { divine: number; chaos: number; vaal?: number };
  b: Record<string, PriceTuple>;
};

export type TabletMarketRow = {
  catalogModId: string;
  base: string;
  affix: "prefix" | "suffix";
  text: string;
  medianExalt: number;
  minExalt: number;
  listings: number;
  modRef?: ModRef;
  patternKo?: string;
  tabletTypeId?: number;
};

export type TabletMarketSnapshot = {
  league: string;
  updatedAt: number;
  publishedAt: number;
  rows: TabletMarketRow[];
  sourceUrl: string;
};

const CACHE_MS = 30 * 60 * 1000;
let cache: { at: number; data: TabletMarketSnapshot } | undefined;

async function gunzipToJson<T>(buffer: ArrayBuffer): Promise<T> {
  const ds = new DecompressionStream("gzip");
  const decompressed = new Response(new Blob([buffer]).stream().pipeThrough(ds));
  return (await decompressed.json()) as T;
}

function medianForMod(mod: ColdingCatalogMod, prices: ColdingPrices): Omit<TabletMarketRow, "modRef" | "patternKo"> | null {
  const keys = [...mod.keys, `${mod.id}:exists`];
  let medianExalt = 0;
  let minExalt = 0;
  let listings = 0;
  for (const key of keys) {
    const tuple = prices.b[key];
    if (!tuple) continue;
    const med = tuple[4];
    const min = tuple[3];
    const list = tuple[2];
    if (med >= medianExalt) {
      medianExalt = med;
      minExalt = min;
      listings = list;
    }
  }
  if (medianExalt <= 0) return null;
  const tabletTypeId = COLding_BASE_TO_TABLET_ID[mod.base];
  return {
    catalogModId: mod.id,
    base: mod.base,
    affix: mod.affix,
    text: mod.text,
    medianExalt,
    minExalt,
    listings,
    tabletTypeId,
  };
}

export async function fetchTabletMarket(force = false): Promise<TabletMarketSnapshot> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) {
    return cache.data;
  }

  const pricesRes = await fetch("/colding/prices");
  if (!pricesRes.ok) throw new Error("시세 API 실패");
  const prices = (await pricesRes.json()) as ColdingPrices;

  const catalogRes = await fetch(`/colding/catalog/${encodeURIComponent(prices.catalog)}`);
  if (!catalogRes.ok) throw new Error("카탈로그 API 실패");
  const catalog = await gunzipToJson<ColdingCatalog>(await catalogRes.arrayBuffer());

  const rows: TabletMarketRow[] = [];
  for (const mod of catalog.mods) {
    const base = medianForMod(mod, prices);
    if (!base) continue;
    const matched = findModByCatalogText(mod.text);
    const ref = catalogTextToRef(mod.text, mod.affix);
    rows.push({
      ...base,
      modRef: ref,
      patternKo: matched?.pattern_ko,
      tabletTypeId: base.tabletTypeId ?? matched?.tablet_type_id ?? undefined,
    });
  }

  rows.sort((a, b) => b.medianExalt - a.medianExalt);

  const data: TabletMarketSnapshot = {
    league: prices.league,
    updatedAt: prices.updatedAt,
    publishedAt: prices.publishedAt,
    rows,
    sourceUrl: "https://colding.xyz/tools/tablet/",
  };
  cache = { at: Date.now(), data };
  return data;
}

export function marketRowsForFilter(rows: TabletMarketRow[], filter: TabletFilter): TabletMarketRow[] {
  if (filter === "all") return rows;
  return rows.filter((row) => row.tabletTypeId === filter);
}

/** colding 중앙값 상위 — 정규식 패턴 매칭 가능한 것만 */
export function recommendRefsFromMarket(
  snapshot: TabletMarketSnapshot,
  filter: TabletFilter,
  limit = 14,
  minMedianExalt = 3,
): ModRef[] {
  const seen = new Set<string>();
  const refs: ModRef[] = [];
  for (const row of marketRowsForFilter(snapshot.rows, filter)) {
    if (row.medianExalt < minMedianExalt || !row.modRef) continue;
    const key = modRefKey(row.modRef);
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push(row.modRef);
    if (refs.length >= limit) break;
  }
  return refs;
}

export function typePatternForFilter(filter: TabletFilter): string | undefined {
  if (filter === "all") return undefined;
  return tabletTypes.find((t) => t.id === filter)?.pattern_ko;
}

/** modRef → 중앙값(ex). 동일 옵션이 여러 서판에 있으면 더 높은 값 */
export function buildModRefMedianMap(rows: TabletMarketRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.modRef || row.medianExalt <= 0) continue;
    const key = modRefKey(row.modRef);
    const prev = map.get(key);
    if (prev === undefined || row.medianExalt > prev) {
      map.set(key, row.medianExalt);
    }
  }
  return map;
}
