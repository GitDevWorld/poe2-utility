// 서판 데이터 점검: (1) 창고 검색 패턴이 다른 옵션 문구에도 걸리는지 (2) 경매장 stat이 실제로 검색되는지.
// 사용: node scripts/check-tablet-data.mjs [--trade]
import { readFileSync } from "node:fs";

const data = JSON.parse(readFileSync("src/tablet/tabletData.json", "utf8"));
const tradeMap = JSON.parse(readFileSync("src/tablet/tabletTradeMap.json", "utf8"));
const mods = [...data.prefixOptions, ...data.suffixOptions];
const typeName = Object.fromEntries(data.tabletTypes.map((t) => [t.id, t.name_ko]));

// 게임에 표시되는 문구처럼 범위 "(8–12)"를 숫자 하나로 바꾼다.
// 게임에 표시되지 않는 "(숨은 효과: …)" 설명은 뺀다.
const shown = (text) =>
  text.replace(/\s*\(숨은 효과[^)]*\)/g, "").replace(/\((\d+(?:\.\d+)?)[–—-](\d+(?:\.\d+)?)\)/g, "$2");

console.log("== 패턴 점검");
let patternIssues = 0;
for (const mod of mods) {
  let re;
  try {
    re = new RegExp(mod.pattern_ko, "i");
  } catch (err) {
    console.log(`[잘못된 패턴] ${mod.type}:${mod.id} ${mod.pattern_ko} — ${err.message}`);
    patternIssues += 1;
    continue;
  }
  if (!re.test(shown(mod.text_ko))) {
    console.log(`[자기 문구에 안 걸림] ${mod.type}:${mod.id} "${mod.pattern_ko}" / ${mod.text_ko}`);
    patternIssues += 1;
  }
  const hits = mods.filter((other) => other !== mod && re.test(shown(other.text_ko)));
  // 같은 문구가 서판 종류별로 따로 있는 경우는 같은 옵션으로 본다.
  const real = hits.filter((other) => shown(other.text_ko) !== shown(mod.text_ko));
  if (real.length) {
    patternIssues += 1;
    console.log(
      `[다른 옵션에도 걸림] ${mod.type}:${mod.id} "${mod.pattern_ko}" (${mod.text_ko})\n` +
        real.map((o) => `    → ${o.type}:${o.id} ${typeName[o.tablet_type_id] ?? "공통"} ${o.text_ko}`).join("\n"),
    );
  }
  for (const t of data.tabletTypes) {
    if (re.test(`${t.trade_ko}`)) {
      patternIssues += 1;
      console.log(`[서판 이름에 걸림] ${mod.type}:${mod.id} "${mod.pattern_ko}" → ${t.trade_ko}`);
    }
  }
}
console.log(`패턴 문제 ${patternIssues}건`);

if (process.argv.includes("--trade")) {
  console.log("\n== 경매장 검색 점검 (카카오, 즉시 구매)");
  const UA = "OAuth poe2-utility/0.1 (+https://github.com/GitDevWorld/poe2-utility)";
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let tradeIssues = 0;
  let checked = 0;
  // ONLY="prefix:1,suffix:10" 처럼 일부만 다시 확인할 수 있다.
  const only = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
  for (const mod of mods) {
    const key = `${mod.type}:${mod.id}`;
    if (only && !only.has(key)) continue;
    checked += 1;
    const statId = tradeMap.tradeStatByRef[key];
    if (!statId) {
      tradeIssues += 1;
      console.log(`[stat 없음] ${key} ${mod.text_ko}`);
      continue;
    }
    const type = data.tabletTypes.find((t) => t.id === mod.tablet_type_id)?.trade_ko;
    const query = {
      status: { option: "securable" },
      stats: [{ type: "and", filters: [{ id: statId }] }],
      filters: { type_filters: { filters: { category: { option: "map.tablet" } } } },
    };
    if (type) query.type = type;
    const res = await fetch(`https://poe.kakaogames.com/api/trade2/search/poe2/${encodeURIComponent(process.env.LEAGUE ?? "Forbidden Rites")}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ query, sort: { price: "asc" } }),
    });
    if (res.status === 429) {
      const wait = Number(res.headers.get("retry-after") ?? 60);
      console.log(`  (요청 한도 — ${wait}초 대기)`);
      await sleep((wait + 2) * 1000);
    }
    const body = await res.json().catch(() => ({ error: { message: `HTTP ${res.status} (JSON 아님)` } }));
    const total = body.error ? `오류 ${body.error.message}` : body.total;
    if (body.error || !body.total) {
      tradeIssues += 1;
      console.log(`[검색 결과 없음] ${key} ${type ?? "전체"} ${mod.text_ko} → ${total}`);
    }
    await sleep(11_000);
  }
  console.log(`경매장 문제 ${tradeIssues}건 / ${checked}개`);
}
