import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

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

const html = fs.readFileSync(path.join(root, ".tmp-poe2way-en.html"), "utf8");
const data = parseLocale(html, "ko");
for (let i = 0; i < 7; i++) {
  const mod = data.prefixOptions[i];
  console.log(mod?.id, mod?.text_en, "|", mod?.text_ko);
}
