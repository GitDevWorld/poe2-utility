// 필터 생성기 아이템 카탈로그: poe2db.tw 의 아이템 클래스 페이지(영문·한글)에서 이름·아이콘을 모은다.
// 사용: node scripts/build-filtergen-catalog.mjs  (리그가 바뀌면 다시 실행)
// 결과: src/filtergen/catalog.json
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const CACHE = process.env.POE2DB_CACHE; // 지정하면 받은 페이지를 저장해 다시 쓴다.
const UA = { "User-Agent": "Mozilla/5.0 (poe2-utility catalog)" };

async function page(lang, slug, optional = false) {
  const file = CACHE && `${CACHE}/${lang}_${slug}.html`;
  if (file && existsSync(file)) return readFileSync(file, "utf8");
  const res = await fetch(`https://poe2db.tw/${lang}/${slug}`, { headers: UA });
  if (!res.ok && optional) return "";
  if (!res.ok) throw new Error(`${lang}/${slug}: HTTP ${res.status}`);
  const text = await res.text();
  if (file) {
    mkdirSync(CACHE, { recursive: true });
    writeFileSync(file, text);
  }
  return text;
}

/** 아이템 클래스(= 필터 Class) 중 화폐처럼 하나씩 티어에 넣을 것. sections 를 주면 그 탭만 쓴다. */
const ITEM_CLASSES = [
  { slug: "Stackable_Currency", filterClass: "Stackable Currency" },
  { slug: "Liquid_Emotions", filterClass: "Stackable Currency" },
  { slug: "Omen", filterClass: "Omen" },
  { slug: "Augment", filterClass: "Augment" },
  { slug: "Map_Fragments", filterClass: "Map Fragments" },
  // poe2db 에 Misc_Map_Items 페이지가 없다(탐험 일지는 기타 항목으로 다룬다).
  { slug: "Tablet", filterClass: "Tablet" },
  { slug: "Incubators", filterClass: "Incubators" },
  { slug: "Inscribed_Ultimatum", filterClass: "Inscribed Ultimatum" },
  { slug: "Trial_Coins", filterClass: "Trial Coins" },
  { slug: "Vault_Keys", filterClass: "Vault Keys" },
  { slug: "Pinnacle_Keys", filterClass: "Pinnacle Keys" },
  { slug: "Relics", filterClass: "Relics" },
  { slug: "Waystones", filterClass: "Waystones" },
  { slug: "Lineage_Supports", filterClass: "Support Gems" },
];

/** 종류(클래스) 단위로만 다루는 장비·장신구 등: 대표 아이콘과 한글 이름만 가져온다. */
const GEAR_CLASSES = [
  ["Body_Armours", "Body Armours"],
  ["Helmets", "Helmets"],
  ["Gloves", "Gloves"],
  ["Boots", "Boots"],
  ["Shields", "Shields"],
  ["Bucklers", "Bucklers"],
  ["Foci", "Foci"],
  ["Quivers", "Quivers"],
  ["Bows", "Bows"],
  ["Crossbows", "Crossbows"],
  ["Quarterstaves", "Quarterstaves"],
  ["Spears", "Spears"],
  ["Claws", "Claws"],
  ["Daggers", "Daggers"],
  ["Flails", "Flails"],
  ["One_Hand_Axes", "One Hand Axes"],
  ["One_Hand_Maces", "One Hand Maces"],
  ["One_Hand_Swords", "One Hand Swords"],
  ["Two_Hand_Axes", "Two Hand Axes"],
  ["Two_Hand_Maces", "Two Hand Maces"],
  ["Two_Hand_Swords", "Two Hand Swords"],
  ["Sceptres", "Sceptres"],
  ["Staves", "Staves"],
  ["Wands", "Wands"],
  ["Talismans", "Talismans"],
  ["Traps", "Traps"],
  ["Rings", "Rings"],
  ["Amulets", "Amulets"],
  ["Belts", "Belts"],
  ["Jewels", "Jewels"],
  ["Charms", "Charms"],
  ["Life_Flasks", "Life Flasks"],
  ["Mana_Flasks", "Mana Flasks"],
  ["Skill_Gems", "Skill Gems"],
  ["Support_Gems", "Support Gems"],
  ["Spirit_Gems", "Spirit Gems"],
];

const SKIP_SECTION = /Unique|Ref$|Mods|Passives|Recipes|Maps$|Legends|Content|Penalty|Types|Wager|Length|Towers/;
// 젬 페이지는 링크에 /us/ 가 붙고 이름이 <div> 로 한 번 더 감싸져 있다.
const ITEM =
  /<div class="flex-shrink-0"><a class="([^"]*)"[^>]*href="(?:\/(?:us|kr)\/)?([^"]+)"><img[^>]*src="([^"]+)"[^>]*><\/a><\/div><div class="flex-grow-1 ms-2">(?:<div>)?<a [^>]*>(?:<img[^>]*>)?([^<]+)<\/a>/g;
const decode = (s) => s.replace(/&#039;|&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"').trim();

/** 페이지를 탭(섹션)별 아이템 목록으로 나눈다. 탭이 없는 페이지는 섹션 하나. */
function sections(html) {
  const marks = [...html.matchAll(/<div id="([^"]+)" class="tab-pane[^"]*"><div\s+class="card mb-2 ">\s*<h5 class="card-header">([^<]+)<\/h5>/g)];
  // 탭보다 앞에 나오는 목록(혈통 젬 등)도 섹션 하나로 둔다.
  const parts = marks.length
    ? [
        { id: "main", title: "", html: html.slice(0, marks[0].index) },
        ...marks.map((m, i) => ({
          id: m[1],
          title: m[2].replace(/\/\d+\s*$/, "").trim(),
          html: html.slice(m.index, marks[i + 1]?.index ?? html.length),
        })),
      ]
    : [{ id: "all", title: "", html }];
  return parts.map((p) => ({
    ...p,
    items: [...p.html.matchAll(ITEM)].map((m) => ({ kind: m[1], slug: m[2], icon: m[3], name: decode(m[4]) })),
  }));
}

const krIndex = await page("kr", "Items");
const krClassName = {};
for (const m of krIndex.matchAll(/href="([A-Za-z_]+)"[^>]*>([^<]{1,40})<\/a>/g)) krClassName[m[1]] = decode(m[2]);

// 한글 페이지가 없거나 이름이 빠지면 경매장 한글 데이터(items.json)로 보충한다.
const tradeKo = JSON.parse(readFileSync("src/filtergen/items.json", "utf8"));

const classes = [];
for (const { slug, filterClass } of ITEM_CLASSES) {
  const [us, kr] = await Promise.all([page("us", slug), page("kr", slug, true)]);
  // 한글 페이지는 탭 id가 한글이라 같은 순서의 탭끼리, 아이템은 링크(slug)로 잇는다.
  const usSections = sections(us);
  const krSections = sections(kr);
  const koBySlug = new Map(krSections.flatMap((s) => s.items.map((i) => [i.slug, i.name])));
  const out = [];
  const seen = new Set();
  for (const [index, s] of usSections.entries()) {
    if (SKIP_SECTION.test(s.id) || !s.items.length) continue;
    const krs = krSections.length === usSections.length ? krSections[index] : undefined;
    const items = [];
    for (const item of s.items) {
      // 다른 페이지로 가는 링크(같은 이름 반복·테스트 아이템)는 뺀다.
      if (seen.has(item.slug) || /\[|DNT|UNUSED/i.test(item.name)) continue;
      seen.add(item.slug);
      items.push({ en: item.name, ko: koBySlug.get(item.slug) ?? tradeKo[item.name]?.ko ?? item.name, icon: item.icon });
    }
    if (items.length) out.push({ id: s.id, en: s.title, ko: krs?.title ?? s.title, items });
  }
  classes.push({ slug, filterClass, ko: krClassName[slug] ?? slug, sections: out });
  console.log(slug, out.map((s) => `${s.ko}(${s.items.length})`).join(" "));
}

// poe2db 가 "disabled" 로 표시한 클래스(클로·단검 등 아직 게임에 없는 무기)는 뺀다.
const usIndex = await page("us", "Items");
const disabled = new Set(
  [...usIndex.matchAll(/class="ItemClasses disabled[^"]*"[^>]*href="([A-Za-z_]+)"/g)].map((m) => m[1]),
);

const gear = [];
for (const [slug, filterClass] of GEAR_CLASSES) {
  if (disabled.has(slug)) continue;
  const us = await page("us", slug);
  const first = sections(us).find((s) => !/Unique/.test(s.id) && s.items.length)?.items[0];
  gear.push({ slug, filterClass, ko: krClassName[slug] ?? filterClass, icon: first?.icon });
}
console.log("gear", gear.map((g) => `${g.ko}${g.icon ? "" : "(아이콘 없음)"}`).join(" "));

// 조건으로 묶는 항목(미가공 젬, 탐험 일지)의 아이콘은 경매장 이미지를 쓴다.
const icons = {};
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
  const icon = tradeKo[name]?.icon;
  if (icon) icons[name] = icon.startsWith("http") ? icon : `https://web.poecdn.com${icon}`;
}

writeFileSync("src/filtergen/catalog.json", JSON.stringify({ classes, gear, icons }, null, 1) + "\n");
