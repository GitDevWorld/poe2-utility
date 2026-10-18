import { useMemo, useState } from "react";
import { iconUrl } from "../format";
import { evaluate, parseRules, type Sample } from "./evaluate";
import {
  ALL_RARITY,
  CORRUPTION_LABEL,
  GEAR_CLASSES,
  GEAR_GROUPS,
  GEAR_PRESETS,
  gearRuleMatches,
  gearRuleSummary,
  newGearRule,
  RARITY_LABEL,
  type Corruption,
  type GearRarity,
  type GearRule,
} from "./gearRules";
import {
  SOUNDS,
  TIERS,
  tierById,
  type TierId,
  type TierSetting,
} from "./tiers";

const classById = new Map(GEAR_CLASSES.map((c) => [c.id, c]));
const baseInfo = new Map(
  GEAR_CLASSES.flatMap((c) =>
    c.bases.map((b) => [b.en, { ...b, cls: c.id }] as const),
  ),
);

/** 숫자 칸: 비우면 "상관없음" */
function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value?: number;
  min: number;
  max: number;
  onChange: (value?: number) => void;
}) {
  return (
    <label className="gr-num">
      <span>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value ?? ""}
        placeholder="상관없음"
        onChange={(event) => {
          const n = Number(event.target.value);
          onChange(
            event.target.value === "" || Number.isNaN(n) || n <= 0
              ? undefined
              : Math.min(max, n),
          );
        }}
      />
      <span className="gr-num-unit">이상</span>
    </label>
  );
}

function TierSelect({
  value,
  onChange,
  label,
}: {
  value: TierId;
  onChange: (tier: TierId) => void;
  label: string;
}) {
  const tier = tierById(value);
  return (
    <select
      className="gr-tier"
      aria-label={label}
      value={value}
      style={{ background: tier.color }}
      onChange={(event) => onChange(event.target.value as TierId)}
    >
      {TIERS.map((t) => (
        <option key={t.id} value={t.id}>
          {t.id === "hidden" ? "숨김" : `티어 ${t.label}`}
        </option>
      ))}
    </select>
  );
}

function BasePicker({
  rule,
  onChange,
}: {
  rule: GearRule;
  onChange: (bases: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const pool = (
    rule.classes.length ? rule.classes : GEAR_CLASSES.map((c) => c.id)
  ).flatMap((id) => classById.get(id)?.bases ?? []);
  const q = query.trim().toLowerCase();
  // 클래스를 고르지 않았으면 검색어가 있을 때만 후보를 보여 준다 (전체 베이스는 너무 많다).
  const candidates =
    rule.classes.length || q
      ? pool.filter(
          (b) =>
            !rule.bases.includes(b.en) &&
            (!q ||
              b.ko.toLowerCase().includes(q) ||
              b.en.toLowerCase().includes(q)),
        )
      : [];
  return (
    <div className="gr-bases">
      {rule.bases.length > 0 && (
        <ul className="gr-base-chosen">
          {rule.bases.map((en) => {
            const b = baseInfo.get(en);
            return (
              <li key={en}>
                <button
                  type="button"
                  className="gr-base on"
                  onClick={() => onChange(rule.bases.filter((x) => x !== en))}
                >
                  {b?.icon && (
                    <img
                      src={iconUrl(b.icon)}
                      alt=""
                      width={22}
                      height={22}
                      loading="lazy"
                    />
                  )}
                  {b?.ko ?? en}
                  <span aria-hidden>×</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <input
        type="search"
        className="tm-search gr-base-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={
          rule.classes.length
            ? "베이스 이름으로 좁히기"
            : "베이스 검색 (한글·영문)"
        }
        aria-label="베이스 검색"
      />
      {candidates.length > 0 && (
        <ul className="gr-base-list">
          {candidates.slice(0, 60).map((b) => (
            <li key={b.en}>
              <button
                type="button"
                className="gr-base"
                title={b.en}
                onClick={() => onChange([...rule.bases, b.en])}
              >
                {b.icon && (
                  <img
                    src={iconUrl(b.icon)}
                    alt=""
                    width={22}
                    height={22}
                    loading="lazy"
                  />
                )}
                {b.ko}
                {b.level ? (
                  <span className="gr-base-lv">Lv{b.level}</span>
                ) : null}
              </button>
            </li>
          ))}
          {candidates.length > 60 && (
            <li className="gr-more">
              외 {candidates.length - 60}개 · 검색어로 좁혀 주세요
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function RuleBody({
  rule,
  onChange,
}: {
  rule: GearRule;
  onChange: (patch: Partial<GearRule>) => void;
}) {
  const toggleClasses = (list: string[]) => {
    const all = list.every((c) => rule.classes.includes(c));
    onChange({
      classes: all
        ? rule.classes.filter((c) => !list.includes(c))
        : [...new Set([...rule.classes, ...list])],
    });
  };
  return (
    <div className="gr-body">
      <div className="gr-field">
        <span className="gr-key">대상</span>
        <div className="gr-val">
          <div className="chip-row">
            <button
              type="button"
              className={`chip small ${rule.classes.length ? "" : "active"}`}
              onClick={() => onChange({ classes: [], bases: [] })}
            >
              모든 장비
            </button>
            {GEAR_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                className={`chip small ${g.classes.every((c) => rule.classes.includes(c)) ? "active" : ""}`}
                onClick={() => toggleClasses(g.classes)}
              >
                {g.label} 전부
              </button>
            ))}
          </div>
          {GEAR_GROUPS.map((g) => (
            <div key={g.id} className="chip-row gr-classes">
              <span className="gr-group">{g.label}</span>
              {g.classes.map((id) => {
                const c = classById.get(id);
                if (!c) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`chip small ${rule.classes.includes(id) ? "active" : ""}`}
                    onClick={() => toggleClasses([id])}
                  >
                    {c.icon && (
                      <img
                        src={iconUrl(c.icon)}
                        alt=""
                        width={18}
                        height={18}
                      />
                    )}
                    {c.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="gr-field">
        <span className="gr-key">희귀도</span>
        <div className="gr-val chip-row">
          {ALL_RARITY.map((r: GearRarity) => (
            <button
              key={r}
              type="button"
              className={`chip small rarity-${r.toLowerCase()} ${rule.rarity.includes(r) ? "active" : ""}`}
              onClick={() => {
                const next = rule.rarity.includes(r)
                  ? rule.rarity.filter((x) => x !== r)
                  : [...rule.rarity, r];
                if (next.length)
                  onChange({
                    rarity: ALL_RARITY.filter((x) => next.includes(x)),
                  });
              }}
            >
              {RARITY_LABEL[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="gr-field">
        <span className="gr-key">레벨</span>
        <div className="gr-val gr-nums">
          <NumberField
            label="아이템 레벨"
            value={rule.itemLevel}
            min={1}
            max={100}
            onChange={(v) => onChange({ itemLevel: v })}
          />
          <NumberField
            label="베이스 레벨(렙제)"
            value={rule.dropLevel}
            min={1}
            max={100}
            onChange={(v) => onChange({ dropLevel: v })}
          />
          <label className="gr-num">
            <span>미확인 등급</span>
            <select
              value={rule.unidTier ?? ""}
              onChange={(event) =>
                onChange({
                  unidTier: event.target.value
                    ? Number(event.target.value)
                    : undefined,
                })
              }
            >
              <option value="">상관없음</option>
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}등급 이상
                </option>
              ))}
              <option value={5}>5등급</option>
            </select>
          </label>
        </div>
      </div>

      <div className="gr-field">
        <span className="gr-key">특출난</span>
        <div className="gr-val gr-nums">
          <label className="tm-check gr-ex">
            <input
              type="checkbox"
              checked={Boolean(rule.exceptional)}
              onChange={(event) =>
                onChange({ exceptional: event.target.checked || undefined })
              }
            />
            특출난만 (품질 21+ 또는 소켓이 보통보다 많음)
          </label>
          <NumberField
            label="품질"
            value={rule.quality}
            min={1}
            max={30}
            onChange={(v) => onChange({ quality: v })}
          />
          <NumberField
            label="소켓"
            value={rule.sockets}
            min={1}
            max={6}
            onChange={(v) => onChange({ sockets: v })}
          />
        </div>
      </div>

      <div className="gr-field">
        <span className="gr-key">타락</span>
        <div className="gr-val chip-row">
          {(Object.keys(CORRUPTION_LABEL) as Corruption[]).map((c) => (
            <button
              key={c}
              type="button"
              className={`chip small ${rule.corruption === c ? "active" : ""}`}
              onClick={() => onChange({ corruption: c })}
            >
              {CORRUPTION_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="gr-field">
        <span className="gr-key">베이스</span>
        <div className="gr-val">
          <p className="gr-hint">
            비워 두면 고른 대상의 모든 베이스. 특정 베이스만 잡으려면 골라
            주세요.
          </p>
          <BasePicker rule={rule} onChange={(bases) => onChange({ bases })} />
        </div>
      </div>
    </div>
  );
}

/** 예시 아이템 하나가 어느 규칙에 걸리는지 바로 확인 */
function Tester({ rules, baseText }: { rules: GearRule[]; baseText: string }) {
  const baseRules = useMemo(() => parseRules(baseText), [baseText]);
  const [cls, setCls] = useState("Gloves");
  const [base, setBase] = useState("");
  const [rarity, setRarity] = useState<GearRarity>("Rare");
  const [itemLevel, setItemLevel] = useState(82);
  const [unidTier, setUnidTier] = useState(0);
  const [quality, setQuality] = useState(0);
  const [sockets, setSockets] = useState(0);
  const [corruption, setCorruption] = useState<Corruption>("no");

  const bases = classById.get(cls)?.bases ?? [];
  const b = bases.find((x) => x.en === base) ?? bases[0];
  const sample: Sample = {
    Class: cls,
    BaseType: b?.en ?? "",
    DropLevel: b?.level || 1,
    Rarity: rarity,
    ItemLevel: itemLevel,
    UnidentifiedItemTier: unidTier,
    Quality: quality,
    Sockets: sockets,
    Corrupted: corruption === "yes" || corruption === "twice",
    TwiceCorrupted: corruption === "twice",
  };
  const index = rules.findIndex((r) => gearRuleMatches(r, sample));
  const hit = index >= 0 ? rules[index] : undefined;
  const fallback = hit ? undefined : evaluate(baseRules, sample);

  return (
    <div className="gr-tester">
      <strong>확인해 보기</strong>
      <div className="gr-tester-row">
        <select
          aria-label="클래스"
          value={cls}
          onChange={(event) => {
            setCls(event.target.value);
            setBase("");
          }}
        >
          {GEAR_CLASSES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          aria-label="베이스"
          value={b?.en ?? ""}
          onChange={(event) => setBase(event.target.value)}
        >
          {bases.map((x) => (
            <option key={x.en} value={x.en}>
              {x.ko}
              {x.level ? ` (Lv${x.level})` : ""}
            </option>
          ))}
        </select>
        <select
          aria-label="희귀도"
          value={rarity}
          onChange={(event) => setRarity(event.target.value as GearRarity)}
        >
          {ALL_RARITY.map((r) => (
            <option key={r} value={r}>
              {RARITY_LABEL[r]}
            </option>
          ))}
        </select>
        <label className="gr-num">
          <span>아이템 레벨</span>
          <input
            type="number"
            min={1}
            max={100}
            value={itemLevel}
            onChange={(e) => setItemLevel(Number(e.target.value) || 1)}
          />
        </label>
        <label className="gr-num">
          <span>미확인 등급</span>
          <select
            value={unidTier}
            onChange={(e) => setUnidTier(Number(e.target.value))}
          >
            <option value={0}>없음</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}등급
              </option>
            ))}
          </select>
        </label>
        <label className="gr-num">
          <span>품질</span>
          <input
            type="number"
            min={0}
            max={30}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value) || 0)}
          />
        </label>
        <label className="gr-num">
          <span>소켓</span>
          <input
            type="number"
            min={0}
            max={6}
            value={sockets}
            onChange={(e) => setSockets(Number(e.target.value) || 0)}
          />
        </label>
        <select
          aria-label="타락"
          value={corruption}
          onChange={(event) => setCorruption(event.target.value as Corruption)}
        >
          <option value="no">타락 안 됨</option>
          <option value="yes">타락됨</option>
          <option value="twice">이중 타락</option>
        </select>
      </div>
      <p className="gr-result">
        →{" "}
        {hit ? (
          <>
            <span
              className="gr-result-tier"
              style={{ background: tierById(hit.tier).color }}
            >
              {hit.tier === "hidden"
                ? "숨김"
                : `티어 ${tierById(hit.tier).label}`}
            </span>{" "}
            규칙 {index + 1}: {gearRuleSummary(hit)}
          </>
        ) : (
          <>
            규칙에 안 걸림 · 기본값 필터대로{" "}
            <strong>
              {fallback?.show
                ? `표시${fallback.sound ? ` (소리 ${fallback.sound})` : ""}`
                : "숨김"}
            </strong>
          </>
        )}
      </p>
    </div>
  );
}

export function GearRuleEditor({
  rules,
  onChange,
  settings,
  onSettings,
  baseText,
}: {
  rules: GearRule[];
  onChange: (rules: GearRule[]) => void;
  settings: Record<TierId, TierSetting>;
  onSettings: (tier: TierId, setting: TierSetting) => void;
  baseText: string;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const update = (id: string, patch: Partial<GearRule>) =>
    onChange(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const move = (index: number, delta: number) => {
    const next = [...rules];
    const [rule] = next.splice(index, 1);
    next.splice(index + delta, 0, rule);
    onChange(next);
  };
  const add = (partial: Partial<GearRule> = {}) => {
    const rule = newGearRule(partial);
    onChange([...rules, rule]);
    setOpen(rule.id);
  };

  return (
    <div className="gr">
      <p className="fg-help">
        장비·장신구·주얼·플라스크는 조건으로 정합니다. 규칙 하나는 적힌 조건을{" "}
        <strong>모두 만족</strong>하는 아이템을 고른 티어로 보내고,{" "}
        <strong>위에 있는 규칙이 먼저</strong> 걸립니다. 예를 들어 "아이템 레벨
        82+ · 특출난 → B" 아래에 "일반·마법 → 숨김"을 두면 82레벨 이상 특출난
        장비만 보이고 나머지 일반·마법 장비는 숨겨집니다. 어느 규칙에도 안 걸린
        장비는 기본값 필터대로 나옵니다. 고유 장비는 "고유" 탭에서 정합니다.
      </p>

      <div className="gr-tiers" aria-label="티어 소리·표시">
        {TIERS.filter((t) => t.id !== "hidden").map((t) => {
          const setting = settings[t.id];
          return (
            <div
              key={t.id}
              className={`gr-tierset${setting.show ? "" : " off"}`}
            >
              <span className="gr-tierset-name" style={{ background: t.color }}>
                {t.label}
              </span>
              <select
                className="tm-sound"
                aria-label={`${t.label} 티어 소리`}
                value={setting.sound}
                disabled={!setting.show}
                onChange={(event) =>
                  onSettings(t.id, { ...setting, sound: event.target.value })
                }
              >
                {SOUNDS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value="none">소리 없음</option>
              </select>
              <button
                type="button"
                role="switch"
                aria-checked={setting.show}
                aria-label={`${t.label} 티어 ${setting.show ? "표시" : "숨김"}`}
                className={`fg-switch${setting.show ? " on" : ""}`}
                onClick={() =>
                  onSettings(t.id, { ...setting, show: !setting.show })
                }
              >
                <span />
              </button>
            </div>
          );
        })}
      </div>

      <ol className="gr-list">
        {rules.map((rule, index) => {
          const isOpen = open === rule.id;
          return (
            <li
              key={rule.id}
              className={`gr-rule${rule.enabled ? "" : " off"}${isOpen ? " open" : ""}`}
            >
              <div className="gr-head">
                <span className="gr-index">{index + 1}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={rule.enabled}
                  aria-label={`규칙 ${index + 1} ${rule.enabled ? "켜짐" : "꺼짐"}`}
                  className={`fg-switch${rule.enabled ? " on" : ""}`}
                  onClick={() => update(rule.id, { enabled: !rule.enabled })}
                >
                  <span />
                </button>
                <button
                  type="button"
                  className="gr-summary"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : rule.id)}
                  title="눌러서 조건 고치기"
                >
                  {gearRuleSummary(rule)}
                  <span className="gr-edit">
                    {isOpen ? "접기" : "조건 고치기"}
                  </span>
                </button>
                <span className="gr-arrow" aria-hidden>
                  →
                </span>
                <TierSelect
                  value={rule.tier}
                  label={`규칙 ${index + 1} 티어`}
                  onChange={(tier) => update(rule.id, { tier })}
                />
                <div className="gr-btns">
                  <button
                    type="button"
                    className="btn"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                    aria-label="위로"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="btn"
                    disabled={index === rules.length - 1}
                    onClick={() => move(index, 1)}
                    aria-label="아래로"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const { id: _id, ...rest } = rule;
                      const copy = newGearRule(rest);
                      onChange([
                        ...rules.slice(0, index + 1),
                        copy,
                        ...rules.slice(index + 1),
                      ]);
                      setOpen(copy.id);
                    }}
                  >
                    복제
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() =>
                      onChange(rules.filter((r) => r.id !== rule.id))
                    }
                  >
                    삭제
                  </button>
                </div>
              </div>
              {isOpen && (
                <RuleBody
                  rule={rule}
                  onChange={(patch) => update(rule.id, patch)}
                />
              )}
            </li>
          );
        })}
        <li className="gr-rule gr-rest">
          <div className="gr-head">
            <span className="gr-index">끝</span>
            <span className="gr-summary static">위 규칙에 안 걸린 장비</span>
            <span className="gr-arrow" aria-hidden>
              →
            </span>
            <span className="gr-rest-label">기본값 필터대로</span>
          </div>
        </li>
      </ol>

      <div className="gr-add">
        <button type="button" className="btn btn-primary" onClick={() => add()}>
          + 새 규칙
        </button>
        <span className="tm-variant-title">예시로 추가</span>
        {GEAR_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="chip small"
            onClick={() => add(p.rule)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <Tester rules={rules} baseText={baseText} />
    </div>
  );
}
