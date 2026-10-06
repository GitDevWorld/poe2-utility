import { useEffect, useState } from "react";
import { getLeagues } from "../api";

const STORAGE_LEAGUE = "poe2-exchange.league";
const FALLBACK = "Forbidden Rites";

/** 경매장 검색 링크에 넣을 리그 — 교환비 페이지에서 고른 리그, 없으면 현재 메인 리그. */
export function useTradeLeague(): string {
  const [league, setLeague] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_LEAGUE) || FALLBACK;
    } catch {
      return FALLBACK;
    }
  });

  useEffect(() => {
    let alive = true;
    getLeagues()
      .then(({ data }) => {
        if (!alive) return;
        if (data.some((item) => item.name === league)) return;
        const main = data.find((item) => !/hardcore|^hc |ruthless|standard/i.test(item.name));
        if (main) setLeague(main.name);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
    // 처음 한 번만 확인한다.
  }, []);

  return league;
}
