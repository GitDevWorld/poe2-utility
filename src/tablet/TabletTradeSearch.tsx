import { useEffect, useMemo, useState } from "react";
import type { ModRef } from "./data";
import {
  buildTabletQuery,
  encodeFilterCode,
  resolveTabletTypeId,
  TABLET_ICONS,
  tradeSearchUrl,
  type SearchRarity,
} from "./tradeSearch";
import { hasTradeStatForRef } from "./tradeStatMap";

const RARITIES: { id: SearchRarity; label: string }[] = [
  { id: "any", label: "전체" },
  { id: "magic", label: "마법" },
  { id: "rare", label: "희귀" },
];

export function TabletTradeSearch({
  refs,
  tabletTypeId,
  league,
}: {
  refs: ModRef[];
  tabletTypeId?: number;
  league: string;
}) {
  const [rarity, setRarity] = useState<SearchRarity>("any");
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);

  const searchable = useMemo(() => refs.filter(hasTradeStatForRef), [refs]);
  const query = useMemo(
    () => buildTabletQuery({ refs: searchable, tabletTypeId, rarity }),
    [searchable, tabletTypeId, rarity],
  );
  const url = tradeSearchUrl(league, query);
  const typeName = typeof query.type === "string" ? query.type : "전체 서판";
  const typeId = resolveTabletTypeId(searchable, tabletTypeId);

  useEffect(() => {
    let alive = true;
    encodeFilterCode(query)
      .then((value) => alive && setCode(value))
      .catch(() => alive && setCode(""));
    return () => {
      alive = false;
    };
  }, [query]);

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const skipped = refs.length - searchable.length;

  return (
    <section className="tablet-trade-search">
      <div className="tablet-trade-search-head">
        {typeId != null && TABLET_ICONS[typeId] && <img src={TABLET_ICONS[typeId]} alt="" width={36} height={36} />}
        <div>
          <h3>경매장 검색</h3>
          <p className="guide-search-note">
            {typeName} · {searchable.length ? `선택한 옵션 ${searchable.length}개 중 하나 이상` : "옵션 조건 없음"} · 즉시 구매 · 낮은 가격순
            {skipped > 0 ? ` · 경매장 미연동 옵션 ${skipped}개 제외` : ""}
          </p>
        </div>
        <div className="tablet-trade-rarity">
          {RARITIES.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`ghost ${rarity === r.id ? "active" : ""}`}
              onClick={() => setRarity(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <p>경매장에서 다음 검색 필터를 넣으면 됩니다.</p>
      <div className="guide-search-code">
        <code>{code || "…"}</code>
        <button type="button" className="ghost" disabled={!code} onClick={() => void copy()}>
          {copied ? "복사됨" : "필터 복사"}
        </button>
      </div>
      <a className="guide-search-go" href={url} target="_blank" rel="noreferrer">
        필터 적용된 검색 바로 가기 →
      </a>
    </section>
  );
}
