export type TabletType = {
  id: number;
  code: string;
  name_ko: string;
  pattern_ko: string;
  /** 경매장 베이스 이름 (카카오 경매장은 한글만 받는다) */
  trade_ko: string;
  /** poe2db 아이콘 파일 이름 */
  icon: string;
};

export type TabletMod = {
  id: number;
  tablet_type_id: number | null;
  text_ko: string;
  pattern_ko: string;
  type: "prefix" | "suffix";
};

export type CombineMode = "and" | "or";

export type TabletPreset = {
  id: string;
  label: string;
  tabletTypeId: number;
  prefixIds: number[];
  suffixIds: number[];
  includeType: boolean;
  combineMode: CombineMode;
};

export type SavedRegex = {
  id: string;
  name: string;
  regex: string;
  savedAt: number;
};
