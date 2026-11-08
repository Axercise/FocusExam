-- Run with trusted database administration; fixtures are rolled back.
begin;
set local statement_timeout='15s';
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
do $$
declare
 u uuid:=gen_random_uuid();other_user uuid:=gen_random_uuid();subject uuid:=gen_random_uuid();other_subject uuid:=gen_random_uuid();
 run_id uuid:=gen_random_uuid();client uuid:=gen_random_uuid();d jsonb;blocked boolean:=false;
begin
 insert into auth.users(id,raw_user_meta_data)values(u,'{"full_name":"Track rollback QA"}'),(other_user,'{"full_name":"Track other rollback QA"}');
 update public.profiles set timezone='UTC'where id in(u,other_user);
 insert into public.tracks(id,user_id,name)values(subject,u,'Track rollback subject'),(other_subject,u,'Other subject');
 insert into public.timer_runs(id,user_id,client_id,mode,status,accumulated_ms,started_at,ended_at)
 values(run_id,u,client,'lockin','completed',600000,'2026-03-31T23:55:00Z','2026-04-01T00:05:00Z');
 insert into public.timer_run_segments(run_id,user_id,started_at,ended_at,credited_ms)
 values(run_id,u,'2026-03-31T23:55:00Z','2026-04-01T00:05:00Z',600000);
 perform set_config('request.jwt.claim.sub',u::text,true);
 execute 'set local role authenticated';
 perform public.timer_command(client,'save',null,null,subject,'Cross-month Recap');
 d:=public.track_detail_statistics(subject,'2026-03-31','2026-03-31',1,false);
 assert(d->'summary'->>'all_seconds')::bigint=600,'Wrong all-time total';
 assert(d->'history'->>'total')::integer=1,'Wrong session count';
 assert(d->'history'->'sessions'->0->>'range_seconds')::integer=300,'Saved date used instead of study date';
 assert(d->'history'->'sessions'->0->>'duration_seconds')::integer=600,'Full duration lost';
 assert d->'history'->'sessions'->0->>'recap'='Cross-month Recap','Recap lost';
 d:=public.track_detail_statistics(subject,'2026-03-31','2026-04-01',999,false);
 assert(d->'history'->>'total')::integer=1,'One session duplicated across two days';
 assert(d->'history'->>'page')::integer=1,'Pagination not clamped';
 d:=public.track_detail_statistics(other_subject,'2026-03-31','2026-04-01',1,true);
 assert(d->'summary'->>'all_seconds')::integer=0,'Other subject time leaked';
 execute 'reset role';
 update public.tracks set archived_at=now()where id=subject;
 execute 'set local role authenticated';
 assert(public.track_detail_statistics(subject,'2026-04-01','2026-04-01')->'history'->>'total')::integer=1,'Archived history hidden';
 execute 'reset role';
 update public.user_roles set role='admin'where user_id=other_user;
 perform set_config('request.jwt.claim.sub',other_user::text,true);
 execute 'set local role authenticated';
 begin perform public.track_detail_statistics(subject);exception when insufficient_privilege then blocked:=true;end;
 assert blocked,'Foreign Track exposed through admin log permission';
 assert not has_function_privilege('anon','public.track_detail_statistics(uuid,date,date,integer,boolean)','execute'),'Anonymous RPC enabled';
 execute 'reset role';
end;
$$;
rollback;
select 'passed: owner-only Track RPC, actual-date allocation, no duplicate sessions, recap, archive, pagination and grants; fixtures rolled back' as verification;
