"use client";

import { useEffect, useId, useRef } from "react";
import { ArrowRight, Flame, X } from "lucide-react";
import type { Locale } from "@/lib/copy";
import type { StreakNotice } from "@/lib/streak/model";

export default function StreakCelebration({ notice, locale, onClose }: { notice: StreakNotice; locale: Locale; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId(), description = useId();
  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => { element?.close(); if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); };
  }, []);
  const th = locale === "th";
  return <dialog ref={dialog} className="streak-celebration" aria-labelledby={title} aria-describedby={description} onClose={event => { if (!event.currentTarget.open) onClose(); }}>
    <button className="streak-close" type="button" aria-label={th ? "ปิดการแจ้งเตือน Streak" : "Close streak notification"} onClick={() => dialog.current?.close()}><X size={20}/></button>
    <div className="streak-emblem" aria-hidden="true"><Flame size={42} strokeWidth={1.6}/><span>✦</span><span>✧</span></div>
    <span className="streak-kicker">DAILY STREAK</span>
    <h2 id={title}>{th ? "วันนี้คุณได้เรียนรู้แล้ว!" : "You showed up today!"}</h2>
    <p id={description}>{th ? "สะสมเวลาเรียนจริงครบ 10 นาทีแล้ว วันนี้ Streak ของคุณเพิ่มขึ้นอีก 1 วัน" : "You studied for 10 minutes today. Your streak just grew by one day."}</p>
    <div className="streak-growth" aria-label={th ? `Streak เพิ่มจาก ${notice.previous} เป็น ${notice.current} วัน` : `Streak increased from ${notice.previous} to ${notice.current} days`}>
      <span className="streak-before">{notice.previous}</span><ArrowRight size={25} aria-hidden="true"/><strong>{notice.current}</strong><span className="streak-unit">{th ? "วัน" : "days"}</span>
    </div>
    <p className="streak-encouragement">{th ? "ทีละนิด ทุกวันก็เติบโตได้ 🌱" : "Little steps. A little growth, every day. 🌱"}</p>
    <button autoFocus className="streak-continue" type="button" onClick={() => dialog.current?.close()}>{th ? "ไปต่อกันเลย" : "Keep growing"}</button>
  </dialog>;
}
