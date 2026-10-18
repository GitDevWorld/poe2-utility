// 필터 생성기에 보여 줄 아이템 이름·아이콘: 필터 BaseType(영문) → 한글 이름 + 경매장 이미지
// 사용: node scripts/build-filtergen-items.mjs  (필터를 바꾸면 다시 실행)
import { readFileSync, writeFileSync } from "node:fs";

const UA = { "User-Agent": "poe2-utility (+https://github.com/GitDevWorld/poe2-utility)" };
const get = async (url) => (await fetch(url, { headers: UA })).json();

const [staticEn, staticKr, itemsEn, itemsKr] = await Promise.all([
  get("https://www.pathofexile.com/api/trade2/data/static"),
  get("https://poe.kakaogames.com/api/trade2/data/static"),
  get("https://www.pathofexile.com/api/trade2/data/items"),
  get("https://poe.kakaogames.com/api/trade2/data/items"),
]);

// 화폐류: 같은 id로 영문·한글을 잇고 이미지는 영문 쪽 경로(web.poecdn.com)를 쓴다.
const kr = new Map(staticKr.result.flatMap((g) => g.entries.map((e) => [e.id, e])));
const byName = new Map();
for (const group of staticEn.result) {
  for (const e of group.entries) {
    const k = kr.get(e.id);
    if (k && !byName.has(e.text)) byName.set(e.text, { ko: k.text, icon: e.image });
  }
}
// 그 밖(서판 등): 아이템 목록은 id가 없어 같은 자리끼리 잇는다. 영문·한글 묶음 크기가 다르면
// 순서가 어긋나 엉뚱한 이름이 붙으므로 크기가 같은 묶음만 쓴다. 이미지는 없다.
itemsEn.result.forEach((group, gi) => {
  const krGroup = itemsKr.result[gi];
  if (!krGroup || krGroup.id !== group.id || krGroup.entries.length !== group.entries.length) return;
  group.entries.forEach((e, i) => {
    const k = krGroup.entries[i];
    if (!e.name && !byName.has(e.type)) byName.set(e.type, { ko: k.type });
  });
});

// 생성기 칸(src/filtergen/generate.ts CATEGORIES)에 해당하는 블록의 BaseType만 남긴다.
const TYPES = new Set([
  "currency",
  "currency->emotions",
  "currency->catalysts",
  "currency->essence",
  "currency->omen",
  "sockets->general",
  "xenotiering",
  "currency->splinter",
  "fragments->generic",
  "gems->lineage",
  "maplike->special",
]);
const used = new Set();
for (const file of ["public/filters/sskim.filter", "public/filters/jjm.filter"]) {
  let inBlock = false;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (/^(Show|Hide)\b/.test(line)) {
      const tag = line.match(/\$type->(\S+)\s+\$tier->/);
      inBlock = Boolean((tag && TYPES.has(tag[1])) || /# sskim: .*(Mirror|S tier|Divine|Alchemy)/.test(line));
      continue;
    }
    if (!line.trim()) inBlock = false;
    const m = inBlock && line.match(/^\s*BaseType == (.*)$/);
    if (m) for (const q of m[1].match(/"[^"]+"/g) ?? []) used.add(q.slice(1, -1));
  }
}

// 서판은 경매장 이미지가 없어 poe2db 아이콘을 쓴다.
const tablets = JSON.parse(readFileSync("src/tablet/tabletData.json", "utf8")).tabletTypes;
const tradeMap = JSON.parse(readFileSync("src/tablet/tabletTradeMap.json", "utf8")).tabletTypeTrade;
for (const t of tablets) {
  const en = tradeMap[String(t.id)];
  if (en && byName.has(en)) {
    byName.get(en).icon = `https://cdn.poe2db.tw/image/Art/2DItems/Currency/PrecursorTablets/${t.icon}.webp`;
  }
}

// 조건으로 묶은 항목(미가공 젬, 탐험 일지)의 아이콘
for (const name of [
  "Uncut Skill Gem (Level 20)",
  "Uncut Skill Gem (Level 19)",
  "Uncut Skill Gem (Level 10)",
  "Uncut Spirit Gem (Level 20)",
  "Uncut Spirit Gem (Level 19)",
  "Uncut Spirit Gem (Level 10)",
  "Uncut Support Gem (Level 5)",
  "Expedition Logbook",
]) {
  used.add(name);
}

const out = {};
const missing = [];
for (const name of [...used].sort()) {
  const hit = byName.get(name);
  if (hit) out[name] = hit;
  else missing.push(name);
}
writeFileSync("src/filtergen/items.json", JSON.stringify(out, null, 1) + "\n");
console.log(`wrote ${Object.keys(out).length} items, ${missing.length} without Korean name`);
