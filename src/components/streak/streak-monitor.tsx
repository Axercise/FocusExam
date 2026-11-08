"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/copy";
import type { TimerState } from "@/lib/timer/model";
import type { StreakNotice, StreakStatus } from "@/lib/streak/model";
import { checkStreakAction } from "@/lib/streak/actions";
import StreakCelebration from "./streak-celebration";

const changed = "focusexam:streak-timer-change";
const dismissed = "focusexam:streak-dismissed";

export default function StreakMonitor({ ownerId, locale, initialStatus, timer }: { ownerId: string; locale: Locale; initialStatus: StreakStatus | null; timer: TimerState }) {
  const router = useRouter();
  const [notice, setNotice] = useState<StreakNotice | null>(null);
  const enabled = ownerId !== "guest" && initialStatus !== null;
  const initialCurrent = initialStatus?.current_streak;
  useEffect(() => {
    if (!enabled) return;
    let live = true, stopped = false, inFlight = false, rerun = false, pendingNotice = false;
    let queued: StreakNotice | null = null, lastCurrent = initialCurrent;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const clearScreen = () => document.visibilityState === "visible" && !document.querySelector("dialog[open]");
    function flushNotice() {
      if (queued && clearScreen()) { const next = queued; queued = null; setNotice(next); }
    }
    function schedule(ms: number | null) {
      clearTimeout(timeout);
      if (ms !== null && live && !stopped) timeout = setTimeout(() => { void check(); }, ms);
    }
    async function check() {
      if (!live || stopped || document.visibilityState !== "visible") return;
      if (inFlight) { rerun = true; return; }
      inFlight = true;
      clearTimeout(timeout);
      try {
        const result = await checkStreakAction({ expectedOwnerId: ownerId, claimNotice: !queued && clearScreen() });
        if (!live) return;
        if (result.error === "auth" || result.error === "not_installed") { stopped = true; return; }
        if (!result.status) { schedule(15000); return; }
        const status = result.status;
        pendingNotice = status.pending_notice;
        if (status.notice) queued = status.notice;
        flushNotice();
        if (status.current_streak !== lastCurrent) { lastCurrent = status.current_streak; router.refresh(); }
        schedule(status.next_check_ms);
      } catch { if (live) schedule(15000); }
      finally {
        inFlight = false;
        if (live && rerun) { rerun = false; schedule(0); }
      }
    }
    const wake = () => { flushNotice(); if (inFlight) rerun = true; else schedule(0); };
    // Native dialogs share the top layer: wait until another panel closes.
    const observer = new MutationObserver(records => {
      if (!pendingNotice && !queued) return;
      if (records.some(r => r.type === "attributes" || [...r.addedNodes, ...r.removedNodes].some(n => n instanceof Element && (n.matches("dialog") || n.querySelector("dialog"))))) {
        flushNotice();
        if (pendingNotice && clearScreen()) void check();
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["open"] });
    window.addEventListener(changed, wake);
    window.addEventListener(dismissed, wake);
    window.addEventListener("focus", wake);
    window.addEventListener("pageshow", wake);
    document.addEventListener("visibilitychange", wake);
    schedule(0);
    return () => {
      live = false; clearTimeout(timeout); observer.disconnect();
      window.removeEventListener(changed, wake); window.removeEventListener(dismissed, wake);
      window.removeEventListener("focus", wake); window.removeEventListener("pageshow", wake); document.removeEventListener("visibilitychange", wake);
    };
    // Initial count is only the baseline. Refreshing server props must not
    // cancel an in-flight notice claim and consume a reward without showing it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, enabled, router]);

  useEffect(() => { if (enabled) window.dispatchEvent(new Event(changed)); }, [enabled, timer.serverRunId, timer.status, timer.mode, timer.elapsedMs, timer.savedSessionId]);

  return <>
    {enabled && <p className="streak-timer-hint">{locale === "th" ? "เรียนครบ 10 นาทีต่อวัน เพื่อเพิ่ม Streak · รวมทุกรอบ ไม่นับเวลาพัก" : "Study 10 minutes a day to grow your streak · All rounds count, breaks excluded"}</p>}
    {notice && <StreakCelebration key={notice.id} notice={notice} locale={locale} onClose={() => { setNotice(null); window.dispatchEvent(new Event(dismissed)); }}/>}
  </>;
}
