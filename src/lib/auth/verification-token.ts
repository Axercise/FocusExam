import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function encryptionKey(secret: string) {
  const key = Buffer.from(secret, "base64url");
  if (key.length !== 32) throw new Error("ACCOUNT_SECURITY_KEY must be a random 32-byte base64url key.");
  return key;
}

/** Authenticated encryption: PKCE verifiers must never be readable by the client. */
export function sealVerificationToken(payload: unknown, secret: string, purpose: string, ttlSeconds: number, now = Date.now()) {
  if (!Number.isFinite(ttlSeconds) || ttlSeconds <= 0) throw new Error("Invalid token lifetime.");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(secret), iv);
  cipher.setAAD(Buffer.from(purpose));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify({ payload, expiresAt: now + ttlSeconds * 1000 }), "utf8"), cipher.final(),
  ]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".");
}

export function openVerificationToken<T>(token: string, secret: string, purpose: string, now = Date.now()): { payload: T; expiresAt: number } | null {
  try {
    if (token.length > 6000) return null;
    const [version, iv, tag, encrypted, extra] = token.split(".");
    if (version !== "v1" || !iv || !tag || !encrypted || extra) return null;
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(secret), Buffer.from(iv, "base64url"));
    decipher.setAAD(Buffer.from(purpose));
    decipher.setAuthTag(Buffer.from(tag, "base64url"));
    const plain = Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]);
    const result = JSON.parse(plain.toString("utf8"));
    if (!Number.isFinite(result.expiresAt) || result.expiresAt <= now || !result.payload) return null;
    return result;
  } catch { return null; }
}
