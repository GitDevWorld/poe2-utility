import { useState } from "react";
import { TabletRegexBuilder } from "./TabletRegexBuilder";

export function TabletRegexPage() {
  const [notice, setNotice] = useState("");

  const copy = async (text: string) => {
    if (!text.trim()) {
      setNotice("복사할 정규식이 없습니다.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setNotice("복사했습니다. 게임 창고·서판 탭에서 Ctrl+F → 붙여넣기.");
    } catch {
      setNotice("복사에 실패했습니다.");
    }
  };

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Path of Exile 2 · 0.5.5 · 창고 검색</p>
          <h1>돈되는 서판 찾기</h1>
        </div>
      </header>

      {notice && <div className="banner">{notice}</div>}

      <TabletRegexBuilder onCopy={(text) => void copy(text)} />
    </div>
  );
}
