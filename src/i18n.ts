import { NAMES } from "./names.generated";

function norm(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9가-힣]+/g, "");
}

export function koreanName(id: string, fallback: string, detailsId?: string): string {
  return (
    NAMES[id] ??
    (detailsId ? NAMES[detailsId] : undefined) ??
    NAMES[norm(fallback)] ??
    NAMES[norm(id)] ??
    fallback
  );
}
