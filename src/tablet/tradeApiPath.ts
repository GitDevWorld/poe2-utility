/** PoE trade2 proxy (Vite dev + Vercel serverless) */
export const TRADE_API_PREFIX = "/api/trade";

export function tradeApiUrl(relativePath: string, searchParams?: Record<string, string>): string {
  const url = new URL(TRADE_API_PREFIX, window.location.origin);
  url.searchParams.set("path", relativePath);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  return `${url.pathname}${url.search}`;
}
