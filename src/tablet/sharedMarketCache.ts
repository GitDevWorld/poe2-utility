import type { TabletFilter } from "./recommended";
import type { TabletTradeSnapshot } from "./tradeMarket";

const SAVE_DEBOUNCE_MS = 1500;

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let pending: { snapshot: TabletTradeSnapshot; filter: TabletFilter } | undefined;

function filterKey(filter: TabletFilter): string {
  return filter === "all" ? "all" : String(filter);
}

export async function loadSharedMarket(
  league: string,
  filter: TabletFilter,
): Promise<TabletTradeSnapshot | null> {
  try {
    const url = `/api/tablet-market?league=${encodeURIComponent(league)}&filter=${encodeURIComponent(filterKey(filter))}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.status === 404 || res.status === 503) return null;
    if (!res.ok) return null;
    return (await res.json()) as TabletTradeSnapshot;
  } catch {
    return null;
  }
}

export function scheduleSharedMarketSave(snapshot: TabletTradeSnapshot, filter: TabletFilter): void {
  pending = { snapshot, filter };
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void flushSharedMarketSave();
  }, SAVE_DEBOUNCE_MS);
}

async function flushSharedMarketSave(): Promise<void> {
  const job = pending;
  pending = undefined;
  if (!job || !job.snapshot.league) return;
  try {
    const url = `/api/tablet-market?league=${encodeURIComponent(job.snapshot.league)}&filter=${encodeURIComponent(filterKey(job.filter))}`;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...job.snapshot, filter: filterKey(job.filter) }),
    });
  } catch {
    /* ignore */
  }
}

export function isSharedSnapshotComplete(snapshot: TabletTradeSnapshot): boolean {
  const p = snapshot.progress;
  if (!p || p.total <= 0) return Object.keys(snapshot.prices).length > 0;
  return p.done >= p.total;
}
