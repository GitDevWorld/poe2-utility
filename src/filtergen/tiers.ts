/**
 * 티어 메이커식 필터 생성: 아이템을 티어에 넣고, 티어마다 소리·표시 여부를 정한다.
 * 생성한 필터 = 우리 티어 규칙(맨 위, 먼저 걸림) + 기준 필터 전체(장비·고유·젬 등 나머지 아이템용).
 */
import { CATEGORIES, cellKey, readDefaults, type CellGroup } from "./generate";

export type TierId = "sss" | "ss" | "s" | "a" | "b" | "c" | "d" | "e" | "f" | "hidden";

export type TierStyle = {
  size: number;
  text: string;
  border?: string;
  background?: string;
  effect?: string;
  icon?: string;
};

export type TierDef = { id: TierId; label: string; color: string; sound: string; style: TierStyle };

/** 티어 순서 = 필터 안 순서. 기본 소리는 정정민 필터의 lv1~lv7 에 맞췄다. */
export const TIERS: TierDef[] = [
  {
    id: "sss",
    label: "SSS",
    color: "#ff7f7f",
    sound: "lv1",
    style: { size: 45, text: "255 0 0 255", border: "255 0 0 255", background: "255 255 255 255", effect: "Red", icon: "0 Red Star" },
  },
  {
    id: "ss",
    label: "SS",
    color: "#ffbf7f",
    sound: "lv2",
    style: { size: 45, text: "255 255 255 255", border: "255 255 255 255", background: "220 0 255 255", effect: "Red", icon: "0 Red Hexagon" },
  },
  {
    id: "s",
    label: "S",
    color: "#ffdf7f",
    sound: "lv3",
    style: { size: 45, text: "255 255 255 255", border: "255 255 255 255", background: "245 105 90 255", effect: "Red", icon: "0 Red Circle" },
  },
  {
    id: "a",
    label: "A",
    color: "#ffff7f",
    sound: "lv4",
    style: { size: 45, text: "255 255 255 255", border: "255 255 255 255", background: "188 96 37 255", effect: "Orange", icon: "0 Orange Circle" },
  },
  {
    id: "b",
    label: "B",
    color: "#bfff7f",
    sound: "lv5",
    style: { size: 42, text: "0 0 0 255", border: "0 0 0 255", background: "245 105 90 255", effect: "Yellow", icon: "1 Yellow Circle" },
  },
  {
    id: "c",
    label: "C",
    color: "#7fff7f",
    sound: "lv6",
    style: { size: 42, text: "0 0 0 255", border: "0 0 0 255", background: "245 139 87 255", effect: "White", icon: "1 Yellow Circle" },
  },
  {
    id: "d",
    label: "D",
    color: "#7fffff",
    sound: "lv7",
    style: { size: 40, text: "0 0 0 255", border: "0 0 0 255", background: "240 180 100 255", effect: "White Temp", icon: "2 White Circle" },
  },
  {
    id: "e",
    label: "E",
    color: "#7fbfff",
    sound: "t_stack",
    style: { size: 40, text: "240 207 132 255", border: "240 207 132 255", effect: "White Temp", icon: "2 Grey Circle" },
  },
  {
    id: "f",
    label: "F",
    color: "#bf7fff",
    sound: "none",
    style: { size: 36, text: "200 200 200 255" },
  },
  { id: "hidden", label: "숨김", color: "#9aa3ad", sound: "none", style: { size: 18, text: "180 180 180 255" } },
];

export const tierById = (id: TierId) => TIERS.find((t) => t.id === id) ?? TIERS[TIERS.length - 1];

/** 티어에 넣는 단위: 보통은 아이템 하나, 조각·경로석은 묶음 수·등급 구간 */
export type TierItem = {
  id: string;
  label: string;
  /** 아이콘을 찾을 BaseType 영문 이름 */
  iconOf?: string;
  baseTypes?: string[];
  /** 추가 조건 줄 (예: StackSize >= 20) */
  conditions?: string[];
};

export type TierCategory = { id: string; label: string; items: TierItem[] };

const SPLINTERS = ["Breach Splinter", "Petition Splinter", "Runic Splinter", "Simulacrum Splinter"];

/** 조각·경로석은 아이템 대신 구간을 티어에 넣는다. 구간이 겹치지 않아 티어 순서와 상관없다. */
const SPLINTER_BUCKETS: { id: string; cell: string; label: string; conditions: string[] }[] = [
  { id: "splinter:20", cell: "t1", label: "조각 20개 이상", conditions: ["StackSize >= 20"] },
  { id: "splinter:8", cell: "t2", label: "조각 8~19개", conditions: ["StackSize >= 8", "StackSize <= 19"] },
  { id: "splinter:4", cell: "t3", label: "조각 4~7개", conditions: ["StackSize >= 4", "StackSize <= 7"] },
  { id: "splinter:2", cell: "t4", label: "조각 2~3개", conditions: ["StackSize >= 2", "StackSize <= 3"] },
  { id: "splinter:1", cell: "t5", label: "조각 1개", conditions: ["StackSize 1"] },
];

const WAYSTONE_BUCKETS: { id: string; cell?: string; label: string; conditions: string[] }[] = [
  { id: "waystone:16", cell: "t16", label: "경로석 16등급", conditions: ['Class == "Waystones"', "WaystoneTier >= 16"] },
  { id: "waystone:15", cell: "t15", label: "경로석 15등급", conditions: ['Class == "Waystones"', "WaystoneTier 15"] },
  { id: "waystone:14", label: "경로석 14등급 이하", conditions: ['Class == "Waystones"', "WaystoneTier <= 14"] },
];

function tierFromGroup(group: Pick<CellGroup, "show" | "sound"> | undefined): TierId {
  if (!group || !group.show) return "hidden";
  const lv = group.sound?.match(/^lv(\d)$/);
  if (lv) return (["sss", "ss", "s", "a", "b", "c", "d"] as TierId[])[Number(lv[1]) - 1] ?? "d";
  return group.sound ? "e" : "f";
}

export type TierModel = {
  categories: TierCategory[];
  /** 기준 필터에서 읽은 아이템별 티어 */
  defaults: Record<string, TierId>;
};

/** 기준 필터에서 종류별 아이템 목록과 기본 티어를 읽는다. 같은 아이템은 처음 나온 종류에만 둔다. */
export function buildTierModel(text: string, labelOf: (baseType: string) => string): TierModel {
  const info = readDefaults(text);
  const defaults: Record<string, TierId> = {};
  const categories: TierCategory[] = [];

  for (const category of CATEGORIES) {
    const items: TierItem[] = [];
    if (category.id === "splinter") {
      for (const b of SPLINTER_BUCKETS) {
        items.push({ id: b.id, label: b.label, iconOf: SPLINTERS[3], baseTypes: SPLINTERS, conditions: b.conditions });
        defaults[b.id] = tierFromGroup(info[cellKey("splinter", b.cell)]?.groups[0]);
      }
    } else if (category.id === "waystones") {
      for (const b of WAYSTONE_BUCKETS) {
        items.push({ id: b.id, label: b.label, conditions: b.conditions });
        defaults[b.id] = b.cell ? tierFromGroup(info[cellKey("waystones", b.cell)]?.groups[0]) : "hidden";
      }
    } else {
      for (const cell of category.cells) {
        for (const group of info[cellKey(category.id, cell.id)]?.groups ?? []) {
          for (const name of group.items) {
            if (name in defaults) continue;
            defaults[name] = tierFromGroup(group);
            items.push({ id: name, label: labelOf(name), iconOf: name, baseTypes: [name] });
          }
        }
      }
    }
    if (items.length) categories.push({ id: category.id, label: category.label, items });
  }
  return { categories, defaults };
}

export type TierSetting = { sound: string; show: boolean };

function styleLines(style: TierStyle, show: boolean): string[] {
  const lines = [`\tSetFontSize ${style.size}`, `\tSetTextColor ${style.text}`];
  if (style.border) lines.push(`\tSetBorderColor ${style.border}`);
  if (style.background) lines.push(`\tSetBackgroundColor ${style.background}`);
  if (show && style.effect) lines.push(`\tPlayEffect ${style.effect}`);
  if (show && style.icon) lines.push(`\tMinimapIcon ${style.icon}`);
  return lines;
}

/** 티어 배치·설정으로 필터 텍스트(CRLF)를 만든다. */
export function generateTierFilter(
  model: TierModel,
  assign: Record<string, TierId>,
  settings: Record<TierId, TierSetting>,
  baseText: string,
  title: string,
): string {
  const out: string[] = [
    "#===============================================================================================================",
    `# ${title} — poe2-utility 필터 생성기`,
    "# 위쪽 [티어] 규칙이 먼저 걸리고, 그 밖의 아이템(장비·고유·젬 등)은 아래 기준 필터 규칙을 따른다.",
    "#===============================================================================================================",
  ];

  for (const tier of TIERS) {
    const setting = settings[tier.id];
    const show = tier.id !== "hidden" && setting.show;
    const keyword = show ? "Show" : "Hide";
    const sound = show && setting.sound !== "none" ? setting.sound : undefined;
    const summary: string[] = [];

    const blocks: string[][] = [];
    for (const category of model.categories) {
      const items = category.items.filter((item) => (assign[item.id] ?? model.defaults[item.id]) === tier.id);
      if (!items.length) continue;
      summary.push(`${category.label} ${items.length}`);
      const names = items.filter((item) => !item.conditions).flatMap((item) => item.baseTypes ?? []);
      // 고유 서판은 기준 필터(고유 규칙)를 따르게, 서판은 일반·마법·희귀만 잡는다.
      const tablets = names.filter((n) => n.endsWith(" Tablet"));
      const others = names.filter((n) => !n.endsWith(" Tablet"));
      const quoted = (list: string[]) => list.map((n) => `"${n}"`).join(" ");
      if (others.length) {
        blocks.push([`${keyword} # [티어 ${tier.label}] ${category.label}`, `\tBaseType == ${quoted(others)}`]);
      }
      if (tablets.length) {
        blocks.push([
          `${keyword} # [티어 ${tier.label}] ${category.label} 서판`,
          "\tRarity Normal Magic Rare",
          `\tBaseType == ${quoted(tablets)}`,
        ]);
      }
      for (const item of items.filter((i) => i.conditions)) {
        const lines = [`${keyword} # [티어 ${tier.label}] ${item.label}`, ...item.conditions!.map((c) => `\t${c}`)];
        if (item.baseTypes) lines.push(`\tBaseType == ${item.baseTypes.map((n) => `"${n}"`).join(" ")}`);
        blocks.push(lines);
      }
    }

    out.push(
      "",
      `#------------------------------------`,
      `# [티어 ${tier.label}] ${show ? "표시" : "숨김"}${sound ? ` · 소리 ${sound}` : ""}${summary.length ? ` · ${summary.join(", ")}` : " · 비어 있음"}`,
      `#------------------------------------`,
    );
    for (const block of blocks) {
      out.push("", ...block, ...styleLines(tier.style, show));
      if (sound) out.push(`CustomAlertSound "${sound}.mp3" 300`);
      if (!show) out.push("\tDisableDropSound True");
    }
  }

  out.push(
    "",
    "#===============================================================================================================",
    "# 기준 필터 (위 티어에 없는 아이템용)",
    "#===============================================================================================================",
    "",
  );
  return [...out, ...baseText.split(/\r?\n/)].join("\r\n");
}
