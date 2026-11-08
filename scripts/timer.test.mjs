import test from "node:test";
import assert from "node:assert/strict";
import { initialTimer, transitionTimer, elapsedMs, remainingSeconds, decodeTimer, formatTimer, formatElapsed, durationMs, fromServerTimer } from "../src/lib/timer/model.ts";

const at = 100000;
const start = (state = initialTimer(), now = at) => transitionTimer(state, { type: "start" }, now, "session-1");
test("timestamp countdown catches up after hidden tabs and reload without accumulating tick drift", () => {
  const timer = start();
  assert.equal(remainingSeconds(timer, at), 1500);
  assert.equal(remainingSeconds(timer, at + 999), 1500);
  assert.equal(remainingSeconds(timer, at + 1000), 1499);
  const restored = decodeTimer(JSON.stringify(timer));
  assert.equal(remainingSeconds(restored, at + 8 * 60000), 17 * 60);
  assert.equal(elapsedMs(restored, at - 5000), 0);
});
test("pause and resume preserve elapsed time and session identity, excluding paused time", () => {
  const paused = transitionTimer(start(), { type: "pause" }, at + 10000, "unused");
  assert.equal(paused.status, "paused");
  assert.equal(elapsedMs(paused, at + 1000000), 10000);
  const resumed = transitionTimer(paused, { type: "start" }, at + 20000, "different-id");
  assert.equal(resumed.sessionId, "session-1");
  assert.equal(elapsedMs(resumed, at + 25000), 15000);
});
test("deadline completion uses the actual finish timestamp, clamps overrun and is idempotent", () => {
  const running = start();
  const completed = transitionTimer(running, { type: "sync" }, at + 2000000, "unused");
  assert.equal(completed.status, "completed");
  assert.equal(completed.elapsedMs, 1500000);
  assert.equal(completed.completedAt, at + 1500000);
  assert.equal(remainingSeconds(completed, at + 9000000), 0);
  assert.strictEqual(transitionTimer(completed, { type: "sync" }, at + 9000000, "unused"), completed);
  assert.strictEqual(transitionTimer(completed, { type: "start" }, at + 9000000, "unused"), completed);
});
test("finishing early records only the actual active time, with no sub-second empty round", () => {
  const running = start();
  assert.equal(transitionTimer(running, { type: "finish" }, at + 900, "unused").status, "running");
  const paused = transitionTimer(running, { type: "pause" }, at + 12000, "unused");
  const done = transitionTimer(paused, { type: "finish" }, at + 60000, "unused");
  assert.equal(done.elapsedMs, 12000);
  assert.equal(done.status, "completed");
  assert.equal(done.completedAt, at + 60000);
});
test("duration/mode changes cannot erase an active round and focus/break settings stay separate", () => {
  let state = transitionTimer(initialTimer(), { type: "duration", minutes: 120 }, at, "unused");
  assert.equal(durationMs(state), 7200000);
  state = transitionTimer(state, { type: "mode", mode: "break" }, at, "unused");
  assert.equal(durationMs(state), 300000);
  state = transitionTimer(state, { type: "duration", minutes: 10 }, at, "unused");
  state = start(state);
  assert.strictEqual(transitionTimer(state, { type: "mode", mode: "focus" }, at + 1000, "unused"), state);
  assert.strictEqual(transitionTimer(state, { type: "duration", minutes: 20 }, at + 1000, "unused"), state);
  const reset = transitionTimer(state, { type: "reset" }, at + 1000, "unused");
  assert.equal(reset.focusSeconds, 7200); assert.equal(reset.breakSeconds, 600);
  assert.equal(reset.elapsedMs, 0); assert.equal(reset.sessionId, null);
});
test("next mode waits for an explicit start and creates a new round identity", () => {
  const done = transitionTimer(start(), { type: "finish" }, at + 1000, "unused");
  const next = transitionTimer(done, { type: "next" }, at + 2000, "unused");
  assert.equal(next.mode, "break"); assert.equal(next.status, "idle");
  assert.equal(start(next, at + 3000).elapsedMs, 0);
});
test("pause exactly at the deadline completes instead of leaving a zero-time paused round", () => {
  assert.equal(transitionTimer(start(), { type: "pause" }, at + 1500000, "unused").status, "completed");
});
test("stored state is validated and unknown properties are removed", () => {
  for (const raw of ["", "{bad", "null", "[]", "x".repeat(2501), JSON.stringify({ ...initialTimer(), version: 999 }),
    JSON.stringify({ ...initialTimer(), elapsedMs: -1 }), JSON.stringify({ ...start(), startedAt: null }),
    JSON.stringify({ ...initialTimer(), focusSeconds: 0 }), JSON.stringify({ ...initialTimer(), focusSeconds: 0.5 })]) {
    assert.deepEqual(decodeTimer(raw), initialTimer());
  }
  assert.deepEqual(decodeTimer(JSON.stringify({ ...start(), user_id: "spoofed", role: "admin" })), start());
});
test("duration bounds, fractional minutes and display formatting", () => {
  for (const minutes of [0, -1, 181, 2.5, Infinity, NaN]) {
    const state = initialTimer();
    assert.strictEqual(transitionTimer(state, { type: "duration", minutes }, at, "unused"), state);
  }
  assert.equal(formatTimer(0), "00:00"); assert.equal(formatTimer(3599), "59:59");
  assert.equal(formatTimer(10800), "180:00"); assert.equal(formatTimer(-10), "00:00");
});
test("second precision accepts short countdowns and rejects overflowing second fields", () => {
  const base=initialTimer();
  const timer=transitionTimer(base,{type:"duration",minutes:0,seconds:5},at,"unused");
  assert.equal(timer.focusSeconds,5);
  assert.equal(remainingSeconds(start(timer),at+1000),4);
  assert.equal(transitionTimer(start(timer),{type:"sync"},at+5000,"unused").status,"completed");
  assert.strictEqual(transitionTimer(base,{type:"duration",minutes:1,seconds:60},at,"unused"),base);
  assert.strictEqual(transitionTimer(base,{type:"duration",minutes:180,seconds:1},at,"unused"),base);
  assert.equal(decodeTimer(JSON.stringify(timer)).focusSeconds,5);
});
test("Lock in counts past eight hours without auto-finishing, then saves its real active time", () => {
  let timer=transitionTimer(initialTimer(),{type:"mode",mode:"lockin"},at,"unused");
  timer=start(timer);
  assert.equal(elapsedMs(timer,at+28800000),28800000);
  assert.strictEqual(transitionTimer(timer,{type:"sync"},at+28800000,"unused"),timer);
  assert.equal(formatElapsed(elapsedMs(timer,at+28800000)/1000),"08:00:00");
  assert.equal(formatElapsed(360000),"100:00:00");
  timer=transitionTimer(timer,{type:"pause"},at+28800000,"unused");
  assert.equal(elapsedMs(timer,at+40000000),28800000);
  const done=transitionTimer(timer,{type:"finish"},at+40000000,"unused");
  assert.equal(done.elapsedMs,28800000);
  assert.equal(decodeTimer(JSON.stringify(done)).elapsedMs,28800000);
  const saved=transitionTimer(done,{type:"saved",sessionId:done.sessionId,savedSessionId:"saved-id",trackName:"Math"},at,"unused");
  assert.equal(saved.savedSessionId,"saved-id");
  assert.strictEqual(transitionTimer(done,{type:"saved",sessionId:"different-round",savedSessionId:"wrong",trackName:"Wrong"},at,"unused"),done);
});
test("old local snapshots survive and server snapshots cannot inherit a forged client duration", () => {
  const old=initialTimer();delete old.serverRunId;delete old.savedSessionId;delete old.savedTrackName;
  assert.deepEqual(decodeTimer(JSON.stringify(old)),initialTimer());
  const snapshot={id:"server-run",client_id:"client-id",mode:"lockin",duration_seconds:null,status:"completed",elapsed_ms:28800000,
    started_at:"2026-11-06T00:00:00Z",ended_at:"2026-11-06T08:00:00Z",server_now:"2026-11-06T08:00:00Z",saved_session_id:null,saved_track_name:null};
  const state=fromServerTimer(snapshot,{...initialTimer(),elapsedMs:999999999},at);
  assert.equal(state.elapsedMs,28800000);assert.equal(state.serverRunId,"server-run");
  assert.deepEqual(decodeTimer(JSON.stringify(state)),state);
});
