"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize, Minimize } from "lucide-react";
import { copy, type Locale } from "@/lib/copy";
import { useCosmetics } from "./cosmetics/cosmetics-provider";

export default function TimerFullscreen({ children, locale, label, toolbar }: { children: ReactNode; locale: Locale; label?: string; toolbar?: ReactNode }) {
  const { appearance } = useCosmetics();
  const card = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [fallback, setFallback] = useState(false);
  const expanded = nativeFullscreen || fallback;
  const t = copy[locale];

  useEffect(() => {
    const synchronize = () => setNativeFullscreen(document.fullscreenElement === card.current);
    document.addEventListener("fullscreenchange", synchronize);
    return () => document.removeEventListener("fullscreenchange", synchronize);
  }, []);

  useEffect(() => {
    if (!expanded || !card.current) return;
    const previousOverflow = document.body.style.overflow;
    const toggleButton = toggle.current;
    document.body.style.overflow = "hidden";
    // Keep background content out of the keyboard and screen reader flow.
    const background: { element: HTMLElement; inert: boolean }[] = [];
    let branch: HTMLElement = card.current;
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          background.push({ element: sibling, inert: sibling.inert });
          sibling.setAttribute("inert", "");
        }
      }
      if (branch.parentElement === document.body) break;
      branch = branch.parentElement;
    }
    toggleButton?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      // Native dialogs handle their own focus and Escape before fullscreen.
      if (card.current?.querySelector("dialog[open]")) return;
      if (event.key === "Escape") {
        if (document.fullscreenElement === card.current) {
          void document.exitFullscreen().catch(() => {});
        } else {
          setFallback(false);
        }
      }
      if (event.key === "Tab") {
        const controls = Array.from(card.current?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex="0"]') ?? []).filter(element => element.getClientRects().length > 0);
        if (!controls?.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      background.forEach(({ element, inert }) => {
        if (inert) element.setAttribute("inert", "");
        else element.removeAttribute("inert");
      });
      document.removeEventListener("keydown", onKeyDown);
      toggleButton?.focus({ preventScroll: true });
    };
  }, [expanded]);

  async function toggleFullscreen() {
    const element = card.current;
    if (!element) return;
    if (document.fullscreenElement === element) {
      try { await document.exitFullscreen(); } catch { /* Browser exit controls remain available. */ }
    } else if (fallback) {
      setFallback(false);
    } else {
      try {
        if (!element.requestFullscreen || !document.fullscreenEnabled) {
          setFallback(true);
          return;
        }
        await element.requestFullscreen();
      } catch {
        // Mobile browsers and embedded pages may only allow a viewport overlay.
        setFallback(true);
      }
    }
  }

  return (
    <section
      ref={card}
      className={`focus-card card clock-skin-${appearance.clock_skin} focus-space-${appearance.focus_background}${expanded ? " is-expanded" : ""}${fallback ? " fullscreen-fallback" : ""}`}
      aria-labelledby="focus-title"
      role={fallback ? "dialog" : undefined}
      aria-modal={fallback ? true : undefined}
    >
      <div className="focus-top">
        <span className="section-kicker"><span className="live-dot" />{label ?? t.focusMode}</span>
        <div className="focus-actions">
          {toolbar}
          <button ref={toggle} type="button" className="fullscreen-button" onClick={toggleFullscreen} aria-label={expanded ? t.exitFullscreen : t.fullscreen} aria-pressed={expanded} title={expanded ? t.exitFullscreen : t.fullscreen}>
            {expanded ? <Minimize size={17} /> : <Maximize size={17} />}
            <span>{expanded ? t.exitFullscreen : t.fullscreen}</span>
          </button>
        </div>
      </div>
      {children}
      {expanded && <p className="fullscreen-hint">{t.fullscreenHint}</p>}
    </section>
  );
}
