import type { ModRef } from "../tablet/data";

export type SetupOption = {
  ref: ModRef;
  /** 처음부터 선택. 서판 하나에 접두·접미는 각각 최대 2개라 전부 고르면 맞는 서판이 없다. */
  selected?: boolean;
  /** 수치 최소값 — 경매장 필터 최소값. 창고 검색은 `pattern`으로 맞춘다 */
  min?: number;
  /** 창고 검색 패턴을 따로 쓸 때 (예: 수치까지 맞추기) */
  pattern?: string;
  /** 목록에 덧붙이는 설명 */
  note?: string;
};

/** 콘텐츠별 파밍 세팅. 새 콘텐츠는 여기에 항목만 추가하면 메뉴에 생긴다. */
export type ContentSetup = {
  id: string;
  label: string;
  /** 서판 종류 id (tabletData.json) */
  tabletTypeId: number;
  options: SetupOption[];
  /** 잔여 사용 횟수 조건 (서판 최대가 10회라 10이면 새 서판만) */
  minUses?: number;
  /** 자도의 첩보술 포인트 (이름만) */
  mapSettings?: string[];
};

const MONSTER_EFFECTIVENESS: SetupOption = { ref: { slot: "prefix", id: 71 }, note: "필요하면 추가" };

export const CONTENT_SETUPS: ContentSetup[] = [
  {
    id: "expedition",
    label: "도시 탐험",
    tabletTypeId: 3,
    minUses: 10,
    options: [
      { ref: { slot: "prefix", id: 4 }, selected: true }, // 희귀 몬스터 수 증가
      MONSTER_EFFECTIVENESS,
      { ref: { slot: "suffix", id: 124 }, selected: true, note: "1~3서판" }, // 탐험 폭발물 효과 범위 증가
      { ref: { slot: "suffix", id: 132 }, selected: true }, // 베리시움 유적 1개 추가 등장 초과 확률
      { ref: { slot: "suffix", id: 134 }, note: "4서판" }, // 베리시움 유적 추가 룬 속성 확률
    ],
    mapSettings: ["뜻밖의 임무", "동방의 지식", "부분적인 해독", "예리한 감정"],
  },
  {
    id: "grand-expedition",
    label: "대탐험",
    tabletTypeId: 1,
    minUses: 10,
    options: [
      { ref: { slot: "prefix", id: 100 }, selected: true }, // 지도의 몬스터 희귀도 증가
      { ref: { slot: "prefix", id: 6 }, selected: true }, // 지도 내 경험치 획득 증가
      MONSTER_EFFECTIVENESS,
      // 지도에 무작위 속성 부여 (1–2)개 추가 → 2개만. 아이템 문구 "무작위 속성 부여 2개 추가"
      { ref: { slot: "suffix", id: 81 }, selected: true, min: 2, pattern: "부여.2", note: "2개" },
      { ref: { slot: "suffix", id: 66 }, selected: true }, // 경로석 수량 증가
    ],
  },
  {
    id: "ritual",
    label: "의식",
    tabletTypeId: 5,
    minUses: 10,
    options: [
      { ref: { slot: "prefix", id: 2 }, selected: true }, // 지도 내 무리 규모 증가
      { ref: { slot: "prefix", id: 100 }, selected: true }, // 지도의 몬스터 희귀도 증가
      MONSTER_EFFECTIVENESS,
      { ref: { slot: "suffix", id: 56 }, selected: true }, // 의식 헌정품이 징조일 확률 증가
      { ref: { slot: "suffix", id: 49 }, selected: true }, // 헌정품 무작위 변경 공물 점수 감소
    ],
    mapSettings: ["뜻밖의 임무", "수수께끼의 선물", "부분적인 해독", "기나긴 나날"],
  },
];
