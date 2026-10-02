import { joinPatterns, REGEX_CHAR_LIMIT } from "./buildRegex";

/**
 * PoE2 창고 Ctrl+F: 따옴표 블록끼리는 AND, 블록 안의 `|`는 OR.
 * `"!제외1|제외2" "옵션1" "옵션2"` — 제외 옵션이 하나도 없고 선택 옵션이 모두 있는 서판만 하이라이트.
 */
export function buildStashSearchQuery(includePatterns: string[], excludePatterns: string[]): {
  query: string;
  length: number;
  overLimit: boolean;
} {
  const blocks: string[] = [];
  const excludeBlock = joinPatterns(excludePatterns, "or");
  if (excludeBlock) blocks.push(`"!${excludeBlock}"`);
  for (const pattern of new Set(includePatterns.map((part) => part.trim()).filter(Boolean))) {
    blocks.push(`"${pattern}"`);
  }

  const query = blocks.join(" ");
  const length = [...query].length;
  return {
    query,
    length,
    overLimit: length > REGEX_CHAR_LIMIT,
  };
}
