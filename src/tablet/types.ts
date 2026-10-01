export type TabletType = {
  id: number;
  code: string;
  name_ko: string;
  pattern_ko: string;
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
