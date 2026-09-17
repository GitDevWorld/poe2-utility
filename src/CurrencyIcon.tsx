import { iconUrl } from "./format";
import type { MarketRow } from "./types";

export function CurrencyIcon({ row, size = 28 }: { row?: MarketRow; size?: number }) {
  if (!row) return <span className="icon-fallback" style={{ width: size, height: size }} />;
  return (
    <img
      className="currency-icon"
      src={iconUrl(row.image)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
    />
  );
}
