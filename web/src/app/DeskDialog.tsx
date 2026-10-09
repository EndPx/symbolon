import { useEffect, useId, useRef, type ReactNode } from "react";

export function Dialog({ title, children, close, busy = false, className = "" }: { title: string; children: ReactNode; close(): void; busy?: boolean; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    return () => { trigger?.focus(); };
  }, []);
  return <dialog ref={ref} className={`desk-dialog terminal-dialog ${className}`} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); if (!busy) close(); }}>
    <div className="dialog-heading"><h2 id={titleId}>{title}</h2>
      <button type="button" className="ghost sm" onClick={close} disabled={busy} aria-label={`Close ${title}`}>Close</button>
    </div>{children}
  </dialog>;
}
