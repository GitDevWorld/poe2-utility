/**
 * 장비·장신구 규칙: 화폐처럼 아이템을 티어에 넣는 대신, 조건을 모두 만족(AND)하는 아이템을 한 티어로 보낸다.
 * 규칙은 목록 순서대로 필터 맨 위에 들어가 위에 있는 규칙이 먼저 걸린다. 규칙에 안 걸린 장비는 기본값 필터를 따른다.
 */
import catalog from "./catalog.json";
import { matches, type Sample } from "./evaluate";
import type { GearClass } from "./extras";
import type { TierId } from "./tiers";

export type GearRarity = "Normal" | "Magic" | "Rare";
export type Corruption = "any" | "no" | "yes" | "twice";

export type GearRule = {
  id: string;
  enabled: boolean;
  /** 필터 Class 이름. 비어 있으면 모든 장비·장신구 */
  classes: string[];
  /** 특정 베이스만 (비어 있으면 모든 베이스) */
  bases: string[];
  rarity: GearRarity[];
  itemLevel?: number;
  /** 베이스 요구 레벨(렙제) 이상 */
  dropLevel?: number;
  /** 미확인 등급 이상 (1~5) */
  unidTier?: number;
  /** 특출난: 품질 21+ 또는 소켓이 보통보다 많음 */
  exceptional?: boolean;
  quality?: number;
  sockets?: number;
  corruption: Corruption;
  tier: TierId;
};

const GEAR = (catalog as { gear: GearClass[] }).gear.filter(
  (g) => g.bases.length && !/Gems|Tablet|Relics/.test(g.filterClass),
);

export const GEAR_GROUPS: { id: string; label: string; classes: string[] }[] = [
  {
    id: "weapons",
    label: "무기",
    classes: [
      "Bows",
      "Crossbows",
      "Quarterstaves",
      "Spears",
      "One Hand Maces",
      "Two Hand Maces",
      "Sceptres",
      "Staves",
      "Wands",
      "Talismans",
    ],
  },
  {
    id: "armour",
    label: "방어구",
    classes: [
      "Body Armours",
      "Helmets",
      "Gloves",
      "Boots",
      "Shields",
      "Bucklers",
      "Foci",
      "Quivers",
    ],
  },
  { id: "jewellery", label: "장신구", classes: ["Rings", "Amulets", "Belts"] },
  {
    id: "other",
    label: "주얼·플라스크",
    classes: ["Jewels", "Charms", "Life Flasks", "Mana Flasks"],
  },
];

export const GEAR_CLASSES = GEAR.map((g) => ({
  id: g.filterClass,
  label: g.ko,
  icon: g.icon,
  bases: [...g.bases].sort((a, b) => (b.level ?? 0) - (a.level ?? 0)),
}));
const classLabel = new Map(GEAR_CLASSES.map((c) => [c.id, c.label]));
const baseLabel = new Map(
  GEAR.flatMap((g) => g.bases.map((b) => [b.en, b.ko] as const)),
);

/** 소켓이 기본 2개인 클래스 (특출난 = 3개+), 나머지 무기·방어구는 2개+ */
const BIG = new Set([
  "Body Armours",
  "Bows",
  "Crossbows",
  "Quarterstaves",
  "Staves",
  "Talismans",
  "Two Hand Maces",
]);
const SOCKETED = new Set(
  [...GEAR_GROUPS[0].classes, ...GEAR_GROUPS[1].classes].filter(
    (c) => c !== "Quivers",
  ),
);

export const RARITY_LABEL: Record<GearRarity, string> = {
  Normal: "일반",
  Magic: "마법",
  Rare: "희귀",
};
export const CORRUPTION_LABEL: Record<Corruption, string> = {
  any: "상관없음",
  no: "타락 안 됨",
  yes: "타락됨",
  twice: "이중 타락",
};
export const ALL_RARITY: GearRarity[] = ["Normal", "Magic", "Rare"];

export function newGearRule(partial: Partial<GearRule> = {}): GearRule {
  return {
    id: `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
    enabled: true,
    classes: [],
    bases: [],
    rarity: [...ALL_RARITY],
    corruption: "any",
    tier: "c",
    ...partial,
  };
}

/** 자주 쓰는 규칙 예시 */
export const GEAR_PRESETS: { label: string; rule: Partial<GearRule> }[] = [
  {
    label: "82+ 특출난",
    rule: { itemLevel: 82, exceptional: true, corruption: "no", tier: "b" },
  },
  {
    label: "특출난 (품질·소켓)",
    rule: { exceptional: true, corruption: "no", tier: "c" },
  },
  { label: "이중 타락", rule: { corruption: "twice", tier: "c" } },
  { label: "5등급 희귀", rule: { rarity: ["Rare"], unidTier: 5, tier: "c" } },
  {
    label: "82+ 일반·마법 방어구",
    rule: {
      classes: GEAR_GROUPS[1].classes,
      rarity: ["Normal", "Magic"],
      itemLevel: 82,
      tier: "e",
    },
  },
  {
    label: "4등급+ 장신구",
    rule: { classes: GEAR_GROUPS[2].classes, unidTier: 4, tier: "d" },
  },
  {
    label: "나머지 일반·마법 숨김",
    rule: { rarity: ["Normal", "Magic"], tier: "hidden" },
  },
];

const names = (list: string[], label: Map<string, string>, max: number) =>
  list.length > max
    ? `${list
        .slice(0, max)
        .map((c) => label.get(c) ?? c)
        .join("·")} 외 ${list.length - max}`
    : list.map((c) => label.get(c) ?? c).join("·");

export function targetLabel(classes: string[]): string {
  if (!classes.length) return "모든 장비";
  const group = GEAR_GROUPS.find(
    (g) =>
      g.classes.length === classes.length &&
      g.classes.every((c) => classes.includes(c)),
  );
  return group ? group.label : names(classes, classLabel, 3);
}

/** "희귀 장갑·장화 · 아이템 레벨 82+ · 특출난" */
export function gearRuleSummary(rule: GearRule): string {
  const rarity =
    rule.rarity.length === ALL_RARITY.length
      ? ""
      : rule.rarity.map((r) => RARITY_LABEL[r]).join("·");
  const parts = [[rarity, targetLabel(rule.classes)].filter(Boolean).join(" ")];
  if (rule.bases.length) parts.push(names(rule.bases, baseLabel, 2));
  if (rule.itemLevel) parts.push(`아이템 레벨 ${rule.itemLevel}+`);
  if (rule.dropLevel) parts.push(`베이스 레벨 ${rule.dropLevel}+`);
  if (rule.unidTier)
    parts.push(rule.unidTier >= 5 ? "5등급" : `${rule.unidTier}등급 이상`);
  if (rule.exceptional) parts.push("특출난");
  if (rule.quality) parts.push(`품질 ${rule.quality}+`);
  if (rule.sockets) parts.push(`소켓 ${rule.sockets}개+`);
  if (rule.corruption !== "any") parts.push(CORRUPTION_LABEL[rule.corruption]);
  return parts.join(" · ");
}

const quoted = (list: string[]) => list.map((n) => `"${n}"`).join(" ");

/**
 * 필터 규칙 조건 묶음. 대부분 하나이고, "특출난"은 품질 21+ 또는 소켓 초과라
 * 필터에서는 OR 를 쓸 수 없어 품질 규칙·소켓 규칙으로 나눈다.
 */
export function gearRuleBlocks(rule: GearRule): string[][] {
  const classes = rule.classes.length
    ? rule.classes
    : GEAR_CLASSES.map((c) => c.id);
  const common: string[] = [];
  if (rule.corruption === "no") common.push("Corrupted False");
  if (rule.corruption === "yes") common.push("Corrupted True");
  if (rule.corruption === "twice") common.push("TwiceCorrupted True");
  if (rule.quality) common.push(`Quality >= ${rule.quality}`);
  if (rule.sockets) common.push(`Sockets >= ${rule.sockets}`);
  if (rule.unidTier) common.push(`UnidentifiedItemTier >= ${rule.unidTier}`);
  if (rule.itemLevel) common.push(`ItemLevel >= ${rule.itemLevel}`);
  if (rule.dropLevel) common.push(`DropLevel >= ${rule.dropLevel}`);
  common.push(
    `Rarity ${(rule.rarity.length ? rule.rarity : ALL_RARITY).join(" ")}`,
  );
  const tail = rule.bases.length ? [`BaseType == ${quoted(rule.bases)}`] : [];
  const block = (extra: string[], list: string[]) => [
    ...common,
    ...extra,
    `Class == ${quoted(list)}`,
    ...tail,
  ];

  if (!rule.exceptional) return [block([], classes)];
  const big = classes.filter((c) => BIG.has(c));
  const small = classes.filter((c) => SOCKETED.has(c) && !BIG.has(c));
  const out = [block(["Quality >= 21"], classes)];
  if (big.length) out.push(block(["Sockets >= 3"], big));
  if (small.length) out.push(block(["Sockets >= 2"], small));
  return out;
}

/** 예시 아이템이 규칙에 걸리는지 */
export function gearRuleMatches(rule: GearRule, sample: Sample): boolean {
  return (
    rule.enabled &&
    gearRuleBlocks(rule).some((conditions) => matches(conditions, sample))
  );
}

export function parseGearRules(value: unknown): GearRule[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (r): r is GearRule =>
        Boolean(r) &&
        typeof r === "object" &&
        typeof (r as GearRule).id === "string",
    )
    .map((r) => newGearRule({ ...r }));
}
