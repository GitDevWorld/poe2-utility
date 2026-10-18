/**
 * 필터 생성기: 기준 필터(NeverSink 기반)의 블록을 종류·등급별로 켜고 끄거나 소리를 바꾼다.
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

/**
 * 사용자가 바꾼 칸. show 미지정이면 기준 필터 그대로, sound "" 는 기본, "none" 은 소리 없음.
 * items: 아이템별 켜기/끄기 (BaseType 영문 이름 → 표시 여부). 조건만 있는 블록은 ITEMLESS 키를 쓴다.
 */
export type CellChange = { show?: boolean; sound?: string; items?: Record<string, boolean> };
export type Changes = Record<string, CellChange>;
/** 소리 레벨 제한: N이면 lv1~lvN 아이템만 표시 (t_* 소리나 소리 없는 아이템은 영향 없음) */
export type LevelLimit = number | null;

/** BaseType 없이 조건(묶음 수·등급)으로만 거르는 블록을 한 아이템처럼 다룰 때 쓰는 키 */
export const ITEMLESS = "*";

export const cellKey = (categoryId: string, cellId: string) => `${categoryId}.${cellId}`;

export function soundLevel(sound?: string): number | undefined {
  const m = sound?.match(/^lv(\d)$/);
  return m ? Number(m[1]) : undefined;
}

/** 칸 설정을 반영한 블록의 소리 */
export function effectiveSound(change: CellChange | undefined, blockSound?: string): string | undefined {
  if (!change?.sound) return blockSound;
  return change.sound === "none" ? undefined : change.sound;
}

/** 아이템이 최종적으로 보이는지: 개별 설정 > 칸 스위치 > 레벨 제한 */
export function itemShown(
  change: CellChange | undefined,
  blockShow: boolean,
  blockSound: string | undefined,
  item: string,
  limit: LevelLimit,
): boolean {
  const override = change?.items?.[item];
  if (override !== undefined) return override;
  if (!(change?.show ?? blockShow)) return false;
  const level = soundLevel(effectiveSound(change, blockSound));
  return !(limit != null && level != null && level > limit);
}

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

const STYLE_ON_SHOW = /^\s*(PlayEffect|MinimapIcon)\b|^CustomAlertSound\b/;

/** 블록 본문을 표시/숨김·소리에 맞게 고친다. items가 있으면 BaseType을 그 아이템들로 바꾼다. */
function rewriteBlock(
  body: string[],
  show: boolean,
  sound: string | undefined,
  options: { header?: string; items?: string[] } = {},
): string[] {
  const [header, ...rest] = body;
  const keyword = show ? "Show" : "Hide";
  const out = [options.header ? `${keyword} # ${options.header}` : header.replace(/^(Show|Hide)/, keyword)];
  // 숨김 블록에는 효과·아이콘·소리가 필요 없다.
  let kept = show ? rest : rest.filter((line) => !STYLE_ON_SHOW.test(line));
  if (options.items) {
    const list = options.items.map((name) => `"${name}"`).join(" ");
    kept = kept.map((line) => (/^\s*BaseType\b/.test(line) ? `\tBaseType == ${list}` : line));
  }
  if (show && sound !== undefined) {
    out.push(...kept.filter((line) => !/^CustomAlertSound\b/.test(line)));
    if (sound !== "none") out.push(`CustomAlertSound "${sound}.mp3" 300`);
  } else {
    out.push(...kept);
  }
  return out;
}

/** 바꾼 칸·아이템·레벨 제한을 반영한 새 필터 텍스트 (CRLF) */
export function generateFilter(text: string, changes: Changes, title: string, limit: LevelLimit = null): string {
  const lines = text.split(/\r?\n/);
  const blocks = findBlocks(lines);
  const summary: string[] = [];
  if (limit != null) summary.push(`#   소리 레벨 제한: lv${limit}까지만 표시`);

  const edits: { block: Block; replacement: string[] }[] = [];

  for (const category of CATEGORIES) {
    const { all, owned } = categoryBlocks(lines, blocks, category);
    for (const cell of category.cells) {
      const change = changes[cellKey(category.id, cell.id)];
      const parts: string[] = [];
      if (change?.show !== undefined) parts.push(change.show ? "표시" : "숨김");
      if (change?.sound) parts.push(change.sound === "none" ? "소리 없음" : `소리 ${change.sound}`);
      const offItems: string[] = [];
      const onItems: string[] = [];

      for (const block of all.filter((b) => matches(b, category, cell))) {
        const original = block.header.startsWith("Show");
        const sound = blockSound(lines, block);
        const items = owned.get(block) ?? [];
        // 조건만 있는 블록은 블록 전체를 한 아이템처럼 다룬다.
        let finalShow = items.length
          ? (change?.show ?? original)
          : itemShown(change, original, sound, ITEMLESS, limit);
        let flipped = items.filter((name) => itemShown(change, original, sound, name, limit) !== finalShow);
        // 블록 아이템이 모두 뒤집히면 개별 블록 없이 블록 자체를 뒤집는다.
        if (items.length && flipped.length === items.length) {
          (finalShow ? offItems : onItems).push(...flipped);
          finalShow = !finalShow;
          flipped = [];
        }
        const soundOverride = change?.sound || undefined;
        if (finalShow === original && !soundOverride && !flipped.length) continue;
        if (!items.length && finalShow !== original && change?.show === undefined) {
          parts.push(finalShow ? "표시" : "숨김");
        }

        (finalShow ? offItems : onItems).push(...flipped);
        const body = lines.slice(block.start, block.end);
        const replacement: string[] = [];
        if (flipped.length) {
          // 바뀐 아이템만 원래 블록 바로 앞에 같은 조건으로 넣어 먼저 걸리게 한다.
          replacement.push(
            ...rewriteBlock(body, !finalShow, soundOverride, {
              header: `poe2-utility: ${category.label} ${cell.label} 개별 설정`,
              items: flipped,
            }),
            "",
          );
        }
        replacement.push(...rewriteBlock(body, finalShow, soundOverride));
        edits.push({ block, replacement });
      }

      if (offItems.length) parts.push(`${offItems.length}개 끔`);
      if (onItems.length) parts.push(`${onItems.length}개 켬`);
      if (parts.length) summary.push(`#   ${category.label} ${cell.label}: ${parts.join(", ")}`);
    }
  }

  // 뒤에서부터 고쳐야 줄 번호가 밀리지 않는다.
  edits.sort((a, b) => b.block.start - a.block.start);
  for (const { block, replacement } of edits) {
    lines.splice(block.start, block.end - block.start, ...replacement);
  }

  const head = [
    "#------------------------------------",
    `# ${title} — poe2-utility 필터 생성기로 바꾼 설정`,
    "#------------------------------------",
    ...(summary.length ? summary : ["#   (바꾼 설정 없음)"]),
    "#",
  ];
  return [...head, ...lines].join("\r\n");
}
