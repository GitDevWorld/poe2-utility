/**
 * 티어 메이커식 필터 생성: 아이템을 티어에 넣고, 티어마다 소리·표시 여부를 정한다.
 * 아이템 목록·분류는 poe2db 카탈로그, 기본 티어는 고른 기준 필터로 계산한다.
 * 생성한 필터 = 우리 티어 규칙(맨 위, 먼저 걸림) + 기준 필터 전체(티어에 없는 아이템용).
 */
import catalog from "./catalog.json";
import { evaluate, parseRules, type Sample } from "./evaluate";
import { buildExtraCategories, EQUIPMENT_TABS, type CatalogUnique, type GearClass, type Tone } from "./extras";

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

/** 티어에 넣는 단위: 아이템(베이스) 하나, 또는 조건으로 묶은 구간 */
export type TierItem = {
  id: string;
  label: string;
  icon?: string;
  baseTypes?: string[];
  /** 조건 줄 (예: StackSize >= 20). 없으면 BaseType 만으로 잡는다. */
  conditions?: string[];
  /** 필터 안에서 먼저 걸려야 하는 순서 (작을수록 위, 기본 6) */
  order?: number;
  tone?: Tone;
  /** 장비류: 클래스(필터 Class)와 조건 id */
  sub?: string;
  variant?: string;
  /** 요구 레벨 (poe2db) */
  level?: number;
  /** 같은 베이스를 쓰는 다른 고유 등 덧붙일 설명 */
  note?: string;
  /** 고유 베이스 타일: 이 베이스를 쓰는 고유 아이템 이름 */
  members?: string[];
};

export type TierCategory = {
  id: string;
  label: string;
  items: TierItem[];
  /** BaseType 으로만 잡는 아이템 규칙에 덧붙일 조건 (예: 고유 서판·유물은 빼기) */
  guard?: string[];
  /** 장비류: 클래스 목록과 클래스별 조건 목록 */
  subs?: { id: string; label: string; icon?: string }[];
  variants?: Record<string, { id: string; label: string }[]>;
  /** 너무 많아 "전체" 탭에서는 뺀다 */
  hideInAll?: boolean;
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
  /** 기준 필터로 계산한 기본 티어 (처음 물어볼 때 계산하고 기억한다) */
  defaultOf: (id: string) => TierId;
};

/**
 * 아이템 목록·분류는 poe2db 카탈로그를 따르고, 기본 티어만 기준 필터로 계산한다:
 * 아이템마다 예시를 만들어 기준 필터에서 처음 걸리는 규칙의 표시 여부·소리를 본다.
 */
export function buildTierModel(baseText: string): TierModel {
  const rules = parseRules(baseText);
  const samples = new Map<string, Sample>();
  const cache = new Map<string, TierId>();
  const defaultOf = (id: string): TierId => {
    let tier = cache.get(id);
    if (!tier) {
      const sample = samples.get(id);
      tier = sample ? tierFromResult(evaluate(rules, sample)) : "hidden";
      cache.set(id, tier);
    }
    return tier;
  };

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
            items.push({ id, label: `${item.ko} ${range.label}`, icon: item.icon, baseTypes: [item.en], conditions: range.conditions });
            samples.set(id, { ...base, StackSize: range.stack });
          }
          continue;
        }
        const tier = Number(item.en.match(/Tier (\d+)/)?.[1] ?? 0);
        items.push({ id: item.en, label: item.ko, icon: item.icon, baseTypes: [item.en] });
        samples.set(item.en, cls.filterClass === "Waystones" ? { ...base, WaystoneTier: tier } : base);
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

  // 장비류: 클래스 → 조건 → 베이스
  for (const tab of EQUIPMENT_TABS) {
    const classes = CATALOG.gear.filter((g) => tab.match(g) && g.bases.length);
    const items: TierItem[] = [];
    const variants: Record<string, { id: string; label: string }[]> = {};
    for (const g of classes) {
      const list = tab.variants(g);
      variants[g.filterClass] = list.map(({ id, label }) => ({ id, label }));
      const bases = [...g.bases].sort((a, b) => (a.level ?? 0) - (b.level ?? 0));
      for (const v of list) {
        const conditions = [...v.conditions, `Class == "${g.filterClass}"`];
        for (const b of bases) {
          const id = `${tab.id}|${g.filterClass}|${v.id}|${b.en}`;
          items.push({
            id,
            label: b.ko,
            icon: b.icon,
            baseTypes: [b.en],
            conditions,
            order: v.order,
            tone: v.tone,
            sub: g.filterClass,
            variant: v.id,
            level: b.level,
          });
          samples.set(id, { Class: g.filterClass, BaseType: b.en, DropLevel: b.level || 1, UnidentifiedItemTier: 1, ...v.sample });
        }
      }
    }
    categories.push({
      id: tab.id,
      label: tab.label,
      items,
      subs: classes.map((g) => ({ id: g.filterClass, label: g.ko, icon: g.icon })),
      variants,
      hideInAll: true,
    });
  }

  // 고유: 필터는 고유를 이름이 아니라 베이스로만 가리므로, 베이스 하나를 타일 하나로 두고 그 베이스의 고유를 함께 보여 준다.
  const uniqueClasses = CATALOG.gear.filter((g) => g.uniques.length);
  const uniqueItems: TierItem[] = [];
  for (const g of uniqueClasses) {
    const baseKo = new Map(g.bases.map((b) => [b.en, b.ko]));
    const byBase = new Map<string, CatalogUnique[]>();
    for (const u of g.uniques) byBase.set(u.base, [...(byBase.get(u.base) ?? []), u]);
    const conditions = ["Rarity Unique", `Class == "${g.filterClass}"`];
    for (const [base, list] of byBase) {
      const id = `unique|${g.filterClass}|${base}`;
      uniqueItems.push({
        id,
        label: baseKo.get(base) ?? base,
        icon: list.find((u) => u.icon)?.icon,
        baseTypes: [base],
        conditions,
        order: 6,
        tone: "unique",
        sub: g.filterClass,
        level: Math.min(...list.map((u) => u.level ?? 0)) || undefined,
        members: list.map((u) => u.ko),
      });
      samples.set(id, { Class: g.filterClass, Rarity: "Unique", BaseType: base });
    }
  }
  categories.push({
    id: "uniques",
    label: "고유",
    items: uniqueItems,
    subs: uniqueClasses.map((g) => ({ id: g.filterClass, label: g.ko, icon: g.icon })),
  });

  for (const extra of buildExtraCategories(CATALOG.gear, CATALOG.icons)) {
    for (const item of extra.items) samples.set(item.id, item.sample);
    categories.push({
      id: extra.id,
      label: extra.label,
      items: extra.items.map(({ sample: _sample, ...item }) => item),
    });
  }
  return { categories, defaultOf };
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

  const tierOf = (item: TierItem) => assign[item.id] ?? model.defaultOf(item.id);
  const orders = [...new Set(model.categories.flatMap((c) => c.items.map((i) => i.order ?? 6)))].sort((a, b) => a - b);

  // 파일 크기 줄이기: 클래스·조건 묶음(같은 order) 안에서 가장 많은 티어가 그 묶음의 마지막 티어라면,
  // 그 티어 규칙은 BaseType 목록 없이 "나머지 전부"로 쓴다. 앞 티어 규칙이 먼저 걸리므로 결과는 같다.
  const catchAll = new Map<string, TierId>();
  const tierIndex = new Map(TIERS.map((t, i) => [t.id, i]));
  for (const category of model.categories) {
    const groups = new Map<string, Map<TierId, number>>();
    for (const item of category.items) {
      if (!item.conditions?.some((c) => c.startsWith("Class ")) || !item.baseTypes) continue;
      const key = `${category.id}\n${item.conditions.join("\n")}`;
      const counts = groups.get(key) ?? new Map<TierId, number>();
      const tier = tierOf(item);
      counts.set(tier, (counts.get(tier) ?? 0) + 1);
      groups.set(key, counts);
    }
    for (const [key, counts] of groups) {
      const tiers = [...counts.keys()];
      const last = tiers.reduce((a, b) => (tierIndex.get(a)! > tierIndex.get(b)! ? a : b));
      const most = tiers.reduce((a, b) => (counts.get(a)! >= counts.get(b)! ? a : b));
      if (last === most) catchAll.set(key, last);
    }
  }

  // 겹치는 조건(이중 타락 vs 희귀 등)은 order 가 작은 쪽이 먼저 걸리고, 같은 order 안에서는 티어 순서.
  for (const order of orders) {
    for (const tier of TIERS) {
      const setting = settings[tier.id];
      const show = tier.id !== "hidden" && setting.show;
      const keyword = show ? "Show" : "Hide";
      const sound = show && setting.sound !== "none" ? setting.sound : undefined;
      const blocks: string[][] = [];
      const summary: string[] = [];

      for (const category of model.categories) {
        const items = category.items.filter((item) => (item.order ?? 6) === order && tierOf(item) === tier.id);
        if (!items.length) continue;
        summary.push(`${category.label} ${items.length}`);
        // 조건이 같은 아이템은 BaseType 을 모아 규칙 하나로 만든다.
        const merged = new Map<string, { label: string; conditions: string[]; baseTypes: string[] }>();
        for (const item of items) {
          const conditions = item.conditions ?? category.guard ?? [];
          const key = item.baseTypes ? conditions.join("\n") : `${item.id}\n${conditions.join("\n")}`;
          const label = item.conditions ? (item.sub ? `${category.label} ${item.sub}` : item.label) : category.label;
          const entry = merged.get(key) ?? { label, conditions, baseTypes: [] };
          for (const name of item.baseTypes ?? []) if (!entry.baseTypes.includes(name)) entry.baseTypes.push(name);
          merged.set(key, entry);
        }
        for (const entry of merged.values()) {
          const lines = [`${keyword} # [티어 ${tier.label}] ${entry.label}`, ...entry.conditions.map((c) => `\t${c}`)];
          const rest = catchAll.get(`${category.id}\n${entry.conditions.join("\n")}`) === tier.id;
          if (entry.baseTypes.length && !rest) lines.push(`\tBaseType == ${quoted(entry.baseTypes)}`);
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
