import { useEffect, useState } from "react";
import App from "./App";
import { TabletRegexPage } from "./tablet/TabletRegexPage";
import { GuidePage, type GuideTab } from "./guide/GuidePage";
import { WaystonePage } from "./waystone/WaystonePage";

type Page = "exchange" | "tablet" | "waystone" | "guide-ring" | "guide-jewel";

const HASH: Record<Page, string> = {
  exchange: "",
  tablet: "#tablet",
  waystone: "#waystone",
  "guide-ring": "#guide",
  "guide-jewel": "#guide-jewel",
};

const TITLES: Record<Page, string> = {
  exchange: "POE2 화폐 교환비",
  tablet: "POE2 서판",
  waystone: "POE2 경로석",
  "guide-ring": "POE2 제작 가이드 · 풀매찬 반지",
  "guide-jewel": "POE2 제작 가이드 · 5옵션 보석",
};

const NAV: { title?: string; items: { page: Page; label: string }[] }[] = [
  {
    items: [
      { page: "exchange", label: "화폐" },
      { page: "tablet", label: "서판" },
      { page: "waystone", label: "경로석" },
    ],
  },
  {
    title: "제작 가이드",
    items: [
      { page: "guide-ring", label: "풀매찬 반지" },
      { page: "guide-jewel", label: "5옵션 보석" },
    ],
  },
];

function readPage(): Page {
  const hash = window.location.hash;
  const found = (Object.keys(HASH) as Page[]).find((page) => HASH[page] && HASH[page] === hash);
  return found ?? "exchange";
}

export default function Root() {
  const [page, setPage] = useState<Page>(readPage);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onHash = () => setPage(readPage());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.title = TITLES[page];
  }, [page]);

  const go = (next: Page) => {
    const hash = HASH[next];
    if (hash) window.location.hash = hash;
    else history.replaceState(null, "", window.location.pathname + window.location.search);
    setPage(next);
    setMenuOpen(false);
    window.scrollTo(0, 0);
  };

  const guideTab: GuideTab | null = page === "guide-ring" ? "ring" : page === "guide-jewel" ? "jewel" : null;

  return (
    <div className={`app-shell${menuOpen ? " menu-open" : ""}`}>
      <header className="app-topbar">
        <button type="button" className="app-menu-btn" aria-label="메뉴 열기" onClick={() => setMenuOpen(true)}>
          <span />
          <span />
          <span />
        </button>
        <strong>POE2 유틸리티</strong>
      </header>

      <aside className="app-sidebar" aria-label="메뉴">
        <div className="app-brand">
          <strong>POE2 유틸리티</strong>
          <span>Path of Exile 2 도구 모음</span>
        </div>
        <nav className="app-nav">
          {NAV.map((group, index) => (
            <div key={group.title ?? index} className="app-nav-group">
              {group.title && <p className="app-nav-title">{group.title}</p>}
              {group.items.map((item) => (
                <button
                  key={item.page}
                  type="button"
                  className={page === item.page ? "active" : ""}
                  aria-current={page === item.page ? "page" : undefined}
                  onClick={() => go(item.page)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <button type="button" className="app-scrim" aria-label="메뉴 닫기" onClick={() => setMenuOpen(false)} />

      <main className="app-main">
        {page === "tablet" ? (
          <TabletRegexPage />
        ) : page === "waystone" ? (
          <WaystonePage />
        ) : guideTab ? (
          <GuidePage tab={guideTab} />
        ) : (
          <App />
        )}
      </main>
    </div>
  );
}
