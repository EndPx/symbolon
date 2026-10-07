import { useId, type ReactNode } from "react";
import { tabForKey } from "./terminal-state";

export function TerminalTabs<T extends string>({ id, label, value, options, onChange, className = "terminal-tabs" }: {
  id: string;
  label: string;
  value: T;
  options: readonly { value: T; label: string; count?: number }[];
  onChange(value: T): void;
  className?: string;
}) {
  const instance = useId();
  return <div className={className} role="tablist" aria-label={label} data-tabs={instance}>
    {options.map(option => <button type="button" role="tab" key={option.value}
      id={`${id}-tab-${option.value}`} aria-controls={`${id}-panel-${option.value}`}
      aria-selected={value === option.value} tabIndex={value === option.value ? 0 : -1}
      className={value === option.value ? "on" : ""} onClick={() => onChange(option.value)}
      onKeyDown={event => {
        const next = tabForKey(event.key, option.value, options.map(item => item.value));
        if (!next) return;
        event.preventDefault();
        onChange(next);
        document.getElementById(`${id}-tab-${next}`)?.focus();
      }}>{option.label}{option.count !== undefined && option.count > 0 && <span className="terminal-tab-count">{option.count}</span>}</button>)}
  </div>;
}

export function TerminalPanels<T extends string>({ id, value, values, children }: {
  id: string;
  value: T;
  values: readonly T[];
  children: ReactNode;
}) {
  return values.map(panel => <div key={panel} className="terminal-tab-panel" role="tabpanel"
    id={`${id}-panel-${panel}`} aria-labelledby={`${id}-tab-${panel}`}
    hidden={panel !== value} tabIndex={panel === value ? 0 : -1}>{panel === value ? children : null}</div>);
}
