import { useMemo, useState } from "react";
import { ControlGroup, SearchOutputs } from "../components/SearchOutputs";
import { useTradeLeague } from "../tablet/useTradeLeague";
import { atLeast } from "./numberRegex";
import raw from "./waystoneData.json";

type WaystoneMod = {
  id: number;
  type: "prefix" | "suffix";
  text_ko: string;
  extras: string[];
  pattern_ko: string;
  stat: string | null;
};

const allMods = [...raw.prefixOptions, ...raw.suffixOptions] as WaystoneMod[];
const TIERS = raw.tiers;
const DEFAULT_TIER = 15;

/**
 * 경로석 상단 수치 속성 — 아이템에는 "아이템 희귀도: +27%" 처럼 보인다.
 * regex: 다른 줄과 겹치지 않는 앞부분 (콜론이 있어 옵션 문구 "…희귀도 14% 증폭"과 구분된다)
 * filter: 경매장 엔드게임 필터 id
 */
const STATS = [
  { key: "iir", label: "아이템 희귀도", regex: "템 희귀도: \\+", filter: "map_iir" },
  { key: "pack", label: "무리 규모", regex: "규모: \\+", filter: "map_packsize" },
  { key: "rare", label: "몬스터 희귀도", regex: "터 희귀도: \\+", filter: "map_rare_monsters" },
  { key: "eff", label: "몬스터 효율", regex: "효율: \\+", filter: "map_magic_monsters" },
  { key: "drop", label: "경로석 출현 확률", regex: "현 확률: \\+", filter: "map_bonus" },
] as const;

type StatKey = (typeof STATS)[number]["key"];
type Mins = Partial<Record<StatKey, number>>;

function NumberField({ label, value, onChange, suffix }: { label: string; value?: number; onChange: (v?: number) => void; suffix: string }) {
  return (
    <label className="ws-field">
      <span>{label}</span>
      <span className="ws-field-input">
        <input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="—"
          value={value ?? ""}
          onChange={(event) => {
            const v = event.target.value;
            onChange(v === "" ? undefined : Math.max(0, Math.floor(Number(v))));
          }}
        />
        <em>{suffix}</em>
      </span>
    </label>
  );
}

export function WaystonePage() {
  const league = useTradeLeague();
  const [tier, setTier] = useState<number | null>(DEFAULT_TIER);
  const [mins, setMins] = useState<Mins>({});
  const [minMods, setMinMods] = useState<number | undefined>();
  const [excluded, setExcluded] = useState<number[]>([]);
  const [query, setQuery] = useState("");

  const regex = useMemo(() => {
    const blocks: string[] = [];
    const exclude = [...new Set(excluded.map((id) => allMods.find((m) => m.id === id)?.pattern_ko).filter(Boolean))];
    if (exclude.length) blocks.push(`"!${exclude.join("|")}"`);
    if (tier != null) blocks.push(`"\\(${tier}등"`);
    for (const stat of STATS) {
      const min = mins[stat.key];
      if (min != null && min > 0) blocks.push(`"${stat.regex}${atLeast(min)}%"`);
    }
    return blocks.join(" ");
  }, [excluded, tier, mins]);

  const tradeQuery = useMemo(() => {
    const mapFilters: Record<string, unknown> = {};
    if (tier != null) mapFilters.map_tier = { min: tier, max: tier };
    for (const stat of STATS) {
      const min = mins[stat.key];
      if (min != null && min > 0) mapFilters[stat.filter] = { min };
    }
    const stats: unknown[] = [];
    if (minMods != null && minMods > 0) {
      stats.push({ type: "and", filters: [{ id: "pseudo.pseudo_number_of_affix_mods", value: { min: minMods } }] });
    }
    const notIds = [...new Set(excluded.map((id) => allMods.find((m) => m.id === id)?.stat).filter(Boolean))];
    if (notIds.length) stats.push({ type: "not", filters: notIds.map((id) => ({ id })) });

    const q: Record<string, unknown> = {
      status: { option: "securable" },
      filters: {
        type_filters: { filters: { category: { option: "map.waystone" } } },
        ...(Object.keys(mapFilters).length ? { map_filters: { filters: mapFilters } } : {}),
      },
    };
    if (stats.length) q.stats = stats;
    return q;
  }, [tier, mins, minMods, excluded]);

  const filtered = (type: "prefix" | "suffix") =>
    allMods.filter((m) => m.type === type && (!query.trim() || m.text_ko.includes(query.trim())));

  const toggle = (id: number) =>
    setExcluded((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));

  const reset = () => {
    setTier(DEFAULT_TIER);
    setMins({});
    setMinMods(undefined);
    setExcluded([]);
  };

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Path of Exile 2 · 창고 검색 · 경매장</p>
          <h1>경로석</h1>
        </div>
      </header>

      <section className="table-wrap tablet-builder">
        <SearchOutputs
          regex={regex}
          tradeQuery={tradeQuery}
          league={league}
          note={
            minMods != null && minMods > 0 ? (
              <span>속성 부여 개수는 아이템 문구로 셀 수 없어 경매장 필터에만 들어갑니다.</span>
            ) : null
          }
        />

        <div className="ctrl-panel">
          <ControlGroup label="등급" className="wide">
            <select
              className="ctrl-select"
              value={tier ?? ""}
              onChange={(event) => setTier(event.target.value === "" ? null : Number(event.target.value))}
            >
              <option value="">전체</option>
              {TIERS.map((t) => (
                <option key={t} value={t}>
                  {t}등급
                </option>
              ))}
            </select>
            <button type="button" className="btn" onClick={reset}>
              초기화
            </button>
          </ControlGroup>
          <ControlGroup label="상단 수치 · 최소값" className="wide">
            <div className="ws-fields">
              {STATS.map((stat) => (
                <NumberField
                  key={stat.key}
                  label={stat.label}
                  suffix="%↑"
                  value={mins[stat.key]}
                  onChange={(v) => setMins((prev) => ({ ...prev, [stat.key]: v }))}
                />
              ))}
              <NumberField label="속성 부여 개수" suffix="개↑" value={minMods} onChange={setMinMods} />
            </div>
          </ControlGroup>
        </div>

        <div className="ws-section">
          <div className="opt-bar">
            <h3>
              제외할 옵션 <small>{excluded.length ? `${excluded.length}개 선택` : "선택 사항"}</small>
            </h3>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="옵션 검색"
              className="opt-search"
            />
          </div>
          <div className="tablet-two-cols">
            {(["prefix", "suffix"] as const).map((type) => (
              <div key={type} className="tablet-col">
                <h4>{type === "prefix" ? "접두" : "접미"}</h4>
                <ul className="ws-mod-list">
                  {filtered(type).map((mod) => {
                    const on = excluded.includes(mod.id);
                    return (
                      <li key={mod.id}>
                        <button
                          type="button"
                          className={`ws-mod${on ? " on" : ""}`}
                          title={mod.extras.join(" · ")}
                          onClick={() => toggle(mod.id)}
                        >
                          <span className="ws-check" aria-hidden>
                            {on ? "✕" : ""}
                          </span>
                          {mod.text_ko}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
