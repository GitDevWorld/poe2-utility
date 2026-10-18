/**
 * 장비·장신구·주얼·플라스크·고유·젬·기타 항목.
 * 장비류는 poe2db 카탈로그의 클래스 → 베이스(실제 아이템) 단위이고, 같은 베이스를
 * "조건 조합"(희귀도·미확인 등급·특출난·아이템 레벨을 AND 로 묶은 것)마다 따로 티어에 넣는다.
 * 조건이 많이 걸린 조합이 필터에서 먼저 걸린다.
 */
import type { Sample } from "./evaluate";

export type Tone = "normal" | "magic" | "rare" | "unique" | "gem" | "misc";

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

export type Rarity = "Normal" | "Magic" | "Rare";
export type TierCond = "4" | "5" | "45";
export type Exceptional = "quality" | "sockets" | "twice" | "enchanted" | "quality18";

/** 조건 조합: 걸린 조건을 모두 만족하는 아이템 (AND) */
export type RuleDef = {
  id: string;
  rarity: Rarity[];
  tier?: TierCond;
  exceptional?: Exceptional;
  ilvl?: number;
};

export const RARITY_KO: Record<Rarity, string> = { Normal: "일반", Magic: "마법", Rare: "희귀" };
export const TIER_KO: Record<TierCond, string> = { "4": "4등급", "5": "5등급", "45": "4~5등급" };

const BIG = new Set(["Body Armours", "Bows", "Crossbows", "Quarterstaves", "Staves", "Talismans", "Two Hand Maces"]);
const socketsFor = (filterClass?: string) => (filterClass && BIG.has(filterClass) ? 3 : 2);

export function exceptionalLabel(e: Exceptional, filterClass?: string): string {
  switch (e) {
    case "quality":
      return "품질 21+";
    case "sockets":
      return filterClass ? `소켓 ${socketsFor(filterClass)}개+` : "소켓 초과";
    case "twice":
      return "이중 타락";
    case "enchanted":
      return "타락 인챈트";
    case "quality18":
      return "품질 18+";
  }
}

/** 장비류 탭이 어떤 조건을 고를 수 있는지와 기본 조합 */
export type TabSpec = {
  id: string;
  label: string;
  match: (g: GearClass) => boolean;
  rarities: Rarity[];
  tiers: boolean;
  exceptionals: Exceptional[];
  ilvl: boolean;
  /** 처음 주어지는 조합 (예전 단일 조건 버튼과 같은 id 라 저장된 배치가 이어진다) */
  defaults: RuleDef[];
};

const NMR: Rarity[] = ["Normal", "Magic", "Rare"];

export const EQUIPMENT_TABS: TabSpec[] = [
  {
    id: "gear",
    label: "장비",
    match: (g) => !/Rings|Amulets|Belts|Jewels|Charms|Flasks|Gems|Tablet|Relics/.test(g.filterClass),
    rarities: NMR,
    tiers: true,
    exceptionals: ["quality", "sockets", "twice"],
    ilvl: true,
    defaults: [
      { id: "normal", rarity: ["Normal"] },
      { id: "magic", rarity: ["Magic"] },
      { id: "rare", rarity: ["Rare"] },
      { id: "t5", rarity: NMR, tier: "5" },
      { id: "t4", rarity: NMR, tier: "4" },
      { id: "quality", rarity: NMR, exceptional: "quality" },
      { id: "sockets", rarity: NMR, exceptional: "sockets" },
      { id: "twice", rarity: NMR, exceptional: "twice" },
      { id: "ilvl82", rarity: ["Normal", "Magic"], ilvl: 82 },
    ],
  },
  {
    id: "jewellery",
    label: "장신구",
    match: (g) => ["Rings", "Amulets", "Belts"].includes(g.filterClass),
    rarities: NMR,
    tiers: true,
    exceptionals: ["twice"],
    ilvl: true,
    defaults: [
      { id: "normal", rarity: ["Normal"] },
      { id: "magic", rarity: ["Magic"] },
      { id: "rare", rarity: ["Rare"] },
      { id: "t5", rarity: NMR, tier: "5" },
      { id: "t4", rarity: NMR, tier: "4" },
      { id: "twice", rarity: NMR, exceptional: "twice" },
      { id: "ilvl82", rarity: ["Normal", "Magic"], ilvl: 82 },
    ],
  },
  {
    id: "jewels",
    label: "주얼",
    match: (g) => g.filterClass === "Jewels",
    rarities: NMR,
    tiers: false,
    exceptionals: ["enchanted"],
    ilvl: false,
    defaults: [
      { id: "enchanted", rarity: NMR, exceptional: "enchanted" },
      { id: "rare", rarity: ["Rare"] },
      { id: "magic", rarity: ["Normal", "Magic"] },
    ],
  },
  {
    id: "flasks",
    label: "플라스크·호신부",
    match: (g) => /Charms|Flasks/.test(g.filterClass),
    rarities: ["Normal", "Magic"],
    tiers: false,
    exceptionals: ["quality18"],
    ilvl: false,
    defaults: [
      { id: "quality", rarity: ["Normal", "Magic"], exceptional: "quality18" },
      { id: "magic", rarity: ["Normal", "Magic"] },
    ],
  },
];

/** 조합 이름: "희귀 · 5등급 · 품질 21+ · 아이템 레벨 82+" */
export function ruleLabel(rule: RuleDef, spec: TabSpec, filterClass?: string): string {
  const parts: string[] = [];
  const allRarities = spec.rarities.every((r) => rule.rarity.includes(r));
  if (!allRarities || (!rule.tier && !rule.exceptional && !rule.ilvl)) parts.push(rule.rarity.map((r) => RARITY_KO[r]).join("·"));
  if (rule.tier) parts.push(TIER_KO[rule.tier]);
  if (rule.exceptional) parts.push(exceptionalLabel(rule.exceptional, filterClass));
  if (rule.ilvl) parts.push(`아이템 레벨 ${rule.ilvl}+`);
  return parts.join(" · ");
}

/** 필터 안 순서: 조건이 많이 걸릴수록 먼저(작은 값). 특출난 > 등급 > 아이템 레벨 > 희귀도 순으로 무게를 둔다. */
export function ruleOrder(rule: RuleDef, spec: TabSpec): number {
  let weight = 0;
  if (rule.exceptional) weight += 4;
  if (rule.tier) weight += 3;
  if (rule.ilvl) weight += 2;
  if (!spec.rarities.every((r) => rule.rarity.includes(r))) weight += 1;
  return 6 - weight;
}

export function ruleConditions(rule: RuleDef, filterClass: string): string[] {
  const out: string[] = [];
  if (rule.exceptional === "quality") out.push("Corrupted False", "Quality >= 21");
  if (rule.exceptional === "sockets") out.push("Corrupted False", `Sockets >= ${socketsFor(filterClass)}`);
  if (rule.exceptional === "twice") out.push("TwiceCorrupted True");
  if (rule.exceptional === "enchanted") out.push("AnyEnchantment True", "Corrupted True");
  if (rule.exceptional === "quality18") out.push("Quality >= 18");
  if (rule.tier === "4") out.push("UnidentifiedItemTier 4");
  if (rule.tier === "5") out.push("UnidentifiedItemTier >= 5");
  if (rule.tier === "45") out.push("UnidentifiedItemTier >= 4");
  if (rule.ilvl) out.push(`ItemLevel >= ${rule.ilvl}`);
  out.push(`Rarity ${rule.rarity.join(" ")}`, `Class == "${filterClass}"`);
  return out;
}

/** 기본 티어 계산용 예시: 조합을 만족하는 대표 아이템 (가장 높은 희귀도) */
export function ruleSample(rule: RuleDef, filterClass: string): Sample {
  const sample: Sample = { Rarity: rule.rarity[rule.rarity.length - 1] ?? "Normal" };
  if (rule.exceptional === "quality") sample.Quality = 21;
  if (rule.exceptional === "sockets") sample.Sockets = socketsFor(filterClass);
  if (rule.exceptional === "twice") Object.assign(sample, { Corrupted: true, TwiceCorrupted: true });
  if (rule.exceptional === "enchanted") Object.assign(sample, { Corrupted: true, AnyEnchantment: true });
  if (rule.exceptional === "quality18") Object.assign(sample, { Quality: 20, ItemLevel: 82 });
  if (rule.tier) sample.UnidentifiedItemTier = rule.tier === "4" ? 4 : 5;
  if (rule.ilvl) sample.ItemLevel = rule.ilvl;
  return sample;
}

export function ruleTone(rule: RuleDef): Tone {
  const top = rule.rarity[rule.rarity.length - 1];
  return top === "Rare" ? "rare" : top === "Magic" ? "magic" : "normal";
}

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
