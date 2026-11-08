"use client";
import { Snowflake, Sparkles, Trees, Ghost } from "lucide-react";
import TrackIcon from "@/components/tracks/track-icon";
import type { TrackIconName } from "@/lib/tracks/model";
import { defaultAppearance, type CosmeticItem, type Appearance } from "@/lib/cosmetics/model";

export function ClockPreview({ skin }: { skin: string }) {
  return <div className={`cosmetic-clock-preview clock-skin-${skin}`}><div className="timer-display" aria-hidden="true"><span className="timer-number-part">25</span><span className="timer-number-part"><span className="timer-colon">:</span>00</span></div>{skin === "frost" && <Snowflake size={19} />}</div>;
}
export function FocusSpacePreview({ appearance }: { appearance: Appearance }) {
  return <div className={`focus-space-preview focus-space-${appearance.focus_background}`} data-preview-clock={appearance.clock_skin} data-preview-background={appearance.focus_background} aria-hidden="true"><span className="space-preview-kicker"><i />FOCUS SPACE</span><ClockPreview skin={appearance.clock_skin} /><span className="space-preview-controls"><i /><i /><i /></span></div>;
}
export default function CosmeticPreview({ item, appearance = defaultAppearance }: { item: CosmeticItem; appearance?: Appearance }) {
  if (item.kind === "clock") return <ClockPreview skin={item.value} />;
  if (item.kind === "space") return <FocusSpacePreview appearance={{ ...appearance, focus_background: item.value }} />;
  if (item.kind === "theme") return <div className={`cosmetic-theme-preview theme-preview-${item.value}`} aria-hidden="true"><span>{item.value === "christmas" ? <Trees size={27} /> : item.value === "halloween" ? <Ghost size={27} /> : <Sparkles size={27} />}</span><div><i /><i /><b>FocusExam</b></div></div>;
  if (item.kind === "icon") return <div className="cosmetic-track-preview"><span className="personal-track-icon track-color-mint"><TrackIcon name={item.value as TrackIconName} size={36} /></span></div>;
  return <div className={`cosmetic-track-preview track-bg-${item.kind === "background" ? item.value : "plain"}`}><span className={`personal-track-icon track-color-${item.kind === "color" ? item.value : "mint"}`}><TrackIcon name="book" size={29} /></span><div className="preview-lines"><i /><i /></div></div>;
}
