import { useState } from "react";
import { iconUrl } from "../format";
import { ArrowIcon, EndIcon, RingPanel, type RingState } from "./CraftGuidePage";

const EMERALD_ICON = "https://cdn.poe2db.tw/image/Art/2DItems/Jewels/EmeraldJewel.webp";

const ITEMS = {
  annul: {
    name: "소멸의 오브",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQW5udWxsT3JiIiwic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/2daba8ccca/AnnullOrb.png",
  },
  chaos: {
    name: "카오스 오브",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lSZXJvbGxSYXJlIiwic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/c0ca392a78/CurrencyRerollRare.png",
  },
  exalt: {
    name: "엑잘티드 오브",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lBZGRNb2RUb1JhcmUiLCJzY2FsZSI6MSwicmVhbG0iOiJwb2UyIn1d/ad7c366789/CurrencyAddModToRare.png",
  },
  contempt: {
    name: "위력적인 액체 경멸",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvRGlzdGlsbGVkRW1vdGlvbnMvVW5pcXVlQmVhc3RFbW90aW9uIiwic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/d126680055/UniqueBeastEmotion.png",
  },
  ferocity: {
    name: "위력적인 액체 흉포함",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvRGlzdGlsbGVkRW1vdGlvbnMvVW5pcXVlQ29uc3RydWN0c0Vtb3Rpb24iLCJzY2FsZSI6MSwicmVhbG0iOiJwb2UyIn1d/c4ddf1e927/UniqueConstructsEmotion.png",
  },
  cranium: {
    name: "보존된 두개골",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQWJ5c3MvUHJlc2VydmVkQ3Jhbml1bSIsInNjYWxlIjoxLCJyZWFsbSI6InBvZTIifV0/791fdae503/PreservedCranium.png",
  },
  abyssalEchoes: {
    name: "심연의 메아리의 징조",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvT21lbnMvT21lbk9uQWJ5c3NSZXJvbGxPcHRpb25zIiwic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/9690f99016/OmenOnAbyssRerollOptions.png",
  },
  light: {
    name: "빛의 징조",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvT21lbnMvT21lbk9uQW5udWxSZW1vdmVBYnlzc01vZCIsInNjYWxlIjoxLCJyZWFsbSI6InBvZTIifV0/eb39bcb3d7/OmenOnAnnulRemoveAbyssMod.png",
  },
  dextralAnnul: {
    name: "우측 소멸의 징조",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvT21lbnMvVm9vZG9vT21lbnMzUHVycGxlIiwic2NhbGUiOjEsInJlYWxtIjoicG9lMiJ9XQ/d901658529/VoodooOmens3Purple.png",
  },
  dextralErasure: {
    name: "우측 말소의 징조",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvT21lbnMvVm9vZG9vT21lbnMzRGFyayIsInNjYWxlIjoxLCJyZWFsbSI6InBvZTIifV0/6e2bb52963/VoodooOmens3Dark.png",
  },
  divine: {
    name: "신성한 오브",
    image: "/gen/image/WzI1LDE0LHsiZiI6IjJESXRlbXMvQ3VycmVuY3kvQ3VycmVuY3lNb2RWYWx1ZXMiLCJzY2FsZSI6MSwicmVhbG0iOiJwb2UyIn1d/2986e220b3/CurrencyModValues.png",
  },
} as const;

type ItemId = keyof typeof ITEMS;
type JewelStepId = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type JewelStep = {
  id: JewelStepId;
  title: string;
  body: string[];
  items: ItemId[];
  jewel: RingState;
  note?: string;
  next?: { label: string; to: JewelStepId | "end"; ok: boolean; endText?: string }[];
};

// 옵션 문구·범위는 poe2db(한국어) 에메랄드 옵션 기준, 수치는 예시값.
const FRAC_P = "희귀 및 고유 적 명중 시 피해 20% 증가"; // (10—20)%
const ATTACK_P = "공격 피해 15% 증가"; // (5—15)%
const DESECRATED_P = "회피 10% 증가 · 공격 피해 8% 증가"; // 훼손 (5—10)% · (4—8)%
const CRIT_BONUS_S = "공격 피해의 치명타 피해 보너스 20% 증가"; // (10—20)%
const JUNK_S = "육척봉 사용 시 동결 축적 15% 증가";
const JUNK_S2 = "창 사용 시 치명타 피해 보너스 15% 증가";
const CONTEMPT_S = "접두어 속성 부여의 최대 개수 +1 개"; // 위력적인 액체 경멸 (에메랄드 접미)
const FEROCITY_S = "접두어 효과 50% 증가"; // 위력적인 액체 흉포함 (40—60)%

const STEPS: JewelStep[] = [
  {
    id: "1",
    title: "보석과 3속성 위치 정하기",
    body: [
      "자기 스펙에 맞게 원하는 옵션이 있는 보석과, 접두·접미 중 어디에 3속성을 할지 정한다.",
      "예시: 에메랄드 · 3접두.",
    ],
    items: [],
    jewel: {
      prefixes: [{ text: FRAC_P, kind: "fractured" }, { text: ATTACK_P }, { text: DESECRATED_P, kind: "desecrated" }],
      suffixes: [{ text: CRIT_BONUS_S }, { text: FEROCITY_S }],
      note: "목표 — 에메랄드 3접두",
    },
  },
  {
    id: "2",
    title: "3속성 할 베이스의 분열 옵션 준비",
    body: ["3속성 할 쪽(예시는 접두)에 원하는 옵션이 분열된 베이스를 제작하거나 산다."],
    items: [],
    jewel: {
      prefixes: [{ text: FRAC_P, kind: "fractured" }, { text: "원소 피해 8% 증가", hint: "잡옵션" }],
      suffixes: [{ text: JUNK_S, hint: "잡옵션" }, { text: JUNK_S2, hint: "잡옵션" }],
      note: "분열 베이스",
    },
  },
  {
    id: "3",
    title: "소멸 후 카오스로 원하는 접두 하나 더",
    body: [
      "분열 옵션과 옵션 1개를 남기고 나머지를 소멸의 오브로 지운다.",
      "카오스 오브로 원하는 접두 옵션을 하나 더 붙인다 — 접두 2개 완성(1개는 분열).",
    ],
    items: ["annul", "chaos"],
    jewel: {
      prefixes: [{ text: FRAC_P, kind: "fractured" }, { text: ATTACK_P, kind: "new" }],
      suffixes: [{ text: JUNK_S, hint: "남긴 옵션" }, null],
      note: "접두 2개 완성 (1분열)",
    },
  },
  {
    id: "4",
    title: "엑잘티드 오브 2개 + 위력적인 액체 경멸",
    body: [
      "엑잘티드 오브를 2개 발라서 4옵션을 만든다.",
      "위력적인 액체 경멸로 접미에 '접두어 속성 부여의 최대 개수 +1 개'를 붙인다 — 무작위 옵션 하나가 지워지므로 성공 확률 66%.",
    ],
    items: ["exalt", "contempt"],
    note: "33% 확률로 접두 옵션이 지워지면 실패 — 3번으로 돌아간다.",
    next: [
      { label: "접미가 지워지면 (66%)", to: "5", ok: true },
      { label: "접두가 지워지면 (33%)", to: "3", ok: false },
    ],
    jewel: {
      prefixes: [{ text: FRAC_P, kind: "fractured" }, { text: ATTACK_P }, null],
      suffixes: [{ text: JUNK_S }, { text: CONTEMPT_S, kind: "new" }],
      note: "접두 3칸 허용",
    },
  },
  {
    id: "5",
    title: "보존된 두개골로 훼손 — 원하는 옵션 뽑기",
    body: [
      "보존된 두개골로 훼손해서 원하는 접두 옵션을 뽑는다.",
      "심연의 메아리의 징조와 빛의 징조를 미리 준비해 둔다.",
    ],
    items: ["cranium", "abyssalEchoes", "light", "annul"],
    jewel: {
      prefixes: [{ text: FRAC_P, kind: "fractured" }, { text: ATTACK_P }, { text: DESECRATED_P, kind: "desecrated" }],
      suffixes: [{ text: JUNK_S }, { text: CONTEMPT_S }],
      note: "접두 3개 완성",
    },
  },
  {
    id: "6",
    title: "접두 +1 옵션 지우기",
    body: [
      "'접두어 속성 부여의 최대 개수 +1 개'를 지우기 위해 우측 소멸의 징조 + 소멸의 오브로 날린다.",
      "실패하면 우측 말소의 징조 + 카오스 오브.",
    ],
    items: ["dextralAnnul", "annul", "dextralErasure", "chaos"],
    jewel: {
      prefixes: [{ text: FRAC_P, kind: "fractured" }, { text: ATTACK_P }, { text: DESECRATED_P, kind: "desecrated" }],
      suffixes: [{ text: JUNK_S }, null],
      note: "접두 3개 유지 · 접미 1칸 비움",
    },
  },
  {
    id: "7",
    title: "접미 2개 채우고 카오스로 원하는 접미 뽑기",
    body: [
      "접미 2개를 채우고 카오스 오브로 원하는 접미 옵션 1개를 뽑는다.",
      "카오스 오브를 돌려도 접미만 바뀌니 안심하고 돌린다.",
    ],
    items: ["exalt", "chaos"],
    jewel: {
      prefixes: [{ text: FRAC_P, kind: "fractured" }, { text: ATTACK_P }, { text: DESECRATED_P, kind: "desecrated" }],
      suffixes: [{ text: CRIT_BONUS_S, kind: "new" }, { text: JUNK_S2, hint: "잡옵션" }],
      note: "원하는 접미 1개 확보",
    },
  },
  {
    id: "8",
    title: "위력적인 액체 흉포함 — 접두어 효과 40~60% 증폭",
    body: ["위력적인 액체 흉포함을 발라서 접미에 '접두어 효과 (40—60)% 증가'를 붙인다."],
    items: ["ferocity"],
    note: "50% 확률로 원하는 접미가 지워지면 실패 — 7번으로 돌아간다.",
    next: [
      { label: "잡옵션이 지워지면 (50%)", to: "9", ok: true },
      { label: "원하는 접미가 지워지면 (50%)", to: "7", ok: false },
    ],
    jewel: {
      prefixes: [{ text: FRAC_P, kind: "fractured" }, { text: ATTACK_P }, { text: DESECRATED_P, kind: "desecrated" }],
      suffixes: [{ text: CRIT_BONUS_S }, { text: FEROCITY_S, kind: "new" }],
      note: "접미 완성",
    },
  },
  {
    id: "9",
    title: "신성한 오브로 수치 다듬고 퀄리티 작업",
    body: ["접미까지 완성되면 신성한 오브로 수치를 굴린다. 완벽하면 퀄리티 작업으로 마무리한다."],
    items: ["divine"],
    next: [{ label: "완벽하면", to: "end", ok: true, endText: "완성" }],
    jewel: {
      prefixes: [{ text: FRAC_P, kind: "fractured" }, { text: ATTACK_P }, { text: DESECRATED_P, kind: "desecrated" }],
      suffixes: [{ text: CRIT_BONUS_S }, { text: FEROCITY_S }],
      note: "완성 — 5옵션 보석",
    },
  },
];

const WANTED = {
  prefixes: [
    { text: "희귀 및 고유 적 명중 시 피해 (10—20)% 증가", tag: "분열 후보" },
    { text: "육척봉 사용 시 피해 (6—16)% 증가", tag: "분열 후보" },
    { text: "에너지 보호막 최대치 20% 증가", tag: "분열 후보" },
    { text: "공격 피해 (5—15)% 증가" },
    { text: "원소 피해 (5—15)% 증가" },
    { text: "회피 (10—20)% 증가" },
    { text: "회피 (5—10)% 증가 · 공격 피해 (4—8)% 증가", tag: "훼손" },
    { text: "에너지 보호막 최대치 (5—10)% 증가 · 공격 피해 (4—8)% 증가", tag: "훼손" },
  ],
  suffixes: [{ text: "공격 피해의 치명타 피해 보너스 (10—20)% 증가" }, { text: "공격 치명타 명중 확률 (6—16)% 증가" }],
};

function stepLabel(id: JewelStepId) {
  return `${id}번`;
}

export function JewelGuide() {
  const [flash, setFlash] = useState<JewelStepId | null>(null);

  const goStep = (id: JewelStepId) => {
    document.getElementById(`jewel-step-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setFlash(id);
    window.setTimeout(() => setFlash((cur) => (cur === id ? null : cur)), 1600);
  };

  return (
    <div className="page guide-page">
      <header className="hero">
        <div>
          <p className="eyebrow">Path of Exile 2 · 제작 가이드</p>
          <h1>5옵션 보석 만들기</h1>
          <p className="lede">
            접두 3개 + 접미 2개, 옵션 5개짜리 보석 제작 순서. 예시는 <strong>에메랄드 · 3접두</strong>.
          </p>
        </div>
      </header>

      <p className="guide-legend">
        왼쪽 보석 상태의 옵션·수치는 이해를 돕기 위한 <strong>예시값</strong>입니다. 실제 옵션과 수치는 다를 수 있습니다.
      </p>

      <section className="guide-search">
        <h2 className="guide-search-title">
          <img src={EMERALD_ICON} alt="" width={36} height={36} />
          원하는 옵션 리스트 — 에메랄드
        </h2>
        <div className="jewel-wanted">
          <div>
            <p className="ring-group">접두</p>
            <ul>
              {WANTED.prefixes.map((m) => (
                <li key={m.text}>
                  {m.tag && <span className={`jewel-wanted-tag${m.tag === "훼손" ? " desecrated" : ""}`}>{m.tag}</span>}
                  {m.text}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="ring-group">접미</p>
            <ul>
              {WANTED.suffixes.map((m) => (
                <li key={m.text}>{m.text}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <h2 className="guide-section-title">제작 순서</h2>
      <ol className="guide-steps">
        {STEPS.map((step, index) => {
          const following = STEPS[index + 1];
          const next = step.next ?? (following ? [{ label: "다음 단계", to: following.id, ok: true }] : undefined);
          return (
            <li
              key={step.id}
              id={`jewel-step-${step.id}`}
              className={`guide-step${flash === step.id ? " flash" : ""}`}
            >
              <span className="guide-step-no">{step.id}</span>
              <RingPanel
                ring={step.jewel}
                stateText={`${step.id}단계 후`}
                itemName="에메랄드"
                itemIcon={EMERALD_ICON}
              />
              <div className="guide-step-body">
                <h3>{step.title}</h3>
                <ul>
                  {step.body.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {step.note && (
                  <p className="guide-key-note">
                    <strong>실패 시</strong> {step.note}
                  </p>
                )}
                {step.items.length > 0 && (
                  <div className="guide-items">
                    {step.items.map((id) => (
                      <span key={id} className="guide-item" title={ITEMS[id].name}>
                        <img src={iconUrl(ITEMS[id].image)} alt="" width={28} height={28} loading="lazy" />
                        {ITEMS[id].name}
                      </span>
                    ))}
                  </div>
                )}
                {next && (
                  <div className="guide-next">
                    {next.map((n) =>
                      n.to === "end" ? (
                        <span key={n.label} className={`guide-go end ${n.ok ? "ok" : "fail"}`}>
                          <span className="guide-go-label">{n.label}</span>
                          <span className="guide-go-dest">{n.endText ?? "끝"}</span>
                          <span className="guide-go-icon">
                            <EndIcon ok={n.ok} />
                          </span>
                        </span>
                      ) : (
                        <button
                          key={n.label}
                          type="button"
                          className="guide-go dest-main"
                          onClick={() => goStep(n.to as JewelStepId)}
                          title={`${stepLabel(n.to as JewelStepId)}(으)로 이동`}
                        >
                          <span className="guide-go-label">{n.label}</span>
                          <span className="guide-go-dest">{stepLabel(n.to as JewelStepId)}</span>
                          <span className="guide-go-icon">
                            <ArrowIcon back={!n.ok} />
                          </span>
                        </button>
                      ),
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
