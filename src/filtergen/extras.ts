/**
 * 장비·장신구·주얼·플라스크·고유·젬·기타 항목.
 * 장비류는 poe2db 카탈로그의 클래스 → 베이스(실제 아이템) 단위이고, 같은 베이스를
 * 조건(희귀도·미확인 등급·특출난·이중 타락·아이템 레벨)별로 따로 티어에 넣는다.
 *
 * order: 필터 안에서 먼저 걸려야 하는 순서(작을수록 위). 조건이 겹칠 때만 의미가 있다.
 *   1 이중 타락 → 2 특출난 → 3 5등급 → 4 4등급 → 5 아이템 레벨 82+ → 6 희귀도 → 9 나머지 잡기
 */
import type { Sample } from "./evaluate";

export type Tone = "normal" | "magic" | "rare" | "unique" | "gem" | "misc";

/** 조건 하나: 같은 베이스를 이 조건으로 따로 티어에 넣는다. */
export type Variant = {
  id: string;
  label: string;
  conditions: string[];
  order: number;
  tone: Tone;
  /** 기본 티어 계산용 예시 값 */
  sample: Sample;
};

export type CatalogBase = { en: string; ko: string; icon?: string; level?: number };
export type CatalogUnique = { en: string; ko: string; base: string; icon?: string; level?: number };
export type GearClass = {
  slug: string;
  filterClass: string;
  ko: string;
  icon?: string;
  bases: CatalogBase[];
  uniques: CatalogUnique[];
};

const NMR = "Rarity Normal Magic Rare";
const BIG = new Set(["Body Armours", "Bows", "Crossbows", "Quarterstaves", "Staves", "Talismans", "Two Hand Maces"]);

const rarityVariants: Variant[] = [
  { id: "normal", label: "일반", conditions: ["Rarity Normal"], order: 6, tone: "normal", sample: { Rarity: "Normal" } },
  { id: "magic", label: "마법", conditions: ["Rarity Magic"], order: 6, tone: "magic", sample: { Rarity: "Magic" } },
  { id: "rare", label: "희귀", conditions: ["Rarity Rare"], order: 6, tone: "rare", sample: { Rarity: "Rare" } },
];

const tierVariants: Variant[] = [
  {
    id: "t5",
    label: "5등급",
    conditions: ["UnidentifiedItemTier >= 5", NMR],
    order: 3,
    tone: "rare",
    sample: { Rarity: "Rare", UnidentifiedItemTier: 5 },
  },
  {
    id: "t4",
    label: "4등급",
    conditions: ["UnidentifiedItemTier 4", NMR],
    order: 4,
    tone: "rare",
    sample: { Rarity: "Rare", UnidentifiedItemTier: 4 },
  },
];

const twice: Variant = {
  id: "twice",
  label: "이중 타락",
  conditions: ["TwiceCorrupted True", NMR],
  order: 1,
  tone: "rare",
  sample: { Rarity: "Rare", Corrupted: true, TwiceCorrupted: true },
};

const ilvl82: Variant = {
  id: "ilvl82",
  label: "아이템 레벨 82+",
  conditions: ["ItemLevel >= 82", "Rarity Normal Magic"],
  order: 5,
  tone: "normal",
  sample: { Rarity: "Normal", ItemLevel: 82 },
};

/** 장비(무기·방어구) 조건. 소켓 초과 기준은 양손·갑옷 3개, 나머지 2개. */
function gearVariants(filterClass: string): Variant[] {
  const sockets = BIG.has(filterClass) ? 3 : 2;
  return [
    ...rarityVariants,
    ...tierVariants,
    {
      id: "quality",
      label: "품질 21+",
      conditions: ["Corrupted False", "Quality >= 21", NMR],
      order: 2,
      tone: "rare",
      sample: { Rarity: "Rare", Quality: 21 },
    },
    {
      id: "sockets",
      label: `소켓 ${sockets}개+`,
      conditions: ["Corrupted False", `Sockets >= ${sockets}`, NMR],
      order: 2,
      tone: "rare",
      sample: { Rarity: "Rare", Sockets: sockets },
    },
    twice,
    ilvl82,
  ];
}

const JEWELLERY_VARIANTS: Variant[] = [...rarityVariants, ...tierVariants, twice, ilvl82];

const JEWEL_VARIANTS: Variant[] = [
  {
    id: "enchanted",
    label: "타락 인챈트",
    conditions: ["AnyEnchantment True", "Corrupted True", NMR],
    order: 2,
    tone: "rare",
    sample: { Rarity: "Rare", Corrupted: true, AnyEnchantment: true },
  },
  { id: "rare", label: "희귀", conditions: ["Rarity Rare"], order: 6, tone: "rare", sample: { Rarity: "Rare" } },
  {
    id: "magic",
    label: "일반·마법",
    conditions: ["Rarity Normal Magic"],
    order: 6,
    tone: "magic",
    sample: { Rarity: "Magic" },
  },
];

const FLASK_VARIANTS: Variant[] = [
  {
    id: "quality",
    label: "품질 18+",
    conditions: ["Quality >= 18", "Rarity Normal Magic"],
    order: 2,
    tone: "magic",
    sample: { Rarity: "Magic", Quality: 20, ItemLevel: 82 },
  },
  {
    id: "magic",
    label: "일반·마법",
    conditions: ["Rarity Normal Magic"],
    order: 6,
    tone: "magic",
    sample: { Rarity: "Magic" },
  },
];

/** 장비류 탭: 어떤 클래스를 넣고 조건을 어떻게 나눌지 */
export const EQUIPMENT_TABS: {
  id: string;
  label: string;
  match: (g: GearClass) => boolean;
  variants: (g: GearClass) => Variant[];
}[] = [
  {
    id: "gear",
    label: "장비",
    match: (g) => !/Rings|Amulets|Belts|Jewels|Charms|Flasks|Gems|Tablet|Relics/.test(g.filterClass),
    variants: (g) => gearVariants(g.filterClass),
  },
  {
    id: "jewellery",
    label: "장신구",
    match: (g) => ["Rings", "Amulets", "Belts"].includes(g.filterClass),
    variants: () => JEWELLERY_VARIANTS,
  },
  { id: "jewels", label: "주얼", match: (g) => g.filterClass === "Jewels", variants: () => JEWEL_VARIANTS },
  {
    id: "flasks",
    label: "플라스크·호신부",
    match: (g) => /Charms|Flasks/.test(g.filterClass),
    variants: () => FLASK_VARIANTS,
  },
];

/** 조건 없이 하나씩 넣는 항목(젬·기타) */
export type ExtraItem = {
  id: string;
  label: string;
  conditions: string[];
  baseTypes?: string[];
  order: number;
  sample: Sample;
  tone?: Tone;
  icon?: string;
};

export type ExtraCategory = { id: string; label: string; items: ExtraItem[] };

export function buildExtraCategories(gear: GearClass[], icons: Record<string, string>): ExtraCategory[] {
  const iconOf = (cls: string) => gear.find((g) => g.filterClass === cls)?.icon;

  const uncut = (kind: string, ko: string, en: string): ExtraItem[] => [
    {
      id: `gem:${kind}:20`,
      label: `미가공 ${ko} 20레벨`,
      conditions: ["GemLevel >= 20", `BaseType "${en}"`],
      order: 6,
      tone: "gem",
      icon: icons[`${en} (Level 20)`],
      sample: { BaseType: en, GemLevel: 20 },
    },
    {
      id: `gem:${kind}:19`,
      label: `미가공 ${ko} 19레벨`,
      conditions: ["GemLevel 19", `BaseType "${en}"`],
      order: 6,
      tone: "gem",
      icon: icons[`${en} (Level 19)`],
      sample: { BaseType: en, GemLevel: 19 },
    },
    {
      id: `gem:${kind}:low`,
      label: `미가공 ${ko} 18레벨 이하`,
      conditions: ["GemLevel <= 18", `BaseType "${en}"`],
      order: 6,
      tone: "gem",
      icon: icons[`${en} (Level 10)`],
      sample: { BaseType: en, GemLevel: 18 },
    },
  ];

  const gems: ExtraItem[] = [
    ...uncut("skill", "스킬 젬", "Uncut Skill Gem"),
    ...uncut("spirit", "정신 젬", "Uncut Spirit Gem"),
    {
      id: "gem:support",
      label: "미가공 보조 젬",
      conditions: ['BaseType "Uncut Support Gem"'],
      order: 6,
      tone: "gem",
      icon: icons["Uncut Support Gem (Level 5)"],
      sample: { BaseType: "Uncut Support Gem", GemLevel: 3 },
    },
    {
      id: "gem:twice",
      label: "이중 타락 젬",
      conditions: ["TwiceCorrupted True", 'Class == "Skill Gems" "Support Gems"'],
      order: 1,
      tone: "gem",
      icon: iconOf("Skill Gems"),
      sample: { Class: "Skill Gems", BaseType: "Fireball", Corrupted: true, TwiceCorrupted: true },
    },
    {
      id: "gem:other",
      label: "그 외 젬",
      conditions: ['Class == "Skill Gems" "Support Gems"'],
      order: 9,
      tone: "gem",
      icon: iconOf("Support Gems"),
      sample: { Class: "Skill Gems", BaseType: "Fireball" },
    },
  ];

  const misc: ExtraItem[] = [
    {
      id: "misc:quest",
      label: "퀘스트 아이템",
      conditions: ['Class == "Instance Local Items" "Quest Items"'],
      order: 6,
      tone: "misc",
      sample: { Class: "Quest Items", BaseType: "" },
    },
    {
      id: "misc:logbook",
      label: "탐험 일지",
      conditions: ['Class == "Expedition Logbook"'],
      order: 6,
      tone: "misc",
      icon: icons["Expedition Logbook"],
      sample: { Class: "Expedition Logbook", BaseType: "Expedition Logbook" },
    },
    {
      id: "misc:gold-huge",
      label: "골드 5000+",
      conditions: ["StackSize >= 5000"],
      baseTypes: ["Gold"],
      order: 6,
      tone: "misc",
      sample: { BaseType: "Gold", StackSize: 5000 },
    },
    {
      id: "misc:gold-large",
      label: "골드 2000~4999",
      conditions: ["StackSize >= 2000", "StackSize <= 4999"],
      baseTypes: ["Gold"],
      order: 6,
      tone: "misc",
      sample: { BaseType: "Gold", StackSize: 2000 },
    },
    {
      id: "misc:gold-small",
      label: "골드 2000 미만",
      conditions: ["StackSize < 2000"],
      baseTypes: ["Gold"],
      order: 6,
      tone: "misc",
      sample: { BaseType: "Gold", StackSize: 300 },
    },
    {
      id: "misc:unique-other",
      label: "목록에 없는 고유",
      conditions: ["Rarity Unique"],
      order: 9,
      tone: "unique",
      sample: { Class: "Unknown", Rarity: "Unique", BaseType: "Unlisted Base" },
    },
  ];

  return [
    { id: "gems", label: "젬", items: gems },
    { id: "misc", label: "기타", items: misc },
  ];
}
