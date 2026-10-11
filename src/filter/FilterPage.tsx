import { useState } from "react";

type Sound = { file: string; items: string };

/** 필터 파일 머리말의 "설정 요약"을 옮긴 것. 필터를 고치면 여기도 같이 고친다. */
type FilterInfo = {
  id: string;
  name: string;
  file: string;
  followUrl: string;
  summary: string;
  rules: { label: string; show: string }[];
  /** 가치별 소리 (lv1이 가장 신나는 소리) */
  valueSounds: Sound[];
  typeSounds: Sound[];
};

const BASE = "NeverSink 6-UBER PLUS STRICT";

const FILTERS: FilterInfo[] = [
  {
    id: "sskim",
    name: "씹양태증증미김성수 렛츠고",
    file: "/filters/sskim.filter",
    followUrl: "https://poe2.kakaogames.com/kr/my-account/item-filters/38zzK1TX",
    summary: "장신구는 다 보고, 장비는 4~5등급만 보는 기본 파밍용.",
    rules: [
      { label: "화폐", show: "C티어(상급 제왕의 오브) 이상 + 연금술의 오브. 제왕의 오브 이하 D티어는 숨김" },
      { label: "반지·목걸이", show: "모든 등급 표시 (일반·마법·희귀·고유)" },
      {
        label: "방어구·무기",
        show: "4~5등급만 표시 (석궁 포함). 특출난 아이템(고품질·소켓 초과·이중 타락)과 특수 베이스는 등급 무관 표시",
      },
      { label: "허리띠", show: "원본 설정 (무거운·특수 허리띠 찬스 베이스 표시)" },
      { label: "경로석", show: "15등급 이상" },
      { label: "콘텐츠 화폐", show: "원본 등급 유지, 에센스만 전부 표시" },
      { label: "시련 열쇠", show: "숨김 (진 바리야, 시험 바리야, 새겨진 결전)" },
      { label: "고유·젬", show: "원본 설정 (1~2티어 고유, 19~20레벨 미가공 젬 등)" },
    ],
    valueSounds: [
      { file: "lv1", items: "칼란드라의 거울, 히네코라의 머리카락, 1티어 고유, 21/21 젬, 금고 열쇠" },
      { file: "lv2", items: "분열의 오브, 빛의 징조, 보스 초대장, S급 혈통 젬, 탐험 일지" },
      { file: "lv3", items: "건축가의 오브, 상위 징조(축성·절사·소멸), 보스·희귀 성유물 열쇠" },
      {
        file: "lv4",
        items: "신성한 오브보다 살짝 위 S화폐(완벽한 쥬얼러·엑잘티드·카오스 오브 등), 고대 심연 뼈, 2티어 고유, A급 혈통 젬, 20레벨 미가공 젬",
      },
      { file: "lv5", items: "신성한 오브 + 나머지 S티어 화폐·징조·콘텐츠 화폐" },
      { file: "lv6", items: "A티어 화폐·콘텐츠 화폐, 16등급 경로석, 5등급 장비, 특출난 최상급 장비, 찬스 허리띠, 조각 20개+" },
      { file: "lv7", items: "B·C티어 화폐, 연금술의 오브, 하위 에센스, 서판, 15등급 경로석, 19레벨 젬" },
    ],
    typeSounds: [
      { file: "t_ring", items: "반지·목걸이" },
      { file: "t_popup", items: "4등급·특출난 장비, 주얼, 유물, 새 아이템" },
      { file: "t_stack", items: "조각·베리시움" },
      { file: "t_flask", items: "고품질 부적" },
    ],
  },
  {
    id: "jjm",
    name: "돈만쳐먹는정정민필터",
    file: "/filters/jjm.filter",
    followUrl: "https://poe2.kakaogames.com/kr/my-account/item-filters/BNPD81hx",
    summary: "위 필터에서 장비·골드·잡고유를 더 숨긴 화폐 위주 파밍용.",
    rules: [
      { label: "골드", show: "전부 숨김" },
      { label: "화폐", show: "C티어(상급 제왕의 오브) 이상 + 연금술의 오브. 제왕의 오브 이하 D티어는 숨김" },
      {
        label: "반지·목걸이",
        show: "4~5등급만 표시. 에메랄드·청금석·철제·무보석 반지, 진홍색·담청색 목걸이는 등급 무관 숨김",
      },
      {
        label: "방어구·무기",
        show: "전부 숨김. 예외: 특출난 아이템(품질 21+, 소켓 2~3개 이상, 이중 타락), 아이템 레벨 81+ 트라투스 대포",
      },
      { label: "허리띠", show: "전부 숨김, 고유만 표시" },
      { label: "경로석", show: "15등급 이상" },
      { label: "콘텐츠 화폐", show: "원본 등급 유지, 에센스만 전부 표시" },
      { label: "조각", show: "복제된 영토 파편 1개짜리는 숨김 (2개 이상 묶음만 표시)" },
      { label: "시련 열쇠", show: "숨김 (진 바리야, 시험 바리야, 새겨진 결전)" },
      {
        label: "고유",
        show: "헤드헌터·마법사의 피, 고유 서판 전체, 고유 반지 전체, 고유 주얼 전체, 강령외투만 표시. 나머지 숨김",
      },
      { label: "주얼", show: "희귀 주얼 숨김 (오래된 주얼·타락 주얼은 표시)" },
      { label: "젬", show: "원본 설정 (19~20레벨 미가공 젬 등)" },
    ],
    valueSounds: [
      { file: "lv1", items: "칼란드라의 거울, 히네코라의 머리카락, 헤드헌터·마법사의 피, 1티어 고유, 21/21 젬, 금고 열쇠" },
      { file: "lv2", items: "분열의 오브, 빛의 징조, 보스 초대장, S급 혈통 젬" },
      { file: "lv3", items: "건축가의 오브, 상위 징조(축성·절사·소멸), 보스·희귀 성유물 열쇠" },
      {
        file: "lv4",
        items: "신성한 오브보다 살짝 위 S화폐(완벽한 쥬얼러·엑잘티드·카오스 오브 등), 고대 심연 뼈, 2티어 고유, A급 혈통 젬, 20레벨 미가공 젬, 탐험 일지",
      },
      { file: "lv5", items: "신성한 오브 + 나머지 S티어 화폐·징조·콘텐츠 화폐" },
      { file: "lv6", items: "A티어 화폐·콘텐츠 화폐, 16등급 경로석, A급 파편, 조각 20개+" },
      { file: "lv7", items: "B·C티어 화폐, 연금술의 오브, 하위 에센스, 서판(고유 서판 포함), 15등급 경로석, 19레벨 젬" },
    ],
    typeSounds: [
      { file: "t_ring", items: "반지·목걸이 4~5등급" },
      { file: "t_popup", items: "고유 서판, 주얼, 유물, 퀘스트 아이템, 새 아이템" },
      { file: "t_stack", items: "조각·베리시움" },
      { file: "t_flask", items: "고품질 부적" },
    ],
  },
];

function SoundRow({ file, items }: Sound) {
  return (
    <li className="filter-sound">
      <span className="filter-sound-name">{file}</span>
      <span className="filter-sound-items">{items}</span>
      <audio controls preload="none" src={`/filters/sounds/${file}.mp3`} />
    </li>
  );
}

export function FilterPage() {
  const [active, setActive] = useState(FILTERS[0].id);
  const filter = FILTERS.find((f) => f.id === active) ?? FILTERS[0];

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Path of Exile 2 · {BASE} 기반</p>
          <h1>아이템 필터</h1>
        </div>
      </header>

      <section className="table-wrap filter-page">
        <div className="segmented filter-tabs" role="group">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={active === f.id ? "active" : ""}
              aria-pressed={active === f.id}
              onClick={() => setActive(f.id)}
            >
              {f.name}
            </button>
          ))}
        </div>

        <div className="filter-head">
          <div>
            <h2>{filter.name}</h2>
            <p>{filter.summary}</p>
          </div>
          <div className="filter-actions">
            <a className="btn btn-primary" href={filter.followUrl} target="_blank" rel="noreferrer">
              필터 팔로우
            </a>
            <a className="btn" href={filter.file} download>
              필터 파일
            </a>
            <a className="btn" href="/filters/poe2-filter-sounds.zip" download>
              사운드 (zip)
            </a>
          </div>
        </div>

        <ol className="filter-steps">
          <li>
            <strong>필터 팔로우</strong>를 눌러 공식 홈페이지에서 팔로우하고, 게임 옵션 → 게임 → 아이템 필터에서 고릅니다.
            필터를 고치면 자동으로 최신으로 바뀝니다.
          </li>
          <li>
            소리가 나려면 <strong>사운드 (zip)</strong>을 받아 mp3 11개를{" "}
            <code>문서\My Games\Path of Exile 2</code> 폴더에 풀어 넣습니다. 두 필터 모두 같은 사운드를 씁니다.
          </li>
          <li>팔로우 대신 파일로 쓰려면 필터 파일도 같은 폴더에 넣고 게임에서 고릅니다.</li>
        </ol>

        <h3 className="filter-subtitle">보이는 것</h3>
        <dl className="filter-rules">
          {filter.rules.map((rule) => (
            <div key={rule.label}>
              <dt>{rule.label}</dt>
              <dd>{rule.show}</dd>
            </div>
          ))}
        </dl>

        <h3 className="filter-subtitle">
          가치별 소리 <small>lv1이 가장 신나는 소리</small>
        </h3>
        <ul className="filter-sounds">
          {filter.valueSounds.map((s) => (
            <SoundRow key={s.file} {...s} />
          ))}
        </ul>

        <h3 className="filter-subtitle">유형별 소리</h3>
        <ul className="filter-sounds">
          {filter.typeSounds.map((s) => (
            <SoundRow key={s.file} {...s} />
          ))}
        </ul>
      </section>
    </div>
  );
}
