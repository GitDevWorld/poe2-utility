/**
 * 화폐류 밖의 아이템(장비·장신구·특출난·고유·젬·주얼·플라스크·기타)을 티어에 넣는 항목.
 * 항목마다 필터 조건과, 기본 티어를 기준 필터로 계산할 예시 아이템(sample)을 둔다.
 *
 * order: 필터 안에서 먼저 걸려야 하는 순서(작을수록 위). 항목끼리 조건이 겹칠 때만 의미가 있다.
 *   0 특정 베이스 예외 → 1 고급 조건 → 2 특출난 → 3 장비 등급 → 5 일반 → 9 나머지 잡기
 */
import type { Sample } from "./evaluate";

export type Tone = "normal" | "magic" | "rare" | "unique" | "gem" | "misc";

export type ExtraItem = {
  id: string;
  label: string;
  conditions: string[];
  baseTypes?: string[];
  order: number;
  sample: Sample;
  tone?: Tone;
  /** 아이콘을 찾을 경매장 이름 */
  iconOf?: string;
};

export type ExtraCategory = { id: string; label: string; items: ExtraItem[] };

const GEAR: [string, string][] = [
  ["Body Armours", "갑옷"],
  ["Helmets", "투구"],
  ["Gloves", "장갑"],
  ["Boots", "장화"],
  ["Shields", "방패"],
  ["Bucklers", "버클러"],
  ["Foci", "집중구"],
  ["Quivers", "화살통"],
  ["Bows", "활"],
  ["Crossbows", "석궁"],
  ["Quarterstaves", "육척봉"],
  ["Spears", "창"],
  ["One Hand Maces", "한손 철퇴"],
  ["Two Hand Maces", "양손 철퇴"],
  ["Sceptres", "셉터"],
  ["Staves", "지팡이"],
  ["Wands", "마법봉"],
  ["Talismans", "부적"],
];
const GEAR_CLASSES = `Class == ${GEAR.map(([c]) => `"${c}"`).join(" ")}`;
const BIG_GEAR = 'Class == "Body Armours" "Bows" "Crossbows" "Quarterstaves" "Staves" "Talismans" "Two Hand Maces"';
const SMALL_GEAR =
  'Class == "Boots" "Bucklers" "Foci" "Gloves" "Helmets" "One Hand Maces" "Sceptres" "Shields" "Spears" "Wands"';

const RARITIES: [string, string, Tone][] = [
  ["Normal", "일반", "normal"],
  ["Magic", "마법", "magic"],
  ["Rare", "희귀", "rare"],
];

const JEWELLERY: [string, string][] = [
  ["Rings", "반지"],
  ["Amulets", "목걸이"],
  ["Belts", "허리띠"],
];

const LOW_JEWELLERY = ["Azure Amulet", "Crimson Amulet", "Emerald Ring", "Iron Ring", "Lazuli Ring", "Unset Ring"];

/** 기준 필터의 고유 등급 목록(NeverSink $type->uniques $tier->t1 …)으로 고유 항목을 만든다. */
export function buildExtraCategories(uniqueTiers: Record<string, string[]>): ExtraCategory[] {
  const gear: ExtraItem[] = GEAR.flatMap(([cls, ko]) =>
    RARITIES.map(([rarity, rko, tone]) => ({
      id: `gear:${cls}:${rarity}`,
      label: `${rko} ${ko}`,
      conditions: [`Rarity ${rarity}`, `Class == "${cls}"`],
      order: 5,
      tone,
      sample: { Class: cls, Rarity: rarity, BaseType: "", UnidentifiedItemTier: 1 },
    })),
  );

  const jewellery: ExtraItem[] = JEWELLERY.flatMap(([cls, ko]) =>
    RARITIES.map(([rarity, rko, tone]) => ({
      id: `jewel:${cls}:${rarity}`,
      label: `${rko} ${ko}`,
      conditions: [`Rarity ${rarity}`, `Class == "${cls}"`],
      order: 5,
      tone,
      sample: { Class: cls, Rarity: rarity, BaseType: "", UnidentifiedItemTier: 1 },
    })),
  );

  const exceptional: ExtraItem[] = [
    {
      id: "ex:lowjewel",
      label: "저가 반지·목걸이 베이스",
      conditions: ["Rarity Normal Magic Rare"],
      baseTypes: LOW_JEWELLERY,
      order: 0,
      tone: "rare",
      sample: { Class: "Rings", Rarity: "Rare", BaseType: "Iron Ring", UnidentifiedItemTier: 4 },
    },
    {
      id: "ex:jewel45",
      label: "반지·목걸이 4~5등급",
      conditions: ["UnidentifiedItemTier >= 4", "Rarity Normal Magic Rare", 'Class == "Amulets" "Rings"'],
      order: 1,
      tone: "rare",
      sample: { Class: "Rings", Rarity: "Rare", BaseType: "Ruby Ring", UnidentifiedItemTier: 4 },
    },
    {
      id: "ex:quality",
      label: "특출난 품질 21+",
      conditions: ["Corrupted False", "Quality >= 21", "Rarity Normal Magic Rare", GEAR_CLASSES],
      order: 2,
      tone: "rare",
      sample: { Class: "Gloves", Rarity: "Rare", BaseType: "", Quality: 21 },
    },
    {
      id: "ex:socket3",
      label: "특출난 소켓 3개+ (양손·갑옷)",
      conditions: ["Corrupted False", "Sockets >= 3", "Rarity Normal Magic Rare", BIG_GEAR],
      order: 2,
      tone: "rare",
      sample: { Class: "Body Armours", Rarity: "Rare", BaseType: "", Sockets: 3 },
    },
    {
      id: "ex:socket2",
      label: "특출난 소켓 2개+ (한손·방어구)",
      conditions: ["Corrupted False", "Sockets >= 2", "Rarity Normal Magic Rare", SMALL_GEAR],
      order: 2,
      tone: "rare",
      sample: { Class: "Gloves", Rarity: "Rare", BaseType: "", Sockets: 2 },
    },
    {
      id: "ex:twice-rare",
      label: "이중 타락 희귀",
      conditions: ["TwiceCorrupted True", "Rarity Rare"],
      order: 2,
      tone: "rare",
      sample: { Class: "Gloves", Rarity: "Rare", BaseType: "", Corrupted: true, TwiceCorrupted: true },
    },
    {
      id: "ex:twice-magic",
      label: "이중 타락 일반·마법",
      conditions: ["TwiceCorrupted True", "Rarity Normal Magic"],
      order: 2,
      tone: "magic",
      sample: { Class: "Gloves", Rarity: "Magic", BaseType: "", Corrupted: true, TwiceCorrupted: true },
    },
    {
      id: "ex:gear5",
      label: "장비 5등급",
      conditions: ["UnidentifiedItemTier >= 5", "Rarity Normal Magic Rare", GEAR_CLASSES],
      order: 3,
      tone: "rare",
      sample: { Class: "Gloves", Rarity: "Rare", BaseType: "", UnidentifiedItemTier: 5 },
    },
    {
      id: "ex:gear4",
      label: "장비 4등급",
      conditions: ["UnidentifiedItemTier 4", "Rarity Normal Magic Rare", GEAR_CLASSES],
      order: 3,
      tone: "rare",
      sample: { Class: "Gloves", Rarity: "Rare", BaseType: "", UnidentifiedItemTier: 4 },
    },
  ];

  const uniqueTier = (id: string, label: string, list: string[] | undefined): ExtraItem[] =>
    list?.length
      ? [
          {
            id: `unique:${id}`,
            label,
            conditions: ["Rarity Unique"],
            baseTypes: list,
            order: 1,
            tone: "unique",
            sample: { Class: "Body Armours", Rarity: "Unique", BaseType: list[0] },
          },
        ]
      : [];

  const uniques: ExtraItem[] = [
    {
      id: "unique:belt",
      label: "고유 허리띠 (헤드헌터·마법사의 피)",
      conditions: ["Rarity Unique", 'Class == "Belts"'],
      baseTypes: ["Heavy Belt", "Utility Belt"],
      order: 0,
      tone: "unique",
      sample: { Class: "Belts", Rarity: "Unique", BaseType: "Heavy Belt" },
    },
    {
      id: "unique:tablet",
      label: "고유 서판",
      conditions: ["Rarity Unique", 'Class == "Tablet"'],
      order: 0,
      tone: "unique",
      sample: { Class: "Tablet", Rarity: "Unique", BaseType: "Ritual Tablet" },
    },
    {
      id: "unique:ring",
      label: "고유 반지",
      conditions: ["Rarity Unique", 'Class == "Rings"'],
      order: 0,
      tone: "unique",
      sample: { Class: "Rings", Rarity: "Unique", BaseType: "Ruby Ring" },
    },
    {
      id: "unique:amulet",
      label: "고유 목걸이",
      conditions: ["Rarity Unique", 'Class == "Amulets"'],
      order: 0,
      tone: "unique",
      sample: { Class: "Amulets", Rarity: "Unique", BaseType: "Jade Amulet" },
    },
    {
      id: "unique:jewel",
      label: "고유 주얼",
      conditions: ["Rarity Unique", 'Class == "Jewels"'],
      order: 0,
      tone: "unique",
      sample: { Class: "Jewels", Rarity: "Unique", BaseType: "Ruby" },
    },
    ...uniqueTier("t1", "고유 1티어 베이스", uniqueTiers.t1),
    ...uniqueTier("t2", "고유 2티어 베이스", uniqueTiers.t2),
    ...uniqueTier("t3", "고유 3티어 베이스", uniqueTiers.t3),
    ...uniqueTier("t4", "고유 4티어 베이스", uniqueTiers.t4),
    {
      id: "unique:other",
      label: "그 외 고유",
      conditions: ["Rarity Unique"],
      order: 9,
      tone: "unique",
      sample: { Class: "Body Armours", Rarity: "Unique", BaseType: "Unlisted Base" },
    },
  ];

  const uncut = (kind: string, ko: string, en: string): ExtraItem[] => [
    {
      id: `gem:${kind}:20`,
      label: `미가공 ${ko} 20레벨`,
      conditions: ["GemLevel >= 20", `BaseType "${en}"`],
      order: 5,
      tone: "gem",
      iconOf: `${en} (Level 20)`,
      sample: { BaseType: en, GemLevel: 20 },
    },
    {
      id: `gem:${kind}:19`,
      label: `미가공 ${ko} 19레벨`,
      conditions: ["GemLevel 19", `BaseType "${en}"`],
      order: 5,
      tone: "gem",
      iconOf: `${en} (Level 19)`,
      sample: { BaseType: en, GemLevel: 19 },
    },
    {
      id: `gem:${kind}:low`,
      label: `미가공 ${ko} 18레벨 이하`,
      conditions: ["GemLevel <= 18", `BaseType "${en}"`],
      order: 5,
      tone: "gem",
      iconOf: `${en} (Level 10)`,
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
      order: 5,
      tone: "gem",
      iconOf: "Uncut Support Gem (Level 5)",
      sample: { BaseType: "Uncut Support Gem", GemLevel: 3 },
    },
    {
      id: "gem:twice",
      label: "이중 타락 젬",
      conditions: ["TwiceCorrupted True", 'Class == "Skill Gems" "Support Gems"'],
      order: 1,
      tone: "gem",
      sample: { Class: "Skill Gems", BaseType: "Fireball", Corrupted: true, TwiceCorrupted: true },
    },
    {
      id: "gem:other",
      label: "그 외 젬",
      conditions: ['Class == "Skill Gems" "Support Gems"'],
      order: 9,
      tone: "gem",
      sample: { Class: "Skill Gems", BaseType: "Fireball" },
    },
  ];

  const jewels: ExtraItem[] = [
    {
      id: "jewelitem:timelost",
      label: "오래된 주얼",
      conditions: ["Rarity Normal Magic Rare", 'Class == "Jewels"'],
      baseTypes: ["Time-Lost Emerald", "Time-Lost Ruby", "Time-Lost Sapphire"],
      order: 1,
      tone: "rare",
      sample: { Class: "Jewels", Rarity: "Rare", BaseType: "Time-Lost Ruby" },
    },
    {
      id: "jewelitem:enchanted",
      label: "타락 인챈트 주얼",
      conditions: ["AnyEnchantment True", "Corrupted True", "Rarity Normal Magic Rare", 'Class == "Jewels"'],
      order: 1,
      tone: "rare",
      sample: { Class: "Jewels", Rarity: "Rare", BaseType: "Ruby", Corrupted: true, AnyEnchantment: true },
    },
    {
      id: "jewelitem:rare",
      label: "희귀 주얼",
      conditions: ["Rarity Rare", 'Class == "Jewels"'],
      order: 5,
      tone: "rare",
      sample: { Class: "Jewels", Rarity: "Rare", BaseType: "Ruby" },
    },
    {
      id: "jewelitem:magic",
      label: "일반·마법 주얼",
      conditions: ["Rarity Normal Magic", 'Class == "Jewels"'],
      order: 5,
      tone: "magic",
      sample: { Class: "Jewels", Rarity: "Magic", BaseType: "Ruby" },
    },
  ];

  const flasks: ExtraItem[] = [
    {
      id: "flask:charm-quality",
      label: "고품질 호신부 (품질 18+)",
      conditions: ["Quality >= 18", "Rarity Normal Magic", 'Class == "Charms"'],
      order: 1,
      tone: "magic",
      sample: { Class: "Charms", Rarity: "Magic", BaseType: "Golden Charm", Quality: 20, ItemLevel: 82 },
    },
    {
      id: "flask:charm",
      label: "호신부",
      conditions: ["Rarity Normal Magic", 'Class == "Charms"'],
      order: 5,
      tone: "magic",
      sample: { Class: "Charms", Rarity: "Magic", BaseType: "Golden Charm" },
    },
    {
      id: "flask:life",
      label: "생명력 플라스크",
      conditions: ["Rarity Normal Magic", 'Class == "Life Flasks"'],
      order: 5,
      tone: "magic",
      sample: { Class: "Life Flasks", Rarity: "Magic", BaseType: "Ultimate Life Flask" },
    },
    {
      id: "flask:mana",
      label: "마나 플라스크",
      conditions: ["Rarity Normal Magic", 'Class == "Mana Flasks"'],
      order: 5,
      tone: "magic",
      sample: { Class: "Mana Flasks", Rarity: "Magic", BaseType: "Ultimate Mana Flask" },
    },
  ];

  const misc: ExtraItem[] = [
    {
      id: "misc:quest",
      label: "퀘스트 아이템",
      conditions: ['Class == "Instance Local Items" "Quest Items"'],
      order: 5,
      tone: "misc",
      sample: { Class: "Quest Items", BaseType: "" },
    },
    {
      id: "misc:vault",
      label: "금고 열쇠",
      conditions: ['Class == "Vault Keys"'],
      order: 5,
      tone: "misc",
      sample: { Class: "Vault Keys", BaseType: "" },
    },
    {
      id: "misc:pinnacle",
      label: "최상위 보스 열쇠",
      conditions: ['Class == "Pinnacle Keys"'],
      order: 5,
      tone: "misc",
      sample: { Class: "Pinnacle Keys", BaseType: "" },
    },
    {
      id: "misc:logbook",
      label: "탐험 일지",
      conditions: ['Class == "Expedition Logbook"'],
      order: 5,
      tone: "misc",
      iconOf: "Expedition Logbook",
      sample: { Class: "Expedition Logbook", BaseType: "Expedition Logbook" },
    },
    {
      id: "misc:relic",
      label: "유물",
      conditions: ["Rarity Normal Magic"],
      baseTypes: ["Amphora Relic", "Coffer Relic", "Incense Relic", "Seal Relic", "Tapestry Relic", "Urn Relic", "Vase Relic"],
      order: 5,
      tone: "misc",
      sample: { Rarity: "Magic", BaseType: "Vase Relic" },
    },
    {
      id: "misc:djinn",
      label: "진 바리야",
      conditions: [],
      baseTypes: ["Djinn Barya"],
      order: 5,
      tone: "misc",
      sample: { BaseType: "Djinn Barya", ItemLevel: 80 },
    },
    {
      id: "misc:test",
      label: "시험 바리야",
      conditions: [],
      baseTypes: ["Test of Cunning Barya", "Test of Strength Barya", "Test of Time Barya", "Test of Will Barya"],
      order: 5,
      tone: "misc",
      sample: { BaseType: "Test of Will Barya" },
    },
    {
      id: "misc:ultimatum",
      label: "새겨진 결전",
      conditions: [],
      baseTypes: ["Inscribed Ultimatum"],
      order: 5,
      tone: "misc",
      sample: { BaseType: "Inscribed Ultimatum", Rarity: "Normal", ItemLevel: 80 },
    },
    {
      id: "misc:gold-huge",
      label: "골드 5000+",
      conditions: ["StackSize >= 5000"],
      baseTypes: ["Gold"],
      order: 5,
      tone: "misc",
      sample: { BaseType: "Gold", StackSize: 5000 },
    },
    {
      id: "misc:gold-large",
      label: "골드 2000~4999",
      conditions: ["StackSize >= 2000", "StackSize <= 4999"],
      baseTypes: ["Gold"],
      order: 5,
      tone: "misc",
      sample: { BaseType: "Gold", StackSize: 2000 },
    },
    {
      id: "misc:gold-small",
      label: "골드 2000 미만",
      conditions: ["StackSize < 2000"],
      baseTypes: ["Gold"],
      order: 5,
      tone: "misc",
      sample: { BaseType: "Gold", StackSize: 300 },
    },
  ];

  return [
    { id: "exceptional", label: "특출난·고급 장비", items: exceptional },
    { id: "gear", label: "장비", items: gear },
    { id: "jewellery", label: "장신구", items: jewellery },
    { id: "uniques", label: "고유", items: uniques },
    { id: "gems", label: "젬", items: gems },
    { id: "jewelitems", label: "주얼", items: jewels },
    { id: "flasks", label: "플라스크·호신부", items: flasks },
    { id: "misc", label: "기타", items: misc },
  ];
}
