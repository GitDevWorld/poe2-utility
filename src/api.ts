import { CATEGORIES, type CategoryId, type ExchangeOverview, type League, type MarketRow } from "./types";
import { koreanName } from "./i18n";

const CACHE_MS = 5 * 60 * 1000;

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`시세 조회 실패 (${response.status})`);
  }
  return (await response.json()) as T;
}

async function cached<T>(key: string, force: boolean, load: () => Promise<T>): Promise<CacheEntry<T>> {
  const existing = cache.get(key) as CacheEntry<T> | undefined;
  if (!force && existing && Date.now() - existing.fetchedAt < CACHE_MS) {
    return existing;
  }
  try {
    const data = await load();
    const entry = { data, fetchedAt: Date.now() };
    cache.set(key, entry);
    return entry;
  } catch (error) {
    if (existing) return existing;
    throw error;
  }
}

export async function getLeagues(force = false): Promise<CacheEntry<League[]>> {
  return cached("leagues", force, () => fetchJson<League[]>("/ninja/poe2/api/economy/leagues"));
}

export async function getOverview(
  league: string,
  type: CategoryId,
  force = false,
): Promise<CacheEntry<ExchangeOverview>> {
  const query = new URLSearchParams({ league, type });
  return cached(`overview:${league}:${type}`, force, () =>
    fetchJson<ExchangeOverview>(`/ninja/poe2/api/economy/exchange/current/overview?${query}`),
  );
}

export async function getMarket(
  league: string,
  force = false,
): Promise<{ rows: MarketRow[]; fetchedAt: number; primary: string; secondary: string }> {
  const results = await Promise.allSettled(
    CATEGORIES.map(async (category) => {
      const overview = await getOverview(league, category.id, force);
      return { category: category.id, overview };
    }),
  );

  const rows = new Map<string, MarketRow>();
  let fetchedAt = 0;
  let primary = "divine";
  let secondary = "chaos";

  for (const result of results) {
    if (result.status === "rejected") continue;
    const { category, overview } = result.value;
    fetchedAt = Math.max(fetchedAt, overview.fetchedAt);
    if (category === "Currency") {
      primary = overview.data.core.primary;
      secondary = overview.data.core.secondary;
    }

    const items = new Map<string, ExchangeOverview["items"][number]>();
    for (const item of [...overview.data.core.items, ...overview.data.items]) {
      items.set(item.id, item);
    }

    for (const line of overview.data.lines) {
      const meta = items.get(line.id);
      if (!meta || !Number.isFinite(line.primaryValue) || line.primaryValue <= 0) continue;
      rows.set(`${category}:${line.id}`, {
        id: line.id,
        name: meta.name,
        koName: koreanName(line.id, meta.name, meta.detailsId),
        image: meta.image,
        category: meta.category || category,
        categoryId: category,
        divineValue: line.primaryValue,
        volumeDivine: line.volumePrimaryValue,
        sparkline: line.sparkline,
      });
    }
  }

  if (rows.size === 0) {
    throw new Error("시세 데이터가 없습니다. 리그 또는 네트워크를 확인하세요.");
  }

  return {
    rows: [...rows.values()],
    fetchedAt,
    primary,
    secondary,
  };
}

export function findRow(rows: MarketRow[], id: string): MarketRow | undefined {
  return (
    rows.find((row) => row.id === id && row.categoryId === "Currency") ??
    rows.find((row) => row.id === id)
  );
}
