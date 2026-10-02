// GitHub Actions 등 외부 서버에서 경매장 API 접근이 되는지 확인하는 시험 스크립트.
const LEAGUE = process.env.LEAGUE ?? "Forbidden Rites";
const USER_AGENT = "OAuth poe2-utility/0.1 (+https://github.com/GitDevWorld/poe2-utility)";
const HOSTS = ["https://www.pathofexile.com", "https://poe.kakaogames.com"];

const body = {
  query: {
    status: { option: "securable" },
    filters: {
      type_filters: { filters: { category: { option: "map.tablet" }, rarity: { option: "magic" } } },
      trade_filters: { filters: { price: { min: 1, option: "exalted" } } },
    },
    stats: [{ type: "and", filters: [{ id: "explicit.stat_2306002879", value: { min: 1 }, disabled: false }] }],
  },
  sort: { price: "asc" },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failed = false;

for (const host of HOSTS) {
  const url = `${host}/api/trade2/search/poe2/${encodeURIComponent(LEAGUE)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", "User-Agent": USER_AGENT },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let summary = text.slice(0, 160).replace(/\s+/g, " ");
    try {
      const json = JSON.parse(text);
      summary = json.error ? `error ${json.error.code}: ${json.error.message}` : `total ${json.total}, results ${json.result?.length}`;
      if (!json.error && json.result?.length) {
        await sleep(1500);
        const ids = json.result.slice(0, 3).join(",");
        const f = await fetch(`${host}/api/trade2/fetch/${ids}?query=${json.id}`, {
          headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        });
        const fj = await f.json().catch(() => ({}));
        const prices = (fj.result ?? []).map((r) => `${r.listing?.price?.amount} ${r.listing?.price?.currency}`);
        summary += ` | fetch ${f.status}: ${prices.join(", ")}`;
      }
    } catch {
      /* not json (HTML block page) */
    }
    console.log(`${host} -> HTTP ${res.status} | ${summary}`);
    if (res.status !== 200) failed = true;
  } catch (err) {
    console.log(`${host} -> request failed: ${err.message}`);
    failed = true;
  }
  await sleep(2000);
}

process.exit(failed ? 1 : 0);
