import type { CombineMode } from "./types";

export const REGEX_CHAR_LIMIT = 50;

export function joinPatterns(patterns: string[], mode: CombineMode): string {
  const parts = patterns.map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return "";
  if (parts.length === 1) return parts[0];
  return mode === "or" ? parts.join("|") : parts.join(" ");
}

export function buildTabletRegex(input: {
  typePattern?: string;
  modPatterns: string[];
  includeType: boolean;
  combineMode: CombineMode;
}): string {
  const mods = joinPatterns(input.modPatterns, input.combineMode);
  if (!input.includeType || !input.typePattern) return mods;
  if (!mods) return input.typePattern;
  return input.combineMode === "or" ? `${input.typePattern}|${mods}` : `${input.typePattern} ${mods}`;
}

export function regexStatus(text: string): { length: number; overLimit: boolean; empty: boolean } {
  const length = [...text].length;
  return { length, overLimit: length > REGEX_CHAR_LIMIT, empty: !text.trim() };
}
