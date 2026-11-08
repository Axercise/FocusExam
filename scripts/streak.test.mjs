import test from "node:test";
import assert from "node:assert/strict";
import {parseStreakStatus} from "../src/lib/streak/model.ts";

const status={today:"2026-11-08",timezone:"Asia/Bangkok",server_now:"2026-11-08T10:00:00Z",study_seconds:600,qualified:true,current_streak:2,longest_streak:4,pending_notice:false,notice:{id:"e3a138a0-d00d-40ef-a1dc-a5e0beea22fe",date:"2026-11-08",previous:1,current:2},next_check_ms:251};
test("a verified streak response retains the reward, current date and next threshold",()=>{
  assert.deepEqual(parseStreakStatus(status),status);
  assert.ok(parseStreakStatus({...status,notice:null,next_check_ms:null}));
});
test("malformed dates, counters and fast or excessive schedules are rejected without throwing",()=>{
  for(const change of[{today:"2026-99-99"},{today:"2026-02-30"},{server_now:"invalid"},{current_streak:-1},{longest_streak:1},{study_seconds:NaN},{study_seconds:600.1},{next_check_ms:0},{next_check_ms:90000251},{next_check_ms:Infinity}])assert.equal(parseStreakStatus({...status,...change}),null);
  for(const value of[null,undefined,[],{},true,1])assert.equal(parseStreakStatus(value),null);
});
test("a celebration must identify today's award and exactly one earned day",()=>{
  for(const change of[{id:"invalid"},{date:"2026-11-07"},{previous:-1},{current:3},{current:"2"}])assert.equal(parseStreakStatus({...status,notice:{...status.notice,...change}}),null);
});
