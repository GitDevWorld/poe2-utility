import { useState } from "react";
import { RingGuide } from "./CraftGuidePage";
import { JewelGuide } from "./JewelGuide";

type GuideTab = "ring" | "jewel";

const TABS: { id: GuideTab; label: string }[] = [
  { id: "ring", label: "풀매찬 반지" },
  { id: "jewel", label: "5옵션 보석" },
];

const STORAGE_KEY = "guide-tab";

function readTab(): GuideTab {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "jewel" ? "jewel" : "ring";
  } catch {
    return "ring";
  }
}

export function GuidePage() {
  const [tab, setTab] = useState<GuideTab>(readTab);

  const select = (next: GuideTab) => {
    setTab(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 저장 실패는 무시 — 탭은 그대로 바뀐다.
    }
  };

  return (
    <>
      <nav className="guide-tabs" aria-label="제작 가이드 종류">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={tab === t.id ? "active" : ""}
            aria-pressed={tab === t.id}
            onClick={() => select(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "ring" ? <RingGuide /> : <JewelGuide />}
    </>
  );
}
