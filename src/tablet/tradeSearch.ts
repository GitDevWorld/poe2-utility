import { getModByRef, tabletTypeName, tabletTypes, type ModRef } from "./data";
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
  /** 남은 사용 횟수 최소값 */
  minUses?: number;
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
export function buildTabletQuery({ refs, tabletTypeId, rarity, minUses }: TabletSearchInput) {
  const statIds = [...new Set(refs.map(tradeStatIdForRef).filter((id): id is string => Boolean(id)))];
  const typeId = resolveTabletTypeId(refs, tabletTypeId);

  const typeFilters: Record<string, unknown> = { category: { option: "map.tablet" } };
  if (rarity !== "any") typeFilters.rarity = { option: rarity };

  const query: Record<string, unknown> = {
    status: { option: "securable" },
    filters: { type_filters: { filters: typeFilters } },
  };
  if (typeId != null && TABLET_BASE_KO[typeId]) query.type = TABLET_BASE_KO[typeId];
  const filters: Record<string, unknown>[] = statIds.map((id) => ({ id }));
  if (minUses != null && minUses > 0) {
    filters.push({ id: "pseudo.pseudo_number_of_uses_remaining", value: { min: minUses } });
  }
  if (filters.length) query.stats = [{ type: "and", filters }];
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

export type ComboCheck = {
  /** 한 서판에 같이 붙을 수 없는 조합 — 창고·경매장 모두 결과 없음 */
  impossible?: string;
  /** 마법 서판(접두·접미 각 1개)에서는 안 나오는 조합 */
  rareOnly?: boolean;
};

/** 선택한 옵션을 "모두 포함"으로 찾을 때 실제로 존재할 수 있는 조합인지 확인한다. */
export function checkCombo(refs: ModRef[]): ComboCheck {
  const mods = refs.map(getModByRef).filter((mod): mod is NonNullable<typeof mod> => Boolean(mod));
  const suffixTypes = [...new Set(mods.map((mod) => mod.tablet_type_id).filter((id): id is number => id != null))];
  const prefixes = mods.filter((mod) => mod.type === "prefix").length;
  const suffixes = mods.filter((mod) => mod.type === "suffix").length;
  return {
    impossible:
      suffixTypes.length > 1
        ? `${suffixTypes.map(tabletTypeName).join("·")} 서판 전용 접미는 한 서판에 같이 붙지 않아 결과가 없습니다.`
        : undefined,
    rareOnly: prefixes > 1 || suffixes > 1,
  };
}
