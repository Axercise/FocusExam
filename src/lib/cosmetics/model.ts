export type CosmeticKind = "clock" | "space" | "theme" | "color" | "icon" | "background";
export type CosmeticSection = "clock" | "space" | "theme" | "tracks";
export type CosmeticItem = { id: string; kind: CosmeticKind; value: string; name_th: string; name_en: string; price: number; event: string | null };
export type Appearance = { clock_skin: string; site_theme: string; focus_background: string };
export type CosmeticState = { balance: number; owned: string[]; appearance: Appearance; catalog: CosmeticItem[] };
export const defaultAppearance: Appearance = { clock_skin: "default", site_theme: "default", focus_background: "default" };
export const freeColors = ["mint", "blue", "peach", "lavender", "rose", "amber", "teal", "slate", "lime"] as const;
export const extraColors = ["midnight", "coral", "gold"] as const;
export const freeIcons = ["book", "math", "language", "science", "code", "art", "music", "globe"] as const;
export const extraIcons = ["rocket", "graduation", "sparkles"] as const;
export const trackBackgrounds = ["plain", "blueprint", "aurora", "confetti"] as const;
export const clockSkins = ["default", "orbit", "flip", "frost"] as const;
export const spaceThemes = ["default", "christmas", "halloween"] as const;
export const focusBackgrounds = ["default", "garden", "night"] as const;
export function appearanceKey(kind: CosmeticKind): keyof Appearance | null {
  return kind === "clock" ? "clock_skin" : kind === "space" ? "focus_background" : kind === "theme" ? "site_theme" : null;
}
export function ownsCosmetic(owned: string[], kind: CosmeticKind, value: string) {
  if (kind === "color" && freeColors.some(c => c === value)) return true;
  if (kind === "icon" && freeIcons.some(c => c === value)) return true;
  if ((kind === "background" && value === "plain") || (["clock", "space", "theme"].includes(kind) && value === "default")) return true;
  return owned.includes(`${kind}:${value}`);
}
