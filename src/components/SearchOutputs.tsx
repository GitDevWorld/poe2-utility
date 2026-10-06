import { useEffect, useState, type ReactNode } from "react";
import { REGEX_CHAR_LIMIT, regexStatus } from "../tablet/buildRegex";
import { encodeFilterCode, tradeSearchUrl } from "../tablet/tradeSearch";

/** 정규식·경매장 결과를 한 줄씩 보여주는 결과 막대. */
export function SearchOutputs({
  regex,
  tradeQuery,
  league,
  note,
}: {
  regex: string;
  tradeQuery: Record<string, unknown>;
  league: string;
  note?: ReactNode;
}) {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const status = regexStatus(regex);

  useEffect(() => {
    let alive = true;
    encodeFilterCode(tradeQuery)
      .then((value) => alive && setCode(value))
      .catch(() => alive && setCode(""));
    return () => {
      alive = false;
    };
  }, [tradeQuery]);

  const copy = async () => {
    if (!regex) return;
    try {
      await navigator.clipboard.writeText(regex);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="search-out" aria-label="검색 결과">
      <div className="search-out-row">
        <span className="search-out-label">정규식</span>
        <code title={regex} className={regex ? undefined : "empty"}>
          {regex || "옵션을 고르면 만들어집니다"}
        </code>
        <button type="button" className="btn btn-primary" disabled={!regex} onClick={() => void copy()}>
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <div className="search-out-row">
        <span className="search-out-label">경매장</span>
        <code title={code}>{code || "…"}</code>
        <a className="btn btn-primary" href={tradeSearchUrl(league, tradeQuery)} target="_blank" rel="noreferrer">
          검색
        </a>
      </div>
      {(status.overLimit || note) && (
        <div className="search-out-note">
          {status.overLimit && (
            <span className="warn">
              정규식이 {status.length}자로 {REGEX_CHAR_LIMIT}자를 넘습니다.
            </span>
          )}
          {note}
        </div>
      )}
    </section>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="segmented" role="group">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={value === option.id ? "active" : ""}
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** 이름표가 붙은 조작 묶음 */
export function ControlGroup({
  label,
  children,
  className,
  bodyClassName,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={`ctrl-group${className ? ` ${className}` : ""}`}>
      <span className="ctrl-label">{label}</span>
      <div className={`ctrl-body${bodyClassName ? ` ${bodyClassName}` : ""}`}>{children}</div>
    </div>
  );
}
