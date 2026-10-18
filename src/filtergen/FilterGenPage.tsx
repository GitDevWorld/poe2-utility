import { Fragment, useEffect, useMemo, useState, type DragEvent } from "react";
import { Segmented } from "../components/SearchOutputs";
import { iconUrl } from "../format";
import {
  EQUIPMENT_TABS,
  exceptionalLabel,
  RARITY_KO,
  TIER_KO,
  type Exceptional,
  type Rarity,
  type RuleDef,
  type TierCond,
} from "./extras";
import {
  buildTierModel,
  generateTierFilter,
  SOUNDS,
  TIERS,
  type TierCategory,
  type TierId,
  type TierItem,
  type TierModel,
  type TierSetting,
} from "./tiers";

type BaseId = "sskim" | "jjm";

const BASES: { id: BaseId; label: string; name: string; file: string }[] = [
  { id: "jjm", label: "정정민 필터", name: "돈만쳐먹는정정민필터", file: "/filters/jjm.filter" },
  { id: "sskim", label: "씹양태 필터", name: "씹양태증증미김성수 렛츠고", file: "/filters/sskim.filter" },
];

/**
 * 설정은 브라우저에 자동 저장한다. 키는 바꾸지 않는다: 아이템 id 가 바뀌어도 모르는 id 는 그냥 무시되므로
 * 지울 필요가 없다. 예전 버전 키에 남은 설정은 처음 한 번 옮겨 온다.
 */
const STORAGE_KEY = "filtergen.tiers";
const OLD_KEYS = ["filtergen.tiers.v4", "filtergen.tiers.v3", "filtergen.tiers.v2", "filtergen.tiers.v1"];
const ALL = "all";

type View = { categoryId: string; subId: string | null; variantId: string | null };
type Saved = {
  baseId: BaseId;
  assign: Record<string, TierId>;
  settings: Partial<Record<TierId, TierSetting>>;
  view?: View;
  /** 장비류 탭별 조건 조합 (없으면 기본 조합) */
  rules?: Record<string, RuleDef[]>;
};

function parseSaved(raw: string | null): Saved | undefined {
  if (!raw) return undefined;
  const data = JSON.parse(raw) as Partial<Saved>;
  if (!data || typeof data !== "object" || typeof data.assign !== "object") return undefined;
  return {
    baseId: data.baseId === "sskim" ? "sskim" : "jjm",
    assign: data.assign ?? {},
    settings: data.settings ?? {},
    view: data.view,
    rules: data.rules,
  };
}

function loadSaved(): Saved | undefined {
  try {
    const current = parseSaved(window.localStorage.getItem(STORAGE_KEY));
    if (current) return current;
    // 예전 키에 남은 배치를 모두 합쳐 옮겨 온다 (최근 키가 우선).
    const old = OLD_KEYS.map((key) => parseSaved(window.localStorage.getItem(key))).filter(Boolean) as Saved[];
    if (!old.length) return undefined;
    return {
      baseId: old[0].baseId,
      assign: Object.assign({}, ...[...old].reverse().map((s) => s.assign)),
      settings: old[0].settings,
    };
  } catch {
    return undefined;
  }
}

function defaultSettings(): Record<TierId, TierSetting> {
  return Object.fromEntries(TIERS.map((t) => [t.id, { sound: t.sound, show: t.id !== "hidden" }])) as Record<
    TierId,
    TierSetting
  >;
}

function ItemTile({
  item,
  selected,
  onSelect,
}: {
  item: TierItem;
  selected: boolean;
  onSelect: (shift: boolean) => void;
}) {
  const onDragStart = (event: DragEvent) => {
    event.dataTransfer.setData("text/plain", item.id);
    event.dataTransfer.effectAllowed = "move";
  };
  const title = [
    item.label,
    item.baseTypes?.length === 1 ? item.baseTypes[0] : "",
    item.level ? `요구 레벨 ${item.level}` : "",
    item.members ? `이 베이스의 고유: ${item.members.join(", ")}` : "",
    item.note ?? "",
  ]
    .filter(Boolean)
    .join("\n");
  return (
    <li>
      <button
        type="button"
        draggable
        onDragStart={onDragStart}
        className={`tm-item${selected ? " selected" : ""}${item.members ? " unique" : ""}`}
        title={title}
        aria-pressed={selected}
        onClick={(event) => onSelect(event.shiftKey)}
      >
        {item.icon ? (
          <img src={iconUrl(item.icon)} alt="" width={36} height={36} loading="lazy" draggable={false} />
        ) : (
          <span className={`tm-item-fallback tone-${item.tone ?? "misc"}`} aria-hidden>
            {(item.label.split(" (")[0].split(" ").pop() ?? item.label).slice(0, 3)}
          </span>
        )}
        {item.level ? <span className="tm-item-level">Lv{item.level}</span> : null}
        <span className="tm-item-name">{item.label}</span>
        {item.members && (
          <span className="tm-item-members">
            {item.members.slice(0, 3).join(" · ")}
            {item.members.length > 3 ? ` 외 ${item.members.length - 3}` : ""}
          </span>
        )}
      </button>
    </li>
  );
}

export function FilterGenPage() {
  const saved = useMemo(loadSaved, []);
  const [baseId, setBaseId] = useState<BaseId>(saved?.baseId ?? "jjm");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [assign, setAssign] = useState<Record<string, TierId>>(saved?.assign ?? {});
  const [settings, setSettings] = useState<Record<TierId, TierSetting>>({ ...defaultSettings(), ...saved?.settings });
  const [categoryId, setCategoryId] = useState(saved?.view?.categoryId ?? ALL);
  const [subId, setSubId] = useState<string | null>(saved?.view?.subId ?? null);
  const [variantId, setVariantId] = useState<string | null>(saved?.view?.variantId ?? null);
  const [saveState, setSaveState] = useState<"saved" | "failed" | null>(null);
  const [rules, setRules] = useState<Record<string, RuleDef[]>>(saved?.rules ?? {});
  const [draft, setDraft] = useState<{ rarity: Rarity[]; tier: TierCond | ""; exceptional: Exceptional | ""; ilvl: boolean }>({
    rarity: ["Rare"],
    tier: "",
    exceptional: "",
    ilvl: false,
  });
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  // 여러 개 선택: 누를 때마다 넣고 빼고, Shift+클릭은 같은 줄의 범위를 고른다.
  const [selected, setSelected] = useState<string[]>([]);
  const [anchor, setAnchor] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TierId | null>(null);
  const [bulkTier, setBulkTier] = useState<TierId>("hidden");

  const base = BASES.find((b) => b.id === baseId) ?? BASES[0];

  useEffect(() => {
    let alive = true;
    setText("");
    setError("");
    fetch(base.file)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      })
      .then((body) => alive && setText(body))
      .catch(() => alive && setError("기준 필터를 불러오지 못했습니다."));
    return () => {
      alive = false;
    };
  }, [base.file]);

  useEffect(() => {
    try {
      const view: View = { categoryId, subId, variantId };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ baseId, assign, settings, view, rules } satisfies Saved));
      setSaveState("saved");
    } catch {
      // 사생활 보호 모드 등에서는 저장이 안 될 수 있다. 화면은 그대로 동작한다.
      setSaveState("failed");
    }
  }, [baseId, assign, settings, categoryId, subId, variantId, rules]);

  const model = useMemo<TierModel | null>(() => (text ? buildTierModel(text, rules) : null), [text, rules]);
  const tierOf = (id: string): TierId => assign[id] ?? model?.defaultOf(id) ?? "hidden";

  const category: TierCategory | undefined =
    categoryId === ALL ? undefined : model?.categories.find((c) => c.id === categoryId);
  const sub = category?.subs ? (category.subs.find((s) => s.id === subId) ?? category.subs[0]) : undefined;
  const variants = sub ? (category?.variants?.[sub.id] ?? []) : [];
  const variant = variants.find((v) => v.id === variantId) ?? variants[0];
  const tabSpec = EQUIPMENT_TABS.find((t) => t.id === categoryId);
  const tabRules = tabSpec ? (rules[tabSpec.id] ?? tabSpec.defaults) : [];

  const addRule = () => {
    if (!tabSpec || !draft.rarity.length) return;
    const rule: RuleDef = {
      id: `c${Date.now().toString(36)}`,
      rarity: tabSpec.rarities.filter((r) => draft.rarity.includes(r)),
      ...(draft.tier ? { tier: draft.tier } : {}),
      ...(draft.exceptional ? { exceptional: draft.exceptional } : {}),
      ...(draft.ilvl ? { ilvl: 82 } : {}),
    };
    const same = tabRules.find(
      (r) =>
        r.rarity.join() === rule.rarity.join() &&
        r.tier === rule.tier &&
        r.exceptional === rule.exceptional &&
        r.ilvl === rule.ilvl,
    );
    if (same) {
      setVariantId(same.id);
      setNotice("이미 있는 조합입니다.");
      return;
    }
    setRules((prev) => ({ ...prev, [tabSpec.id]: [...tabRules, rule] }));
    setVariantId(rule.id);
    setNotice("");
  };

  const removeRule = (id: string) => {
    if (!tabSpec || tabRules.length <= 1) return;
    setRules((prev) => ({ ...prev, [tabSpec.id]: tabRules.filter((r) => r.id !== id) }));
    if (variantId === id) setVariantId(null);
  };

  const resetRules = () => {
    if (!tabSpec) return;
    setRules((prev) => {
      const next = { ...prev };
      delete next[tabSpec.id];
      return next;
    });
    setVariantId(null);
  };

  /** 지금 화면에 보일 종류·아이템 (클래스·조건·검색어 반영) */
  const shown = useMemo(() => {
    if (!model) return [];
    const q = query.trim().toLowerCase();
    const cats = categoryId === ALL ? model.categories.filter((c) => !c.hideInAll) : category ? [category] : [];
    return cats.map((c) => ({
      category: c,
      items: c.items.filter(
        (item) =>
          (!sub || c !== category || item.sub === sub.id) &&
          (!variant || c !== category || item.variant === variant.id) &&
          (!q ||
            item.label.toLowerCase().includes(q) ||
            item.baseTypes?.some((b) => b.toLowerCase().includes(q)) ||
            item.members?.some((m) => m.toLowerCase().includes(q))),
      ),
    }));
  }, [model, categoryId, category, sub, variant, query]);

  const visibleItems = shown.flatMap((g) => g.items);
  const counts = Object.fromEntries(TIERS.map((t) => [t.id, 0])) as Record<TierId, number>;
  for (const item of visibleItems) counts[tierOf(item.id)]++;
  const movedCount = model ? Object.keys(assign).filter((id) => assign[id] !== model.defaultOf(id)).length : 0;

  const moveMany = (ids: string[], tier: TierId) => {
    setAssign((prev) => {
      const next = { ...prev };
      for (const id of ids) {
        if (model && model.defaultOf(id) === tier) delete next[id];
        else next[id] = tier;
      }
      return next;
    });
    setSelected([]);
  };
  const moveTo = (itemId: string, tier: TierId) => moveMany([itemId], tier);

  const toggleSelect = (rowItems: TierItem[], id: string, shift: boolean) => {
    const ids = rowItems.map((i) => i.id);
    if (shift && anchor && ids.includes(anchor)) {
      const [a, b] = [ids.indexOf(anchor), ids.indexOf(id)].sort((x, y) => x - y);
      const range = ids.slice(a, b + 1);
      setSelected((prev) => [...new Set([...prev, ...range])]);
    } else {
      setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }
    setAnchor(id);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pickCategory = (id: string) => {
    setCategoryId(id);
    setSubId(null);
    setVariantId(null);
    setSelected([]);
  };

  // 기본값 필터를 바꿔도 직접 옮긴 배치는 그대로 두고, 옮기지 않은 아이템만 새 기본값을 따른다.
  const changeBase = (id: BaseId) => setBaseId(id);

  const reset = () => {
    if (!window.confirm("옮긴 배치와 티어 설정을 모두 지우고 기본값으로 되돌릴까요?")) return;
    setAssign({});
    setSettings(defaultSettings());
  };

  /** 설정 백업: 다른 PC·브라우저로 옮기거나 브라우저 데이터를 지우기 전에 */
  const exportSettings = () => {
    const data = { app: "poe2-utility-filtergen", version: 2, baseId, assign, settings, rules };
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "poe2-filtergen-settings.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const importSettings = (file: File | undefined) => {
    if (!file) return;
    file
      .text()
      .then((body) => {
        const data = parseSaved(body);
        if (!data) throw new Error("bad");
        setBaseId(data.baseId);
        setAssign(data.assign);
        setSettings({ ...defaultSettings(), ...data.settings });
        setRules(data.rules ?? {});
        setNotice(`설정을 가져왔습니다 (옮긴 아이템 ${Object.keys(data.assign).length}개).`);
      })
      .catch(() => setNotice("설정 파일을 읽지 못했습니다."));
  };

  const download = () => {
    if (!model || !text) return;
    const out = generateTierFilter(model, assign, settings, text, base.name);
    const blob = new Blob([out], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "poe2-tier.filter";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onDrop = (event: DragEvent, tier: TierId) => {
    event.preventDefault();
    setDragOver(null);
    const id = event.dataTransfer.getData("text/plain");
    if (!id) return;
    if (selected.includes(id)) moveMany(selected, tier);
    else moveTo(id, tier);
  };

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Path of Exile 2 · 아이템 필터</p>
          <h1>필터 생성기</h1>
        </div>
      </header>

      <section className="table-wrap fg-page">
        <div className="fg-toolbar">
          <div className="fg-base">
            <span className="ctrl-label">기본값</span>
            <Segmented value={baseId} options={BASES} onChange={changeBase} />
          </div>
          <div className="fg-actions">
            <span className="fg-count">
              {movedCount ? `${movedCount}개 옮김` : "기본 배치"}
              {saveState === "saved" && " · 브라우저에 자동 저장됨"}
              {saveState === "failed" && " · 이 브라우저에서는 저장이 안 됩니다 (설정 내보내기로 백업하세요)"}
            </span>
            <button type="button" className="btn" onClick={exportSettings}>
              설정 내보내기
            </button>
            <label className="btn fg-import">
              설정 가져오기
              <input
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  importSettings(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            <button type="button" className="btn" onClick={reset}>
              초기화
            </button>
            <button type="button" className="btn btn-primary" disabled={!model} onClick={download}>
              필터 내려받기
            </button>
          </div>
        </div>
        {notice && <p className="fg-notice">{notice}</p>}

        <p className="fg-help">
          아이템을 끌어서 다른 티어에 놓거나, 아이템을 눌러 고른 다음 티어 이름을 누르면 옮겨집니다. 여러 개를 고를 수 있고
          (Shift+클릭은 범위, "이 줄 전체 선택"도 있음), 고른 것 중 하나를 끌어도 모두 함께 옮겨집니다. 티어마다 소리와 표시 여부를
          정하고, "숨김" 티어와 스위치를 끈 티어의 아이템은 바닥에 보이지 않습니다. 아이템 목록과 분류는 poe2db.tw 를 따르고,
          처음 배치는 고른 기본값 필터로 정해집니다. 장비·장신구·주얼·플라스크는 클래스와 조건 조합을 골라 베이스마다 티어를 정합니다.
          조합은 희귀도·미확인 등급·특출난·아이템 레벨을 모두 만족(AND)하는 아이템이고, 조건이 많이 걸린 조합이 먼저 적용됩니다
          (예: "희귀 · 5등급"을 C에, "희귀"를 숨김에 두면 5등급 희귀만 보입니다). 고유는 필터가 이름이 아니라 베이스로만 구분하므로, 베이스 하나에 그 베이스를 쓰는 고유
          아이템을 함께 보여 주고 함께 옮깁니다(고유 이름으로도 검색됩니다). 내려받은 파일과{" "}
          <a href="/filters/poe2-filter-sounds.zip" download>
            사운드 mp3
          </a>
          를 <code>문서\My Games\Path of Exile 2</code> 폴더에 넣고 게임에서 고르면 됩니다.
        </p>

        {error && <p className="fg-error">{error}</p>}
        {!model && !error && <p className="fg-help">기본값 필터 불러오는 중…</p>}

        {model && (
          <>
            <div className="chip-row tm-tabs" role="tablist" aria-label="아이템 종류">
              <button
                type="button"
                role="tab"
                aria-selected={categoryId === ALL}
                className={`chip ${categoryId === ALL ? "active" : ""}`}
                onClick={() => pickCategory(ALL)}
              >
                전체
              </button>
              {model.categories.map((c) => {
                const icon = c.subs?.[0]?.icon ?? c.items.map((i) => i.icon).find(Boolean);
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={c.id === categoryId}
                    className={`chip ${c.id === categoryId ? "active" : ""}`}
                    onClick={() => pickCategory(c.id)}
                  >
                    {icon && <img src={iconUrl(icon)} alt="" width={20} height={20} />}
                    {c.label}
                  </button>
                );
              })}
            </div>

            {category?.subs && (
              <div className="tm-subbar">
                <div className="chip-row" role="group" aria-label="클래스">
                  {category.subs.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`chip small ${s.id === sub?.id ? "active" : ""}`}
                      onClick={() => {
                        setSubId(s.id);
                        setSelected([]);
                      }}
                    >
                      {s.icon && <img src={iconUrl(s.icon)} alt="" width={18} height={18} />}
                      {s.label}
                    </button>
                  ))}
                </div>
                {variants.length > 0 && (
                  <div className="tm-rules">
                    <span className="tm-variant-title">조건 조합</span>
                    {variants.map((v) => (
                      <span key={v.id} className={`tm-rule${v.id === variant?.id ? " active" : ""}`}>
                        <button
                          type="button"
                          className="tm-rule-name"
                          onClick={() => {
                            setVariantId(v.id);
                            setSelected([]);
                          }}
                        >
                          {v.label}
                        </button>
                        {variants.length > 1 && (
                          <button
                            type="button"
                            className="tm-rule-del"
                            aria-label={`${v.label} 조합 지우기`}
                            title="조합 지우기"
                            onClick={() => removeRule(v.id)}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
                {tabSpec && (
                  <div className="tm-builder">
                    <span className="tm-variant-title">조합 만들기 (모두 만족)</span>
                    {tabSpec.rarities.map((r) => (
                      <label key={r} className="tm-check">
                        <input
                          type="checkbox"
                          checked={draft.rarity.includes(r)}
                          onChange={(event) =>
                            setDraft((d) => ({
                              ...d,
                              rarity: event.target.checked ? [...d.rarity, r] : d.rarity.filter((x) => x !== r),
                            }))
                          }
                        />
                        {RARITY_KO[r]}
                      </label>
                    ))}
                    {tabSpec.tiers && (
                      <select
                        className="tm-bulk-select"
                        aria-label="미확인 등급"
                        value={draft.tier}
                        onChange={(event) => setDraft((d) => ({ ...d, tier: event.target.value as TierCond | "" }))}
                      >
                        <option value="">등급 상관없음</option>
                        {(Object.keys(TIER_KO) as TierCond[]).map((t) => (
                          <option key={t} value={t}>
                            {TIER_KO[t]}
                          </option>
                        ))}
                      </select>
                    )}
                    <select
                      className="tm-bulk-select"
                      aria-label="특출난"
                      value={draft.exceptional}
                      onChange={(event) => setDraft((d) => ({ ...d, exceptional: event.target.value as Exceptional | "" }))}
                    >
                      <option value="">특출난 상관없음</option>
                      {tabSpec.exceptionals.map((e) => (
                        <option key={e} value={e}>
                          특출난: {exceptionalLabel(e, sub?.id)}
                        </option>
                      ))}
                    </select>
                    {tabSpec.ilvl && (
                      <label className="tm-check">
                        <input
                          type="checkbox"
                          checked={draft.ilvl}
                          onChange={(event) => setDraft((d) => ({ ...d, ilvl: event.target.checked }))}
                        />
                        아이템 레벨 82+
                      </label>
                    )}
                    <button type="button" className="btn" disabled={!draft.rarity.length} onClick={addRule}>
                      조합 추가
                    </button>
                    <button type="button" className="btn" onClick={resetRules}>
                      기본 조합으로
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="tm-tools">
              <input
                type="search"
                className="tm-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="아이템 검색 (한글·영문)"
                aria-label="아이템 검색"
              />
              {selected.length > 0 && (
                <div className="tm-selection">
                  <strong>{selected.length}개 선택됨</strong>
                  <span>티어 이름이나 빈 칸을 누르거나 끌어다 놓으면 함께 옮겨집니다 (Esc: 해제)</span>
                  <button type="button" className="btn" onClick={() => setSelected([])}>
                    선택 해제
                  </button>
                </div>
              )}
              <div className="tm-bulk">
                <span>보이는 {visibleItems.length}개 모두</span>
                <select
                  className="tm-bulk-select"
                  aria-label="옮길 티어"
                  value={bulkTier}
                  onChange={(event) => setBulkTier(event.target.value as TierId)}
                >
                  {TIERS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn"
                  disabled={!visibleItems.length}
                  onClick={() => moveMany(visibleItems.map((i) => i.id), bulkTier)}
                >
                  티어로 옮기기
                </button>
              </div>
            </div>

            <div className="tm-board">
              {TIERS.map((tier) => {
                const setting = settings[tier.id];
                const visible = tier.id !== "hidden" && setting.show;
                const groups = shown
                  .map((g) => ({ category: g.category, items: g.items.filter((item) => tierOf(item.id) === tier.id) }))
                  .filter((g) => g.items.length);
                const rowItems = groups.flatMap((g) => g.items);
                const rowAllSelected = rowItems.length > 0 && rowItems.every((i) => selected.includes(i.id));
                return (
                  <div
                    key={tier.id}
                    className={`tm-row${visible ? "" : " off"}${dragOver === tier.id ? " over" : ""}`}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOver(tier.id);
                    }}
                    onDragLeave={() => setDragOver((v) => (v === tier.id ? null : v))}
                    onDrop={(event) => onDrop(event, tier.id)}
                  >
                    <div className="tm-label" style={{ background: tier.color }}>
                      <button
                        type="button"
                        className="tm-label-name"
                        disabled={!selected.length}
                        onClick={() => selected.length && moveMany(selected, tier.id)}
                        title={selected.length ? `선택한 ${selected.length}개를 ${tier.label} 티어로 옮기기` : undefined}
                      >
                        {tier.label}
                      </button>
                      <span className="tm-label-count">{counts[tier.id]}개</span>
                      {rowItems.length > 0 && (
                        <button
                          type="button"
                          className="tm-row-select"
                          onClick={() =>
                            setSelected((prev) =>
                              rowAllSelected
                                ? prev.filter((id) => !rowItems.some((i) => i.id === id))
                                : [...new Set([...prev, ...rowItems.map((i) => i.id)])],
                            )
                          }
                        >
                          {rowAllSelected ? "줄 선택 해제" : "이 줄 전체 선택"}
                        </button>
                      )}
                      {tier.id !== "hidden" && (
                        <div className="tm-label-ctrl">
                          <select
                            className="tm-sound"
                            aria-label={`${tier.label} 티어 소리`}
                            value={setting.sound}
                            disabled={!setting.show}
                            onChange={(event) =>
                              setSettings((prev) => ({ ...prev, [tier.id]: { ...prev[tier.id], sound: event.target.value } }))
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
                            aria-label={`${tier.label} 티어 ${setting.show ? "표시" : "숨김"}`}
                            className={`fg-switch${setting.show ? " on" : ""}`}
                            onClick={() =>
                              setSettings((prev) => ({ ...prev, [tier.id]: { ...prev[tier.id], show: !prev[tier.id].show } }))
                            }
                          >
                            <span />
                          </button>
                        </div>
                      )}
                    </div>
                    <ul
                      className="tm-items"
                      onClick={(event) => {
                        if (selected.length && event.target === event.currentTarget) moveMany(selected, tier.id);
                      }}
                    >
                      {groups.map((group) => (
                        <Fragment key={group.category.id}>
                          {categoryId === ALL && <li className="tm-group">{group.category.label}</li>}
                          {group.items.map((item) => (
                            <ItemTile
                              key={item.id}
                              item={item}
                              selected={selected.includes(item.id)}
                              onSelect={(shift) => toggleSelect(rowItems, item.id, shift)}
                            />
                          ))}
                        </Fragment>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            {categoryId === ALL && (
              <p className="fg-help">장비·장신구·주얼·플라스크는 베이스가 많아 "전체"에서는 빼고, 각 탭에서 클래스·조건별로 보여 줍니다.</p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
