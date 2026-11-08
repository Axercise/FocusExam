"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Coins, Eye, Gift, Languages, LockKeyhole, Moon, Palette, Sparkles, Sun } from "lucide-react";
import { usePreferences } from "@/lib/preferences";
import { cosmeticAction } from "@/lib/cosmetics/actions";
import { appearanceKey, ownsCosmetic, type Appearance, type CosmeticItem, type CosmeticKind, type CosmeticSection, type CosmeticState } from "@/lib/cosmetics/model";
import CosmeticPreview, { FocusSpacePreview } from "./cosmetic-preview";
import StudyRewardsPanel from "./study-rewards";
import type { StudyRewards } from "@/lib/cosmetics/rewards-model";

const labels = {
  th: { title: "แต่งพื้นที่ให้เป็นคุณ", intro: "ทุกนาทีที่ตั้งใจ ค่อย ๆ เปลี่ยนเป็นพื้นที่ที่คุณรัก", back: "กลับไปโฟกัส", coins: "เหรียญสะสม", clock: "สกินนาฬิกา", theme: "ธีมเว็บไซต์", color: "สี Track", icon: "ไอคอน", background: "พื้นหลัง Track", preview: "ดูตัวอย่าง", use: "เลือกใช้", using: "ใช้อยู่", owned: "มีแล้ว", free: "ฟรี", unlock: "ปลดล็อก", track: "เลือกใช้ในหน้าแก้ไข Track", pending: "กำลังบันทึก…", event: "กิจกรรม Christmas · เรียน 2 ชั่วโมง", eventHint: "ของรางวัลจากกิจกรรม", saved: "เลือกใช้แล้ว พื้นที่ของคุณเปลี่ยนแล้ว", bought: "ปลดล็อกแล้ว! เลือกใช้ได้เลย", unavailable: "ทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง", auth: "บัญชีเปลี่ยนไปแล้ว กรุณาเข้าสู่ระบบอีกครั้ง", locked: "ยังไม่ได้ปลดล็อกไอเทมนี้", insufficient: "เหรียญยังไม่พอ", previewHint: "ตัวอย่างเท่านั้น · สกินจะเปลี่ยนเมื่อกดเลือกใช้", collection: "คอลเลกชันของคุณ", quests: "เรียนรู้แล้วรับเหรียญ", questsHint: "Daily Quest จะนับเวลาโฟกัสที่บันทึกจริง", previewTitle: "ลองจินตนาการพื้นที่ใหม่" },
  en: { title: "Make space for you", intro: "Turn little moments of focus into a space you love.", back: "Back to focus", coins: "Your coins", clock: "Clock skins", theme: "Website themes", color: "Track colors", icon: "Icons", background: "Track backgrounds", preview: "Preview", use: "Use this", using: "In use", owned: "Owned", free: "Free", unlock: "Unlock", track: "Apply in your Track editor", pending: "Saving…", event: "Christmas event · Study 2 hours", eventHint: "Event reward", saved: "Applied. Your space has a fresh look.", bought: "Unlocked! It is ready to use.", unavailable: "Couldn’t complete this. Please try again.", auth: "Your account changed. Please sign in again.", locked: "This item is still locked.", insufficient: "Not enough coins", previewHint: "Preview only · Choose Use this to apply", collection: "YOUR COLLECTION", quests: "Focus, grow, collect", questsHint: "Daily Quests use real saved focus time", previewTitle: "A little glimpse of your next space" },
};
export default function CosmeticsStudio({ ownerId, initial, rewards }: { ownerId: string; initial: CosmeticState; rewards: StudyRewards }) {
  const { locale, theme, updatePreferences } = usePreferences();
  const t = { ...labels[locale], ...(locale === "th" ? { space: "พื้นหลังพื้นที่จับเวลา", tracks: "ของตกแต่ง Track", resetPreview: "กลับไปดูชุดที่ใช้อยู่" } : { space: "Focus Space", tracks: "Track decorations", resetPreview: "Preview current setup" }) };
  const data = initial;
  const [section, setSection] = useState<CosmeticSection>("clock");
  const [trackKind, setTrackKind] = useState<Extract<CosmeticKind, "color" | "icon" | "background">>("color");
  const kind: CosmeticKind = section === "tracks" ? trackKind : section;
  const [draft, setDraft] = useState<Partial<Appearance>>({});
  const [preview, setPreview] = useState<CosmeticItem | null>(null), [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const title = (item: CosmeticItem) => locale === "th" ? item.name_th : item.name_en;
  const previewAppearance = { ...data.appearance, ...draft };
  const clockItem = data.catalog.find(i => i.id === `clock:${previewAppearance.clock_skin}`);
  const spaceItem = data.catalog.find(i => i.id === `space:${previewAppearance.focus_background}`);
  function showPreview(item: CosmeticItem) {
    setPreview(item);
    const key = appearanceKey(item.kind);
    if (key) setDraft(previous => ({ ...previous, [key]: item.value }));
  }
  function command(item: CosmeticItem, operation: "buy" | "equip") {
    setNotice("");
    startTransition(async () => {
      try {
        const result = await cosmeticAction(ownerId, operation, item.id);
        if (result.data) {
          if (operation === "equip") {
            const key = appearanceKey(item.kind);
            if (key) setDraft(previous => { const next = { ...previous }; delete next[key]; return next; });
            setPreview(null);
          }
          setNotice(operation === "buy" ? t.bought : t.saved);
          router.refresh();
        }
        else setNotice(result.error === "coins" ? t.insufficient : result.error ? t[result.error] : t.unavailable);
      } catch { setNotice(t.unavailable); }
    });
  }
  return <div className="tracks-page cosmetics-page">
    <header className="tracks-header"><Link className="account-brand" href="/"><span className="brand-mark"><Sparkles size={24} /></span>Focus<span className="brand-accent">Exam</span></Link><div className="tracks-toolbar"><button className="account-tool" onClick={() => updatePreferences({ locale: locale === "th" ? "en" : "th" })} aria-label="Language"><Languages size={17} />{locale === "th" ? "EN" : "ไทย"}</button><button className="account-tool" onClick={() => updatePreferences({ theme: theme === "light" ? "dark" : "light" })} aria-label={locale === "th" ? "เปลี่ยนโหมดสว่าง/มืด" : "Toggle light/dark mode"}>{theme === "light" ? <Moon size={18} /> : <Sun size={18} />}</button></div></header>
    <main className="tracks-main cosmetics-main"><Link className="account-back" href="/"><ArrowLeft size={16} />{t.back}</Link>
      <div className="cosmetics-hero"><div><span className="account-eyebrow"><Sparkles size={14} /> FOCUS / PERSONALIZE</span><h1>{t.title}</h1><p>{t.intro}</p></div><div className="coin-wallet"><Coins size={27} /><div><small>{t.coins}</small><strong>{data.balance.toLocaleString(locale === "th" ? "th-TH" : "en-US")}</strong></div></div></div>
      <section className="cosmetics-preview-stage" aria-label={t.previewTitle}><div><span>{t.collection}</span><h2>{preview ? title(preview) : t.previewTitle}</h2><p>{t.previewHint}</p><p className="cosmetics-preview-caption">{clockItem && title(clockItem)} + {spaceItem && title(spaceItem)}</p><button type="button" className="cosmetics-reset-preview" onClick={() => { setDraft({}); setPreview(null); }}>{t.resetPreview}</button></div>{preview && !["clock", "space"].includes(preview.kind) ? <CosmeticPreview item={preview} appearance={previewAppearance} /> : <FocusSpacePreview appearance={previewAppearance} />}</section>
      <nav className="cosmetics-tabs" aria-label={locale === "th" ? "ประเภทของตกแต่ง" : "Decoration categories"}>{(["clock", "space", "theme", "tracks"] as const).map(value => <button type="button" key={value} aria-pressed={section === value} onClick={() => { setSection(value); setPreview(null); }}>{value === "clock" && <Palette size={16} />}{t[value]}</button>)}</nav>
      {section === "tracks" && <nav className="cosmetics-track-tabs" aria-label={t.tracks}>{(["color", "icon", "background"] as const).map(value => <button type="button" key={value} aria-pressed={trackKind === value} onClick={() => { setTrackKind(value); setPreview(null); }}>{t[value]}</button>)}</nav>}
      {notice && <p className="cosmetic-notice" role="status">{notice}</p>}
      <div className="cosmetics-grid">{data.catalog.filter(i => i.kind === kind).map(item => {
        const owned = ownsCosmetic(data.owned, item.kind, item.value), key = appearanceKey(item.kind), wearable = key !== null;
        const selected = key !== null && data.appearance[key] === item.value;
        return <article className={`cosmetic-card${selected ? " is-equipped" : ""}`} key={item.id}>
          <button className="cosmetic-preview-button" type="button" onClick={() => showPreview(item)} aria-label={`${t.preview} ${title(item)}`}><CosmeticPreview item={item} appearance={previewAppearance} /><span><Eye size={14} />{t.preview}</span></button>
          <div className="cosmetic-card-info"><span className="cosmetic-label">{item.event ? <><Gift size={13} />{t.eventHint}</> : owned ? <><Check size={13} />{item.price === 0 ? t.free : t.owned}</> : <><LockKeyhole size={13} />{item.price} Coin</>}</span><h3>{title(item)}</h3>
            {item.event && <p>{t.event}</p>}
            {owned ? wearable ? <button className="track-primary cosmetic-action" disabled={pending || selected} onClick={() => command(item, "equip")}>{selected ? <Check size={16} /> : <Sparkles size={16} />}{selected ? t.using : t.use}</button> : <Link className="cosmetic-track-link" href="/tracks">{t.track} →</Link> : <button className="track-secondary cosmetic-action" disabled={pending || Boolean(item.event) || data.balance < item.price} onClick={() => command(item, "buy")}><Coins size={16} />{pending ? t.pending : item.event ? t.eventHint : `${t.unlock} · ${item.price}`}</button>}
          </div>
        </article>;
      })}</div>
      <StudyRewardsPanel data={rewards} />
    </main>
  </div>;
}
