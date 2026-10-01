import tradeMap from "./tabletTradeMap.json";
import { modRefKey, type ModRef } from "./data";

const statByRef = tradeMap.tradeStatByRef as Record<string, string>;

export function tradeStatIdForRef(ref: ModRef): string | undefined {
  return statByRef[modRefKey(ref)];
}

export function hasTradeStatForRef(ref: ModRef): boolean {
  return Boolean(tradeStatIdForRef(ref));
}
