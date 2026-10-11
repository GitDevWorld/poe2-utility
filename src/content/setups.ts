import type { ModRef } from "../tablet/data";

/** 콘텐츠별 파밍 세팅. 새 콘텐츠는 여기에 항목만 추가하면 메뉴에 탭이 생긴다. */
export type ContentSetup = {
  id: string;
  label: string;
  /** 서판 종류 id (tabletData.json) */
  tabletTypeId: number;
  /** 추천 서판 옵션 — 순서대로 표시 */
  tabletRefs: ModRef[];
  /** 처음에 선택해 둘 옵션. 서판 하나에 접두·접미는 각각 최대 2개라 전부 고르면 맞는 서판이 없다. */
  defaultRefs: ModRef[];
  /** 잔여 사용 횟수 조건 (서판 최대가 10회라 10이면 새 서판만) */
  minUses?: number;
  /** 자도의 첩보술 포인트 (이름만) */
  mapSettings: string[];
};

export const CONTENT_SETUPS: ContentSetup[] = [
  {
    id: "expedition",
    label: "탐험",
    tabletTypeId: 3,
    tabletRefs: [
      { slot: "suffix", id: 124 }, // 탐험 폭발물 효과 범위 증가
      { slot: "suffix", id: 132 }, // 베리시움 유적 1개 추가 등장 초과 확률
      { slot: "prefix", id: 4 }, // 희귀 몬스터 수 증가
      { slot: "suffix", id: 134 }, // 베리시움 유적 추가 룬 속성 확률
    ],
    defaultRefs: [
      { slot: "suffix", id: 124 },
      { slot: "suffix", id: 132 },
      { slot: "prefix", id: 4 },
    ],
    minUses: 10,
    mapSettings: ["뜻밖의 임무", "동방의 지식", "부분적인 해독", "예리한 감정"],
  },
];
