// 서판 옵션별 경매장 시세 수집기 (GitHub Actions에서 주기 실행).
// Vercel 등 일부 데이터센터 IP는 경매장이 막기 때문에, 수집은 여기서 하고 결과 JSON만 사이트가 읽는다.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const TRADE_ORIGIN = "https://www.pathofexile.com/api/trade2";
const USER_AGENT = "OAuth poe2-utility/0.1 (+https://github.com/GitDevWorld/poe2-utility)";
const OUT_FILE = process.env.OUT_FILE ?? "out/tablet-prices.json";
const SAMPLE_LISTINGS = 10;
// 검색 한도 30회/300초 → 10초 간격보다 조금 넉넉하게.
const SEARCH_GAP_MS = 10_500;
const FETCH_GAP_MS = 1_500;
const MAX_RETRIES = 3;

const data = JSON.parse(readFileSync("src/tablet/tabletData.json", "utf8"));
const tradeMap = JSON.parse(readFileSync("src/tablet/tabletTradeMap.json", "utf8"));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const log = (...args) => console.log(new Date().toISOString().slice(11, 19), ...args);

async function json(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { error: { message: `non-JSON response (HTTP ${res.status})` } };
  }
  return { res, body };
}

async function resolveLeague() {
  if (process.env.LEAGUE) return process.env.LEAGUE;
  const { body } = await json("https://poe.ninja/poe2/api/economy/leagues");
  const leagues = Array.isArray(body) ? body : [];
  const pick = leagues.find((l) => !/hardcore|^hc |ruthless|standard/i.test(l.name));
  return pick?.name ?? "Standard";
}

/** 엑잘티드 오브 기준 환율 (poe.ninja 교환 시세) */
async function loadRates(league) {
  const url = `https://poe.ninja/poe2/api/economy/exchange/current/overview?league=${encodeURIComponent(league)}&type=Currency`;
  const { body } = await json(url);
  const lines = body?.lines ?? [];
  const byId = Object.fromEntries(lines.map((line) => [line.id, line.primaryValue]));
  const primary = body?.core?.primary ?? "divine";
  // primaryValue = 기준 화폐(보통 divine) 단위 가격
  const exInPrimary = byId.exalted;
  if (!exInPrimary || primary !== "divine") return { divine: 600, chaos: 50 };
  const divine = Math.round((1 / exInPrimary) * 10) / 10;
  const chaos = byId.chaos ? Math.round((byId.chaos / exInPrimary) * 1000) / 1000 : 0;
  return { divine, chaos };
}

function priceToExalt(price, rates) {
  if (!price?.amount || !price.currency) return undefined;
  switch (price.currency) {
    case "exalted":
      return price.amount;
    case "divine":
      return price.amount * rates.divine;
    case "chaos":
      return rates.chaos ? price.amount * rates.chaos : undefined;
    default:
      return undefined;
  }
}

/** X-Rate-Limit 헤더를 보고 한도에 닿기 전에 쉰다. */
async function respectRateLimit(res, policyName) {
  const rules = res.headers.get("x-rate-limit-ip");
  const state = res.headers.get("x-rate-limit-ip-state");
  const retryAfter = Number(res.headers.get("retry-after") ?? 0);
  if (retryAfter > 0) {
    log(`${policyName}: retry-after ${retryAfter}s`);
    await sleep(retryAfter * 1000 + 1000);
    return;
  }
  if (!rules || !state) return;
  const limits = rules.split(",").map((r) => r.split(":").map(Number));
  const current = state.split(",").map((r) => r.split(":").map(Number));
  let waitSec = 0;
  limits.forEach(([max, period], i) => {
    const [hits, , penalty] = current[i] ?? [];
    if (penalty > 0) waitSec = Math.max(waitSec, penalty);
    else if (hits >= max - 1) waitSec = Math.max(waitSec, period);
  });
  if (waitSec > 0) {
    log(`${policyName}: near limit, waiting ${waitSec}s`);
    await sleep(waitSec * 1000 + 1000);
  }
}

async function tradeRequest(path, init, policyName, attempt = 0) {
  const { res, body } = await json(`${TRADE_ORIGIN}/${path}`, {
    ...init,
    headers: { Accept: "application/json", "User-Agent": USER_AGENT, ...(init?.headers ?? {}) },
  });
  await respectRateLimit(res, policyName);
  if (res.status === 429 && attempt < MAX_RETRIES) return tradeRequest(path, init, policyName, attempt + 1);
  if (body?.error) throw new Error(body.error.message ?? `HTTP ${res.status}`);
  return body;
}

function searchBody(statId, rarity, tabletType) {
  const query = {
    status: { option: "securable" },
    filters: {
      type_filters: { filters: { category: { option: "map.tablet" }, rarity: { option: rarity } } },
      trade_filters: { filters: { price: { min: 1, option: "exalted" } } },
    },
    stats: [{ type: "and", filters: [{ id: statId, value: { min: 1 }, disabled: false }] }],
  };
  if (tabletType) query.type = tabletType;
  return { query, sort: { price: "asc" } };
}

async function sample(league, job, rarity, rates) {
  const search = await tradeRequest(
    `search/poe2/${encodeURIComponent(league)}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(searchBody(job.statId, rarity, job.tabletType)) },
    "search",
  );
  await sleep(SEARCH_GAP_MS);
  const ids = (search.result ?? []).slice(0, SAMPLE_LISTINGS);
  if (!ids.length) return undefined;

  const fetched = await tradeRequest(`fetch/${ids.join(",")}?query=${search.id}`, undefined, "fetch");
  await sleep(FETCH_GAP_MS);
  const values = (fetched.result ?? [])
    .map((row) => priceToExalt(row?.listing?.price, rates))
    .filter((v) => v != null && v > 0)
    .sort((a, b) => a - b);
  if (!values.length) return undefined;
  const round = (v) => Math.round(v * 10) / 10;
  return {
    lowestEx: round(values[0]),
    medianEx: round(values[Math.floor((values.length - 1) / 2)]),
    listings: search.total ?? values.length,
  };
}

function buildJobs() {
  const jobs = [];
  for (const mod of [...data.prefixOptions, ...data.suffixOptions]) {
    const key = `${mod.type}:${mod.id}`;
    const statId = tradeMap.tradeStatByRef[key];
    if (!statId) continue;
    const tabletType = mod.tablet_type_id != null ? tradeMap.tabletTypeTrade[String(mod.tablet_type_id)] : undefined;
    jobs.push({ key, statId, tabletType });
  }
  // 로컬 시험용: JOB_LIMIT=2 처럼 앞쪽 몇 개만 조회
  const limit = Number(process.env.JOB_LIMIT ?? 0);
  return limit > 0 ? jobs.slice(0, limit) : jobs;
}

async function main() {
  const league = await resolveLeague();
  const rates = await loadRates(league);
  const jobs = buildJobs();
  log(`league=${league} rates=${JSON.stringify(rates)} jobs=${jobs.length}`);

  const prices = {};
  let errors = 0;
  let lastError = "";
  for (const [index, job] of jobs.entries()) {
    const entry = {};
    for (const rarity of ["magic", "rare"]) {
      try {
        const stats = await sample(league, job, rarity, rates);
        if (stats) entry[rarity] = stats;
      } catch (err) {
        errors += 1;
        lastError = err.message;
        log(`${job.key} ${rarity}: ${err.message}`);
        await sleep(SEARCH_GAP_MS);
      }
    }
    prices[job.key] = entry;
    log(`${index + 1}/${jobs.length} ${job.key} ${JSON.stringify(entry)}`);
  }

  const withPrice = Object.values(prices).filter((p) => p.magic || p.rare).length;
  if (withPrice === 0) {
    // 전부 실패면 기존 데이터를 덮어쓰지 않도록 실패로 끝낸다.
    console.error(`no prices collected (${errors} errors, last: ${lastError})`);
    process.exit(1);
  }

  const out = {
    schema: 1,
    league,
    updatedAt: Date.now(),
    rates,
    sample: SAMPLE_LISTINGS,
    status: "securable",
    stats: { mods: jobs.length, withPrice, errors },
    prices,
  };
  mkdirSync(dirname(OUT_FILE), { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(out));
  log(`wrote ${OUT_FILE}: ${withPrice}/${jobs.length} mods priced, ${errors} errors`);
}

await main();
