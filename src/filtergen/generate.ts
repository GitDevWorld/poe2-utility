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

/** 사용자가 바꾼 칸: show 미지정이면 그대로, sound "" 는 기본, "none" 은 소리 없음 */
export type CellChange = { show?: boolean; sound?: string };
export type Changes = Record<string, CellChange>;

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

export type CellInfo = { found: boolean; show: boolean; sound?: string };

/** 기준 필터에서 칸마다 지금 상태(표시 여부, 첫 블록의 소리)를 읽는다. */
export function readDefaults(text: string): Record<string, CellInfo> {
  const lines = text.split(/\r?\n/);
  const blocks = findBlocks(lines);
  const out: Record<string, CellInfo> = {};
  for (const category of CATEGORIES) {
    for (const cell of category.cells) {
      const hit = blocks.filter((b) => matches(b, category, cell));
      out[cellKey(category.id, cell.id)] = {
        found: hit.length > 0,
        show: hit.some((b) => b.header.startsWith("Show")),
        sound: hit.map((b) => blockSound(lines, b)).find(Boolean),
      };
    }
  }
  return out;
}

const STYLE_ON_SHOW = /^\s*(PlayEffect|MinimapIcon)\b|^CustomAlertSound\b/;

function rewriteBlock(body: string[], show: boolean, sound: string | undefined): string[] {
  const [header, ...rest] = body;
  const keyword = show ? "Show" : "Hide";
  const out = [header.replace(/^(Show|Hide)/, keyword)];
  // 숨김 블록에는 효과·아이콘·소리가 필요 없다.
  const kept = show ? rest : rest.filter((line) => !STYLE_ON_SHOW.test(line));
  if (show && sound !== undefined) {
    const withoutSound = kept.filter((line) => !/^CustomAlertSound\b/.test(line));
    out.push(...withoutSound);
    if (sound !== "none") out.push(`CustomAlertSound "${sound}.mp3" 300`);
  } else {
    out.push(...kept);
  }
  return out;
}

/** 바꾼 칸만 반영한 새 필터 텍스트 (CRLF) */
export function generateFilter(text: string, changes: Changes, title: string): string {
  const lines = text.split(/\r?\n/);
  const blocks = findBlocks(lines);
  const summary: string[] = [];

  // 뒤에서부터 고쳐야 줄 번호가 밀리지 않는다.
  const edits: { block: Block; show: boolean; sound?: string }[] = [];
  for (const category of CATEGORIES) {
    for (const cell of category.cells) {
      const change = changes[cellKey(category.id, cell.id)];
      if (!change || (change.show === undefined && !change.sound)) continue;
      const hit = blocks.filter((b) => matches(b, category, cell));
      if (!hit.length) continue;
      const parts = [];
      if (change.show !== undefined) parts.push(change.show ? "표시" : "숨김");
      if (change.sound) parts.push(change.sound === "none" ? "소리 없음" : `소리 ${change.sound}`);
      summary.push(`#   ${category.label} ${cell.label}: ${parts.join(", ")}`);
      for (const block of hit) {
        const show = change.show ?? block.header.startsWith("Show");
        edits.push({ block, show, sound: change.sound || undefined });
      }
    }
  }

  edits.sort((a, b) => b.block.start - a.block.start);
  for (const { block, show, sound } of edits) {
    const body = lines.slice(block.start, block.end);
    lines.splice(block.start, block.end - block.start, ...rewriteBlock(body, show, sound));
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
