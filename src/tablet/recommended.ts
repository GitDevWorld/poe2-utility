import { joinPatterns } from "./buildRegex";
import { getModByRef, modRefKey, tabletTypes, type ModRef } from "./data";

/** 0.5.5 커뮤니티·SNOMET 기준 — 종류별로 ‘돈/효율’에 자주 거론되는 옵션 */
export const UNIVERSAL_QTY: ModRef = { slot: "prefix", id: 7 };

export type FarmRecipeMeta = {
  id: string;
  tabletTypeId: number;
  /** 프리셋 정규식에 넣을 추천 옵션 (순서 유지) */
  refs: ModRef[];
};

export const FARM_RECOMMENDED: FarmRecipeMeta[] = [
  {
    id: "pioneer-farm",
    tabletTypeId: 1,
    refs: [
      UNIVERSAL_QTY,
      { slot: "suffix", id: 66 },
      { slot: "prefix", id: 2 },
      { slot: "prefix", id: 1 },
    ],
  },
  {
    id: "breach-farm",
    tabletTypeId: 2,
    refs: [
      UNIVERSAL_QTY,
      { slot: "suffix", id: 29 },
      { slot: "suffix", id: 28 },
      { slot: "suffix", id: 27 },
      { slot: "suffix", id: 26 },
    ],
  },
  {
    id: "expedition-farm",
    tabletTypeId: 3,
    refs: [
      UNIVERSAL_QTY,
      { slot: "suffix", id: 36 },
      { slot: "suffix", id: 33 },
      { slot: "suffix", id: 37 },
    ],
  },
  {
    id: "delirium-farm",
    tabletTypeId: 4,
    refs: [
      UNIVERSAL_QTY,
      { slot: "suffix", id: 40 },
      { slot: "suffix", id: 47 },
      { slot: "suffix", id: 39 },
      { slot: "suffix", id: 44 },
    ],
  },
  {
    id: "ritual-farm",
    tabletTypeId: 5,
    refs: [
      UNIVERSAL_QTY,
      { slot: "suffix", id: 56 },
      { slot: "suffix", id: 49 },
      { slot: "suffix", id: 50 },
      { slot: "suffix", id: 52 },
    ],
  },
  {
    id: "overseer-farm",
    tabletTypeId: 6,
    refs: [
      UNIVERSAL_QTY,
      { slot: "suffix", id: 63 },
      { slot: "suffix", id: 62 },
      { slot: "suffix", id: 57 },
      { slot: "suffix", id: 59 },
    ],
  },
  {
    id: "abyss-farm",
    tabletTypeId: 13,
    refs: [
      UNIVERSAL_QTY,
      { slot: "prefix", id: 65 },
      { slot: "suffix", id: 76 },
      { slot: "suffix", id: 77 },
      { slot: "suffix", id: 78 },
      { slot: "suffix", id: 80 },
    ],
  },
];

const recommendedByType = new Map<number, ModRef[]>();
for (const farm of FARM_RECOMMENDED) {
  recommendedByType.set(farm.tabletTypeId, farm.refs);
}

const recommendedByRecipe = new Map(FARM_RECOMMENDED.map((item) => [item.id, item]));

export function recommendedRefsForType(tabletTypeId: number): ModRef[] {
  return recommendedByType.get(tabletTypeId) ?? [UNIVERSAL_QTY];
}

export function recommendedRefsForRecipe(recipeId: string): ModRef[] | undefined {
  return recommendedByRecipe.get(recipeId)?.refs;
}

export type TabletFilter = number | "all";

export function isRecommendedMod(
  filter: TabletFilter | null,
  ref: ModRef,
  mod?: { tablet_type_id: number | null },
): boolean {
  if (modRefKey(ref) === modRefKey(UNIVERSAL_QTY)) return true;
  if (filter === "all") {
    if (ref.slot === "prefix") {
      return FARM_RECOMMENDED.some((farm) =>
        farm.refs.some((item) => modRefKey(item) === modRefKey(ref)),
      );
    }
    const typeId = mod?.tablet_type_id;
    if (typeId == null) return false;
    return isRecommendedMod(typeId, ref);
  }
  if (filter == null) return false;
  const list = recommendedByType.get(filter);
  if (!list) return false;
  return list.some((item) => modRefKey(item) === modRefKey(ref));
}

export function recommendedRefsForAllTypes(): ModRef[] {
  const seen = new Set<string>();
  const refs: ModRef[] = [];
  for (const farm of FARM_RECOMMENDED) {
    for (const ref of farm.refs) {
      const key = modRefKey(ref);
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push(ref);
    }
  }
  return refs;
}

function modSortTier(filter: TabletFilter, ref: ModRef, mod?: { tablet_type_id: number | null }): number {
  if (isRecommendedMod(filter, ref, mod)) return 0;
  return 1;
}

export function sortModsRecommendedFirst<T extends { id: number; type: "prefix" | "suffix"; text_ko: string; tablet_type_id: number | null }>(
  mods: T[],
  filter: TabletFilter,
): T[] {
  return [...mods].sort((a, b) => {
    const refA = { slot: a.type, id: a.id } as ModRef;
    const refB = { slot: b.type, id: b.id } as ModRef;
    const tierA = modSortTier(filter, refA, a);
    const tierB = modSortTier(filter, refB, b);
    if (tierA !== tierB) return tierA - tierB;
    return a.text_ko.localeCompare(b.text_ko, "ko");
  });
}

export function sortSelectedRecommendedFirst(filter: TabletFilter, refs: ModRef[]): ModRef[] {
  return [...refs].sort((a, b) => {
    const modA = getModByRef(a);
    const modB = getModByRef(b);
    const tierA = modSortTier(filter, a, modA);
    const tierB = modSortTier(filter, b, modB);
    if (tierA !== tierB) return tierA - tierB;
    return (modA?.text_ko ?? "").localeCompare(modB?.text_ko ?? "", "ko");
  });
}

export function modLabelsFromRefs(refs: ModRef[]): string[] {
  return refs
    .map((ref) => getModByRef(ref)?.text_ko)
    .filter((text): text is string => Boolean(text));
}

/** 추천 옵션만 `|` OR — 서판 종류 패턴 포함 */
export function regexFromRecommended(tabletTypeId: number, refs: ModRef[]): string {
  const type = tabletTypes.find((item) => item.id === tabletTypeId);
  const seen = new Set<string>();
  const patterns: string[] = [];
  if (type?.pattern_ko) patterns.push(type.pattern_ko);
  for (const ref of refs) {
    const pattern = getModByRef(ref)?.pattern_ko;
    if (!pattern || seen.has(pattern)) continue;
    seen.add(pattern);
    patterns.push(pattern);
  }
  return joinPatterns(patterns, "or");
}

export function sellQtyRegex(): string {
  return joinPatterns(["아.*량", "템.수"], "or");
}
