import { useEffect, useState, type ReactNode } from "react";
import type { CommittedReceipt } from "../ledger/canton-v2";

export type Receipt = {
  phase: "pending" | "succeeded" | "failed" | "unconfirmed";
  label: string;
  detail?: string;
  updateId?: string;
  ledger?: CommittedReceipt;
};

const phaseLabel = {pending: "Pending", succeeded: "Confirmed", failed: "Failed", unconfirmed: "Unconfirmed"};

export function NotificationRegion({ children }: { children?: ReactNode }) {
  return <div className="receipt-region" role="status" aria-live="polite" aria-atomic="true">{children}</div>;
}

export function TransactionToast({ receipt, onDismiss, onView, paused = false }: {
  receipt: Receipt;
  onDismiss(receipt: Receipt): void;
  onView(): void;
  paused?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (receipt.phase !== "succeeded" || hovered || focused || paused) return;
    const timer = window.setTimeout(() => onDismiss(receipt), 8000);
    return () => window.clearTimeout(timer);
  }, [receipt, hovered, focused, paused, onDismiss]);
  const dismissible = receipt.phase === "succeeded" || receipt.phase === "failed";
  return <article className={`transaction-receipt terminal-toast ${receipt.phase}`}
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocus={() => setFocused(true)} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
    }}>
    <div className="toast-heading"><strong>{phaseLabel[receipt.phase]} · {receipt.label}</strong>
      {dismissible && <button className="toast-close" type="button" aria-label="Dismiss notification" onClick={() => onDismiss(receipt)}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>
      </button>}
    </div>
    {receipt.detail && <p>{receipt.detail}</p>}
    {receipt.updateId && <button type="button" className="toast-action" onClick={onView}>View receipt</button>}
  </article>;
}
