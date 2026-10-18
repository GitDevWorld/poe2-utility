import { useEffect, useMemo, useState, type DragEvent } from "react";
import { Segmented } from "../components/SearchOutputs";
import { iconUrl } from "../format";
import { SOUNDS } from "./generate";
import itemData from "./items.json";
import {
  buildTierModel,
  generateTierFilter,
  TIERS,
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

const ITEMS = itemData as Record<string, { ko: string; icon?: string }>;
const STORAGE_KEY = "filtergen.tiers.v1";

type Saved = { baseId: BaseId; assign: Record<string, TierId>; settings: Partial<Record<TierId, TierSetting>> };

function loadSaved(): Saved | undefined {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Saved) : undefined;
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
  onSelect: () => void;
}) {
  const icon = item.iconOf ? ITEMS[item.iconOf]?.icon : undefined;
  const onDragStart = (event: DragEvent) => {
    event.dataTransfer.setData("text/plain", item.id);
    event.dataTransfer.effectAllowed = "move";
  };
  return (
    <li>
      <button
        type="button"
        draggable
        onDragStart={onDragStart}
        className={`tm-item${selected ? " selected" : ""}`}
        title={item.baseTypes?.length === 1 ? `${item.label} (${item.baseTypes[0]})` : item.label}
        aria-pressed={selected}
        onClick={onSelect}
      >
        {icon ? (
          <img src={iconUrl(icon)} alt="" width={36} height={36} loading="lazy" draggable={false} />
        ) : (
          <span className={`tm-item-fallback tone-${item.tone ?? "misc"}`} aria-hidden>
            {(item.label.split(" (")[0].split(" ").pop() ?? item.label).slice(0, 3)}
          </span>
        )}
        <span className="tm-item-name">{item.label}</span>
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
  const [categoryId, setCategoryId] = useState("currency");
  const [selected, setSelected] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TierId | null>(null);

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
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ baseId, assign, settings } satisfies Saved));
    } catch {
      // 저장 못 해도 화면은 그대로 동작한다.
    }
  }, [baseId, assign, settings]);

  const model = useMemo<TierModel | null>(
    () => (text ? buildTierModel(text, (name) => ITEMS[name]?.ko ?? name) : null),
    [text],
  );

  const tierOf = (id: string): TierId => assign[id] ?? model?.defaults[id] ?? "hidden";
  const category = model?.categories.find((c) => c.id === categoryId) ?? model?.categories[0];
  const movedCount = model ? Object.keys(assign).filter((id) => assign[id] !== model.defaults[id]).length : 0;

  const counts = useMemo(() => {
    const out = Object.fromEntries(TIERS.map((t) => [t.id, 0])) as Record<TierId, number>;
    for (const c of model?.categories ?? []) for (const item of c.items) out[tierOf(item.id)]++;
    return out;
    // tierOf 는 assign·model 로만 정해진다.
  }, [model, assign]);

  const moveTo = (itemId: string, tier: TierId) => {
    setAssign((prev) => {
      const next = { ...prev };
      if (model && model.defaults[itemId] === tier) delete next[itemId];
      else next[itemId] = tier;
      return next;
    });
    setSelected(null);
  };

  const changeBase = (id: BaseId) => {
    setBaseId(id);
    setAssign({});
  };

  const reset = () => {
    setAssign({});
    setSettings(defaultSettings());
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
    if (id) moveTo(id, tier);
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
            <span className="fg-count">{movedCount ? `${movedCount}개 옮김` : "기본 배치"}</span>
            <button type="button" className="btn" onClick={reset}>
              초기화
            </button>
            <button type="button" className="btn btn-primary" disabled={!model} onClick={download}>
              필터 내려받기
            </button>
          </div>
        </div>

        <p className="fg-help">
          아이템을 끌어서 다른 티어에 놓거나, 아이템을 누른 다음 티어 이름을 누르면 옮겨집니다. 티어마다 소리와 표시 여부를
          정하고, "숨김" 티어와 스위치를 끈 티어의 아이템은 바닥에 보이지 않습니다. 처음 배치와 소리는 고른 기본값 필터를 따릅니다.
          장비·장신구·특출난·고유·젬·주얼·플라스크·기타 탭까지 있고, 어느 티어에도 해당하지 않는 아이템만 기본값 필터 규칙을 따릅니다. 내려받은 파일과{" "}
          <a href="/filters/poe2-filter-sounds.zip" download>
            사운드 mp3
          </a>
          를 <code>문서\My Games\Path of Exile 2</code> 폴더에 넣고 게임에서 고르면 됩니다.
        </p>

        {error && <p className="fg-error">{error}</p>}
        {!model && !error && <p className="fg-help">기본값 필터 불러오는 중…</p>}

        {model && category && (
          <>
            <div className="chip-row tm-tabs" role="tablist" aria-label="아이템 종류">
              {model.categories.map((c) => {
                const icon = c.items.map((i) => (i.iconOf ? ITEMS[i.iconOf]?.icon : undefined)).find(Boolean);
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="tab"
                    aria-selected={c.id === category.id}
                    className={`chip ${c.id === category.id ? "active" : ""}`}
                    onClick={() => {
                      setCategoryId(c.id);
                      setSelected(null);
                    }}
                  >
                    {icon && <img src={iconUrl(icon)} alt="" width={20} height={20} />}
                    {c.label}
                  </button>
                );
              })}
            </div>

            <div className="tm-board">
              {TIERS.map((tier) => {
                const setting = settings[tier.id];
                const visible = tier.id !== "hidden" && setting.show;
                const items = category.items.filter((item) => tierOf(item.id) === tier.id);
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
                        disabled={!selected}
                        onClick={() => selected && moveTo(selected, tier.id)}
                        title={selected ? `${tier.label} 티어로 옮기기` : undefined}
                      >
                        {tier.label}
                      </button>
                      <span className="tm-label-count">{counts[tier.id]}개</span>
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
                        if (selected && event.target === event.currentTarget) moveTo(selected, tier.id);
                      }}
                    >
                      {items.map((item) => (
                        <ItemTile
                          key={item.id}
                          item={item}
                          selected={selected === item.id}
                          onSelect={() => setSelected((v) => (v === item.id ? null : item.id))}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
