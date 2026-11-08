import test,{before,after} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
const db=new PGlite();
const query=async(sql,args=[])=>(await db.query(sql,args)).rows;
async function owner(zone="UTC"){
 const id=randomUUID();await query("insert into auth.users(id)values($1)",[id]);
 await query("update public.profiles set timezone=$2 where id=$1",[id,zone]);return id;
}
async function track(user){const id=randomUUID();await query("insert into public.tracks(id,user_id,name)values($1,$2,'Subject')",[id,user]);return id;}
async function asUser(user,sql,args=[]){
 await query("select set_config('request.jwt.claim.sub',$1,false)",[user??""]);await db.exec("set role authenticated");
 try{return await query(sql,args);}finally{await db.exec("reset role");await query("select set_config('request.jwt.claim.sub','',false)");}
}
async function save(user,trackId,segments,{mode="lockin",legacy=false,recap="Reviewed fractions"}={}){
 const client=randomUUID(),id=randomUUID(),start=segments[0][0],end=segments.at(-1)[1];
 const ms=segments.reduce((n,[a,b])=>n+Date.parse(b)-Date.parse(a),0);
 await query(`insert into public.timer_runs(id,user_id,client_id,mode,duration_seconds,status,accumulated_ms,started_at,ended_at)
 values($1,$2,$3,$4,$5,'completed',$6,$7,$8)`,[id,user,client,mode,mode==="lockin"?null:ms/1000,ms,start,end]);
 if(legacy)await query("update public.timer_runs set segments_complete=false where id=$1",[id]);
 else for(const [a,b]of segments)await query("insert into public.timer_run_segments(run_id,user_id,started_at,ended_at,credited_ms)values($1,$2,$3,$4,$5)",[id,user,a,b,Date.parse(b)-Date.parse(a)]);
 const r=await asUser(user,"select public.timer_command($1,'save',null,null,$2,$3) s",[client,trackId,recap]);return r[0].s.saved_session_id;
}
async function details(user,id,from,to,page=1,all=false){return(await asUser(user,"select public.track_detail_statistics($1,$2,$3,$4,$5) d",[id,from,to,page,all]))[0].d;}
before(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 grant usage on schema auth to anon,authenticated;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
 for(const f of(await readdir(new URL("../supabase/migrations/",import.meta.url))).sort())await db.exec(await readFile(new URL("../supabase/migrations/"+f,import.meta.url),"utf8"));
});
after(async()=>{await db.close();});
test("subject totals exclude other Tracks and breaks, and match actual allocated dates",async()=>{
 const u=await owner(),a=await track(u),b=await track(u),today=(await query("select current_date::text d"))[0].d;
 await save(u,a,[[today+"T00:00:00Z",today+"T00:02:00Z"]]);
 await save(u,b,[[today+"T01:00:00Z",today+"T01:10:00Z"]]);
 await save(u,null,[[today+"T02:00:00Z",today+"T02:05:00Z"]],{mode:"break"});
 const d=await details(u,a,today,today);
 assert.deepEqual([d.summary.all_seconds,d.summary.today_seconds,d.summary.week_seconds,d.summary.month_seconds],[120,120,120,120]);
 assert.equal(d.summary.session_count,1);assert.deepEqual(d.days,[{date:today,study_seconds:120,break_seconds:0}]);
 assert.equal(d.history.total,1);assert.equal(d.history.sessions[0].recap,"Reviewed fractions");
 assert.equal((await query("select count(*)::int n from public.study_streak_days where user_id=$1",[u]))[0].n,0);
});
test("a paused cross-month round is included by study date and appears once per filtered history",async()=>{
 const u=await owner(),a=await track(u);
 const id=await save(u,a,[["2026-03-31T23:50:00Z","2026-03-31T23:55:00Z"],["2026-04-01T00:05:00Z","2026-04-01T00:10:00Z"]]);
 for(const day of["2026-03-31","2026-04-01"]){const d=await details(u,a,day,day);assert.equal(d.history.total,1);assert.equal(d.history.sessions[0].id,id);assert.equal(d.history.sessions[0].range_seconds,300);assert.equal(d.history.sessions[0].duration_seconds,600);assert.equal(d.days[0].study_seconds,300);}
 const both=await details(u,a,"2026-03-31","2026-04-01");assert.equal(both.history.total,1);assert.equal(both.history.sessions[0].range_seconds,600);
 assert.deepEqual([both.history.sessions[0].first_date,both.history.sessions[0].last_date],["2026-03-31","2026-04-01"]);
});
test("legacy time stays in all-time totals/all-history and cannot be assigned to guessed study dates",async()=>{
 const u=await owner(),a=await track(u);
 await save(u,a,[["2026-03-02T12:00:00Z","2026-03-02T12:10:00Z"]],{legacy:true});
 const d=await details(u,a,"2026-03-02","2026-03-02");assert.equal(d.summary.all_seconds,600);assert.equal(d.summary.legacy_seconds,600);assert.equal(d.summary.legacy_count,1);
 assert.equal(d.history.total,0);assert.equal(d.days[0].study_seconds,0);
 const all=await details(u,a,"2026-03-02","2026-03-02",1,true);assert.equal(all.history.total,1);assert.equal(all.history.sessions[0].allocation_status,"legacy_unallocated");assert.equal(all.history.sessions[0].first_date,null);
});
test("pagination counts sessions rather than day-allocation rows and clamps excessive page input",async()=>{
 const u=await owner(),a=await track(u);
 for(let i=0;i<13;i++)await save(u,a,[[`2026-05-${String(i+1).padStart(2,"0")}T12:00:00Z`,`2026-05-${String(i+1).padStart(2,"0")}T12:10:00Z`]]);
 const first=await details(u,a,"2026-05-01","2026-05-31"),last=await details(u,a,"2026-05-01","2026-05-31",999);
 assert.equal(first.history.sessions.length,12);assert.equal(last.history.sessions.length,1);assert.equal(last.history.page,2);assert.equal(first.history.total,13);
 assert.equal(new Set([...first.history.sessions,...last.history.sessions].map(s=>s.id)).size,13);
 const empty=await details(u,a,"2026-06-01","2026-06-30",99);assert.equal(empty.history.page,1);assert.equal(empty.history.pages,1);assert.equal(empty.days.length,30);
});
test("DST and later profile timezone changes preserve the captured study-date allocation",async()=>{
 const u=await owner("America/New_York"),a=await track(u);
 await save(u,a,[["2026-03-08T04:55:00Z","2026-03-08T05:05:00Z"]]);
 await save(u,a,[["2026-03-08T06:55:00Z","2026-03-08T07:05:00Z"]]);
 await save(u,a,[["2026-11-01T04:30:00Z","2026-11-01T07:30:00Z"]]);
 await query("update public.profiles set timezone='Asia/Bangkok' where id=$1",[u]);
 const march=await details(u,a,"2026-03-07","2026-03-08");assert.deepEqual(march.days.map(d=>d.study_seconds),[300,900]);
 assert.equal((await details(u,a,"2026-11-01","2026-11-01")).days[0].study_seconds,10800);
});
test("archived/empty Tracks remain readable; foreign Tracks remain unavailable even to admin",async()=>{
 const u=await owner(),other=await owner(),a=await track(u);await query("update public.tracks set archived_at=now()where id=$1",[a]);
 const d=await details(u,a,"2026-01-01","2026-01-01");assert.equal(d.summary.all_seconds,0);assert.deepEqual(d.history.sessions,[]);
 await assert.rejects(details(other,a,"2026-01-01","2026-01-01"),/track_unavailable/);
 await query("update public.user_roles set role='admin'where user_id=$1",[other]);
 await assert.rejects(details(other,a,"2026-01-01","2026-01-01"),/track_unavailable/);
 await assert.rejects(details(u,randomUUID(),"2026-01-01","2026-01-01"),/track_unavailable/);
 await assert.rejects(details(null,a,"2026-01-01","2026-01-01"),/Authentication required/);
 assert.equal((await query("select has_function_privilege('anon','public.track_detail_statistics(uuid,date,date,integer,boolean)','execute') allowed"))[0].allowed,false);
});
test("date and pagination guards reject unsupported ranges and malformed RPC inputs",async()=>{
 const u=await owner(),a=await track(u);
 for(const args of[["2026-01-02","2026-01-01",1,false],["2026-01-01","2026-02-01",1,false],["1899-12-31","1899-12-31",1,false],["2026-01-01","2026-01-01",0,false],["2026-01-01","2026-01-01",1,null]])await assert.rejects(details(u,a,...args),/invalid_track_detail_range/);
 const d=await details(u,a,"2024-02-01","2024-02-29");assert.equal(d.days.length,29);
});
test("current summary cards respect ISO-week and calendar-month boundaries",async()=>{
 const u=await owner(),a=await track(u),today=(await query("select current_date::text d"))[0].d;
 const at=new Date(today+"T12:00:00Z"),week=new Date(at),month=new Date(at);week.setUTCDate(week.getUTCDate()-(week.getUTCDay()+6)%7);month.setUTCDate(1);
 const previousMonth=new Date(month),previousWeek=new Date(week);previousMonth.setUTCDate(0);previousWeek.setUTCDate(previousWeek.getUTCDate()-1);
 const fixtures=[at,week,month,previousMonth,previousWeek].map((date,i)=>({date:date.toISOString().slice(0,10),seconds:(i+1)*60}));
 for(const [i,item]of fixtures.entries()){const start=Date.parse(item.date+"T12:00:00Z")+i*600000;await save(u,a,[[new Date(start).toISOString(),new Date(start+item.seconds*1000).toISOString()]]);}
 const d=await details(u,a,today,today),sum=predicate=>fixtures.filter(predicate).reduce((n,x)=>n+x.seconds,0);
 assert.equal(d.summary.today_seconds,sum(x=>x.date===today));
 assert.equal(d.summary.week_seconds,sum(x=>x.date>=week.toISOString().slice(0,10)&&x.date<=today));
 assert.equal(d.summary.month_seconds,sum(x=>x.date>=month.toISOString().slice(0,10)&&x.date<=today));
 assert.equal(d.summary.all_seconds,900);
});
