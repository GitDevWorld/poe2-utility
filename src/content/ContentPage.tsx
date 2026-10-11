import { useMemo, useState } from "react";
import { ControlGroup, SearchOutputs } from "../components/SearchOutputs";
import { getModByRef, modRefKey, tabletTypes, type ModRef } from "../tablet/data";
import { buildTabletQuery, checkCombo, TABLET_ICONS } from "../tablet/tradeSearch";
import { useTradeLeague } from "../tablet/useTradeLeague";
import { CONTENT_SETUPS } from "./setups";

/**
 * 콘텐츠별 서판 조합. 서판 탭과 달리 고른 옵션이 "모두" 붙은 서판을 찾는다:
 * 창고 검색은 옵션마다 따옴표 블록을 따로 만들어 AND로 묶는다.
 */
export function ContentPage({ setupId }: { setupId: string }) {
  const setup = CONTENT_SETUPS.find((s) => s.id === setupId) ?? CONTENT_SETUPS[0];
  const league = useTradeLeague();
  const [selectedKeys, setSelectedKeys] = useState(() => new Set(setup.defaultRefs.map(modRefKey)));

  const type = tabletTypes.find((t) => t.id === setup.tabletTypeId);
  const selected = setup.tabletRefs.filter((ref) => selectedKeys.has(modRefKey(ref)));
  const combo = checkCombo(selected);
  const prefixCount = selected.filter((ref) => ref.slot === "prefix").length;
  const suffixCount = selected.filter((ref) => ref.slot === "suffix").length;
  const tooMany = prefixCount > 2 || suffixCount > 2;

  const regex = useMemo(() => {
    const patterns = selected.map((ref) => getModByRef(ref)?.pattern_ko).filter((p): p is string => Boolean(p));
    if (!patterns.length) return "";
    return [type?.pattern_ko, ...patterns]
      .filter(Boolean)
      .map((p) => `"${p}"`)
      .join(" ");
  }, [selected, type]);

  const tradeQuery = useMemo(
    () => buildTabletQuery({ refs: selected, tabletTypeId: setup.tabletTypeId, rarity: "any" }),
    [selected, setup.tabletTypeId],
  );

  const toggle = (ref: ModRef) => {
    const key = modRefKey(ref);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Path of Exile 2 · 콘텐츠 세팅</p>
          <h1>{setup.label}</h1>
        </div>
      </header>

      <section className="table-wrap tablet-builder">
        <SearchOutputs
          regex={regex}
          tradeQuery={tradeQuery}
          league={league}
          note={
            tooMany ? (
              <span className="warn">
                접두 {prefixCount}개 · 접미 {suffixCount}개를 골랐습니다. 서판 하나에 접두·접미는 각각 최대 2개라 맞는 서판이
                없습니다.
              </span>
            ) : combo.rareOnly ? (
              <span>이 조합은 희귀 서판에서만 나옵니다.</span>
            ) : null
          }
        />

        <div className="ws-section">
          <div className="opt-bar">
            <h3 className="content-title">
              {TABLET_ICONS[setup.tabletTypeId] && <img src={TABLET_ICONS[setup.tabletTypeId]} alt="" width={28} height={28} />}
              {type?.name_ko} 서판 <small>고른 옵션이 모두 붙은 서판을 찾습니다</small>
            </h3>
          </div>
          <ul className="ws-mod-list">
            {setup.tabletRefs.map((ref) => {
              const mod = getModByRef(ref);
              if (!mod) return null;
              const on = selectedKeys.has(modRefKey(ref));
              return (
                <li key={modRefKey(ref)}>
                  <button type="button" className={`ws-mod${on ? " on" : ""}`} onClick={() => toggle(ref)}>
                    <span className="ws-check" aria-hidden>
                      {on ? "✓" : ""}
                    </span>
                    <span className="content-slot">{ref.slot === "prefix" ? "접두" : "접미"}</span>
                    {mod.text_ko}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {setup.mapSettings.length > 0 && (
          <div className="ctrl-panel">
            <ControlGroup label="지도 세팅" className="wide">
              <ul className="content-chips">
                {setup.mapSettings.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </ControlGroup>
          </div>
        )}
      </section>
    </div>
  );
}
