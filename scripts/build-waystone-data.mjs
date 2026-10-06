// 경로석 데이터 생성: poe2db.tw 경로석 옵션 표(https://poe2db.tw/kr/Waystones) → src/waystone/waystoneData.json
// 사용: node scripts/build-waystone-data.mjs
// - 등급(티어)만 다른 같은 옵션은 하나로 묶고 수치 범위를 합친다.
// - pattern_ko: 창고 Ctrl+F 정규식. 다른 옵션의 모든 줄(부가 효과 포함)과 경로석 기본 속성 줄에 걸리지 않는 가장 짧은 문구.
// - stat: 경매장 data/stats 의 explicit stat 번호 (첫 줄 문구로 매칭).
import fs from "fs";

const UA = "OAuth poe2-utility/0.1 (+https://github.com/GitDevWorld/poe2-utility)";
const OUT = "src/waystone/waystoneData.json";

const html = await (await fetch("https://poe2db.tw/kr/Waystones", { headers: { "User-Agent": "Mozilla/5.0" } })).text();
const stats = await (await fetch("https://poe.kakaogames.com/api/trade2/data/stats", { headers: { "User-Agent": UA } })).json();

const start = html.indexOf('id="경로석Mods"');
if (start < 0) throw new Error("경로석 옵션 표를 찾지 못함");
const table = html.slice(start, html.indexOf("</tbody>", start));

const clean = (s) =>
  s
    .replace(/<span class="ndash">—<\/span>/g, "–")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const rows = [...table.matchAll(/<tr><td>(\d+)<\/td><td>(접두어|접미어)<\/td><td>([\s\S]*?)<\/td><\/tr>/g)]
  .map(([, level, affix, desc]) => ({
    level: Number(level),
    type: affix === "접두어" ? "prefix" : "suffix",
    lines: desc.split(/<br\s*\/?>/).map(clean).filter(Boolean),
  }))
  .filter((row) => row.lines.length);

// 수치만 # 로 바꾼 문구 = 같은 옵션 판별 키
const template = (line) => line.replace(/\((-?\d+(?:\.\d+)?)–(-?\d+(?:\.\d+)?)\)|-?\d+(?:\.\d+)?/g, "#");

const groups = new Map();
for (const row of rows) {
  const key = `${row.type}|${template(row.lines[0])}`;
  const group = groups.get(key) ?? { type: row.type, rows: [] };
  group.rows.push(row);
  groups.set(key, group);
}

// 등급별 수치를 합쳐 "(최소–최대)" 로 표시
function mergedText(lines) {
  const parts = lines[0].split(/(\((?:\d+(?:\.\d+)?)–(?:\d+(?:\.\d+)?)\)|\d+(?:\.\d+)?)/);
  let slot = 0;
  return parts
    .map((part, i) => {
      if (i % 2 === 0) return part;
      const values = lines.flatMap((line) => {
        const nums = [...line.matchAll(/\((\d+(?:\.\d+)?)–(\d+(?:\.\d+)?)\)|(\d+(?:\.\d+)?)/g)][slot];
        return nums ? [nums[1] ?? nums[3], nums[2] ?? nums[3]].map(Number) : [];
      });
      slot += 1;
      const lo = Math.min(...values);
      const hi = Math.max(...values);
      return lo === hi ? String(lo) : `(${lo}–${hi})`;
    })
    .join("");
}

const statEntries = stats.result.find((g) => g.id === "explicit").entries;
const statByTemplate = new Map();
for (const entry of statEntries) {
  const key = entry.text.replace(/\+?#/g, "#").replace(/\s+/g, " ");
  if (!statByTemplate.has(key)) statByTemplate.set(key, entry.id);
}
const findStat = (line) => {
  const key = template(line).replace(/\+#/g, "#");
  return statByTemplate.get(key) ?? statByTemplate.get(key.replace(/#%/g, "#%"));
};

// 자동으로 못 만드는 경우만 손으로 정한다 (키: 첫 줄 문구의 수치를 # 로 바꾼 것)
const OVERRIDES = {
  // "몬스터 피해가 …관통" 문구에 통째로 포함돼서, 피해 바로 뒤에 숫자가 오는 경우만 잡는다.
  "몬스터 피해 #% 증가": { pattern: "터.피해.\\d" },
  // poe2db 원문이 음수 범위 "(-4–-3)%" 라 문구를 직접 적는다.
  "플레이어 저항 최대치 #%": { text: "플레이어 저항 최대치 -(3–10)%" },
  // 게임 표시는 "감폭", 경매장 stat 문구는 "증폭"(값이 음수)이다.
  "플레이어의 재사용 대기시간 회복 속도 #% 감폭": { stat: "explicit.stat_941368244" },
};

// 경로석 아이템에 옵션 말고도 보이는 줄 (등급·기본 속성) — 패턴이 여기에 걸리면 안 된다
const BASE_LINES = [
  "경로석 (15등급)",
  "경로석 등급: 15",
  "지역에서 발견하는 아이템 수량: +50%",
  "지역에서 발견하는 아이템 희귀도: +50%",
  "몬스터 무리 규모: +50%",
  "경로석 발견 확률: +50%",
  "남은 부활 횟수: 3",
  "타락",
];

const mods = [...groups.values()].map((group, index) => {
  const first = group.rows.map((row) => row.lines[0]);
  const override = OVERRIDES[template(first[0])] ?? {};
  // 부가 효과 줄은 등급별 수치를 합쳐서 보여준다 (줄 순서는 등급마다 같다)
  const extraCount = Math.max(...group.rows.map((row) => row.lines.length)) - 1;
  const extras = Array.from({ length: extraCount }, (_, k) =>
    mergedText(group.rows.map((row) => row.lines[k + 1]).filter(Boolean)),
  );
  return {
    id: index + 1,
    type: group.type,
    text_ko: override.text ?? mergedText(first),
    extras,
    stat: override.stat ?? findStat(first[0]),
    patternOverride: override.pattern,
    allLines: group.rows.flatMap((row) => row.lines),
  };
});

const shown = (line) => line.replace(/\(([\d.]+)–([\d.]+)\)/g, "$2");
function pickPattern(mod) {
  if (mod.patternOverride) return mod.patternOverride;
  const others = [
    ...mods.filter((m) => m !== mod).flatMap((m) => m.allLines.map(shown)),
    ...BASE_LINES,
  ];
  // 숫자·기호를 뺀 글자 구간에서 후보를 만든다
  const text = shown(mod.allLines[0]);
  const segments = text.split(/[\d%+().,]+/).map((s) => s.trim()).filter((s) => s.length >= 2);
  for (let len = 2; len <= 8; len += 1) {
    for (const seg of segments) {
      for (let i = 0; i + len <= seg.length; i += 1) {
        const raw = seg.slice(i, i + len);
        if (raw.startsWith(" ") || raw.endsWith(" ")) continue;
        const pattern = raw.replace(/ /g, ".");
        const re = new RegExp(pattern);
        if (!re.test(text)) continue;
        if (others.some((line) => re.test(line))) continue;
        return pattern;
      }
    }
  }
  return null;
}

const out = [];
for (const mod of mods) {
  const pattern = pickPattern(mod);
  if (!pattern) console.warn("패턴 없음:", mod.type, mod.text_ko);
  if (!mod.stat) console.warn("경매장 stat 없음:", mod.type, mod.text_ko);
  out.push({
    id: mod.id,
    type: mod.type,
    text_ko: mod.text_ko,
    extras: mod.extras,
    pattern_ko: pattern ?? "",
    stat: mod.stat ?? null,
  });
}

for (const mod of out) {
  if (!mod.pattern_ko) continue;
  const re = new RegExp(mod.pattern_ko);
  const self = mods.find((m) => m.id === mod.id);
  if (!re.test(shown(self.allLines[0]))) console.warn("패턴이 자기 문구에 안 걸림:", mod.pattern_ko, mod.text_ko);
  const clash = mods.filter((m) => m.id !== mod.id && m.allLines.some((line) => re.test(shown(line))));
  if (clash.length) console.warn("패턴 겹침:", mod.pattern_ko, mod.text_ko, "→", clash.map((m) => m.allLines[0]));
}

fs.mkdirSync("src/waystone", { recursive: true });
fs.writeFileSync(
  OUT,
  JSON.stringify(
    {
      source: `poe2db.tw/kr/Waystones + 경매장 data/stats (${new Date().toISOString().slice(0, 10)} 확인)`,
      tiers: Array.from({ length: 16 }, (_, i) => i + 1),
      prefixOptions: out.filter((m) => m.type === "prefix"),
      suffixOptions: out.filter((m) => m.type === "suffix"),
    },
    null,
    2,
  ) + "\n",
);
console.log(`rows ${rows.length} → mods ${out.length} (prefix ${out.filter((m) => m.type === "prefix").length}, suffix ${out.filter((m) => m.type === "suffix").length})`);
for (const m of out) console.log(m.type === "prefix" ? "P" : "S", m.pattern_ko.padEnd(8), m.stat ? "✓" : "✗", m.text_ko);
