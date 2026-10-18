/**
 * 필터 평가기: 예시 아이템(Sample)이 기준 필터에서 어느 규칙에 처음 걸리는지 찾는다.
 * 티어 메이커의 기본 배치(장비·고유·젬 등)를 기준 필터 그대로 보여 주는 데 쓴다.
 */

export type Sample = Record<string, string | number | boolean>;

/** 예시에 없는 값의 기본: 맵핑(지역 레벨 80) 중 떨어진 평범한 아이템 */
const BASE: Sample = {
  Rarity: "Normal",
  ItemLevel: 80,
  AreaLevel: 80,
  DropLevel: 65,
  StackSize: 1,
  UnidentifiedItemTier: 0,
  Quality: 0,
  Sockets: 0,
  GemLevel: 1,
  WaystoneTier: 0,
  Corrupted: false,
  TwiceCorrupted: false,
  Mirrored: false,
  Identified: false,
  AnyEnchantment: false,
};

const RARITY = ["Normal", "Magic", "Rare", "Unique"];
const ACTIONS =
  /^(Set\w+|PlayEffect|MinimapIcon|CustomAlertSound|PlayAlertSound\w*|DisableDropSound|EnableDropSound\w*|DisableDropSoundIfAlertSound|Continue)\b/;

type Rule = { show: boolean; sound?: string; conditions: string[] };

export function parseRules(text: string): Rule[] {
  const lines = text.split(/\r?\n/);
  const rules: Rule[] = [];
  for (let i = 0; i < lines.length; i++) {
    const header = lines[i];
    if (!/^(Show|Hide)\b/.test(header)) continue;
    const body: string[] = [];
    let j = i + 1;
    for (; j < lines.length && lines[j].trim() !== ""; j++)
      body.push(lines[j].trim());
    i = j - 1;
    // Continue 규칙은 꾸미기만 하고 다음 규칙으로 넘어가므로 표시 여부를 정하지 않는다.
    if (body.some((l) => /^Continue\b/.test(l))) continue;
    const sound = body
      .map((l) => l.match(/^CustomAlertSound "([^"]+)\.mp3"/)?.[1])
      .find(Boolean);
    rules.push({
      show: header.startsWith("Show"),
      sound,
      conditions: body.filter((l) => !l.startsWith("#") && !ACTIONS.test(l)),
    });
  }
  return rules;
}

function values(rest: string): string[] {
  const quoted = rest.match(/"[^"]*"/g);
  return quoted
    ? quoted.map((q) => q.slice(1, -1))
    : rest.split(/\s+/).filter(Boolean);
}

function compare(op: string, a: number, b: number): boolean {
  switch (op) {
    case "<":
      return a < b;
    case "<=":
      return a <= b;
    case ">":
      return a > b;
    case ">=":
      return a >= b;
    case "!":
    case "!=":
      return a !== b;
    default:
      return a === b;
  }
}

function test(condition: string, sample: Sample): boolean {
  const m = condition.match(/^(\w+)\s*(==|!=|<=|>=|<|>|=|!)?\s*(.*)$/);
  if (!m) return false;
  const [, key, op = "", rest] = m;
  const value = key in sample ? sample[key] : BASE[key];
  // 모르는 조건(모드 이름, 크기 등)은 예시가 만족하지 않는 것으로 본다.
  if (value === undefined) return false;
  const list = values(rest);

  if (key === "Rarity") {
    const idx = RARITY.indexOf(String(value));
    if (["<", "<=", ">", ">="].includes(op))
      return compare(op, idx, RARITY.indexOf(list[0]));
    const hit = list.includes(String(value));
    return op === "!" || op === "!=" ? !hit : hit;
  }
  if (typeof value === "boolean") return (list[0] === "True") === value;
  if (typeof value === "number") {
    const nums = list.map(Number).filter((n) => !Number.isNaN(n));
    if (!nums.length) return false;
    return op === "" || op === "=" || op === "=="
      ? nums.some((n) => n === value)
      : compare(op, value, nums[0]);
  }
  const text = String(value);
  const hit =
    op === "==" ? list.includes(text) : list.some((v) => text.includes(v));
  return op === "!" || op === "!=" ? !hit : hit;
}

/** 예시 아이템이 조건 줄을 모두 만족하는지 */
export function matches(conditions: string[], sample: Sample): boolean {
  return conditions.every((c) => test(c, sample));
}

/** 예시 아이템이 처음 걸리는 규칙의 표시 여부·소리. 아무 규칙에도 안 걸리면 게임 기본(표시). */
export function evaluate(
  rules: Rule[],
  sample: Sample,
): { show: boolean; sound?: string } {
  for (const rule of rules) {
    if (rule.conditions.every((c) => test(c, sample)))
      return { show: rule.show, sound: rule.sound };
  }
  return { show: true };
}
