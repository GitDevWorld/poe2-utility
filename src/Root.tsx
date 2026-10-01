import { useEffect, useState } from "react";
import App from "./App";
import { TabletRegexPage } from "./tablet/TabletRegexPage";
import { CraftGuidePage } from "./guide/CraftGuidePage";

type Page = "exchange" | "tablet" | "guide";

function readPage(): Page {
  const hash = window.location.hash;
  if (hash === "#tablet") return "tablet";
  if (hash === "#guide") return "guide";
  return "exchange";
}

const TITLES: Record<Page, string> = {
  exchange: "POE2 화폐 교환비",
  tablet: "POE2 돈되는 서판 찾기",
  guide: "POE2 제작 가이드",
};

export default function Root() {
  const [page, setPage] = useState<Page>(readPage);

  useEffect(() => {
    const onHash = () => setPage(readPage());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.title = TITLES[page];
  }, [page]);

  const go = (next: Page) => {
    window.location.hash = next === "exchange" ? "" : `#${next}`;
    setPage(next);
  };

  return (
    <>
      <nav className="site-nav">
        <button type="button" className={page === "exchange" ? "active" : ""} onClick={() => go("exchange")}>
          교환비
        </button>
        <button type="button" className={page === "tablet" ? "active" : ""} onClick={() => go("tablet")}>
          돈되는 서판 찾기
        </button>
        <button type="button" className={page === "guide" ? "active" : ""} onClick={() => go("guide")}>
          제작 가이드
        </button>
      </nav>
      {page === "tablet" ? <TabletRegexPage /> : page === "guide" ? <CraftGuidePage /> : <App />}
    </>
  );
}
