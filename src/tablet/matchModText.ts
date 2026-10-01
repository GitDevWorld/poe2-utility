import { getModByRef, modRefKey, prefixOptions, suffixOptions, type ModRef } from "./data";
import type { TabletMod } from "./types";

const allMods = [...prefixOptions, ...suffixOptions];

/** colding catalog `text` ↔ poe2way `text_ko` */
export function normalizeTabletModText(text: string): string {
  return text
    .replace(/#\s*%/g, "%")
    .replace(/\(\d+[–—\-]\d+\)\s*%/g, "%")
    .replace(/\(\d+—\d+\)\s*%/g, "%")
    .replace(/#\s*개/g, "개")
    .replace(/\s+/g, "")
    .replace(/[–—]/g, "-");
}

const byNorm = new Map<string, TabletMod>();
for (const mod of allMods) {
  byNorm.set(normalizeTabletModText(mod.text_ko), mod);
}

export function findModByCatalogText(text: string): TabletMod | undefined {
  const exact = byNorm.get(normalizeTabletModText(text));
  if (exact) return exact;
  const norm = normalizeTabletModText(text);
  return allMods.find((mod) => normalizeTabletModText(mod.text_ko) === norm);
}

export function catalogTextToRef(text: string, affix: "prefix" | "suffix"): ModRef | undefined {
  const mod = findModByCatalogText(text);
  if (!mod || mod.type !== affix) return undefined;
  return { slot: mod.type, id: mod.id };
}

export function refKeyFromCatalog(text: string, affix: "prefix" | "suffix"): string | undefined {
  const ref = catalogTextToRef(text, affix);
  return ref ? modRefKey(ref) : undefined;
}

export function getModByRefSafe(ref: ModRef): TabletMod | undefined {
  return getModByRef(ref);
}
