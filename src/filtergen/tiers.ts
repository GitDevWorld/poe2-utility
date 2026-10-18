/**
 * 티어 메이커식 필터 생성: 아이템을 티어에 넣고, 티어마다 소리·표시 여부를 정한다.
 * 아이템 목록·분류는 poe2db 카탈로그, 기본 티어는 고른 기준 필터로 계산한다.
 * 생성한 필터 = 우리 티어 규칙(맨 위, 먼저 걸림) + 기준 필터 전체(티어에 없는 아이템용).
 */
import catalog from "./catalog.json";
import { evaluate, parseRules } from "./evaluate";
import { buildExtraCategories, type GearClass, type Tone } from "./extras";

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

export const SOUNDS = ["lv1", "lv2", "lv3", "lv4", "lv5", "lv6", "lv7", "t_popup", "t_stack", "t_ring", "t_flask"];

/** 티어에 넣는 단위: 아이템 하나, 또는 조건으로 묶은 구간(조각 묶음 수, 장비 종류…) */
export type TierItem = {
  id: string;
  label: string;
  icon?: string;
  baseTypes?: string[];
  /** 조건 줄 (예: StackSize >= 20). 없으면 BaseType 만으로 잡는다. */
  conditions?: string[];
  /** 필터 안에서 먼저 걸려야 하는 순서 (작을수록 위, 기본 5) */
  order?: number;
  tone?: Tone;
};

export type TierCategory = {
  id: string;
  label: string;
  items: TierItem[];
  /** BaseType 으로만 잡는 아이템 규칙에 덧붙일 조건 (예: 고유 서판·유물은 빼기) */
  guard?: string[];
};

type CatalogItem = { en: string; ko: string; icon?: string };
type CatalogClass = {
  slug: string;
  filterClass: string;
  ko: string;
  sections: { id: string; en: string; ko: string; items: CatalogItem[] }[];
};
type Catalog = { classes: CatalogClass[]; gear: GearClass[]; icons: Record<string, string> };

const CATALOG = catalog as Catalog;

/** poe2db 탭 이름이 영어로 남은 것 등을 다듬는다. */
const SECTION_LABEL: Record<string, string> = {
  StackableCurrencyItem: "화폐",
  Essence: "에센스",
  SplinterItem: "조각",
  CatalystItem: "기폭제",
};

const SPLINTER_RANGES: { id: string; label: string; conditions: string[]; stack: number }[] = [
  { id: "20", label: "20개+", conditions: ["StackSize >= 20"], stack: 20 },
  { id: "8", label: "8~19개", conditions: ["StackSize >= 8", "StackSize <= 19"], stack: 8 },
  { id: "4", label: "4~7개", conditions: ["StackSize >= 4", "StackSize <= 7"], stack: 4 },
  { id: "2", label: "2~3개", conditions: ["StackSize >= 2", "StackSize <= 3"], stack: 2 },
  { id: "1", label: "1개", conditions: ["StackSize 1"], stack: 1 },
];

/** 고유가 따로 있는 클래스: BaseType 규칙이 고유까지 잡지 않게 한다. */
const RARITY_GUARD = new Set(["Tablet", "Relics"]);

function tierFromResult(result: { show: boolean; sound?: string }): TierId {
  if (!result.show) return "hidden";
  const lv = result.sound?.match(/^lv(\d)$/);
  if (lv) return (["sss", "ss", "s", "a", "b", "c", "d"] as TierId[])[Number(lv[1]) - 1] ?? "d";
  return result.sound ? "e" : "f";
}

export type TierModel = {
  categories: TierCategory[];
  /** 기준 필터에서 계산한 아이템별 기본 티어 */
  defaults: Record<string, TierId>;
};

/**
 * 아이템 목록·분류는 poe2db 카탈로그를 따르고, 기본 티어만 기준 필터로 계산한다:
 * 아이템마다 예시를 만들어 기준 필터에서 처음 걸리는 규칙의 표시 여부·소리를 본다.
 */
export function buildTierModel(baseText: string): TierModel {
  const rules = parseRules(baseText);
  const defaults: Record<string, TierId> = {};
  const categories: TierCategory[] = [];
  const seen = new Set<string>();
  // poe2db "중첩 가능 화폐" 목록에는 액체 감정 등 다른 탭 아이템도 섞여 있어, 더 구체적인 탭에 둔다.
  const specific = new Set(
    CATALOG.classes.flatMap((c) =>
      c.sections.filter((s) => s.id !== "StackableCurrencyItem").flatMap((s) => s.items.map((i) => i.en)),
    ),
  );

  for (const cls of CATALOG.classes) {
    const multi = cls.sections.length > 1 && cls.slug !== "Map_Fragments";
    const groups = multi
      ? cls.sections.map((s) => ({ id: `${cls.slug}:${s.id}`, label: SECTION_LABEL[s.id] ?? s.ko, items: s.items, section: s.id }))
      : [{ id: cls.slug, label: cls.ko, items: cls.sections.flatMap((s) => s.items), section: "" }];

    for (const group of groups) {
      const items: TierItem[] = [];
      for (const item of group.items) {
        if (seen.has(item.en)) continue;
        if (group.section === "StackableCurrencyItem" && specific.has(item.en)) continue;
        seen.add(item.en);
        const base = { Class: cls.filterClass, BaseType: item.en, Rarity: "Normal" };
        if (group.section === "SplinterItem") {
          for (const range of SPLINTER_RANGES) {
            const id = `${item.en}|${range.id}`;
            items.push({
              id,
              label: `${item.ko} ${range.label}`,
              icon: item.icon,
              baseTypes: [item.en],
              conditions: range.conditions,
            });
            defaults[id] = tierFromResult(evaluate(rules, { ...base, StackSize: range.stack }));
          }
          continue;
        }
        const tier = Number(item.en.match(/Tier (\d+)/)?.[1] ?? 0);
        const sample = cls.filterClass === "Waystones" ? { ...base, WaystoneTier: tier } : base;
        items.push({ id: item.en, label: item.ko, icon: item.icon, baseTypes: [item.en] });
        defaults[item.en] = tierFromResult(evaluate(rules, sample));
      }
      if (!items.length) continue;
      categories.push({
        id: group.id,
        label: group.label,
        items,
        guard: RARITY_GUARD.has(cls.filterClass) ? ["Rarity Normal Magic Rare"] : undefined,
      });
    }
  }

  for (const extra of buildExtraCategories(CATALOG.gear, CATALOG.icons)) {
    for (const item of extra.items) defaults[item.id] = tierFromResult(evaluate(rules, item.sample));
    categories.push({
      id: extra.id,
      label: extra.label,
      items: extra.items.map(({ sample: _sample, ...item }) => item),
    });
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

const quoted = (list: string[]) => list.map((n) => `"${n}"`).join(" ");

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
    `# ${title} — poe2-utility 필터 생성기 (아이템 분류: poe2db.tw)`,
    "# 위쪽 [티어] 규칙이 먼저 걸리고, 티어에 없는 아이템은 아래 기준 필터 규칙을 따른다.",
    "#===============================================================================================================",
  ];

  const tierOf = (item: TierItem) => assign[item.id] ?? model.defaults[item.id];
  const orders = [...new Set(model.categories.flatMap((c) => c.items.map((i) => i.order ?? 5)))].sort((a, b) => a - b);

  // 겹치는 조건(특출난 vs 일반 장비 등)은 order 가 작은 쪽이 먼저 걸리고, 같은 order 안에서는 티어 순서.
  for (const order of orders) {
    for (const tier of TIERS) {
      const setting = settings[tier.id];
      const show = tier.id !== "hidden" && setting.show;
      const keyword = show ? "Show" : "Hide";
      const sound = show && setting.sound !== "none" ? setting.sound : undefined;
      const blocks: string[][] = [];
      const summary: string[] = [];

      for (const category of model.categories) {
        const items = category.items.filter((item) => (item.order ?? 5) === order && tierOf(item) === tier.id);
        if (!items.length) continue;
        summary.push(`${category.label} ${items.length}`);
        const names = items.filter((item) => !item.conditions).flatMap((item) => item.baseTypes ?? []);
        if (names.length) {
          blocks.push([
            `${keyword} # [티어 ${tier.label}] ${category.label}`,
            ...(category.guard ?? []).map((c) => `\t${c}`),
            `\tBaseType == ${quoted(names)}`,
          ]);
        }
        for (const item of items.filter((i) => i.conditions)) {
          const lines = [`${keyword} # [티어 ${tier.label}] ${item.label}`, ...item.conditions!.map((c) => `\t${c}`)];
          if (item.baseTypes) lines.push(`\tBaseType == ${quoted(item.baseTypes)}`);
          blocks.push(lines);
        }
      }
      if (!blocks.length) continue;

      out.push(
        "",
        "#------------------------------------",
        `# [티어 ${tier.label}] ${show ? "표시" : "숨김"}${sound ? ` · 소리 ${sound}` : ""} · ${summary.join(", ")}`,
        "#------------------------------------",
      );
      for (const block of blocks) {
        out.push("", ...block, ...styleLines(tier.style, show));
        if (sound) out.push(`CustomAlertSound "${sound}.mp3" 300`);
        if (!show) out.push("\tDisableDropSound True");
      }
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
