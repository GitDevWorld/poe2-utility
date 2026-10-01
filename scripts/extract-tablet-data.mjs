import fs from "fs";
import path from "path";

const source = process.argv[2];
if (!source) {
  console.error("usage: node scripts/extract-tablet-data.mjs <poe2way-html.txt>");
  process.exit(1);
}

const text = fs.readFileSync(source, "utf8");
const marker = '{\\"ko\\":{\\"tabletTypes\\"';
const start = text.indexOf(marker);
if (start < 0) throw new Error("tablet payload not found");
let i = start + '{\\"ko\\":'.length;
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
const escaped = text.slice(start + '{\\"ko\\":'.length, end);
const raw = escaped.replace(/\\"/g, '"');
const data = JSON.parse(raw);
const out = {
  tabletTypes: data.tabletTypes.map((t) => ({
    id: t.id,
    code: t.code,
    name_ko: t.name_ko,
    pattern_ko: t.pattern_ko,
  })),
  prefixOptions: data.prefixOptions.map((o) => ({
    id: o.id,
    tablet_type_id: o.tablet_type_id,
    text_ko: o.text_ko,
    pattern_ko: o.pattern_ko,
    type: o.type,
  })),
  suffixOptions: data.suffixOptions.map((o) => ({
    id: o.id,
    tablet_type_id: o.tablet_type_id,
    text_ko: o.text_ko,
    pattern_ko: o.pattern_ko,
    type: o.type,
  })),
};

const target = path.join("src", "tablet", "tabletData.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(out, null, 2));
console.log(`wrote ${target}`, out.tabletTypes.length, out.prefixOptions.length, out.suffixOptions.length);
