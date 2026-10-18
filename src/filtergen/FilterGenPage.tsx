import { useEffect, useMemo, useState } from "react";
import { Segmented } from "../components/SearchOutputs";
import { iconUrl } from "../format";
import {
  CATEGORIES,
  cellKey,
  generateFilter,
  readDefaults,
  SOUNDS,
  type CellGroup,
  type CellInfo,
  type Changes,
} from "./generate";
import itemData from "./items.json";

type BaseId = "sskim" | "jjm";

const BASES: { id: BaseId; label: string; name: string; file: string }[] = [
  { id: "sskim", label: "씹양태 필터", name: "씹양태증증미김성수 렛츠고", file: "/filters/sskim.filter" },
  { id: "jjm", label: "정정민 필터", name: "돈만쳐먹는정정민필터", file: "/filters/jjm.filter" },
];

const ITEMS = itemData as Record<string, { ko: string; icon?: string }>;
const PREVIEW = 14;

function ItemChip({ name }: { name: string }) {
  const item = ITEMS[name];
  const label = item?.ko ?? name;
  return (
    <li className="fg-item" title={name}>
      {item?.icon ? (
        <img src={iconUrl(item.icon)} alt="" width={22} height={22} loading="lazy" />
      ) : (
        <span className="fg-item-fallback" aria-hidden>
          {label.slice(0, 1)}
        </span>
      )}
      {label}
    </li>
  );
}

function GroupItems({ group, sound }: { group: CellGroup; sound?: string }) {
  const [open, setOpen] = useState(false);
  const items = open ? group.items : group.items.slice(0, PREVIEW);
  const shownSound = group.show ? (sound === "none" ? undefined : sound || group.sound) : undefined;
  return (
    <div className="fg-group">
      <span className={`fg-level${shownSound ? "" : " mute"}`}>{shownSound ?? "소리 없음"}</span>
      {group.note && <span className="fg-note">{group.note}</span>}
      {group.items.length > 0 && (
        <ul className="fg-items">
          {items.map((name) => (
            <ItemChip key={name} name={name} />
          ))}
          {group.items.length > PREVIEW && (
            <li>
              <button type="button" className="fg-more" onClick={() => setOpen((v) => !v)}>
                {open ? "접기" : `+${group.items.length - PREVIEW}개 더`}
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export function FilterGenPage() {
  const [baseId, setBaseId] = useState<BaseId>("jjm");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [changes, setChanges] = useState<Changes>({});

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
  const changedCount = Object.values(changes).filter((c) => c.show !== undefined || c.sound).length;

  const setCell = (key: string, patch: { show?: boolean; sound?: string }) => {
    setChanges((prev) => {
      const info = defaults[key];
      const next = { ...prev[key], ...patch };
      // 기준 필터와 같아지면 바뀐 것으로 치지 않는다.
      if (next.show !== undefined && info && next.show === info.show) delete next.show;
      if (!next.sound) delete next.sound;
      const out = { ...prev };
      if (next.show === undefined && !next.sound) delete out[key];
      else out[key] = next;
      return out;
    });
  };

  const download = () => {
    if (!text) return;
    const out = generateFilter(text, changes, base.name);
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
          </div>
          <div className="fg-actions">
            <span className="fg-count">{changedCount ? `${changedCount}칸 바꿈` : "바꾼 칸 없음"}</span>
            <button type="button" className="btn" disabled={!changedCount} onClick={() => setChanges({})}>
              초기화
            </button>
            <button type="button" className="btn btn-primary" disabled={!text} onClick={download}>
              필터 내려받기
            </button>
          </div>
        </div>

        <p className="fg-help">
          등급마다 스위치로 표시/숨김을 정하고, 소리는 "기본"이면 기준 필터 그대로입니다. 줄마다 그 등급에 들어 있는 아이템과
          소리 레벨(lv1이 가장 신나는 소리)이 보입니다. 내려받은 파일과 사운드 mp3를{" "}
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
                    const change = changes[key] ?? {};
                    const show = change.show ?? info.show;
                    const changed = change.show !== undefined || Boolean(change.sound);
                    return (
                      <div key={key} className={`fg-row${show ? " on" : ""}${changed ? " changed" : ""}`}>
                        <div className="fg-row-ctrl">
                          <span className="fg-tier">{cell.label}</span>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={show}
                            aria-label={`${category.label} ${cell.label} ${show ? "표시" : "숨김"}`}
                            className={`fg-switch${show ? " on" : ""}`}
                            onClick={() => setCell(key, { show: !show })}
                          >
                            <span />
                          </button>
                          <select
                            className="fg-sound"
                            aria-label={`${category.label} ${cell.label} 소리`}
                            value={change.sound ?? ""}
                            disabled={!show}
                            onChange={(event) => setCell(key, { sound: event.target.value })}
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
                            <GroupItems key={i} group={{ ...group, show }} sound={change.sound} />
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
