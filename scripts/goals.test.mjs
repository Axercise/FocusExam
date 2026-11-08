import test from "node:test";
import assert from "node:assert/strict";
import {validGoalTitle,validRevision,goalProgress} from "../src/lib/goals/model.ts";
test("goal titles trim whitespace, count Unicode code points and reject invalid fields",()=>{
 assert.equal(validGoalTitle("  Solve 20 problems  "),true);
 assert.equal(validGoalTitle("🌱".repeat(200)),true);
 for(const value of ["🌱".repeat(201),""," \n\t ",null,["Read"],new Blob(["file"])])assert.equal(validGoalTitle(value),false);
});
test("revision parsing cannot convert malformed or absent values into a valid stale-write guard",()=>{
 for(const value of [null,undefined,"","-1","1.5","1e3","NaN","1000000000",["0"]])assert.equal(validRevision(value),null);
 assert.equal(validRevision("0"),0);assert.equal(validRevision("123"),123);
});
test("progress handles empty days and counts completed goals against the full day's total",()=>{
 assert.equal(goalProgress(0,0),0);assert.equal(goalProgress(1,3),33);
 assert.equal(goalProgress(2,3),67);assert.equal(goalProgress(13,13),100);
});
