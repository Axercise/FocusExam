import test from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { sealVerificationToken, openVerificationToken } from "../src/lib/auth/verification-token.ts";
import { canRenameAt, maskEmail, nextNameChangeAt, RENAME_INTERVAL_MS } from "../src/lib/account/presentation.ts";

const key = randomBytes(32).toString("base64url");
test("email challenge is opaque, authentic, purpose-bound and expires at the boundary", () => {
  const payload = { email: "private@example.com", verifier: "secret-verifier" };
  const token = sealVerificationToken(payload, key, "email-challenge", 60, 1000);
  assert.ok(!token.includes(payload.email) && !token.includes(payload.verifier));
  assert.deepEqual(openVerificationToken(token, key, "email-challenge", 60999)?.payload, payload);
  assert.equal(openVerificationToken(token, key, "email-challenge", 61000), null);
  assert.equal(openVerificationToken(token, key, "password-change", 1000), null);
  assert.equal(openVerificationToken(token, randomBytes(32).toString("base64url"), "email-challenge", 1000), null);
  const parts = token.split(".");
  const bytes = Buffer.from(parts[3], "base64url");
  bytes[0] ^= 1;
  parts[3] = bytes.toString("base64url");
  assert.equal(openVerificationToken(parts.join("."), key, "email-challenge", 1000), null);
  for (const bad of ["", "recovery", "v1.a.b.c", token + ".extra", "x".repeat(6001)]) {
    assert.equal(openVerificationToken(bad, key, "email-challenge", 1000), null);
  }
});
test("proof preserves user, session and account version without exposing them", () => {
  const grant = { userId: "user-a", sessionId: "session-a", userVersion: "version-a" };
  const token = sealVerificationToken(grant, key, "password-change", 600, 1000);
  assert.deepEqual(openVerificationToken(token, key, "password-change", 1001)?.payload, grant);
  assert.ok(!token.includes(grant.userId));
  assert.throws(() => sealVerificationToken(grant, "short", "password-change", 600));
});
test("email display masks both local part and provider", () => {
  for (const email of ["alice@example.com", "a@example.com", "ab@example.com", "thai-name@gmail.com"]) {
    const masked = maskEmail(email);
    assert.notEqual(masked, email);
    assert.ok(masked.includes("•••") && !masked.includes(email.split("@")[1]));
  }
  assert.equal(maskEmail(""), "••••");
});
test("first rename is immediate and next rename is exactly 168 hours later", () => {
  assert.equal(nextNameChangeAt(null), null);
  const changedAt = "2026-11-06T08:00:00.000Z";
  assert.equal(Date.parse(nextNameChangeAt(changedAt)) - Date.parse(changedAt), RENAME_INTERVAL_MS);
  assert.equal(nextNameChangeAt(changedAt), "2026-11-13T08:00:00.000Z");
  assert.equal(canRenameAt(null, 0), true);
  const boundary = Date.parse(nextNameChangeAt(changedAt));
  assert.equal(canRenameAt(nextNameChangeAt(changedAt), boundary - 1), false);
  assert.equal(canRenameAt(nextNameChangeAt(changedAt), boundary), true);
});
