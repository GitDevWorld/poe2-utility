import { getModByRef, tabletTypes, type ModRef } from "./data";
import { tradeStatIdForRef } from "./tradeStatMap";

/** 서판 종류별 이미지 (poe2db 게임 아이콘) */
export const TABLET_ICONS: Record<number, string> = Object.fromEntries(
  tabletTypes.map((t) => [t.id, `https://cdn.poe2db.tw/image/Art/2DItems/Currency/PrecursorTablets/${t.icon}.webp`]),
);

/** 카카오 경매장은 한글 베이스 이름만 받는다 ("Breach Tablet"은 Unknown item base type). */
const TABLET_BASE_KO: Record<number, string> = Object.fromEntries(tabletTypes.map((t) => [t.id, t.trade_ko]));

export type SearchRarity = "any" | "magic" | "rare";

export type TabletSearchInput = {
  refs: ModRef[];
  tabletTypeId?: number;
  rarity: SearchRarity;
};

/** 서판 종류: 직접 고른 종류, 없으면 접미 옵션들이 모두 같은 종류일 때 그 종류. */
export function resolveTabletTypeId(refs: ModRef[], tabletTypeId?: number): number | undefined {
  if (tabletTypeId != null) return tabletTypeId;
  const suffixTypes = new Set(
    refs.map((ref) => getModByRef(ref)?.tablet_type_id).filter((id): id is number => id != null),
  );
  return suffixTypes.size === 1 ? [...suffixTypes][0] : undefined;
}

/** 선택한 옵션으로 경매장 검색 조건을 만든다. 옵션이 여러 개면 모두 붙은 매물만. */
export function buildTabletQuery({ refs, tabletTypeId, rarity }: TabletSearchInput) {
  const statIds = [...new Set(refs.map(tradeStatIdForRef).filter((id): id is string => Boolean(id)))];
  const typeId = resolveTabletTypeId(refs, tabletTypeId);

  const typeFilters: Record<string, unknown> = { category: { option: "map.tablet" } };
  if (rarity !== "any") typeFilters.rarity = { option: rarity };

  const query: Record<string, unknown> = {
    status: { option: "securable" },
    filters: { type_filters: { filters: typeFilters } },
  };
  if (typeId != null && TABLET_BASE_KO[typeId]) query.type = TABLET_BASE_KO[typeId];
  if (statIds.length) {
    query.stats = [{ type: "and", filters: statIds.map((id) => ({ id })) }];
  }
  return query;
}

export function tradeSearchUrl(league: string, query: Record<string, unknown>): string {
  const base = `https://poe.kakaogames.com/trade2/search/poe2/${encodeURIComponent(league)}`;
  return `${base}?q=${encodeURIComponent(JSON.stringify({ query, sort: { price: "asc" } }))}`;
}

/** 경매장 "검색 필터 가져오기"용 코드: 검색 조건 JSON을 gzip → base64url (H4sI… 형태) */
export async function encodeFilterCode(query: Record<string, unknown>): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(query));
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("gzip"));
  const gz = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = "";
  for (const b of gz) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
