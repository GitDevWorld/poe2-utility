const TTL_SEC = 30 * 60;

function cacheKey(league, filter) {
  return `tablet-market:${league}:${filter}`;
}

async function kvClient() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) return null;
  const { kv } = await import("@vercel/kv");
  return kv;
}

export default async function handler(req, res) {
  const league = String(req.query.league ?? "");
  const filter = String(req.query.filter ?? "all");
  if (!league) {
    res.status(400).json({ error: "league required" });
    return;
  }

  const kv = await kvClient();
  if (!kv) {
    if (req.method === "GET") {
      res.status(503).json({ miss: true, reason: "kv_not_configured" });
      return;
    }
    res.status(503).json({ ok: false, reason: "kv_not_configured" });
    return;
  }

  const key = cacheKey(league, filter);

  if (req.method === "GET") {
    const data = await kv.get(key);
    if (!data) {
      res.status(404).json({ miss: true });
      return;
    }
    res.status(200).json(data);
    return;
  }

  if (req.method === "POST") {
    const incoming = req.body ?? {};
    const existing = (await kv.get(key)) ?? null;
    const merged = {
      ...existing,
      ...incoming,
      league,
      filter,
      updatedAt: incoming.updatedAt ?? Date.now(),
      prices: {
        ...(existing?.prices ?? {}),
        ...(incoming.prices ?? {}),
      },
      progress: incoming.progress ?? existing?.progress,
      emptyHint: incoming.emptyHint ?? existing?.emptyHint,
    };
    await kv.set(key, merged, { ex: TTL_SEC });
    res.status(200).json({ ok: true, keys: Object.keys(merged.prices).length });
    return;
  }

  res.status(405).end();
}
