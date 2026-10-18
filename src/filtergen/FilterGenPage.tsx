import { useEffect, useMemo, useState } from "react";
import { Segmented } from "../components/SearchOutputs";
import {
  CATEGORIES,
  cellKey,
  generateFilter,
  readDefaults,
  SOUNDS,
  type CellInfo,
  type Changes,
} from "./generate";

type BaseId = "sskim" | "jjm";

const BASES: { id: BaseId; label: string; name: string; file: string }[] = [
  { id: "sskim", label: "씹양태 필터", name: "씹양태증증미김성수 렛츠고", file: "/filters/sskim.filter" },
  { id: "jjm", label: "정정민 필터", name: "돈만쳐먹는정정민필터", file: "/filters/jjm.filter" },
];

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
          칸마다 스위치로 표시/숨김을 정하고, 소리는 "기본"이면 기준 필터 그대로입니다. 내려받은 파일과 사운드 mp3를{" "}
          <code>문서\My Games\Path of Exile 2</code> 폴더에 넣고 게임에서 고르면 됩니다. 사운드는{" "}
          <a href="/filters/poe2-filter-sounds.zip" download>
            여기
          </a>
          서 받습니다.
        </p>

        {error && <p className="fg-error">{error}</p>}
        {!text && !error && <p className="fg-help">기준 필터 불러오는 중…</p>}

        {text &&
          CATEGORIES.map((category) => (
            <div key={category.id} className="fg-category">
              <h3>{category.label}</h3>
              <div className="fg-cells">
                {category.cells.map((cell) => {
                  const key = cellKey(category.id, cell.id);
                  const info = defaults[key];
                  if (!info?.found) return null;
                  const change = changes[key] ?? {};
                  const show = change.show ?? info.show;
                  const changed = change.show !== undefined || Boolean(change.sound);
                  return (
                    <div key={key} className={`fg-cell${show ? " on" : ""}${changed ? " changed" : ""}`}>
                      <div className="fg-cell-head">
                        <span className="fg-cell-label">{cell.label}</span>
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
                      </div>
                      <select
                        className="fg-sound"
                        value={change.sound ?? ""}
                        disabled={!show}
                        onChange={(event) => setCell(key, { sound: event.target.value })}
                      >
                        <option value="">기본{info.sound ? ` (${info.sound})` : " (소리 없음)"}</option>
                        {SOUNDS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                        <option value="none">소리 없음</option>
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </section>
    </div>
  );
}
