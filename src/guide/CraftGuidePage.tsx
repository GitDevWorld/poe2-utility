import { useState } from "react";
import { iconUrl } from "../format";

type ItemId = keyof typeof ITEMS;

const ITEMS = {
  perfectExalt: {
    name: "완벽한 엑잘티드 오브",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lBZGRNb2RUb1JhcmUiLCJzY2FsZSI6MSwicmVhbG0iOiJwb2UyIn1d/ad7c366789/CurrencyAddModToRare.png",
  },
  catalysing: {
    name: "촉진하는 찬미의 징조",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvT21lbnMvT21lbk9uRXhhbHRDb25zdW1lUXVhbGl0eSIsInNjYWxlIjoxLCJyZWFsbSI6InBvZTIifV0/ca4d0db767/OmenOnExaltConsumeQuality.png",
  },
  dextralExalt: {
    name: "우측 찬미의 징조",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvT21lbnMvVm9vZG9vT21lbnMzWWVsbG93Iiwic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/ed7cf06fa4/VoodooOmens3Yellow.png",
  },
  sinistralCrystal: {
    name: "좌측 결정화의 징조",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvT21lbnMvT21lbk9uUGVyZmVjdEVzc2VuY2VQcmVmaXgiLCJzY2FsZSI6MSwicmVhbG0iOiJwb2UyIn1d/75263d6201/OmenOnPerfectEssencePrefix.png",
  },
  sinistralAnnul: {
    name: "좌측 소멸의 징조",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvT21lbnMvVm9vZG9vT21lbnMyUHVycGxlIiwic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/b9eaf38592/VoodooOmens2Purple.png",
  },
  annul: {
    name: "소멸의 오브",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQW5udWxsT3JiIiwic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/2daba8ccca/AnnullOrb.png",
  },
  light: {
    name: "빛의 징조",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvT21lbnMvT21lbk9uQW5udWxSZW1vdmVBYnlzc01vZCIsInNjYWxlIjoxLCJyZWFsbSI6InBvZTIifV0/eb39bcb3d7/OmenOnAnnulRemoveAbyssMod.png",
  },
  breachEssence: {
    name: "균열의 에센스",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvRXNzZW5jZS9CcmVhY2hFc3NlbmNlIiwic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/60e81fa5eb/BreachEssence.png",
  },
  xophCatalyst: {
    name: "조프의 기폭제 (화염 저항)",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQnJlYWNoL0JyZWFjaENhdGFseXN0RmlyZSIsInNjYWxlIjoxLCJyZWFsbSI6InBvZTIifV0/05b1999374/BreachCatalystFire.png",
  },
  tulCatalyst: {
    name: "툴의 기폭제 (냉기 저항)",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQnJlYWNoL0JyZWFjaENhdGFseXN0Q29sZCIsInNjYWxlIjoxLCJyZWFsbSI6InBvZTIifV0/c3bc9abf43/BreachCatalystCold.png",
  },
  eshCatalyst: {
    name: "에쉬의 기폭제 (번개 저항)",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQnJlYWNoL0JyZWFjaENhdGFseXN0TGlnaHRuaW5nIiwic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/299e62fc33/BreachCatalystLightning.png",
  },
  reaverCatalyst: {
    name: "강탈자 기폭제",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQnJlYWNoL0JyZWFjaENhdGFseXN0QXR0YWNrIiwic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/ccc363f502/BreachCatalystAttack.png",
  },
  greaterExalt: {
    name: "상위 찬미의 징조",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvT21lbnMvVm9vZG9vT21lbnMxWWVsbG93Iiwic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/22d9b6478d/VoodooOmens1Yellow.png",
  },
  dextralNecro: {
    name: "우측 강령술의 징조",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvT21lbnMvT21lbk9uQWJ5c3NBZGRTdWZmaXhlcyIsInNjYWxlIjoxLCJyZWFsbSI6InBvZTIifV0/93e1dd20ce/OmenOnAbyssAddSuffixes.png",
  },
  abyssalEchoes: {
    name: "심연의 메아리의 징조",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvT21lbnMvT21lbk9uQWJ5c3NSZXJvbGxPcHRpb25zIiwic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/9690f99016/OmenOnAbyssRerollOptions.png",
  },
  sinistralNecro: {
    name: "좌측 강령술의 징조",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvT21lbnMvT21lbk9uQWJ5c3NBZGRQcmVmaXhlcyIsInNjYWxlIjoxLCJyZWFsbSI6InBvZTIifV0/1c0a646414/OmenOnAbyssAddPrefixes.png",
  },
  collarbone: {
    name: "빗장뼈",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQWJ5c3MvUHJlc2VydmVkQ2FsdmljbGUiLCJzY2FsZSI6MSwicmVhbG0iOiJwb2UyIn1d/6f63f7462d/PreservedCalvicle.png",
  },
} as const;

type ModKind = "fractured" | "desecrated" | "new" | "gamble";
type Mod = { text: string; kind?: ModKind; hint?: string } | null;

type RingState = {
  quality?: string;
  prefixes: Mod[];
  suffixes: Mod[];
  note?: string;
};

type StepId = "start" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "done" | "B" | "V1" | "V2" | "V3" | "M1" | "M2" | "M3" | "M4";

type Step = {
  id: StepId;
  title: string;
  body: string[];
  items: ItemId[];
  ring: RingState;
  tone?: "fail";
  callout?: string;
  branch?: { label: string; from: StepId };
  next?: { label: string; to: StepId | "end"; ok: boolean; endText?: string }[];
};

// 옵션 문구·티어 범위는 poe2db(한국어) 반지 옵션 기준.
const RARITY_P = "발견하는 아이템 희귀도 18% 증가"; // 접두 1티어 (16—19)%
const RARITY_S = "발견하는 아이템 희귀도 17% 증가"; // 접미 1티어 (15—18)%
const FIRE_RES = "화염 저항 +43%"; // 1티어 (41—45)%
const ALL_RES = "모든 원소 저항 +16%"; // 1티어 (15—16)%
const ATTACK_T1 = "공격 시 물리 피해 15~28 추가"; // 1티어 (12—19)~(22—32)
const MAX_QUALITY = "최대 퀄리티 +20%"; // 균열의 에센스

const TIER_HINTS: Record<string, string> = {
  [RARITY_P]: "1티어",
  [RARITY_S]: "1티어",
  [FIRE_RES]: "1티어",
  [ALL_RES]: "1티어",
  [ATTACK_T1]: "1티어",
};

const MAIN_STEPS: Step[] = [
  {
    id: "start",
    title: "시작 베이스 — 발견하는 아이템 희귀도 증가 접두(분열) + 접미 + 저항 1티어",
    body: [
      "제작 전에 이 상태의 반지를 준비한다. 접두에 분열된 발견하는 아이템 희귀도 증가, 접미에 발견하는 아이템 희귀도 증가 + 1티어 저항.",
      "발견하는 아이템 희귀도 증가 접두 + 접미 + 아무 옵션이면 사도 되지만, 접미에 1티어 저항이 있으면 가장 베스트.",
      "주의: 아이템 레벨 82 이상 베이스여야 저항 1티어가 뜬다.",
    ],
    items: [],
    ring: {
      prefixes: [{ text: RARITY_P, kind: "fractured" }, null, null],
      suffixes: [{ text: RARITY_S }, { text: FIRE_RES }, null],
      note: "제작 시작 상태",
    },
  },
  {
    id: "1",
    title: "기폭제 작업 — 저항 기폭제 퀄리티 20%",
    body: [
      "접미의 속성 저항과 동일한 기폭제를 사서 퀄리티 20%까지 바른다.",
      "화염 저항이면 조프의 기폭제, 냉기 저항이면 툴의 기폭제, 번개 저항이면 에쉬의 기폭제 — 셋 중 하나만 쓴다.",
    ],
    items: ["xophCatalyst", "tulCatalyst", "eshCatalyst"],
    ring: {
      quality: "퀄리티 20% (화염)",
      prefixes: [{ text: RARITY_P, kind: "fractured" }, null, null],
      suffixes: [{ text: RARITY_S }, { text: FIRE_RES }, null],
      note: "옵션 변화 없음 — 퀄리티만 올림",
    },
  },
  {
    id: "2",
    title: "촉진하는 찬미의 징조 — 접미 모든 원소 저항 노리기",
    body: [
      "촉진하는 찬미의 징조 + 우측 찬미의 징조 + 상위 찬미의 징조 + 완벽한 엑잘티드 오브로 모든 원소 저항을 노린다.",
      "상위 찬미의 징조로 옵션이 2개 붙는데, 접미가 다 차면 남은 하나는 접두에 붙는다 — 3번에서 바를 잡옵션을 미리 붙이는 셈.",
      "촉진하는 찬미의 징조는 기폭제 퀄리티를 모두 소모한다 — 이후 퀄리티는 0%.",
      "모든 원소 저항이 안 나오면 망함. 그래도 유효 옵션이 나왔으면 계속 진행.",
      "유효 옵션이 안 나오면 절사로 절대 못 살린다 (접미의 발견하는 아이템 희귀도 증가 옵션 때문에).",
    ],
    items: ["catalysing", "dextralExalt", "greaterExalt", "perfectExalt"],
    tone: "fail",
    next: [
      { label: "성공 시", to: "3", ok: true },
      { label: "실패 시", to: "end", ok: false, endText: "끝 (절사로도 못 살림)" },
    ],
    ring: {
      quality: "퀄리티 0% (촉진하는 찬미의 징조로 소모)",
      prefixes: [{ text: RARITY_P, kind: "fractured" }, { text: "정확도 +120", kind: "new", hint: "잡옵션" }, null],
      suffixes: [{ text: RARITY_S }, { text: FIRE_RES }, { text: ALL_RES, kind: "new" }],
      note: "접미 완성 + 접두에 옵션 1개",
    },
  },
  {
    id: "3",
    title: "접두에 붙은 옵션 확인",
    body: [
      "2번에서 접두에 붙은 옵션을 확인한다.",
      "잡옵션이면 그대로 4번으로 — 균열의 에센스로 교체할 자리다.",
      "공격 1티어가 붙어버렸으면 변형 루트로 간다.",
    ],
    items: [],
    next: [
      { label: "잡옵션이면", to: "4", ok: true },
      { label: "공격 1티어가 붙으면", to: "V1", ok: true },
    ],
    ring: {
      quality: "퀄리티 0%",
      prefixes: [{ text: RARITY_P, kind: "fractured" }, { text: "정확도 +120", hint: "잡옵션" }, null],
      suffixes: [{ text: RARITY_S }, { text: FIRE_RES }, { text: ALL_RES }],
      note: "잡옵션이 붙은 경우",
    },
  },
  {
    id: "4",
    title: "균열의 에센스 — 최대 퀄리티 +20%",
    body: [
      "무효 옵션(잡옵션)을 균열의 에센스 + 좌측 결정화의 징조로 바꾼다.",
      "균열의 에센스는 반지에 접두 '최대 퀄리티 +20%'를 붙인다 — 이 옵션이 있어야 기폭제를 퀄리티 40%까지 바를 수 있다.",
    ],
    items: ["breachEssence", "sinistralCrystal"],
    ring: {
      quality: "퀄리티 0% (최대 40%)",
      prefixes: [{ text: RARITY_P, kind: "fractured" }, { text: MAX_QUALITY, kind: "new" }, null],
      suffixes: [{ text: RARITY_S }, { text: FIRE_RES }, { text: ALL_RES }],
      note: "잡옵션 → 최대 퀄리티 +20%",
    },
  },
  {
    id: "5",
    title: "기폭제 작업 — 강탈자 기폭제 퀄리티 20%",
    body: [
      "현재 상태: 접두 분열 발견하는 아이템 희귀도 증가 + 최대 퀄리티 +20% · 접미 완성.",
      "강탈자 기폭제(공격)를 퀄리티 20%까지만 바른다.",
    ],
    items: ["reaverCatalyst"],
    ring: {
      quality: "퀄리티 20% (공격)",
      prefixes: [{ text: RARITY_P, kind: "fractured" }, { text: MAX_QUALITY }, null],
      suffixes: [{ text: RARITY_S }, { text: FIRE_RES }, { text: ALL_RES }],
      note: "옵션 변화 없음 — 퀄리티만 올림",
    },
  },
  {
    id: "6",
    title: "촉진하는 찬미의 징조 — 공격 1티어 기도",
    body: [
      "촉진하는 찬미의 징조 + 완벽한 엑잘티드 오브로 공격 1티어를 기도한다.",
      "기폭제 퀄리티는 여기서 모두 소모된다.",
    ],
    items: ["catalysing", "perfectExalt"],
    next: [
      { label: "성공 시", to: "7", ok: true },
      { label: "실패 시", to: "B", ok: false },
    ],
    ring: {
      quality: "퀄리티 0% (촉진하는 찬미의 징조로 소모)",
      prefixes: [{ text: RARITY_P, kind: "fractured" }, { text: MAX_QUALITY }, { text: ATTACK_T1, kind: "new" }],
      suffixes: [{ text: RARITY_S }, { text: FIRE_RES }, { text: ALL_RES }],
      note: "접두 3칸 모두 참",
    },
  },
  {
    id: "7",
    title: "강탈자 기폭제 퀄리티 40%",
    body: [
      "최대 퀄리티 +20% 옵션이 남아 있을 때 강탈자 기폭제를 퀄리티 40%까지 바른다.",
      "다음 단계에서 이 옵션이 지워지기 전에 꼭 40%까지 해둬야 한다.",
    ],
    callout: "최대 퀄리티 +20%가 지워지기 전에 꼭 퀄리티 40%까지 바를 것 — 실패하면 강탈자 기폭제 값이 날아간다.",
    items: ["reaverCatalyst"],
    ring: {
      quality: "퀄리티 40% (공격)",
      prefixes: [{ text: RARITY_P, kind: "fractured" }, { text: MAX_QUALITY }, { text: ATTACK_T1 }],
      suffixes: [{ text: RARITY_S }, { text: FIRE_RES }, { text: ALL_RES }],
      note: "옵션 변화 없음 — 공격 퀄리티 0% → 40%",
    },
  },
  {
    id: "8",
    title: "심연 훼손 5:5",
    body: [
      "가장 중요한 씹기도메타. 좌측 강령술의 징조 + 빗장뼈로 접두 심연 훼손 5:5를 노린다.",
      "최대 퀄리티 +20% 쪽이 훼손되면 성공. 공격 1티어가 날아가면 6번부터 다시 — 이때 바른 강탈자 기폭제 퀄리티 40%가 촉진하는 찬미의 징조로 소모된다.",
    ],
    items: ["sinistralNecro", "collarbone"],
    next: [
      { label: "성공 시", to: "9", ok: true },
      { label: "실패 시 (공격 1티어 날아감)", to: "6", ok: false },
    ],
    ring: {
      quality: "퀄리티 40% (공격)",
      prefixes: [
        { text: RARITY_P, kind: "fractured" },
        { text: MAX_QUALITY, kind: "gamble" },
        { text: ATTACK_T1, kind: "gamble" },
      ],
      suffixes: [{ text: RARITY_S }, { text: FIRE_RES }, { text: ALL_RES }],
      note: "둘 중 하나가 5:5로 훼손 — 최대 퀄리티 쪽이면 성공",
    },
  },
  {
    id: "9",
    title: "게임 오버 — 빛의 징조 무한 반복",
    body: ["8번이 성공했다면 그때는 게임 오버. 빛의 징조 + 소멸의 오브를 무한 반복해서 공격 1티어를 띄우면 된다."],
    items: ["light", "annul", "sinistralNecro", "collarbone"],
    next: [{ label: "성공 시", to: "done", ok: true }],
    ring: {
      quality: "퀄리티 40% (공격)",
      prefixes: [
        { text: RARITY_P, kind: "fractured" },
        { text: "훼손 → 공격 1티어 뜰 때까지 반복", kind: "desecrated" },
        { text: ATTACK_T1 },
      ],
      suffixes: [{ text: RARITY_S }, { text: FIRE_RES }, { text: ALL_RES }],
      note: "빛의 징조는 훼손 옵션만 지우므로 나머지는 안전",
    },
  },
  {
    id: "done",
    title: "완성 — 풀매찬 황금 반지",
    body: [
      "접두: 분열 발견하는 아이템 희귀도 증가 + 공격 시 물리 피해 추가(1티어) + 훼손 옵션.",
      "접미: 발견하는 아이템 희귀도 증가 + 1티어 저항 + 모든 원소 저항.",
      "끝. 조시? 뜻대로 될 것 같제? 사는 게 금전적으로도 정신적으로도 이득이다.",
    ],
    items: [],
    ring: {
      quality: "퀄리티 40% (공격)",
      prefixes: [
        { text: RARITY_P, kind: "fractured" },
        { text: ATTACK_T1 },
        { text: "공격 1티어 훼손 옵션 확정", kind: "desecrated" },
      ],
      suffixes: [{ text: RARITY_S }, { text: FIRE_RES }, { text: ALL_RES }],
      note: "완성 상태",
    },
  },
];

const GOLD_RING_ICON = "https://cdn.poe2db.tw/image/Art/2DItems/Rings/Basetypes/GoldRing.webp";
const DESECRATED_RES = "화염 저항 +33%";
const RES_CATALYSTS: ItemId[] = ["xophCatalyst", "tulCatalyst", "eshCatalyst"];

const MAKE_STEPS: Step[] = [
  {
    id: "M1",
    title: "우측 강령술의 징조 + 빗장뼈 + 심연의 메아리의 징조 — 아무 저항 찾기",
    body: [
      "우측 강령술의 징조 + 빗장뼈로 접미에 훼손 옵션을 붙인다.",
      "공개할 때 심연의 메아리의 징조로 선택지를 한 번 더 굴려서, 6개 안에서 아무 저항이나 고른다.",
    ],
    items: ["dextralNecro", "collarbone", "abyssalEchoes"],
    next: [{ label: "저항이 나오면", to: "M2", ok: true }],
    ring: {
      prefixes: [{ text: RARITY_P, kind: "fractured" }, null, null],
      suffixes: [{ text: RARITY_S }, { text: DESECRATED_RES, kind: "desecrated", hint: "아무 저항" }, null],
      note: "접미에 훼손 저항",
    },
  },
  {
    id: "M2",
    title: "해당 기폭제 바르고 모든 원소 저항 띄우기",
    body: [
      "붙은 저항과 같은 기폭제를 퀄리티 20%까지 바른다.",
      "촉진하는 찬미의 징조 + 우측 찬미의 징조 + 완벽한 엑잘티드 오브로 모든 원소 저항을 띄운다.",
    ],
    items: [...RES_CATALYSTS, "catalysing", "dextralExalt", "perfectExalt"],
    next: [{ label: "모든 원소 저항이 붙으면", to: "M3", ok: true }],
    ring: {
      quality: "퀄리티 0% (촉진하는 찬미의 징조로 소모)",
      prefixes: [{ text: RARITY_P, kind: "fractured" }, null, null],
      suffixes: [
        { text: RARITY_S },
        { text: DESECRATED_RES, kind: "desecrated", hint: "아무 저항" },
        { text: ALL_RES, kind: "new" },
      ],
      note: "접미 3칸 모두 참",
    },
  },
  {
    id: "M3",
    title: "빛의 징조로 훼손 저항 삭제",
    body: ["빛의 징조 + 소멸의 오브로 훼손된 저항만 지운다 — 나머지 옵션은 안전하다."],
    items: ["light", "annul"],
    next: [{ label: "삭제 후", to: "M4", ok: true }],
    ring: {
      quality: "퀄리티 0%",
      prefixes: [{ text: RARITY_P, kind: "fractured" }, null, null],
      suffixes: [{ text: RARITY_S }, null, { text: ALL_RES }],
      note: "훼손 저항 자리가 비었다",
    },
  },
  {
    id: "M4",
    title: "다시 기폭제 바르고 저항 붙이기",
    body: [
      "원하는 저항의 기폭제를 다시 퀄리티 20%까지 바른다.",
      "촉진하는 찬미의 징조 + 우측 찬미의 징조 + 완벽한 엑잘티드 오브로 저항을 붙인다.",
      "접미가 성공 경로 2번을 마친 상태와 같아진다.",
    ],
    items: [...RES_CATALYSTS, "catalysing", "dextralExalt", "perfectExalt"],
    next: [{ label: "접두에 잡옵션 붙인 뒤", to: "3", ok: true }],
    ring: {
      quality: "퀄리티 0% (촉진하는 찬미의 징조로 소모)",
      prefixes: [{ text: RARITY_P, kind: "fractured" }, null, null],
      suffixes: [{ text: RARITY_S }, { text: FIRE_RES, kind: "new" }, { text: ALL_RES }],
      note: "베이스 완성 — 접미 완성",
    },
  },
];

const VARIANT_STEPS: Step[] = [
  {
    id: "V1",
    title: "접두에 잡옵션 한 번 더",
    body: [
      "2번에서 접두에 공격 1티어가 붙었으면, 남은 접두 칸에 잡옵션을 하나 더 바른다.",
      "여기서 유효 옵션이 또 붙으면 퀄리티 40% 작업은 포기하고 그대로 종료해도 된다.",
    ],
    items: [],
    branch: { label: "3번 공격 1티어", from: "3" },
    next: [
      { label: "유효 옵션이 붙으면", to: "end", ok: true, endText: "종료 (40% 퀄리티 작업 포기)" },
      { label: "잡옵션이 붙으면", to: "V2", ok: false },
    ],
    ring: {
      quality: "퀄리티 0%",
      prefixes: [
        { text: RARITY_P, kind: "fractured" },
        { text: ATTACK_T1 },
        { text: "정확도 +120", kind: "new", hint: "잡옵션" },
      ],
      suffixes: [{ text: RARITY_S }, { text: FIRE_RES }, { text: ALL_RES }],
      note: "접두 공격 1티어 + 잡옵션",
    },
  },
  {
    id: "V2",
    title: "좌측 결정화의 징조 + 균열의 에센스 5:5",
    body: [
      "좌측 결정화의 징조 + 균열의 에센스로 접두 하나를 날리고 최대 퀄리티 +20%를 붙인다.",
      "분열 옵션은 안 지워지므로 잡옵션과 공격 1티어 중 하나가 5:5로 날아간다.",
    ],
    items: ["sinistralCrystal", "breachEssence"],
    next: [
      { label: "잡옵션이 날아가면", to: "V3", ok: true },
      { label: "공격 1티어가 날아가면", to: "B", ok: false },
    ],
    ring: {
      quality: "퀄리티 0% (최대 40%)",
      prefixes: [
        { text: RARITY_P, kind: "fractured" },
        { text: ATTACK_T1, kind: "gamble" },
        { text: "정확도 +120", kind: "gamble", hint: "잡옵션" },
      ],
      suffixes: [{ text: RARITY_S }, { text: FIRE_RES }, { text: ALL_RES }],
      note: "둘 중 하나가 5:5로 최대 퀄리티 +20%로 교체",
    },
  },
  {
    id: "V3",
    title: "바로 강탈자 기폭제 퀄리티 40%",
    body: [
      "잡옵션이 날아갔으면 접두가 분열 옵션 + 공격 1티어 + 최대 퀄리티 +20%로 성공 경로 7번과 같은 상태다.",
      "여기서 바로 강탈자 기폭제를 퀄리티 40%까지 바르고 마무리 단계(8번)로 진행한다.",
    ],
    items: ["reaverCatalyst"],
    next: [{ label: "40% 작업 후", to: "8", ok: true }],
    ring: {
      quality: "퀄리티 40% (공격)",
      prefixes: [
        { text: RARITY_P, kind: "fractured" },
        { text: ATTACK_T1 },
        { text: MAX_QUALITY, kind: "new" },
      ],
      suffixes: [{ text: RARITY_S }, { text: FIRE_RES }, { text: ALL_RES }],
      note: "잡옵션 → 최대 퀄리티 +20%, 퀄리티 40%",
    },
  },
];

const RECOVERY_STEPS: Step[] = [
  {
    id: "B",
    title: "좌측 소멸의 징조 5:5 삭제 도박",
    body: [
      "좌측 소멸의 징조 + 소멸의 오브로 5:5 삭제 도박을 한다.",
      "실패해도 괜찮다. 최대 퀄리티 +20%가 지워지더라도 4번(균열의 에센스) 작업으로 돌아가서 남은 실패 옵션을 교체하면 된다.",
    ],
    items: ["sinistralAnnul", "annul"],
    branch: { label: "6번 실패", from: "6" },
    next: [
      { label: "실패한 옵션이 지워지면", to: "5", ok: true },
      { label: "최대 퀄리티 +20%가 지워지면", to: "4", ok: false },
    ],
    ring: {
      quality: "퀄리티 0%",
      prefixes: [
        { text: RARITY_P, kind: "fractured" },
        { text: MAX_QUALITY, kind: "gamble" },
        { text: "생명력 최대치 +65", kind: "gamble", hint: "실패한 옵션" },
      ],
      suffixes: [{ text: RARITY_S }, { text: FIRE_RES }, { text: ALL_RES }],
      note: "분열 옵션은 안 지워지므로 나머지 둘 중 하나가 5:5로 삭제",
    },
  },
];

// 시작 베이스 경매장 검색 (카카오 경매장). 리그가 바뀌면 TRADE_LEAGUE만 바꾸면 된다.
const TRADE_LEAGUE = "Forbidden Rites";
const TRADE_BASE_URL = `https://poe.kakaogames.com/trade2/search/poe2/${encodeURIComponent(TRADE_LEAGUE)}/`;
const TRADE_FILTER_CODE =
  "H4sIAAAAAAAACo1QXWoCMRC-SpnnIOyuUM1VioSYTCCQbEIyEWUJ9LFHaE9Q-tZHz6T2DmXVlpUidF7m9_tm5hsgk6SSgQ8QItnQA4eMqiS5dgiVAe0iAoevt4_D_uXh-Pl6en8GdoZl4E_Dz4DsNTAw1hGmS8Nq4IDb6KyyNBsBols2j_PFspm3wGAjXcFxsbc98K6rlV1BMWPRYXZxoi9-jUkEI9BH2omY0Nit8EHnPyztf0lyMXdJmlpXdTV5ZqxnJSb5JFQhpRIJ9Y2GRrp81s8kqagk1MIS-psZSgWh1qvId-it27jfyxZtHe0byZ6TErYBAAA";
// TRADE_FILTER_CODE를 풀어 쓴 검색 조건 (풀링크용).
const TRADE_QUERY = {
  status: { option: "securable" },
  type: "황금 반지",
  stats: [
    {
      type: "and",
      filters: [
        { id: "explicit.stat_3917489142", value: { min: 33 } },
        { id: "pseudo.pseudo_number_of_empty_prefix_mods", value: { min: 2 } },
        { id: "pseudo.pseudo_number_of_empty_suffix_mods", value: { min: 1 } },
      ],
    },
  ],
  filters: {
    misc_filters: { filters: { corrupted: { option: "false" }, fractured_item: { option: "true" } } },
    type_filters: { filters: { ilvl: { min: 82 } } },
  },
};
const TRADE_FULL_URL = `${TRADE_BASE_URL}?q=${encodeURIComponent(JSON.stringify({ query: TRADE_QUERY }))}`;

function BaseSearch() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(TRADE_FILTER_CODE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="guide-search">
      <h2 className="guide-search-title">
        <img src={GOLD_RING_ICON} alt="" width={36} height={36} />
        베이스 검색
      </h2>
      <p>경매장에서 다음 검색 필터를 넣으면 됩니다.</p>
      <div className="guide-search-code">
        <code>{TRADE_FILTER_CODE}</code>
        <button type="button" className="ghost" onClick={() => void copy()}>
          {copied ? "복사됨" : "필터 복사"}
        </button>
      </div>
      <p className="guide-search-note">
        조건: 황금 반지 · 아이템 레벨 82 이상 · 발견하는 아이템 희귀도 합계 33% 이상 · 빈 접두 2칸 이상 · 빈 접미 1칸 이상 · 분열 아이템 · 타락
        아님
      </p>
      <a className="guide-search-go" href={TRADE_FULL_URL} target="_blank" rel="noreferrer">
        필터 적용된 검색 바로 가기 →
      </a>
    </section>
  );
}

const KIND_LABEL: Record<ModKind, string> = {
  fractured: "분열",
  desecrated: "훼손",
  new: "NEW",
  gamble: "5:5",
};

function isVariant(id: StepId) {
  return id === "V1" || id === "V2" || id === "V3";
}

function isMake(id: StepId) {
  return id === "M1" || id === "M2" || id === "M3" || id === "M4";
}

function isRecovery(id: StepId) {
  return id === "B";
}

type DestKind = "main" | "variant" | "recovery" | "make";

function destKind(id: StepId): DestKind {
  if (isVariant(id)) return "variant";
  if (isRecovery(id)) return "recovery";
  if (isMake(id)) return "make";
  return "main";
}

function ArrowIcon({ back = false }: { back?: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d={back ? "M10 3 5 8l5 5M5 8h9" : "M6 3l5 5-5 5M11 8H2"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EndIcon({ ok }: { ok: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
      <path
        d={ok ? "M3 8.5 6.5 12 13 4.5" : "M4 4l8 8M12 4l-8 8"}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function stepLabel(id: StepId) {
  if (id === "start") return "시작";
  if (id === "done") return "완성";
  if (isRecovery(id)) return `복구 ${id}`;
  if (isVariant(id)) return `변형 ${id.slice(1)}`;
  if (isMake(id)) return `제작 ${id.slice(1)}`;
  return `${id}번`;
}

function stateLabel(id: StepId) {
  if (id === "start") return "제작 전";
  if (id === "done") return "완성";
  if (isRecovery(id)) return `복구 ${id} 후`;
  if (isVariant(id)) return `변형 ${id.slice(1)} 후`;
  if (isMake(id)) return `베이스 제작 ${id.slice(1)} 후`;
  return `${id}단계 후`;
}

function ModLine({ mod }: { mod: Mod }) {
  if (!mod)
    return (
      <li className="ring-mod empty">
        <span>빈 칸</span>
      </li>
    );
  return (
    <li className={`ring-mod${mod.kind ? ` ${mod.kind}` : ""}`} title={mod.text}>
      {mod.kind && <span className="ring-mod-tag">{KIND_LABEL[mod.kind]}</span>}
      <span>{mod.text}</span>
      {(mod.hint ?? TIER_HINTS[mod.text]) && <small className="ring-mod-hint">{mod.hint ?? TIER_HINTS[mod.text]}</small>}
    </li>
  );
}

function RingPanel({ ring, id, stateText }: { ring: RingState; id?: StepId; stateText?: string }) {
  const state = stateText ?? (id ? stateLabel(id) : "");
  return (
    <div className="ring-panel" aria-label={`${state} 반지 상태 예시`}>
      {ring.note && <p className="ring-title">{ring.note}</p>}
      <div className="ring-panel-head">
        <strong className="ring-name">
          <img src={GOLD_RING_ICON} alt="" width={28} height={28} loading="lazy" />
          황금 반지
        </strong>
        <span>{state} · 예시값</span>
      </div>
      {ring.quality && <p className="ring-quality">{ring.quality}</p>}
      <p className="ring-group">접두</p>
      <ul>
        {ring.prefixes.map((mod, i) => (
          <ModLine key={i} mod={mod} />
        ))}
      </ul>
      <p className="ring-group">접미</p>
      <ul>
        {ring.suffixes.map((mod, i) => (
          <ModLine key={i} mod={mod} />
        ))}
      </ul>
    </div>
  );
}

export function CraftGuidePage() {
  const [flash, setFlash] = useState<StepId | null>(null);

  const goStep = (id: StepId) => {
    document.getElementById(`guide-step-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setFlash(id);
    window.setTimeout(() => setFlash((cur) => (cur === id ? null : cur)), 1600);
  };

  const renderStep = (step: Step) => {
    // 분기가 없는 성공 경로 단계는 바로 다음 단계로 가는 버튼을 자동으로 붙인다.
    const mainIndex = MAIN_STEPS.indexOf(step);
    const following = mainIndex >= 0 ? MAIN_STEPS[mainIndex + 1] : undefined;
    const next = step.next ?? (following ? [{ label: "다음 단계", to: following.id, ok: true }] : undefined);
    const recovery = isRecovery(step.id);
    const variant = isVariant(step.id);
    const make = isMake(step.id);
    const classes = [
      "guide-step",
      step.tone,
      step.id === "start" || step.id === "done" ? "base" : "",
      recovery ? "recovery" : "",
      variant ? "variant" : "",
      make ? "make" : "",
      flash === step.id ? "flash" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <li key={step.id} id={`guide-step-${step.id}`} className={classes}>
        <span className="guide-step-no">{make ? step.id.slice(1) : recovery || variant ? step.id : step.id === "start" ? "시작" : step.id === "done" ? "완성" : step.id}</span>
        <RingPanel ring={step.ring} id={step.id} />
        <div className="guide-step-body">
          <h3>
            {step.branch && (
              <button
                type="button"
                className={`guide-back dest-${destKind(step.branch.from)}`}
                onClick={() => goStep(step.branch!.from)}
                title={`${stepLabel(step.branch.from)}(으)로 돌아가기`}
              >
                <span className="guide-go-icon">
                  <ArrowIcon back />
                </span>
                {step.branch.label}
              </button>
            )}
            {recovery && <span className="guide-recovery-tag">복구 {step.id}</span>}
            {variant && <span className="guide-variant-tag">변형 {step.id.slice(1)}</span>}
            {make && <span className="guide-make-tag">제작 {step.id.slice(1)}</span>}
            {step.title}
          </h3>
          <ul>
            {step.body.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          {step.callout && (
            <p className="guide-key-note">
              <strong>가장 중요</strong> {step.callout}
            </p>
          )}
          {step.items.length > 0 && (
            <div className="guide-items">
              {step.items.map((id) => (
                <span key={id} className="guide-item" title={ITEMS[id].name}>
                  <img src={iconUrl(ITEMS[id].image)} alt="" width={28} height={28} loading="lazy" />
                  {ITEMS[id].name}
                </span>
              ))}
            </div>
          )}
          {next && (
            <div className="guide-next">
              {next.map((n) =>
                n.to === "end" ? (
                  <span key={n.label} className={`guide-go end ${n.ok ? "ok" : "fail"}`}>
                    <span className="guide-go-label">{n.label}</span>
                    <span className="guide-go-dest">{n.endText ?? "끝"}</span>
                    <span className="guide-go-icon">
                      <EndIcon ok={n.ok} />
                    </span>
                  </span>
                ) : (
                  <button
                    key={n.label}
                    type="button"
                    className={`guide-go dest-${destKind(n.to as StepId)}`}
                    onClick={() => goStep(n.to as StepId)}
                    title={`${stepLabel(n.to as StepId)}(으)로 이동`}
                  >
                    <span className="guide-go-label">{n.label}</span>
                    <span className="guide-go-dest">{stepLabel(n.to as StepId)}</span>
                    <span className="guide-go-icon">
                      <ArrowIcon />
                    </span>
                  </button>
                ),
              )}
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className="page guide-page">
      <header className="hero">
        <div>
          <p className="eyebrow">Path of Exile 2 · 제작 가이드</p>
          <h1>풀매찬 반지 가이드</h1>
          <p className="lede">
            정정민의 풀매찬 반지 제작 순서. <strong>번호 단계(1~9)</strong>가 성공 경로이고, 실패하면 아래{" "}
            <strong>복구 경로(복구 B)</strong>를 거쳐 다시 성공 경로로 돌아온다. 2번에서 접두에 공격 1티어가 같이 붙으면 <strong>변형 루트(변형 1~3)</strong>로 간다.
          </p>
        </div>
      </header>

      <p className="guide-legend">
        왼쪽 반지 상태의 옵션·수치는 이해를 돕기 위한 <strong>예시값</strong>입니다. 실제 옵션과 수치는 다를 수 있습니다.
      </p>

      <section className="guide-base-shape">
        <RingPanel
          stateText="구해야 할 베이스"
          ring={{
            prefixes: [{ text: RARITY_P, kind: "fractured" }, null, null],
            suffixes: [{ text: RARITY_S }, null, null],
            note: "필요한 베이스 모양",
          }}
        />
        <div className="guide-base-shape-text">
          <h2>필요한 베이스</h2>
          <p>황금 반지 · 아이템 레벨 82 이상</p>
          <p>접두에 분열된 발견하는 아이템 희귀도 증가, 접미에 발견하는 아이템 희귀도 증가 — 나머지는 접두·접미 각각 빈 칸 2개.</p>
          <p className="guide-search-note">저항이 이미 붙은 베이스를 구하면 아래 성공 경로 시작부터, 없으면 베이스 만드는 법부터 진행합니다.</p>
        </div>
      </section>

      <BaseSearch />

      <h2 className="guide-section-title make">베이스 만드는 법</h2>
      <p className="guide-legend">
        완성 베이스를 못 구했을 때, 저항이 없는 분열 아이템 희귀도 황금 반지(접두 분열 + 접미 발견하는 아이템 희귀도 증가)로 직접
        만드는 방법입니다.
      </p>
      <ol className="guide-steps">{MAKE_STEPS.map(renderStep)}</ol>

      <h2 className="guide-section-title">성공 경로</h2>
      <ol className="guide-steps">{MAIN_STEPS.map(renderStep)}</ol>

      <h2 className="guide-section-title variant">변형 루트</h2>
      <p className="guide-legend">2번에서 접두에 공격 1티어가 같이 붙었을 때 쓰는 지름길입니다.</p>
      <ol className="guide-steps">{VARIANT_STEPS.map(renderStep)}</ol>

      <h2 className="guide-section-title recovery">실패 복구 경로</h2>
      <p className="guide-legend">실패했을 때만 거치는 단계입니다. 끝나면 아래 버튼으로 성공 경로에 다시 합류합니다.</p>
      <ol className="guide-steps">{RECOVERY_STEPS.map(renderStep)}</ol>
    </div>
  );
}
