/**
 * 고유·젬·기타 항목과 poe2db 카탈로그의 장비 클래스 타입.
 * 장비·장신구는 gearRules.ts 의 조건 규칙으로 다룬다.
 */
import type { Sample } from "./evaluate";

export type Tone = "normal" | "magic" | "rare" | "unique" | "gem" | "misc";

export type CatalogBase = {
  en: string;
  ko: string;
  icon?: string;
  level?: number;
};
export type CatalogUnique = {
  en: string;
  ko: string;
  base: string;
  icon?: string;
  level?: number;
};
export type GearClass = {
  slug: string;
  filterClass: string;
  ko: string;
  icon?: string;
  bases: CatalogBase[];
  uniques: CatalogUnique[];
};

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

export function buildExtraCategories(
  gear: GearClass[],
  icons: Record<string, string>,
): ExtraCategory[] {
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
      conditions: [
        "TwiceCorrupted True",
        'Class == "Skill Gems" "Support Gems"',
      ],
      order: 1,
      tone: "gem",
      icon: iconOf("Skill Gems"),
      sample: {
        Class: "Skill Gems",
        BaseType: "Fireball",
        Corrupted: true,
        TwiceCorrupted: true,
      },
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
