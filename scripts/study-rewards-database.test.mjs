import test,{before,after} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
const db=new PGlite();
const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
let backfill;
async function owner(zone="UTC") {const id=randomUUID();await query("insert into auth.users(id)values($1)",[id]);await query("update public.profiles set timezone=$2 where id=$1",[id,zone]);return id;}
async function track(u){return(await query("insert into public.tracks(user_id,name)values($1,'Subject')returning id",[u]))[0].id;}
async function asUser(u,sql,args=[]){await query("select set_config('request.jwt.claim.sub',$1,false)",[u??""]);await db.exec(`set role ${u?"authenticated":"anon"}`);try{return await query(sql,args);}finally{await db.exec("reset role");await query("select set_config('request.jwt.claim.sub','',false)");}}
async function makeRun(u,segments,{mode="lockin",legacy=false}={}){
 const id=randomUUID(),client=randomUUID(),ms=segments.reduce((n,[a,b])=>n+Date.parse(b)-Date.parse(a),0);
 await query(`insert into public.timer_runs(id,user_id,client_id,mode,duration_seconds,status,accumulated_ms,started_at,ended_at)
 values($1,$2,$3,$4,$5,'completed',$6,$7,$8)`,[id,u,client,mode,mode==="lockin"?null:ms/1000,ms,segments[0][0],segments.at(-1)[1]]);
 if(legacy)await query("update public.timer_runs set segments_complete=false where id=$1",[id]);
 else for(const [a,b]of segments)await query("insert into public.timer_run_segments(run_id,user_id,started_at,ended_at,credited_ms)values($1,$2,$3,$4,$5)",[id,u,a,b,Date.parse(b)-Date.parse(a)]);
 return client;
}
const saveRun=async(u,t,client)=>(await asUser(u,"select public.timer_command($1,'save',null,null,$2,'') s",[client,t]))[0].s;
async function save(u,t,segments,options){const c=await makeRun(u,segments,options);await saveRun(u,t,c);return c;}
const span=(start,seconds)=>[[start,new Date(Date.parse(start)+seconds*1000).toISOString()]];
const balance=async(u)=>Number((await asUser(u,"select public.cosmetics_state() s"))[0].s.balance);
const coinsForTrack=async(u)=>Number((await query("select coalesce(sum(amount),0) n from public.coin_ledger where user_id=$1 and source_key like 'track:%'",[u]))[0].n);
before(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 grant usage on schema auth to anon,authenticated;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
 const files=(await readdir(new URL("../supabase/migrations/",import.meta.url))).sort();
 const rewardIndex=files.findIndex(f=>f.endsWith("_study_coin_rewards.sql"));
 assert.ok(rewardIndex>=0,"Reward migration must exist");
 for(const f of files.slice(0,rewardIndex))await db.exec(await readFile(new URL("../supabase/migrations/"+f,import.meta.url),"utf8"));
 const u=await owner(),t=await track(u),client=await save(u,t,span("2026-01-01T00:00:00Z",36000));backfill={u,t,client};
 for(const f of files.slice(rewardIndex))await db.exec(await readFile(new URL("../supabase/migrations/"+f,import.meta.url),"utf8"));
});
after(async()=>{await db.close();});
test("migration credits existing precise days and saved Track milestones once",async()=>{
 const {u,t,client}=backfill;
 assert.equal(await balance(u),115);assert.equal(await coinsForTrack(u),50);
 assert.equal(Number((await query("select study_seconds from public.track_reward_progress where user_id=$1 and track_id=$2",[u,t]))[0].study_seconds),36000);
 await saveRun(u,t,client);assert.equal(await balance(u),115);
});
test("Daily Quest crosses exact thresholds and cumulative rewards stop at 65 per study date",async()=>{
 const u=await owner(),t=await track(u),day=(await query("select current_date::text d"))[0].d;
 await save(u,t,span(day+"T00:00:00Z",599));assert.equal(await balance(u),0);
 const client=await save(u,t,span(day+"T00:10:00Z",1));assert.equal(await balance(u),5);
 await saveRun(u,t,client);assert.equal(await balance(u),5);
 await save(u,t,span(day+"T00:11:00Z",1200));assert.equal(await balance(u),15);
 await save(u,t,span(day+"T01:00:00Z",1800));assert.equal(await balance(u),35);
 await save(u,t,span(day+"T02:00:00Z",3600));assert.equal(await balance(u),65);
 await save(u,t,span(day+"T03:00:00Z",600));assert.equal(await balance(u),65);
 const r=(await asUser(u,"select public.study_rewards() r"))[0].r;
 assert.equal(r.study_seconds,7800);assert.deepEqual(r.quests.map(q=>q.awarded),[true,true,true,true]);
});
test("unfinished rounds, breaks, pauses and discarded rounds do not create quest coins",async()=>{
 const u=await owner(),t=await track(u);
 const c=await makeRun(u,span("2026-02-01T00:00:00Z",600));assert.equal(await balance(u),0);
 await asUser(u,"select public.timer_command($1,'discard')",[c]);assert.equal(await balance(u),0);
 await save(u,null,span("2026-02-01T01:00:00Z",1800),{mode:"break"});assert.equal(await balance(u),0);
 await save(u,t,[["2026-02-01T03:00:00Z","2026-02-01T03:02:00Z"],["2026-02-01T15:00:00Z","2026-02-01T15:03:00Z"]]);
 assert.equal(await balance(u),0);
 assert.equal(Number((await query("select study_seconds from public.daily_quest_progress where user_id=$1",[u]))[0].study_seconds),300);
});
test("cross-midnight rewards use captured study dates even if saved later or timezone changes",async()=>{
 const u=await owner("Asia/Bangkok"),t=await track(u);
 await save(u,t,[["2026-01-31T16:55:00Z","2026-01-31T17:05:00Z"]]);assert.equal(await balance(u),0);
 await save(u,t,span("2026-01-31T16:40:00Z",300));await save(u,t,span("2026-01-31T17:10:00Z",300));
 assert.equal(await balance(u),10);
 await query("update public.profiles set timezone='America/New_York' where id=$1",[u]);
 const rows=await query("select local_date::text d,study_seconds::int s from public.daily_quest_progress where user_id=$1 order by local_date",[u]);
 assert.deepEqual(rows,[{d:"2026-01-31",s:600},{d:"2026-02-01",s:600}]);
 assert.equal(await balance(u),10);
});
test("DST spring-forward counts elapsed study seconds rather than missing wall-clock hours",async()=>{
 const u=await owner("America/Los_Angeles"),t=await track(u);
 await save(u,t,[["2026-03-08T09:55:00Z","2026-03-08T10:05:00Z"]]);
 assert.equal(await balance(u),5);
 assert.deepEqual(await query("select local_date::text d,study_seconds::int s from public.daily_quest_progress where user_id=$1",[u]),[{d:"2026-03-08",s:600}]);
});
test("each Track receives 50 Coin per ten hours, including multiple milestones in one save",async()=>{
 const u=await owner(),a=await track(u),b=await track(u);
 await save(u,a,span("2026-02-01T00:00:00Z",35999));assert.equal(await coinsForTrack(u),0);
 await save(u,b,span("2026-02-03T00:00:00Z",18000));assert.equal(await coinsForTrack(u),0);
 const c=await save(u,a,span("2026-02-04T00:00:00Z",1));assert.equal(await coinsForTrack(u),50);
 await saveRun(u,a,c);assert.equal(await coinsForTrack(u),50);
 await save(u,a,span("2026-02-05T00:00:00Z",72000));assert.equal(await coinsForTrack(u),150);
 const rows=await query("select amount from public.coin_ledger where user_id=$1 and source_key like 'track:%' order by amount",[u]);
 assert.deepEqual(rows,[{amount:50},{amount:100}]);
});
test("legacy time counts toward all-time Track milestones but never invents a daily quest date",async()=>{
 const u=await owner(),t=await track(u);
 await save(u,t,span("2026-02-01T00:00:00Z",36000),{legacy:true});
 assert.equal(await balance(u),50);
 assert.equal((await query("select * from public.daily_quest_progress where user_id=$1",[u])).length,0);
});
test("archive/restore preserves progress and a rejected save cannot award coins",async()=>{
 const u=await owner(),t=await track(u);await save(u,t,span("2026-02-01T00:00:00Z",18000));
 await asUser(u,"update public.tracks set archived_at=now() where id=$1",[t]);
 const c=await makeRun(u,span("2026-02-02T00:00:00Z",18000)),before=await balance(u);
 await assert.rejects(saveRun(u,t,c),/track_unavailable/);assert.equal(await balance(u),before);
 await asUser(u,"update public.tracks set archived_at=null where id=$1",[t]);
 await saveRun(u,t,c);assert.equal(await coinsForTrack(u),50);
});
test("guests and forged API writes cannot award rewards; admin accounts still see only their own rewards",async()=>{
 const u=await owner(),other=await owner(),t=await track(u);await save(u,t,span("2026-02-01T00:00:00Z",36000));
 await assert.rejects(asUser(null,"select public.study_rewards()"),/permission denied/);
 for(const sql of["insert into public.daily_quest_progress values(auth.uid(),current_date,999999)","insert into public.track_reward_progress values(auth.uid(),'"+t+"',999999)","insert into public.study_sessions(user_id)values(auth.uid())"])
  await assert.rejects(asUser(u,sql),/permission denied/);
 await query("update public.user_roles set role='admin' where user_id=$1",[other]);
 for(const table of["daily_quest_progress","track_reward_progress","coin_ledger"])assert.equal((await asUser(other,`select * from public.${table} where user_id=$1`,[u])).length,0);
 const r=(await asUser(other,"select public.study_rewards() r"))[0].r;assert.equal(r.track_count,0);assert.deepEqual(r.tracks,[]);
 await assert.rejects(asUser(other,"select public.study_rewards(0)"),/Invalid reward page/);
});
test("Daily Quest combines subjects once per account and earned coins can unlock a Focus Space",async()=>{
 const u=await owner(),a=await track(u),b=await track(u);
 await save(u,a,span("2026-02-01T00:00:00Z",300));await save(u,b,span("2026-02-01T01:00:00Z",300));
 assert.equal(await balance(u),5);
 await save(u,b,span("2026-02-01T02:00:00Z",6600));assert.equal(await balance(u),65);
 await save(u,a,span("2026-02-02T00:00:00Z",7200));assert.equal(await balance(u),130);
 await asUser(u,"select public.cosmetics_command('buy','space:garden')");assert.equal(await balance(u),30);
 const s=(await asUser(u,"select public.cosmetics_command('equip','space:garden') s"))[0].s;
 assert.equal(s.appearance.focus_background,"garden");assert.equal(await balance(u),30);
});
test("reward Track pages are bounded, stable, complete and include archived progress",async()=>{
 const u=await owner(),ids=[];for(let i=0;i<7;i++)ids.push(await track(u));
 await asUser(u,"update public.tracks set archived_at=now() where id=$1",[ids[0]]);
 const first=(await asUser(u,"select public.study_rewards(1) r"))[0].r;
 const last=(await asUser(u,"select public.study_rewards(99999) r"))[0].r;
 assert.equal(first.track_count,7);assert.equal(first.pages,2);assert.equal(first.tracks.length,6);
 assert.equal(last.page,2);assert.equal(last.tracks.length,1);assert.equal(last.tracks[0].track_id,ids[0]);
 assert.equal(last.tracks[0].archived,true);assert.equal(last.tracks[0].seconds_to_next,36000);
 assert.deepEqual(new Set([...first.tracks,...last.tracks].map(t=>t.track_id)),new Set(ids));
});
