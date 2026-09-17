import fs from "node:fs";

const html = fs.readFileSync(`${process.env.TEMP}/poe2db-ritual.html`, "utf8");
console.log("len", html.length);
console.log("Omen", html.includes("Omen"));
console.log("징조", html.includes("징조"));
console.log("Omen_of", html.indexOf("Omen_of"));
const idx = html.indexOf("Omen_of");
if (idx >= 0) console.log(html.slice(idx - 80, idx + 180));
const hrefs = [...html.matchAll(/href="([^"]*Omen[^"]*)"/g)].slice(0, 10).map((m) => m[1]);
console.log("hrefs", hrefs);
const scripts = [...html.matchAll(/src="([^"]+)"/g)].map((m) => m[1]).filter((s) => /econ|table|data/i.test(s));
console.log("scripts", scripts.slice(0, 20));
