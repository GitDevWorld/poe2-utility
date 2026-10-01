import { joinPatterns, REGEX_CHAR_LIMIT } from "./buildRegex";

/** PoE2 창고 Ctrl+F: `"!exclude" "include"` — 두 블록 모두 만족할 때만 하이라이트 */
export function buildStashSearchQuery(includePatterns: string[], excludePatterns: string[]): {
  query: string;
  includeBlock: string;
  excludeBlock: string;
  length: number;
  overLimit: boolean;
} {
  const includeBlock = joinPatterns(includePatterns, "or");
  const excludeBlock = joinPatterns(excludePatterns, "or");

  let query = "";
  if (includeBlock && excludeBlock) {
    query = `"!${excludeBlock}" "${includeBlock}"`;
  } else if (includeBlock) {
    query = `"${includeBlock}"`;
  } else if (excludeBlock) {
    query = `"!${excludeBlock}"`;
  }

  const length = [...query].length;
  return {
    query,
    includeBlock,
    excludeBlock,
    length,
    overLimit: length > REGEX_CHAR_LIMIT,
  };
}
