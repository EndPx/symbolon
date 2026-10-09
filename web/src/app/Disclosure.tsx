import { useEffect, useRef, useState, type ReactNode } from "react";

/** Native keyboard behavior, with a cancellable reveal/fade around open state. */
export function Disclosure({ summary, children, className = "", summaryClassName = "" }: {
  summary: ReactNode; children: ReactNode; className?: string; summaryClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const content = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | null>(null);
  const wantsOpen = useRef(false);
  const revision = useRef(0);
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => () => { revision.current++; animation.current?.cancel(); }, []);
  useEffect(() => {
    if (open && !closing && !reduced()) {
      animation.current?.cancel();
      animation.current = content.current?.animate([{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 180, easing: "ease-out" }) ?? null;
    }
  }, [open, closing]);
  const toggle = () => {
    const next = !wantsOpen.current;
    wantsOpen.current = next;
    const request = ++revision.current;
    animation.current?.cancel();
    if (next) { setClosing(false); setOpen(true); return; }
    if (reduced() || !content.current) { setClosing(false); setOpen(false); return; }
    setClosing(true);
    const fade = content.current.animate([{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-4px)" }], { duration: 140, easing: "ease-in", fill: "forwards" });
    animation.current = fade;
    void fade.finished.then(() => {
      if (revision.current === request) { setOpen(false); setClosing(false); fade.cancel(); }
    }).catch(() => { /* A new toggle superseded this fade. */ });
  };
  return <details className={`animated-disclosure ${className}`} open={open} data-closing={closing || undefined}>
    <summary className={summaryClassName} onClick={event => { event.preventDefault(); toggle(); }}>{summary}</summary>
    <div ref={content} className="disclosure-content">{children}</div>
  </details>;
}
