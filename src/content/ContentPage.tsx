import { useMemo, useState } from "react";
import { joinPatterns } from "../tablet/buildRegex";
import { ControlGroup, SearchOutputs } from "../components/SearchOutputs";
import { getModByRef, modRefKey, tabletTypes } from "../tablet/data";
import { buildTabletQuery, checkCombo, TABLET_ICONS } from "../tablet/tradeSearch";
import { tradeStatIdForRef } from "../tablet/tradeStatMap";
import { useTradeLeague } from "../tablet/useTradeLeague";
import { CONTENT_SETUPS, type SetupOption } from "./setups";

/**
 * 콘텐츠별 서판 조합.
 * 창고 검색은 고른 옵션 중 하나라도(OR) — 종류·잔여 횟수는 따로 AND 블록.
 * 경매장은 고른 옵션이 모두(AND) 붙은 매물.
 */
export function ContentPage({ setupId }: { setupId: string }) {
  const setup = CONTENT_SETUPS.find((s) => s.id === setupId) ?? CONTENT_SETUPS[0];
  const league = useTradeLeague();
  const [selectedKeys, setSelectedKeys] = useState(
    () => new Set(setup.options.filter((o) => o.selected).map((o) => modRefKey(o.ref))),
  );
  const [usesOn, setUsesOn] = useState(setup.minUses != null);
  const minUses = usesOn ? setup.minUses : undefined;

  const type = tabletTypes.find((t) => t.id === setup.tabletTypeId);
  const selected = setup.options.filter((o) => selectedKeys.has(modRefKey(o.ref)));
  const selectedRefs = selected.map((o) => o.ref);
  const combo = checkCombo(selectedRefs);
  const prefixCount = selectedRefs.filter((ref) => ref.slot === "prefix").length;
  const suffixCount = selectedRefs.filter((ref) => ref.slot === "suffix").length;
  const tooMany = prefixCount > 2 || suffixCount > 2;

  const regex = useMemo(() => {
    const patterns = selected
      .map((o) => o.pattern ?? getModByRef(o.ref)?.pattern_ko)
      .filter((p): p is string => Boolean(p));
    if (!patterns.length) return "";
    const blocks = [type?.pattern_ko, joinPatterns([...new Set(patterns)], "or")];
    // 아이템 문구 "잔여 사용 횟수 10회"
    if (minUses != null) blocks.push(`횟수.${minUses}`);
    return blocks
      .filter(Boolean)
      .map((p) => `"${p}"`)
      .join(" ");
  }, [selected, type, minUses]);

  const tradeQuery = useMemo(() => {
    const query = buildTabletQuery({ refs: selectedRefs, tabletTypeId: setup.tabletTypeId, rarity: "any", minUses });
    // 수치 최소값이 있는 옵션은 경매장 필터에도 최소값을 넣는다.
    const mins = new Map(
      selected.filter((o) => o.min != null).map((o) => [tradeStatIdForRef(o.ref), o.min] as const),
    );
    const stats = query.stats as { filters: { id: string; value?: { min: number } }[] }[] | undefined;
    for (const filter of stats?.[0]?.filters ?? []) {
      const min = mins.get(filter.id);
      if (min != null) filter.value = { min };
    }
    return query;
  }, [selected, selectedRefs, setup.tabletTypeId, minUses]);

  const toggle = (option: SetupOption) => {
    const key = modRefKey(option.ref);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const optionButton = (key: string, on: boolean, onClick: () => void, label: string, note?: string) => (
    <li key={key}>
      <button type="button" className={`ws-mod content-pick${on ? " on" : ""}`} onClick={onClick}>
        <span className="ws-check" aria-hidden>
          {on ? "✓" : ""}
        </span>
        {label}
        {note && <small className="content-note">{note}</small>}
      </button>
    </li>
  );

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
                접두 {prefixCount}개 · 접미 {suffixCount}개를 골랐습니다. 서판 하나에 접두·접미는 각각 최대 2개라 경매장
                검색 결과가 없습니다.
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
              {type?.name_ko} 서판 <small>창고 검색은 옵션 중 하나라도, 경매장은 옵션이 모두 붙은 서판</small>
            </h3>
          </div>
          {setup.minUses != null && (
            <ul className="ws-mod-list content-uses">
              {optionButton("uses", usesOn, () => setUsesOn((v) => !v), `잔여 사용 횟수 ${setup.minUses}회`)}
            </ul>
          )}
          <div className="tablet-two-cols">
            {(["prefix", "suffix"] as const).map((slot) => (
              <div key={slot} className="tablet-col">
                <h4>{slot === "prefix" ? "접두" : "접미"}</h4>
                <ul className="ws-mod-list">
                  {setup.options
                    .filter((o) => o.ref.slot === slot)
                    .map((o) => {
                      const mod = getModByRef(o.ref);
                      if (!mod) return null;
                      const key = modRefKey(o.ref);
                      return optionButton(key, selectedKeys.has(key), () => toggle(o), mod.text_ko, o.note);
                    })}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {setup.mapSettings && setup.mapSettings.length > 0 && (
          <div className="ctrl-panel">
            <ControlGroup label="자도의 첩보술" className="wide">
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
