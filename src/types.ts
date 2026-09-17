export type League = {
  id: string;
  name: string;
};

export type CurrencyMeta = {
  id: string;
  name: string;
  image: string;
  category: string;
  detailsId: string;
};

export type Sparkline = {
  totalChange: number;
  data: number[];
};

export type ExchangeLine = {
  id: string;
  primaryValue: number;
  volumePrimaryValue: number;
  maxVolumeCurrency: string;
  maxVolumeRate: number;
  sparkline: Sparkline;
};

export type ExchangeOverview = {
  core: {
    items: CurrencyMeta[];
    rates: Record<string, number>;
    primary: string;
    secondary: string;
  };
  lines: ExchangeLine[];
  items: CurrencyMeta[];
};

export type CategoryId =
  | "Currency"
  | "Fragments"
  | "Abyss"
  | "UncutGems"
  | "LineageSupportGems"
  | "Essences"
  | "SoulCores"
  | "Idols"
  | "Runes"
  | "Ritual"
  | "Expedition"
  | "Delirium"
  | "Breach"
  | "Verisium";

export type MarketRow = {
  id: string;
  name: string;
  koName: string;
  image: string;
  category: string;
  categoryId: CategoryId;
  divineValue: number;
  volumeDivine: number;
  sparkline: Sparkline;
};

export const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: "Currency", label: "화폐" },
  { id: "Fragments", label: "조각" },
  { id: "Ritual", label: "의식" },
  { id: "Essences", label: "에센스" },
  { id: "UncutGems", label: "미가공 젬" },
  { id: "LineageSupportGems", label: "리니지 젬" },
  { id: "SoulCores", label: "영혼 핵" },
  { id: "Runes", label: "룬" },
  { id: "Idols", label: "우상" },
  { id: "Abyss", label: "심연" },
  { id: "Delirium", label: "환영" },
  { id: "Breach", label: "균열" },
  { id: "Expedition", label: "탐험" },
  { id: "Verisium", label: "베리시움" },
];
