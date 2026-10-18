/**
 * 기준 필터(NeverSink 기반) 읽기: 종류·등급별 블록과 블록마다 잡는 아이템·소리.
 * 블록은 `$type->종류 $tier->등급` 태그(또는 우리가 붙인 머리말)로 찾는다.
 */

export type Cell = {
  id: string;
  label: string;
  /** `$type->X $tier->Y` 의 Y 목록 */
  tiers?: string[];
  /** 태그 없는 커스텀 블록 머리말에 들어 있는 문구 */
  headers?: string[];
};

export type Category = {
  id: string;
  label: string;
  /** `$type->X` 의 X */
  type: string;
  cells: Cell[];
};

const grade = (...ids: string[]): Cell[] => ids.map((id) => ({ id, label: id.toUpperCase(), tiers: [id] }));

export const CATEGORIES: Category[] = [
  {
    id: "currency",
    label: "화폐",
    type: "currency",
    cells: [
      {
        id: "s",
        label: "S",
        tiers: ["s"],
        headers: [
          "sskim: Mirror of Kalandra",
          "sskim: top S tier currency",
          "sskim: high S tier currency",
          "sskim: S tier currency slightly above Divine",
          "sskim: Divine Orb",
        ],
      },
      ...grade("a", "b", "c"),
      { id: "alchemy", label: "연금술", headers: ["sskim: Orb of Alchemy"] },
      ...grade("d", "e"),
      { id: "supply", label: "하급", tiers: ["supplymagic", "supplieslow"] },
    ],
  },
  { id: "emotions", label: "증류 감정", type: "currency->emotions", cells: grade("s", "a", "b", "c", "d", "e") },
  { id: "catalysts", label: "촉매", type: "currency->catalysts", cells: grade("s", "a", "b", "c") },
  { id: "essence", label: "에센스", type: "currency->essence", cells: grade("s", "a", "b", "c", "d", "e") },
  { id: "omen", label: "징조", type: "currency->omen", cells: grade("s", "a", "b", "c", "d") },
  {
    id: "sockets",
    label: "룬·소울코어",
    type: "sockets->general",
    cells: [...grade("s", "a", "b", "c", "d", "e"), { id: "supply", label: "하급", tiers: ["supplylow"] }],
  },
  { id: "xeno", label: "리그 신규 아이템", type: "xenotiering", cells: grade("s", "a", "b", "c", "d") },
  {
    id: "splinter",
    label: "조각",
    type: "currency->splinter",
    cells: [
      { id: "t1", label: "20개+", tiers: ["t1"] },
      { id: "t2", label: "8개+", tiers: ["t2"] },
      { id: "t3", label: "4개+", tiers: ["t3"] },
      { id: "t4", label: "2개+", tiers: ["t4"] },
      { id: "t5", label: "1개+", tiers: ["t5"] },
    ],
  },
  { id: "fragments", label: "파편·서판", type: "fragments->generic", cells: grade("s", "a", "b", "c") },
  {
    id: "waystones",
    label: "경로석",
    type: "waystones",
    cells: [
      { id: "t16", label: "16등급", tiers: ["waystone_t16"] },
      { id: "t15", label: "15등급", tiers: ["waystone_t15"] },
    ],
  },
];

export const SOUNDS = ["lv1", "lv2", "lv3", "lv4", "lv5", "lv6", "lv7", "t_popup", "t_stack", "t_ring", "t_flask"];

export const cellKey = (categoryId: string, cellId: string) => `${categoryId}.${cellId}`;

type Block = { start: number; end: number; header: string };

const TAG = /\$type->(\S+)\s+\$tier->(\S+)/;

function findBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (!/^(Show|Hide)\b/.test(lines[i])) continue;
    let end = i + 1;
    while (end < lines.length && lines[end].trim() !== "") end++;
    blocks.push({ start: i, end, header: lines[i] });
    i = end - 1;
  }
  return blocks;
}

function matches(block: Block, category: Category, cell: Cell): boolean {
  const tag = block.header.match(TAG);
  if (tag && tag[1] === category.type && cell.tiers?.includes(tag[2])) return true;
  return Boolean(cell.headers?.some((h) => block.header.includes(h)));
}

function blockSound(lines: string[], block: Block): string | undefined {
  for (let i = block.start; i < block.end; i++) {
    const m = lines[i].match(/^CustomAlertSound "([^"]+)\.mp3"/);
    if (m) return m[1];
  }
  return undefined;
}

function blockItems(lines: string[], block: Block): string[] {
  const items: string[] = [];
  for (let i = block.start; i < block.end; i++) {
    const m = lines[i].match(/^\s*BaseType ==? (.*)$/);
    if (m) for (const q of m[1].match(/"[^"]+"/g) ?? []) items.push(q.slice(1, -1));
  }
  return items;
}

/** BaseType 없이 조건으로 거르는 블록(조각 묶음 수, 경로석 등급)의 설명 */
function blockNote(lines: string[], block: Block): string | undefined {
  for (let i = block.start; i < block.end; i++) {
    const stack = lines[i].match(/^\s*StackSize >= (\d+)/);
    if (stack) return `${stack[1]}개 이상 묶음`;
    const tier = lines[i].match(/^\s*WaystoneTier (>= )?(\d+)/);
    if (tier) return `경로석 ${tier[2]}등급${tier[1] ? " 이상" : ""}`;
  }
  return undefined;
}

/**
 * 종류 하나의 블록과 블록마다 실제로 잡는 아이템.
 * 필터는 위에서부터 먼저 걸리는 블록이 이긴다: 같은 종류 안에서 앞 블록(다른 칸 포함)에
 * 이미 잡힌 아이템은 뒤 블록에서 뺀다. 예) 연금술의 오브는 D가 아니라 연금술 칸.
 */
function categoryBlocks(lines: string[], blocks: Block[], category: Category) {
  const owned = new Map<Block, string[]>();
  const seen = new Set<string>();
  const all = blocks.filter((b) => category.cells.some((cell) => matches(b, category, cell)));
  for (const b of all) {
    const items = blockItems(lines, b).filter((name) => !seen.has(name));
    // 묶음 수·등급 같은 조건이 붙은 블록은 그 아이템을 전부 잡지 않는다.
    if (!blockNote(lines, b)) items.forEach((name) => seen.add(name));
    owned.set(b, items);
  }
  return { all, owned };
}

/** 칸 안의 블록 하나: 같은 소리로 묶인 아이템들 */
export type CellGroup = { show: boolean; sound?: string; items: string[]; note?: string };
export type CellInfo = { found: boolean; show: boolean; sound?: string; groups: CellGroup[] };

/** 기준 필터에서 칸마다 지금 상태(표시 여부, 소리, 블록별 아이템)를 읽는다. */
export function readDefaults(text: string): Record<string, CellInfo> {
  const lines = text.split(/\r?\n/);
  const blocks = findBlocks(lines);
  const out: Record<string, CellInfo> = {};
  for (const category of CATEGORIES) {
    const { all, owned } = categoryBlocks(lines, blocks, category);
    for (const cell of category.cells) {
      const hit = all.filter((b) => matches(b, category, cell));
      const groups: CellGroup[] = [];
      for (const b of hit) {
        const items = owned.get(b) ?? [];
        const note = blockNote(lines, b);
        if (!items.length && !note) continue;
        groups.push({ show: b.header.startsWith("Show"), sound: blockSound(lines, b), items, note });
      }
      out[cellKey(category.id, cell.id)] = {
        found: hit.length > 0,
        show: hit.some((b) => b.header.startsWith("Show")),
        sound: hit.map((b) => blockSound(lines, b)).find(Boolean),
        groups,
      };
    }
  }
  return out;
}
