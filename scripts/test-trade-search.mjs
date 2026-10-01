const UA = "OAuth poe2-exchange/0.1 (contact: none)";
const LEAGUE = "Forbidden Rites";

const tests = [
  { name: "prefix1 rarity", stat: "explicit.stat_2306002879" },
  { name: "prefix2 pack", stat: "explicit.stat_2017682521" },
  { name: "prefix3 magic mon", stat: "explicit.stat_3873704640" },
];

function body(stat, rarity) {
  return {
    query: {
      status: { option: "online" },
      filters: {
        type_filters: {
          filters: {
            category: { option: "map.tablet" },
            rarity: { option: rarity },
          },
        },
        trade_filters: {
          filters: {
            price: { min: 1, option: "exalted" },
          },
        },
      },
      stats: [{ type: "and", filters: [{ id: stat, value: { min: 1 }, disabled: false }] }],
    },
    sort: { price: "asc" },
  };
}

async function run() {
  for (const t of tests) {
    for (const rarity of ["magic", "rare"]) {
      const res = await fetch(
        `https://www.pathofexile.com/api/trade2/search/poe2/${encodeURIComponent(LEAGUE)}`,
        {
          method: "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": UA },
          body: JSON.stringify(body(t.stat, rarity)),
        },
      );
      const json = await res.json();
      const total = json.total ?? json.result?.length ?? 0;
      console.log(t.name, rarity, "total", total, json.error?.message ?? "ok");
      if (json.result?.[0] && json.id) {
        const fid = json.result[0];
        const fr = await fetch(
          `https://www.pathofexile.com/api/trade2/fetch/${fid}?query=${encodeURIComponent(json.id)}`,
          { headers: { Accept: "application/json", "User-Agent": UA } },
        );
        const fetched = await fr.json();
        const price = fetched.result?.[0]?.listing?.price;
        console.log("  sample price", price);
      }
    }
  }
}

run().catch(console.error);
