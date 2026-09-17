export function iconUrl(image: string): string {
  if (!image) return "";
  if (image.startsWith("http")) return image;
  return `https://web.poecdn.com${image}`;
}

export function formatRate(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1000) return value.toLocaleString("ko-KR", { maximumFractionDigits: 0 });
  if (value >= 100) return value.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
  if (value >= 10) return value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString("ko-KR", { maximumFractionDigits: 3 });
  if (value >= 0.01) return value.toLocaleString("ko-KR", { maximumFractionDigits: 4 });
  return value.toLocaleString("ko-KR", { maximumSignificantDigits: 3 });
}

export function formatVolume(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toLocaleString("ko-KR", { maximumFractionDigits: 1 });
}

export function timeAgo(timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 10) return "방금";
  if (seconds < 60) return `${seconds}초 전`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  return `${hours}시간 전`;
}

export function formatPct(value: number): string {
  const abs = Math.abs(value);
  const digits = abs >= 1 ? 2 : 3;
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

export type StackHint = {
  give: number;
  get: number;
  exact: number;
  errorPct: number;
};

export function bestStacks(rate: number, maxGive = 24): StackHint[] {
  if (!Number.isFinite(rate) || rate <= 0) return [];

  const hints: StackHint[] = [];
  for (let give = 1; give <= maxGive; give += 1) {
    const exact = give * rate;
    const get = Math.round(exact);
    if (get <= 0) continue;
    hints.push({
      give,
      get,
      exact,
      errorPct: ((get - exact) / exact) * 100,
    });
  }

  hints.sort((a, b) => Math.abs(a.errorPct) - Math.abs(b.errorPct) || a.give - b.give);

  const unique: StackHint[] = [];
  const seen = new Set<string>();
  for (const hint of hints) {
    const divisor = gcd(hint.give, hint.get);
    const key = `${hint.give / divisor}:${hint.get / divisor}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(hint);
    if (unique.length >= 4) break;
  }
  return unique;
}
