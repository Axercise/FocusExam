import test from "node:test";
import assert from "node:assert/strict";
import { validDate,statisticsRange,adjacentDate,sumDays,clockDuration } from "../src/lib/statistics/model.ts";

test("calendar input rejects rollover, malformed, array and out-of-range values",()=>{
  for(const date of [undefined,["2026-01-01"],"2026-02-29","2026-04-31","26-01-01","2026-1-01","10000-01-01","1899-12-31"]) assert.equal(validDate(date),false);
  assert.equal(validDate("2024-02-29"),true);
});
test("monthly ranges include every real day including leap years and December",()=>{
  assert.deepEqual(statisticsRange("month","2024-02-15"),{from:"2024-02-01",to:"2024-02-29"});
  assert.deepEqual(statisticsRange("month","2026-02-15"),{from:"2026-02-01",to:"2026-02-28"});
  assert.deepEqual(statisticsRange("month","2026-12-31"),{from:"2026-12-01",to:"2026-12-31"});
});
test("trailing seven-day range and navigation cross month/year without local timezone drift",()=>{
  assert.deepEqual(statisticsRange("week","2026-01-03"),{from:"2025-12-28",to:"2026-01-03"});
  assert.deepEqual(statisticsRange("day","2026-01-03"),{from:"2026-01-03",to:"2026-01-03"});
  assert.equal(adjacentDate("month","2026-03-31",-1),"2026-02-01");
  assert.equal(adjacentDate("month","2026-12-31",1),"2027-01-01");
  assert.equal(adjacentDate("week","2026-01-03",-1),"2025-12-27");
});
test("study-day count excludes break-only days and time formatting retains seconds and long hours",()=>{
  assert.deepEqual(sumDays([{date:"2026-01-01",study_seconds:1,break_seconds:9},{date:"2026-01-02",study_seconds:0,break_seconds:60}]),{study:1,rest:69,active:1});
  assert.deepEqual(sumDays([]),{study:0,rest:0,active:0});
  assert.equal(clockDuration(28801),"08:00:01");
  assert.equal(clockDuration(360001),"100:00:01");
});
