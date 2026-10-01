import raw from "./tabletData.json";
import type { TabletMod } from "./types";

export type JunkPatternHit = {
  pattern: string;
  mod: TabletMod;
};

export type JunkPatternReport = {
  pattern: string;
  /** tabletData.json 접두·접미 한글 문구 기준 매칭 */
  hits: JunkPatternHit[];
  note?: string;
};

const JUNK_PARTS = [
  "위.속",
  "품.무",
  "이.하",
  "2배",
  "연.4",
  "안정",
  "된.영",
  "분열의",
  "수정",
  "로.베",
  "가.룬",
] as const;

const allMods = [...(raw.prefixOptions as TabletMod[]), ...(raw.suffixOptions as TabletMod[])];

const patternNotes: Record<string, string> = {
  "위.속": "현재 서판 DB(0.5.5 추출)에는 매칭 없음. 다른 문구·구 리그 옵션일 수 있음.",
  "품.무": "매칭 없음. (의식 「헌정품을 무…」 등과 부분 겹칠 수 있는 축약일 가능성)",
  "이.하": "매칭 없음.",
  "2배": "심연 「구덩이 보상 … 2배」 — 파밍 추천과 겹침. 꽝 전용으로 쓰기엔 오탐.",
  "연.4": "심연 「… 심연 4개 추가」 — 밀도 옵션, 추천과 겹칠 수 있음.",
  안정: "매칭 없음.",
  "된.영": "환영 「복제된 영토 파편」 — 저가치 접미로 분류되는 경우 많음.",
  분열의: "환영 「분열의 거울」 — 추천 환영 옵션과 겹침.",
  수정: "매칭 없음.",
  "로.베": "매칭 없음.",
  "가.룬": "매칭 없음.",
};

/** 커뮤니티 꽝 찾기용 문자열 — 하이라이트(찾기) 전용, 돈되는 서판 OR와 별개 */
export const JUNK_TABLET_SEARCH_REGEX = JUNK_PARTS.join("|");

export function analyzeJunkPatterns(): JunkPatternReport[] {
  return JUNK_PARTS.map((pattern) => {
    const re = new RegExp(pattern);
    const hits = allMods
      .filter((mod) => re.test(mod.text_ko))
      .map((mod) => ({ pattern, mod }));
    return {
      pattern,
      hits,
      note: patternNotes[pattern],
    };
  });
}

export function modsMatchingAnyJunkPart(): JunkPatternHit[] {
  const full = new RegExp(JUNK_TABLET_SEARCH_REGEX);
  return allMods.filter((mod) => full.test(mod.text_ko)).map((mod) => ({ pattern: "(any)", mod }));
}
