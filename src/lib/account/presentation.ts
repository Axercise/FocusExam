export const RENAME_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

export function nextNameChangeAt(changedAt: string | null) {
  return changedAt ? new Date(new Date(changedAt).getTime() + RENAME_INTERVAL_MS).toISOString() : null;
}

export function canRenameAt(nextChange: string | null, now = Date.now()) {
  return !nextChange || Date.parse(nextChange) <= now;
}

export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "••••";
  const suffix = domain.includes(".") ? domain.slice(domain.lastIndexOf(".")) : "";
  return `${local[0]}•••${local.length > 2 ? local.at(-1) : ""}@${domain[0]}•••${suffix}`;
}

export type AccountIdentity = {
  displayName: string;
  maskedEmail: string;
};

export type ProfileSettings = AccountIdentity & {
  nextNameChangeAt: string | null;
  canRename: boolean;
  timezone: string;
};

export type SecuritySettings = {
  maskedEmail: string;
  timezone: string;
  passwordVerifiedUntil: string | null;
};
