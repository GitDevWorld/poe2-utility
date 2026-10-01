import { useEffect, useMemo, useRef, useState } from "react";
import { CurrencyIcon } from "./CurrencyIcon";
import type { MarketRow } from "./types";

export function CurrencyPicker({
  label,
  value,
  options,
  onChange,
  placeholder = "화폐 선택",
  allowClear = false,
  clearLabel = "전체",
}: {
  label: string;
  value: string;
  options: MarketRow[];
  onChange: (id: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  clearLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLLabelElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const selected = value ? options.find((row) => row.id === value) : undefined;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (row) =>
        row.koName.toLowerCase().includes(needle) ||
        row.name.toLowerCase().includes(needle) ||
        row.id.includes(needle),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  return (
    <label className="picker" ref={rootRef}>
      {label}
      <button type="button" className="picker-button" onClick={() => setOpen((current) => !current)}>
        <CurrencyIcon row={selected} size={24} />
        <span>{selected?.koName ?? placeholder}</span>
      </button>
      {open && (
        <div className="picker-menu">
          <input
            ref={searchRef}
            value={query}
            placeholder="한글명 검색"
            onChange={(event) => setQuery(event.target.value)}
          />
          <ul>
            {allowClear && !query.trim() && (
              <li>
                <button type="button" className={!value ? "active" : ""} onClick={() => {
                  onChange("");
                  setOpen(false);
                  setQuery("");
                }}>
                  <span>{clearLabel}</span>
                </button>
              </li>
            )}
            {filtered.map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className={row.id === value ? "active" : ""}
                  onClick={() => {
                    onChange(row.id);
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  <CurrencyIcon row={row} size={22} />
                  <span>{row.koName}</span>
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="empty">검색 결과가 없습니다.</li>}
          </ul>
        </div>
      )}
    </label>
  );
}
