const TRADE_ORIGIN = "https://www.pathofexile.com/api/trade2";
const USER_AGENT = "OAuth poe2-utility/0.1 (+https://github.com/GitDevWorld/poe2-utility)";

export default async function handler(req, res) {
  const relativePath = req.query.path;
  if (!relativePath || typeof relativePath !== "string") {
    res.status(400).json({ error: { message: "missing path query" } });
    return;
  }

  const extraQuery = { ...req.query };
  delete extraQuery.path;
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(extraQuery).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v ?? "")])),
  ).toString();

  const target = `${TRADE_ORIGIN}/${relativePath}${qs ? `?${qs}` : ""}`;
  const headers = {
    Accept: "application/json",
    "User-Agent": USER_AGENT,
  };

  let body;
  if (req.method === "POST") {
    headers["Content-Type"] = "application/json";
    body = typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {});
  }

  try {
    const upstream = await fetch(target, { method: req.method, headers, body });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", "application/json");
    res.send(text);
  } catch {
    res.status(502).json({ error: { message: "trade proxy failed" } });
  }
}
