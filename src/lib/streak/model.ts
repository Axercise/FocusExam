export const STREAK_SECONDS = 600;

export type StreakNotice = { id: string; date: string; previous: number; current: number };
export type StreakStatus = {
  today: string;
  timezone: string;
  server_now: string;
  study_seconds: number;
  qualified: boolean;
  current_streak: number;
  longest_streak: number;
  pending_notice: boolean;
  notice: StreakNotice | null;
  next_check_ms: number | null;
};

const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const date = (value: unknown): value is string => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
const uuid = (value: unknown): value is string => typeof value === "string" && /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value);

// Reject malformed responses rather than displaying an unverified reward.
export function parseStreakStatus(value: unknown): StreakStatus | null {
  if (!value || typeof value !== "object") return null;
  const s = value as Record<string, unknown>;
  if (!date(s.today) || typeof s.timezone !== "string" || !s.timezone || typeof s.server_now !== "string" || !Number.isFinite(Date.parse(s.server_now)) ||
      !count(s.study_seconds) || !count(s.current_streak) || !count(s.longest_streak) || s.longest_streak < s.current_streak ||
      typeof s.qualified !== "boolean" || typeof s.pending_notice !== "boolean" ||
      !(s.next_check_ms === null || (count(s.next_check_ms) && s.next_check_ms >= 250 && s.next_check_ms <= 90000250))) return null;
  if (s.notice !== null) {
    if (!s.notice || typeof s.notice !== "object") return null;
    const n = s.notice as Record<string, unknown>;
    if (!uuid(n.id) || !date(n.date) || n.date !== s.today || !count(n.previous) || !count(n.current) || n.current !== n.previous + 1) return null;
  }
  return s as StreakStatus;
}
