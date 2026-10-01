import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function parseLocale(text, loc) {
  const marker = `{\\"${loc}\\":{\\"tabletTypes\\"`;
  const start = text.indexOf(marker);
  if (start < 0) throw new Error(`locale ${loc} not found`);
  let i = start + `{\\"${loc}\\":`.length;
  let depth = 0;
  let end = -1;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  const raw = text.slice(start + `{\\"${loc}\\":`.length, end).replace(/\\"/g, '"');
  return JSON.parse(raw);
}

function normalizeStatText(text) {
  return text
    .replace(/\[([^\]|]+)\|[^\]]+\]/g, "$1")
    .replace(/in your maps/gi, "in map")
    .replace(/in maps/gi, "in map")
    .replace(/(\(\d+[–—\-]\d+\)|\d+[–—\-]\d+|\(\d+-\d+\))\s*%/gi, "#%")
    .replace(/#\s*%/g, "#%")
    .replace(/\+#/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function signature(text) {
  return normalizeStatText(text)
    .replace(/#/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenScore(a, b) {
  const A = new Set(a.split(" ").filter((w) => w.length > 2));
  const B = new Set(b.split(" ").filter((w) => w.length > 2));
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter++;
  return inter / Math.max(A.size, B.size);
}

const MANUAL_PREFIX = {
  "prefix:1": "explicit.stat_2306002879",
  "prefix:2": "explicit.stat_2017682521",
  "prefix:3": "explicit.stat_3873704640",
  "prefix:4": "explicit.stat_3793155082",
  "prefix:5": "explicit.stat_1276056105",
  "prefix:6": "explicit.stat_57434274",
  "prefix:7": "explicit.stat_2390685262",
  "prefix:64": "explicit.stat_3762913035",
  "prefix:65": "explicit.stat_2895378479",
  "prefix:67": "explicit.stat_472809816",
  "prefix:68": "explicit.stat_3289828378",
  "prefix:69": "explicit.stat_1825943485",
  "prefix:71": "explicit.stat_2065500219",
};

const enHtml = fs.readFileSync(path.join(root, ".tmp-poe2way-en.html"), "utf8");
const data = parseLocale(enHtml, "ko");

const statsPath = path.join(root, ".tmp-trade-stats.json");
if (!fs.existsSync(statsPath)) {
  console.error("missing .tmp-trade-stats.json — run curl trade2/data/stats first");
  process.exit(1);
}
const stats = JSON.parse(fs.readFileSync(statsPath, "utf8"));
const explicitEntries = [];
const statByNorm = new Map();
for (const group of stats.result) {
  for (const entry of group.entries ?? []) {
    if (!entry.id?.startsWith("explicit.")) continue;
    explicitEntries.push(entry);
    statByNorm.set(normalizeStatText(entry.text), entry.id);
  }
}

function findStatId(textEn) {
  const norm = normalizeStatText(textEn);
  const exact = statByNorm.get(norm);
  if (exact) return exact;

  const modSig = signature(textEn);
  let bestId = null;
  let best = 0;
  for (const entry of explicitEntries) {
    const score = tokenScore(modSig, signature(entry.text));
    if (score > best) {
      best = score;
      bestId = entry.id;
    }
  }
  return best >= 0.55 ? bestId : null;
}

const TABLET_TYPE_TRADE = {
  pioneer: "Temple Tablet",
  rift: "Breach Tablet",
  expedition: "Expedition Tablet",
  delirium: "Delirium Tablet",
  ritual: "Ritual Tablet",
  guardian: "Overseer Tablet",
  abbysal: "Abyss Tablet",
};

const tabletTypeTrade = {};
for (const t of data.tabletTypes) {
  tabletTypeTrade[t.id] = TABLET_TYPE_TRADE[t.code] ?? null;
}

const mods = [...data.prefixOptions, ...data.suffixOptions];
const tradeStatByRef = { ...MANUAL_PREFIX };
let matched = Object.keys(MANUAL_PREFIX).length;

for (const mod of mods) {
  const key = `${mod.type}:${mod.id}`;
  if (tradeStatByRef[key]) continue;
  const textEn = mod.text_en ?? mod.text_ko ?? "";
  const statId = findStatId(textEn);
  if (statId) {
    tradeStatByRef[key] = statId;
    matched++;
  }
}

const out = {
  generatedAt: new Date().toISOString(),
  tabletTypeTrade,
  tradeStatByRef,
  matched,
  total: mods.length,
};

const target = path.join(root, "src", "tablet", "tabletTradeMap.json");
fs.writeFileSync(target, JSON.stringify(out, null, 2));
console.log(`wrote ${target}`, matched, "/", mods.length);
