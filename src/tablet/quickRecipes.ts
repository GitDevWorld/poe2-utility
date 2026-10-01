import {
  FARM_RECOMMENDED,
  modLabelsFromRefs,
  regexFromRecommended,
  sellQtyRegex,
  UNIVERSAL_QTY,
} from "./recommended";
import { getModByRef } from "./data";

export type QuickRegexRecipe = {
  id: string;
  title: string;
  description: string;
  /** 카드에 표시 — 전부 추천 옵션 */
  mods: string[];
  regex: string;
  hint: string;
  variant: "sell" | "farm" | "junk";
  tabletTypeId?: number;
};

export type RecipeSection = {
  id: string;
  title: string;
  note?: string;
  recipes: QuickRegexRecipe[];
};

const farmTitles: Record<string, string> = {
  "pioneer-farm": "선도자(사능) 고효율",
  "breach-farm": "균열 고효율",
  "expedition-farm": "탐험 고효율",
  "delirium-farm": "환영 고효율",
  "ritual-farm": "의식 고효율",
  "overseer-farm": "감독관 고효율",
  "abyss-farm": "심연 고효율",
};

const farmHints: Record<string, string> = {
  "pioneer-farm": "수량·경로석·무리·희귀도 접두가 자주 거래·파밍에 쓰입니다.",
  "breach-farm": "균열 추가·파편·지휘관(희귀) 위주. 마법 증폭 등은 정규식에서 뺐습니다.",
  "expedition-farm": "일지·유적·표시물. 몬스터 유물 수량(는.유)은 추천에서 제외했습니다.",
  "delirium-farm": "보상 진행·추가 보상·안개 지속·분열 거울.",
  "ritual-farm": "징조일·공물 절감·변경 기회.",
  "overseer-farm": "보스 수량·희귀도·보스 구역 금고·에센스.",
  "abyss-farm": "심연 밀도·2배·4개·훼손·탈주 유배자 접두.",
};

const farmDescriptions: Record<string, string> = {
  "pioneer-farm": "맵핑·경로석 파밍용 선도자 서판.",
  "breach-farm": "균열 파밍·파편 수익용 균열 서판.",
  "expedition-farm": "0.5.5 코어 탐험·일지·유적 파밍.",
  "delirium-farm": "환영 보상·안개 관련 환영 서판.",
  "ritual-farm": "징조·공물 관련 의식 서판.",
  "overseer-farm": "보스 드랍·보스 구역 이벤트 감독관 서판.",
  "abyss-farm": "심연 밀도·보상 심연 서판.",
};

const farmRecipes: QuickRegexRecipe[] = FARM_RECOMMENDED.map((farm) => ({
  id: farm.id,
  title: farmTitles[farm.id] ?? farm.id,
  description: farmDescriptions[farm.id] ?? "",
  mods: modLabelsFromRefs(farm.refs),
  regex: regexFromRecommended(farm.tabletTypeId, farm.refs),
  hint: farmHints[farm.id] ?? "",
  variant: "farm" as const,
  tabletTypeId: farm.tabletTypeId,
}));

/** 0.5.5 · 추천 옵션만 정규식에 포함 */
export const TABLET_RECIPE_SECTIONS: RecipeSection[] = [
  {
    id: "trade",
    title: "거래·정리",
    recipes: [
      {
        id: "sell",
        title: "비싼 서판 팔기",
        description: "수량 옵션이 붙은 서판을 창고에서 골라 거래소에 올릴 때.",
        mods: [getModByRef(UNIVERSAL_QTY)?.text_ko ?? "아이템 수량"],
        regex: sellQtyRegex(),
        hint: "인게임 검색은 `|`가 OR입니다. 하이라이트된 서판 중 수량이 확실한 것부터 시세 확인.",
        variant: "sell",
      },
      {
        id: "junk",
        title: "꽝 서판",
        description: "몬스터 효율(맵 난이도↑)만 있는 서판 후보를 골라 정리할 때.",
        mods: [getModByRef({ slot: "prefix", id: 71 })?.text_ko ?? "몬스터 효율"],
        regex: "효율",
        hint: "수량 검색에 안 잡히면 꽝인 경우가 많습니다.",
        variant: "junk",
      },
    ],
  },
  {
    id: "farm-055",
    title: "종류별 추천 서판 (0.5.5)",
    note: "카드에 나온 옵션만 정규식에 넣었습니다(비추천 패턴 제외). `|`는 OR — 수량+접미 둘 다 있는지 확인하세요.",
    recipes: farmRecipes,
  },
];

export const QUICK_REGEX_RECIPES: QuickRegexRecipe[] = TABLET_RECIPE_SECTIONS.flatMap((section) => section.recipes);

/** 짧은 보조 검색식 — 추천 축만 */
export const QUICK_REGEX_ALT: Record<string, { label: string; regex: string; forId: string }> = {
  qtyOnly: { label: "수량만 (전 종류)", forId: "sell", regex: sellQtyRegex() },
  breachCore: {
    label: "균열 · 추가·파편",
    forId: "breach-farm",
    regex: regexFromRecommended(2, [
      UNIVERSAL_QTY,
      { slot: "suffix", id: 29 },
      { slot: "suffix", id: 28 },
      { slot: "suffix", id: 27 },
    ]),
  },
  expeditionLog: {
    label: "탐험 · 일지·유적",
    forId: "expedition-farm",
    regex: regexFromRecommended(3, [UNIVERSAL_QTY, { slot: "suffix", id: 36 }, { slot: "suffix", id: 33 }]),
  },
  abyssPit: {
    label: "심연 · 밀도·2배",
    forId: "abyss-farm",
    regex: regexFromRecommended(13, [
      UNIVERSAL_QTY,
      { slot: "suffix", id: 76 },
      { slot: "suffix", id: 77 },
    ]),
  },
};
