import { RingGuide } from "./CraftGuidePage";
import { JewelGuide } from "./JewelGuide";

export type GuideTab = "ring" | "jewel";

/** 제작 가이드 — 어떤 가이드를 볼지는 왼쪽 메뉴에서 고른다. */
export function GuidePage({ tab }: { tab: GuideTab }) {
  return tab === "ring" ? <RingGuide /> : <JewelGuide />;
}
