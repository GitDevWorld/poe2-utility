import { useEffect, useMemo, useState } from "react";
import { Segmented } from "../components/SearchOutputs";
import { iconUrl } from "../format";
import {
  CATEGORIES,
  cellKey,
  effectiveSound,
  generateFilter,
  ITEMLESS,
  itemShown,
  readDefaults,
  SOUNDS,
  type CellChange,
  type CellGroup,
  type CellInfo,
  type Changes,
  type LevelLimit,
} from "./generate";
import itemData from "./items.json";

type BaseId = "sskim" | "jjm";

const BASES: { id: BaseId; label: string; name: string; file: string }[] = [
  { id: "sskim", label: "씹양태 필터", name: "씹양태증증미김성수 렛츠고", file: "/filters/sskim.filter" },
  { id: "jjm", label: "정정민 필터", name: "돈만쳐먹는정정민필터", file: "/filters/jjm.filter" },
];

const ITEMS = itemData as Record<string, { ko: string; icon?: string }>;
const PREVIEW = 14;
const LIMITS = [1, 2, 3, 4, 5, 6, 7];

function ItemToggle({
  name,
  label,
  shown,
  overridden,
  onToggle,
}: {
  name: string;
  label: string;
  shown: boolean;
  overridden: boolean;
  onToggle: () => void;
}) {
  const icon = ITEMS[name]?.icon;
  return (
    <li>
      <button
        type="button"
        className={`fg-item${shown ? " on" : ""}${overridden ? " changed" : ""}`}
        aria-pressed={shown}
        title={`${name} — 눌러서 ${shown ? "끄기" : "켜기"}`}
        onClick={onToggle}
      >
        {icon ? (
          <img src={iconUrl(icon)} alt="" width={22} height={22} loading="lazy" />
        ) : (
          <span className="fg-item-fallback" aria-hidden>
            {label.slice(0, 1)}
          </span>
        )}
        {label}
      </button>
    </li>
  );
}

function GroupItems({
  group,
  change,
  limit,
  onToggleItem,
}: {
  group: CellGroup;
  change?: CellChange;
  limit: LevelLimit;
  onToggleItem: (item: string, shown: boolean, baseline: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const sound = effectiveSound(change, group.sound);
  const withoutOverrides = change ? { ...change, items: undefined } : undefined;
  const state = (item: string) => ({
    shown: itemShown(change, group.show, group.sound, item, limit),
    baseline: itemShown(withoutOverrides, group.show, group.sound, item, limit),
    overridden: change?.items?.[item] !== undefined,
  });
  const names = group.items.length ? group.items : [ITEMLESS];
  const visible = open ? names : names.slice(0, PREVIEW);
  const shownCount = names.filter((n) => state(n).shown).length;

  return (
    <div className="fg-group">
      <span className={`fg-level${shownCount && sound ? "" : " mute"}`}>{sound ?? "소리 없음"}</span>
      {names.length > 1 && (
        <span className="fg-note">
          {shownCount}/{names.length} 표시
        </span>
      )}
      <ul className="fg-items">
        {visible.map((name) => {
          const s = state(name);
          const label = name === ITEMLESS ? (group.note ?? "전체") : (ITEMS[name]?.ko ?? name);
          return (
            <ItemToggle
              key={name}
              name={name === ITEMLESS ? label : name}
              label={label}
              shown={s.shown}
              overridden={s.overridden}
              onToggle={() => onToggleItem(name, !s.shown, s.baseline)}
            />
          );
        })}
        {names.length > PREVIEW && (
          <li>
            <button type="button" className="fg-more" onClick={() => setOpen((v) => !v)}>
              {open ? "접기" : `+${names.length - PREVIEW}개 더`}
            </button>
          </li>
        )}
      </ul>
      {group.note && group.items.length > 0 && <span className="fg-note">{group.note}</span>}
    </div>
  );
}

export function FilterGenPage() {
  const [baseId, setBaseId] = useState<BaseId>("jjm");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [changes, setChanges] = useState<Changes>({});
  const [limit, setLimit] = useState<LevelLimit>(null);

  const base = BASES.find((b) => b.id === baseId) ?? BASES[0];

  useEffect(() => {
    let alive = true;
    setText("");
    setError("");
    setChanges({});
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

  const defaults = useMemo<Record<string, CellInfo>>(() => (text ? readDefaults(text) : {}), [text]);

  const changedCount = Object.values(changes).reduce(
    (n, c) => n + (c.show !== undefined ? 1 : 0) + (c.sound ? 1 : 0) + Object.keys(c.items ?? {}).length,
    0,
  );

  const updateCell = (key: string, update: (prev: CellChange) => CellChange) => {
    setChanges((prev) => {
      const next = update({ ...prev[key] });
      if (next.items && !Object.keys(next.items).length) delete next.items;
      if (!next.sound) delete next.sound;
      const out = { ...prev };
      if (next.show === undefined && !next.sound && !next.items) delete out[key];
      else out[key] = next;
      return out;
    });
  };

  const toggleRow = (key: string, show: boolean) =>
    updateCell(key, (c) => {
      // 줄 스위치를 바꾸면 그 줄의 개별 설정은 지운다.
      const next: CellChange = { ...c, show, items: undefined };
      if (show === defaults[key]?.show) delete next.show;
      return next;
    });

  const setSound = (key: string, sound: string) => updateCell(key, (c) => ({ ...c, sound }));

  const toggleItem = (key: string, item: string, shown: boolean, baseline: boolean) =>
    updateCell(key, (c) => {
      const items = { ...c.items };
      // 줄 설정·레벨 제한으로 정해지는 값과 같으면 개별 설정이 필요 없다.
      if (shown === baseline) delete items[item];
      else items[item] = shown;
      return { ...c, items };
    });

  const reset = () => {
    setChanges({});
    setLimit(null);
  };

  const download = () => {
    if (!text) return;
    const out = generateFilter(text, changes, base.name, limit);
    const blob = new Blob([out], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${base.id}-custom.filter`;
    a.click();
    URL.revokeObjectURL(url);
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
            <span className="ctrl-label">기준 필터</span>
            <Segmented value={baseId} options={BASES} onChange={setBaseId} />
            <label className="fg-limit">
              <span className="ctrl-label">소리 레벨 제한</span>
              <select
                className="fg-sound"
                value={limit ?? ""}
                onChange={(event) => setLimit(event.target.value === "" ? null : Number(event.target.value))}
              >
                <option value="">제한 없음</option>
                {LIMITS.map((n) => (
                  <option key={n} value={n}>
                    lv{n}까지만 표시
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="fg-actions">
            <span className="fg-count">
              {changedCount || limit != null
                ? `${changedCount}곳 바꿈${limit != null ? ` · lv${limit}까지` : ""}`
                : "바꾼 곳 없음"}
            </span>
            <button type="button" className="btn" disabled={!changedCount && limit == null} onClick={reset}>
              초기화
            </button>
            <button type="button" className="btn btn-primary" disabled={!text} onClick={download}>
              필터 내려받기
            </button>
          </div>
        </div>

        <p className="fg-help">
          아이템을 눌러 하나씩 켜고 끄고, 줄 스위치로 등급 전체를 켜고 끕니다. 소리 레벨 제한을 고르면 그보다 낮은 레벨(숫자가
          큰 쪽) 아이템이 한꺼번에 꺼집니다(lv1이 가장 신나는 소리, t_ 소리는 제한과 상관없음). 내려받은 파일과 사운드 mp3를{" "}
          <code>문서\My Games\Path of Exile 2</code> 폴더에 넣고 게임에서 고르면 됩니다. 사운드는{" "}
          <a href="/filters/poe2-filter-sounds.zip" download>
            여기
          </a>
          서 받습니다.
        </p>

        {error && <p className="fg-error">{error}</p>}
        {!text && !error && <p className="fg-help">기준 필터 불러오는 중…</p>}

        {text &&
          CATEGORIES.map((category) => {
            const firstIcon = category.cells
              .flatMap((cell) => defaults[cellKey(category.id, cell.id)]?.groups ?? [])
              .flatMap((g) => g.items)
              .map((name) => ITEMS[name]?.icon)
              .find(Boolean);
            return (
              <div key={category.id} className="fg-category">
                <h3>
                  {firstIcon && <img src={iconUrl(firstIcon)} alt="" width={28} height={28} />}
                  {category.label}
                </h3>
                <div className="fg-rows">
                  {category.cells.map((cell) => {
                    const key = cellKey(category.id, cell.id);
                    const info = defaults[key];
                    if (!info?.found) return null;
                    const change = changes[key];
                    const show = change?.show ?? info.show;
                    const changed = Boolean(change);
                    return (
                      <div key={key} className={`fg-row${show ? " on" : ""}${changed ? " changed" : ""}`}>
                        <div className="fg-row-ctrl">
                          <span className="fg-tier">{cell.label}</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={show}
                            aria-label={`${category.label} ${cell.label} 전체 ${show ? "표시" : "숨김"}`}
                            className={`fg-switch${show ? " on" : ""}`}
                            onClick={() => toggleRow(key, !show)}
                          >
                            <span />
                          </button>
                          <select
                            className="fg-sound"
                            aria-label={`${category.label} ${cell.label} 소리`}
                            value={change?.sound ?? ""}
                            onChange={(event) => setSound(key, event.target.value)}
                          >
                            <option value="">소리 기본</option>
                            {SOUNDS.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                            <option value="none">소리 없음</option>
                          </select>
                        </div>
                        <div className="fg-row-items">
                          {info.groups.map((group, i) => (
                            <GroupItems
                              key={i}
                              group={group}
                              change={change}
                              limit={limit}
                              onToggleItem={(item, shown, baseline) => toggleItem(key, item, shown, baseline)}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
      </section>
    </div>
  );
}
