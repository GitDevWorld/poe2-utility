import { joinPatterns, REGEX_CHAR_LIMIT } from "./buildRegex";

/**
 * PoE2 창고 Ctrl+F: 따옴표 블록끼리는 AND, 블록 안의 `|`는 OR.
 * `"!제외1|제외2" "종류" "옵션1|옵션2"` — 제외 옵션이 하나도 없고(종류가 맞고) 선택 옵션 중 하나라도 있는 서판을 하이라이트.
 */
export function buildStashSearchQuery(
  includePatterns: string[],
  excludePatterns: string[],
  typePattern?: string,
): {
  query: string;
  length: number;
  overLimit: boolean;
} {
  const blocks: string[] = [];
  const excludeBlock = joinPatterns(excludePatterns, "or");
  if (excludeBlock) blocks.push(`"!${excludeBlock}"`);
  if (typePattern?.trim()) blocks.push(`"${typePattern.trim()}"`);
  const includeBlock = joinPatterns([...new Set(includePatterns)], "or");
  if (includeBlock) blocks.push(`"${includeBlock}"`);

  const query = blocks.join(" ");
  const length = [...query].length;
  return {
    query,
    length,
    overLimit: length > REGEX_CHAR_LIMIT,
  };
}
