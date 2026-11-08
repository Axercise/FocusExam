export const trackColors = ["mint", "blue", "peach", "lavender", "rose", "amber", "teal", "slate", "lime", "midnight", "coral", "gold"] as const;
export const trackIcons = ["book", "math", "language", "science", "code", "art", "music", "globe", "rocket", "graduation", "sparkles"] as const;
export const trackBackgrounds = ["plain", "blueprint", "aurora", "confetti"] as const;
export type TrackColor = typeof trackColors[number];
export type TrackIconName = typeof trackIcons[number];
export type TrackView = "active" | "archived";
export type PersonalTrack = {
  id: string; name: string; description: string; color: TrackColor;
  icon: TrackIconName; background: string; archived_at: string | null; created_at: string; total_seconds: number;
};
export type TrackMessage = "created" | "saved" | "archived" | "restored" | "invalid_name" | "invalid_description" | "invalid_options" | "not_found" | "unavailable" | "auth_required";
export type TrackActionState = { message?: TrackMessage; success?: boolean };
export const TRACK_PAGE_SIZE = 12;
export function isTrackColor(value: string): value is TrackColor { return trackColors.some(color => color === value); }
export function isTrackIcon(value: string): value is TrackIconName { return trackIcons.some(icon => icon === value); }
export function isTrackId(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value); }
export function parseTrackPage(value: unknown) {
  return typeof value === "string" && /^\d{1,6}$/.test(value) ? Math.max(1, Number(value)) : 1;
}
export function validateTrackFields(form: FormData) {
  const field = (key: string) => typeof form.get(key) === "string" ? String(form.get(key)).trim() : "";
  const name = field("name"), description = field("description"), color = field("color"), icon = field("icon");
  const background = field("background") || "plain";
  if (!name || [...name].length > 80) return { error: "invalid_name" as const };
  if ([...description].length > 280) return { error: "invalid_description" as const };
  if (!isTrackColor(color) || !isTrackIcon(icon) || !trackBackgrounds.some(value => value === background)) return { error: "invalid_options" as const };
  return { values: { name, description, color, icon, background } };
}
