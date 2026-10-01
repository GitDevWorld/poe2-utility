import raw from "./tabletData.json";
import type { TabletMod, TabletType } from "./types";

export const tabletTypes = raw.tabletTypes as TabletType[];
export const prefixOptions = raw.prefixOptions as TabletMod[];
export const suffixOptions = raw.suffixOptions as TabletMod[];

export type ModSlot = "prefix" | "suffix";

export type ModRef = { slot: ModSlot; id: number };

export function modRefKey(ref: ModRef): string {
  return `${ref.slot}:${ref.id}`;
}

export function getModByRef(ref: ModRef): TabletMod | undefined {
  const list = ref.slot === "prefix" ? prefixOptions : suffixOptions;
  return list.find((item) => item.id === ref.id);
}

export function suffixesForTabletType(tabletTypeId: number | null): TabletMod[] {
  if (tabletTypeId == null) return [];
  return suffixOptions.filter((item) => item.tablet_type_id === tabletTypeId);
}

export function suffixesForFilter(filter: number | "all"): TabletMod[] {
  if (filter === "all") return [...suffixOptions];
  return suffixesForTabletType(filter);
}

export function tabletTypeName(tabletTypeId: number | null | undefined): string {
  if (tabletTypeId == null) return "";
  return tabletTypes.find((item) => item.id === tabletTypeId)?.name_ko ?? "";
}

export function filterModsByQuery(mods: TabletMod[], query: string): TabletMod[] {
  const q = query.trim().toLowerCase();
  if (!q) return mods;
  return mods.filter(
    (item) =>
      item.text_ko.toLowerCase().includes(q) ||
      item.pattern_ko.toLowerCase().includes(q),
  );
}
