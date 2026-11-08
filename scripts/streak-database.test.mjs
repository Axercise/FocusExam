// In-memory PostgreSQL with a minimal Supabase Auth fixture. No hosted data.
import test, {before,after} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";

const db=new PGlite();
let backfillOwner;
const iso=ms=>new Date(ms).toISOString();
async function query(sql,args=[]){return (await db.query(sql,args)).rows;}
async function owner(zone="UTC"){
  const id=randomUUID();
  await query("insert into auth.users(id)values($1)",[id]);
  await query("update public.profiles set timezone=$2 where id=$1",[id,zone]);
  return id;
}
async function run(user,segments,{mode="lockin",status="discarded",duration=null,precise=true}={}){
  const id=randomUUID(),client=randomUUID();
  const start=segments[0][0],end=segments.at(-1)[1];
  const ms=segments.reduce((sum,[a,b])=>sum+(b===null?0:Date.parse(b)-Date.parse(a)),0);
  await query(`insert into public.timer_runs(id,user_id,client_id,mode,duration_seconds,status,accumulated_ms,started_at,resumed_at,ended_at)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[id,user,client,mode,duration,status,ms,start,status==="running"?start:null,["completed","saved","discarded"].includes(status)?end:null]);
  if(status!=="running")for(const [a,b]of segments)await query("insert into public.timer_run_segments(run_id,user_id,started_at,ended_at,credited_ms)values($1,$2,$3,$4,$5)",[id,user,a,b,Date.parse(b)-Date.parse(a)]);
  if(!precise)await query("update public.timer_runs set segments_complete=false where id=$1",[id]);
  return {id,client};
}
async function asUser(user,sql,args=[]){
  await query("select set_config('request.jwt.claim.sub',$1,false)",[user??""]);
  await db.exec("set role authenticated");
  try{return await query(sql,args);}finally{await db.exec("reset role");await query("select set_config('request.jwt.claim.sub','',false)");}
}
async function status(user,claim=false){return (await asUser(user,"select public.study_streak_status($1) as s",[claim]))[0].s;}
async function totals(user,now){return await query("select local_date::text,study_ms::text,qualified_at from private.study_streak_totals($1,$2)order by local_date",[user,now]);}
async function relativeDay(offset){return (await query("select ((clock_timestamp()at time zone'UTC')::date+$1::integer)::text as d",[offset]))[0].d;}
async function studyDay(user,offset,ms=600000){const day=await relativeDay(offset),start=Date.parse(day+"T00:00:00Z");return run(user,[[iso(start),iso(start+ms)]]);}

before(async()=>{
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
    create schema auth;grant usage on schema auth to anon,authenticated;
    create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
    create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
  const files=(await readdir(new URL("../supabase/migrations/",import.meta.url))).sort();
  for(const file of files){
    if(file.endsWith("ten_minute_streaks.sql")){
      backfillOwner=await owner();
      await studyDay(backfillOwner,-2,599999);
      await studyDay(backfillOwner,-1);
    }
    await db.exec(await readFile(new URL("../supabase/migrations/"+file,import.meta.url),"utf8"));
  }
});
after(async()=>{await db.close();});

test("migration backfills verified ten-minute days and acknowledges old notices",async()=>{
  const rows=await query("select local_date::text,previous_streak,new_streak,notified_at from public.study_streak_days where user_id=$1",[backfillOwner]);
  assert.equal(rows.length,1);assert.equal(rows[0].local_date,await relativeDay(-1));
  assert.equal(rows[0].previous_streak,0);assert.equal(rows[0].new_streak,1);assert.ok(rows[0].notified_at);
});
test("599999 ms does not qualify; another 1 ms in a different round qualifies exactly once",async()=>{
  const user=await owner(),day=await relativeDay(-1),at=Date.parse(day+"T12:00:00Z");
  await run(user,[[iso(at),iso(at+599999)]]);
  assert.equal((await status(user)).current_streak,0);
  const crossing=iso(at+600001);
  await run(user,[[iso(at+600000),crossing]]);
  assert.equal((await status(user)).current_streak,1);
  assert.equal((await status(user)).current_streak,1);
  const rows=await totals(user,iso(at+700000));
  assert.equal(rows[0].study_ms,"600000");assert.equal(new Date(rows[0].qualified_at).toISOString(),crossing);
  assert.equal((await query("select * from public.study_streak_days where user_id=$1",[user])).length,1);
});
test("pauses, break rounds and incomplete legacy timelines cannot fill a study shortfall",async()=>{
  const user=await owner(),day=await relativeDay(-1);
  await run(user,[[day+"T12:00:00Z",day+"T12:05:00Z"],[day+"T13:00:00Z",day+"T13:04:00Z"]],{status:"paused"});
  await run(user,[[day+"T14:00:00Z",day+"T15:00:00Z"]],{mode:"break",duration:3600});
  await run(user,[[day+"T16:00:00Z",day+"T17:00:00Z"]],{precise:false});
  assert.equal((await totals(user,day+"T23:00:00Z"))[0].study_ms,"540000");
  assert.equal((await status(user)).current_streak,0);
});
test("an unattended countdown is capped at its deadline, while live Lock in time qualifies without saving",async()=>{
  const now=Date.now(),countdown=await owner(),lockin=await owner();
  await run(countdown,[[iso(now-7200000),null]],{mode:"focus",duration:300,status:"running"});
  const seconds=(await totals(countdown,iso(now))).reduce((s,r)=>s+Number(r.study_ms),0);
  assert.equal(seconds,300000);assert.equal((await status(countdown)).qualified,false);
  await run(lockin,[[iso(now-610000),null]],{status:"running"});
  const s=await status(lockin);assert.equal(s.qualified,true);assert.equal(s.current_streak,1);assert.equal(s.pending_notice,true);
  assert.equal((await query("select count(*)::int as n from public.study_sessions where user_id=$1",[lockin]))[0].n,0);
  assert.ok(s.next_check_ms>0);
});
test("5 minutes across each side of midnight never qualifies either day; millisecond credit is conserved",async()=>{
  const user=await owner("Asia/Bangkok");
  await run(user,[["2025-12-31T16:55:00Z","2025-12-31T17:05:00Z"]]);
  const rows=await totals(user,"2026-01-02T00:00:00Z");
  assert.deepEqual(rows.map(r=>[r.local_date,r.study_ms]),[["2025-12-31","300000"],["2026-01-01","300000"]]);
  assert.ok(rows.every(r=>r.qualified_at===null));assert.equal((await status(user)).longest_streak,0);
  const fractional=await owner("Asia/Bangkok");
  await run(fractional,[["2025-12-31T16:59:59.999Z","2025-12-31T17:00:00.001Z"]]);
  assert.deepEqual((await totals(fractional,"2026-01-02T00:00:00Z")).map(r=>r.study_ms),["1","1"]);
});
test("DST spring-forward and fall-back use real elapsed time and the captured timezone",async()=>{
  const user=await owner("America/New_York");
  await run(user,[["2026-03-08T06:55:00Z","2026-03-08T07:05:00Z"]]);
  await run(user,[["2026-11-01T04:30:00Z","2026-11-01T07:30:00Z"]]);
  await query("update public.profiles set timezone='Asia/Bangkok'where id=$1",[user]);
  assert.deepEqual((await totals(user,"2026-11-02T00:00:00Z")).map(r=>[r.local_date,r.study_ms]),[["2026-03-08","600000"],["2026-11-01","10800000"]]);
});
test("consecutive qualifying days produce 1 → 2, gaps reset, and longest remains correct",async()=>{
  const user=await owner();
  for(const offset of[-4,-3,-1])await studyDay(user,offset);
  let s=await status(user);assert.equal(s.current_streak,1);assert.equal(s.longest_streak,2);
  await studyDay(user,0);s=await status(user,true);
  assert.equal(s.current_streak,2);assert.equal(s.longest_streak,2);
  assert.deepEqual([s.notice.previous,s.notice.current],[1,2]);
  const gap=await owner();await studyDay(gap,-2);await studyDay(gap,0);
  s=await status(gap,true);assert.equal(s.current_streak,1);assert.equal(s.notice.previous,0);
});
test("reads preserve a pending notice; server claims return it once across retries and owners",async()=>{
  const user=await owner(),other=await owner();await studyDay(user,0);
  assert.equal((await status(user)).pending_notice,true);assert.equal((await status(user)).notice,null);
  assert.equal((await status(other,true)).notice,null);
  const claimed=await status(user,true);assert.ok(claimed.notice);assert.equal(claimed.pending_notice,false);
  assert.equal((await status(user,true)).notice,null);
  const ownRows=await asUser(user,"select * from public.study_streak_days");
  assert.equal(ownRows.length,1);assert.equal(ownRows[0].user_id,user);
  assert.equal((await asUser(other,"select * from public.study_streak_days where user_id=$1",[user])).length,0);
});
test("saving a qualified round to a Track preserves exactly one earned day",async()=>{
  const user=await owner(),day=await relativeDay(-1),track=randomUUID();
  await query("insert into public.tracks(id,user_id,name)values($1,$2,'Math')",[track,user]);
  const timer=await run(user,[[day+"T12:00:00Z",day+"T12:10:00Z"]],{status:"completed"});
  assert.equal((await status(user)).current_streak,1);
  await asUser(user,"select public.timer_command($1,'save',null,null,$2,'Learned fractions')",[timer.client,track]);
  assert.equal((await status(user)).current_streak,1);
  assert.equal((await query("select count(*)::int n from public.study_streak_days where user_id=$1",[user]))[0].n,1);
  assert.equal((await asUser(user,"select public.study_statistics() s"))[0].s.current_streak,1);
});
test("authenticated direct writes, helper calls, null identities and anonymous RPC access are denied",async()=>{
  const user=await owner();
  await assert.rejects(asUser(user,"insert into public.study_streak_days(user_id,local_date,achieved_at,previous_streak,new_streak)values($1,current_date,now(),0,1)",[user]),/permission denied/);
  await assert.rejects(asUser(user,"select * from private.study_streak_totals($1,now())",[user]),/permission denied/);
  await assert.rejects(status(null),/Authentication required/);
  await db.exec("set role anon");
  try{await assert.rejects(query("select public.study_streak_status(true)"),/permission denied/);}finally{await db.exec("reset role");}
});
