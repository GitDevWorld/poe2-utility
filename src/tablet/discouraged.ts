import { modRefKey, type ModRef } from "./data";

/**
 * 판매·파밍 가치가 거의 없거나 역효율로 분류되는 옵션.
 * 클릭 시 「찾기」가 아니라 「제외(`!`)」 목록에 들어갑니다.
 */
export const DISCOURAGED_MOD_REFS: ModRef[] = [
  { slot: "prefix", id: 71 },
  { slot: "prefix", id: 6 },
  { slot: "prefix", id: 5 },
  { slot: "suffix", id: 23 },
  { slot: "suffix", id: 24 },
  { slot: "suffix", id: 45 },
  { slot: "suffix", id: 61 },
  { slot: "suffix", id: 18 },
  { slot: "suffix", id: 38 },
];

const discouragedKeys = new Set(DISCOURAGED_MOD_REFS.map(modRefKey));

export function isDiscouragedMod(ref: ModRef): boolean {
  return discouragedKeys.has(modRefKey(ref));
}
