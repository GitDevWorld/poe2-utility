import { useEffect, useMemo, useState } from "react";
import { regexStatus, REGEX_CHAR_LIMIT } from "./buildRegex";
import { buildStashSearchQuery } from "./stashSearch";
import {
  filterModsByQuery,
  getModByRef,
  modRefKey,
  prefixOptions,
  suffixesForFilter,
  tabletTypeName,
  tabletTypes,
  type ModRef,
} from "./data";
import type { TabletMod } from "./types";
import type { TabletFilter } from "./recommended";
import {
  formatLowestPrice,
  type ModTradePrices,
} from "./tradeMarket";
import { hasTradeStatForRef } from "./tradeStatMap";
import { TabletTradeSearch } from "./TabletTradeSearch";
import { buildTabletQuery, TABLET_ICONS, tradeSearchUrl } from "./tradeSearch";
import { formatMarketAgo, useTabletMarket } from "./useTabletMarket";

type Props = {
  onCopy: (text: string) => void;
};

type PickMode = "include" | "exclude";

function toggleRef(list: ModRef[], ref: ModRef): ModRef[] {
  const key = modRefKey(ref);
  if (list.some((item) => modRefKey(item) === key)) {
    return list.filter((item) => modRefKey(item) !== key);
  }
  return [...list, ref];
}

function PriceBand({
  label,
  stats,
  searchUrl,
}: {
  label: string;
  stats?: ModTradePrices["magic"];
  searchUrl: string;
}) {
  const hot = stats && stats.lowestEx >= 5;
  return (
    <a
      className={`tablet-mod-price-col ${hot ? "hot" : ""}`}
      href={searchUrl}
      target="_blank"
      rel="noreferrer"
      title={
        stats
          ? `${label} 즉시 구매 최저가 ${stats.lowestEx}ex` +
            (stats.medianEx != null ? ` · 하위 10개 중간값 ${stats.medianEx}ex` : "") +
            (stats.listings != null ? ` · 매물 ${stats.listings >= 10000 ? "10000+" : stats.listings}개` : "")
          : "시세 없음"
      }
    >
      <span className="tablet-mod-price-label">{label}</span>
      {formatLowestPrice(stats)}
      <span className="tablet-mod-price-go" aria-hidden>
        ↗
      </span>
    </a>
  );
}

function ModPicker({
  mods,
  included,
  excluded,
  mode,
  onPick,
  showTypeLabel,
  emptyLabel,
  pricesByRef,
  league,
}: {
  mods: TabletMod[];
  included: ModRef[];
  excluded: ModRef[];
  mode: PickMode;
  onPick: (ref: ModRef) => void;
  showTypeLabel?: boolean;
  emptyLabel?: string;
  pricesByRef?: Record<string, ModTradePrices>;
  league: string;
}) {
  const includedKeys = useMemo(() => new Set(included.map(modRefKey)), [included]);
  const excludedKeys = useMemo(() => new Set(excluded.map(modRefKey)), [excluded]);

  return (
    <div className="tablet-mod-panel">
      {!mods.length ? (
        <p className="tablet-mod-empty">{emptyLabel ?? "없음"}</p>
      ) : (
        <ul className="tablet-mod-list">
          {mods.map((mod) => {
            const ref: ModRef = { slot: mod.type, id: mod.id };
            const key = modRefKey(ref);
            const added = includedKeys.has(key);
            const removed = excludedKeys.has(key);
            const active = mode === "include" ? added : removed;
            const band = pricesByRef?.[key];
            const tradeMapped = hasTradeStatForRef(ref);
            return (
              <li key={`${mode}-${key}`} className="tablet-mod-item">
                <button
                  type="button"
                  className={`tablet-mod-row ${active ? "selected" : ""} ${mode === "exclude" ? "exclude-pick" : ""}`}
                  onClick={() => onPick(ref)}
                >
                  <span className="tablet-mod-row-body">
                    <strong>
                      {added && <span className="tablet-state-badge added">추가됨</span>}
                      {removed && <span className="tablet-state-badge removed">제외됨</span>}
                      {showTypeLabel && mod.tablet_type_id == null && <span className="tablet-mod-type-tag">공통</span>}
                      {showTypeLabel && mod.tablet_type_id != null && (
                        <span className="tablet-mod-type-tag">
                          {TABLET_ICONS[mod.tablet_type_id] && (
                            <img src={TABLET_ICONS[mod.tablet_type_id]} alt="" width={14} height={14} loading="lazy" />
                          )}
                          {tabletTypeName(mod.tablet_type_id)}
                        </span>
                      )}
                      {mod.text_ko}
                    </strong>
                    <small>{mod.pattern_ko}</small>
                  </span>
                </button>
                {pricesByRef != null && (
                  <span className="tablet-mod-prices">
                    {tradeMapped ? (
                      <>
                        <PriceBand
                          label="마법"
                          stats={band?.magic}
                          searchUrl={tradeSearchUrl(league, buildTabletQuery({ refs: [ref], rarity: "magic" }))}
                        />
                        <PriceBand
                          label="희귀"
                          stats={band?.rare}
                          searchUrl={tradeSearchUrl(league, buildTabletQuery({ refs: [ref], rarity: "rare" }))}
                        />
                      </>
                    ) : (
                      <span className="tablet-mod-no-trade" title="경매장 stat 미연동">
                        —
                      </span>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function patternsFromRefs(refs: ModRef[]): string[] {
  const seen = new Set<string>();
  const patterns: string[] = [];
  for (const ref of refs) {
    const pattern = getModByRef(ref)?.pattern_ko;
    if (!pattern || seen.has(pattern)) continue;
    seen.add(pattern);
    patterns.push(pattern);
  }
  return patterns;
}

function ModPickArea({
  addMode,
  prefixMods,
  suffixMods,
  tabletFilter,
  included,
  excluded,
  onPickMod,
  pricesByRef,
  league,
}: {
  addMode: boolean;
  prefixMods: TabletMod[];
  suffixMods: TabletMod[];
  tabletFilter: TabletFilter;
  included: ModRef[];
  excluded: ModRef[];
  onPickMod: (ref: ModRef) => void;
  pricesByRef?: Record<string, ModTradePrices>;
  league: string;
}) {
  const mode: PickMode = addMode ? "include" : "exclude";
  const typeName =
    typeof tabletFilter === "number" ? tabletTypes.find((t) => t.id === tabletFilter)?.name_ko : null;
  const suffixTitle = typeName ? `접미 · ${typeName}` : "접미";

  return (
    <div className="tablet-pick-section">
      <div className="tablet-two-cols">
        <div className="tablet-col">
          <h4>접두</h4>
          <ModPicker
            mods={prefixMods}
            included={included}
            excluded={excluded}
            mode={mode}
            onPick={onPickMod}
            pricesByRef={pricesByRef}
            league={league}
          />
        </div>
        <div className="tablet-col">
          <h4>{suffixTitle}</h4>
          <ModPicker
            mods={suffixMods}
            included={included}
            excluded={excluded}
            mode={mode}
            onPick={onPickMod}
            showTypeLabel={tabletFilter === "all"}
            pricesByRef={pricesByRef}
            league={league}
          />
        </div>
      </div>
    </div>
  );
}

export function TabletRegexBuilder({ onCopy }: Props) {
  const [tabletFilter, setTabletFilter] = useState<TabletFilter>("all");
  const { market, loading: marketLoading, error: marketError, reload: reloadMarket } =
    useTabletMarket(tabletFilter);
  const [includeTypePattern, setIncludeTypePattern] = useState(false);
  const [addMode, setAddMode] = useState(true);
  const [included, setIncluded] = useState<ModRef[]>([]);
  const [excluded, setExcluded] = useState<ModRef[]>([]);
  const [query, setQuery] = useState("");

  const tabletType = typeof tabletFilter === "number" ? tabletTypes.find((item) => item.id === tabletFilter) : undefined;
  const league = market?.league || "Forbidden Rites";

  useEffect(() => {
    if (tabletFilter === "all") {
      setIncludeTypePattern(false);
      return;
    }
    const keepSuffix = (ref: ModRef) => {
      if (ref.slot === "prefix") return true;
      const typeId = getModByRef(ref)?.tablet_type_id;
      return typeId == null || typeId === tabletFilter;
    };
    setIncluded((prev) => prev.filter(keepSuffix));
    setExcluded((prev) => prev.filter(keepSuffix));
  }, [tabletFilter]);

  const sortByPrice = (mods: TabletMod[]) => {
    const prices = market?.prices;
    return [...mods].sort((a, b) => {
      const refA = { slot: a.type, id: a.id } as ModRef;
      const refB = { slot: b.type, id: b.id } as ModRef;
      const mappedA = hasTradeStatForRef(refA);
      const mappedB = hasTradeStatForRef(refB);
      if (mappedA !== mappedB) return mappedA ? -1 : 1;
      if (!prices) return 0;
      const low = (ref: ModRef) => {
        const p = prices[modRefKey(ref)];
        const vals = [p?.magic?.lowestEx, p?.rare?.lowestEx].filter((v): v is number => v != null);
        return vals.length ? Math.max(...vals) : -1;
      };
      return low(refB) - low(refA);
    });
  };

  const prefixFiltered = useMemo(
    () => sortByPrice(filterModsByQuery(prefixOptions, query)),
    [query, market?.prices],
  );

  const suffixFiltered = useMemo(
    () => sortByPrice(filterModsByQuery(suffixesForFilter(tabletFilter), query)),
    [query, tabletFilter, market?.prices],
  );

  const includePatterns = useMemo(() => {
    const patterns = patternsFromRefs(included);
    if (includeTypePattern && tabletType?.pattern_ko && !patterns.includes(tabletType.pattern_ko)) {
      patterns.unshift(tabletType.pattern_ko);
    }
    return patterns;
  }, [included, includeTypePattern, tabletType?.pattern_ko]);

  const excludePatterns = useMemo(() => patternsFromRefs(excluded), [excluded]);

  const search = useMemo(
    () => buildStashSearchQuery(includePatterns, excludePatterns),
    [includePatterns, excludePatterns],
  );

  const status = regexStatus(search.query);

  const pickMod = (ref: ModRef) => {
    if (addMode) {
      setIncluded((prev) => toggleRef(prev, ref));
      setExcluded((prev) => prev.filter((item) => modRefKey(item) !== modRefKey(ref)));
    } else {
      setExcluded((prev) => toggleRef(prev, ref));
      setIncluded((prev) => prev.filter((item) => modRefKey(item) !== modRefKey(ref)));
    }
  };

  const clear = () => {
    setIncluded([]);
    setExcluded([]);
    setIncludeTypePattern(false);
  };

  return (
    <section className="table-wrap tablet-builder">
      <div className="calc-head">
        <h2>정규식 생성기</h2>
      </div>

      <div className="tablet-regex-top">
        <span className="toolbar-label">결과</span>
        <div className="tablet-recipe-regex">
          <code>{search.query || "—"}</code>
        </div>
        <div className={`regex-meta ${status.overLimit ? "over" : ""}`}>
          <span>
            {status.length} / {REGEX_CHAR_LIMIT}자
            {status.overLimit ? " · 초과" : ""}
          </span>
        </div>
        <div className="dps-actions">
          <button
            type="button"
            className="ghost active"
            disabled={!search.query.trim()}
            onClick={() => onCopy(search.query)}
          >
            복사
          </button>
        </div>
      </div>

      <TabletTradeSearch refs={included} tabletTypeId={tabletType?.id} league={league} />

      <div className="tablet-toolbar">
        <div className="tablet-type-row">
          <div className="tablet-type-chips">
            <button
              type="button"
              className={`ghost ${tabletFilter === "all" ? "active" : ""}`}
              onClick={() => setTabletFilter("all")}
            >
              전체
            </button>
            {tabletTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                className={`ghost ${tabletFilter === type.id ? "active" : ""}`}
                onClick={() => setTabletFilter(type.id)}
              >
                {TABLET_ICONS[type.id] && <img src={TABLET_ICONS[type.id]} alt="" width={22} height={22} />}
                {type.name_ko}
              </button>
            ))}
          </div>
        </div>

        <div className="tablet-toolbar-grid">
          <button
            type="button"
            className={`ghost ${includeTypePattern ? "active" : ""}`}
            disabled={tabletFilter === "all"}
            onClick={() => setIncludeTypePattern((v) => !v)}
          >
            종류 패턴{tabletType ? ` ${tabletType.pattern_ko}` : ""}
          </button>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="검색"
            className="tablet-search-input"
          />
          <button
            type="button"
            className="ghost"
            disabled={!included.length && !excluded.length && !includeTypePattern}
            onClick={clear}
          >
            비우기
          </button>
        </div>
        <p className="tablet-market-inline">
          {marketLoading && "경매장 시세 불러오는 중…"}
          {marketError && marketError}
          {market && !marketError && (
            <>
              공식 경매장 즉시 구매 · {market.league} · {formatMarketAgo(market.updatedAt)} 갱신
              {market.progress && market.progress.done < market.progress.total
                ? ` · 수집 중 ${market.progress.done}/${market.progress.total} (모인 것부터 표시)`
                : " · 1시간마다 갱신"}
              {market.emptyHint && !marketLoading ? ` · ${market.emptyHint}` : ""}
              {" · "}
              <span className="tablet-price-legend">마법/희귀 = 즉시 구매 최저가(ex), 누르면 경매장 검색</span>
              <button type="button" className="tablet-market-inline-btn" onClick={() => reloadMarket()}>
                새로고침
              </button>
            </>
          )}
        </p>
      </div>

      <div className="tablet-pick-head">
        <span className="toolbar-label">옵션</span>
        <label className="tablet-mode-switch">
          <span className={addMode ? "" : "on"}>제외</span>
          <input
            type="checkbox"
            className="tablet-mode-switch-input"
            checked={addMode}
            onChange={(event) => setAddMode(event.target.checked)}
          />
          <span className={`tablet-mode-switch-track ${addMode ? "add" : "exclude"}`} aria-hidden />
          <span className={addMode ? "on" : ""}>추가</span>
        </label>
      </div>

      <ModPickArea
        addMode={addMode}
        prefixMods={prefixFiltered}
        suffixMods={suffixFiltered}
        tabletFilter={tabletFilter}
        included={included}
        excluded={excluded}
        onPickMod={pickMod}
        pricesByRef={market?.prices ?? {}}
        league={league}
      />
    </section>
  );
}
