import test from "node:test";
import assert from "node:assert/strict";
import { validateTrackFields, parseTrackPage, isTrackId } from "../src/lib/tracks/model.ts";

function form(fields = {}) {
  const data = new FormData();
  for (const [key, value] of Object.entries({ name: "  คณิตศาสตร์  ", description: "  Algebra  ", color: "mint", icon: "math", ...fields })) data.set(key, value);
  return data;
}
test("track validation trims input and strips fields the user cannot assign", () => {
  const result = validateTrackFields(form({ user_id: "someone-else", role: "admin", created_at: "yesterday" }));
  assert.deepEqual(result.values, { name: "คณิตศาสตร์", description: "Algebra", color: "mint", icon: "math", background: "plain" });
});
test("Unicode limits count code points and reject oversized or empty input", () => {
  assert.ok(validateTrackFields(form({ name: "🌱".repeat(80) })).values);
  assert.equal(validateTrackFields(form({ name: "🌱".repeat(81) })).error, "invalid_name");
  assert.equal(validateTrackFields(form({ name: "   " })).error, "invalid_name");
  assert.ok(validateTrackFields(form({ description: "ก".repeat(280) })).values);
  assert.equal(validateTrackFields(form({ description: "ก".repeat(281) })).error, "invalid_description");
});
test("colors and icons cannot supply arbitrary CSS or markup", () => {
  assert.equal(validateTrackFields(form({ color: "red onclick=alert(1)" })).error, "invalid_options");
  assert.equal(validateTrackFields(form({ icon: "<script>" })).error, "invalid_options");
  const invalid = form(); invalid.set("name", new Blob(["not text"]), "name.txt");
  assert.equal(validateTrackFields(invalid).error, "invalid_name");
});
test("pagination and IDs reject malformed route/form inputs", () => {
  for (const value of [undefined, "-1", "NaN", "Infinity", "1e5", ["2"], "1&view=archived", "9999999"]) assert.equal(parseTrackPage(value), 1);
  assert.equal(parseTrackPage("0"), 1);
  assert.equal(parseTrackPage("12"), 12);
  assert.ok(isTrackId("123e4567-e89b-42d3-a456-426614174000"));
  assert.ok(!isTrackId("id=1 or true"));
});
