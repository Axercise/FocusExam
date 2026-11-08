-- Supabase integration smoke checks. All fixture rows are rolled back.
begin;
set local statement_timeout='15s';
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
do $$
declare
 v_owner uuid:=gen_random_uuid();v_other uuid:=gen_random_uuid();v_run uuid;v_now timestamptz:=clock_timestamp();
 v_today date:=(clock_timestamp() at time zone 'UTC')::date;v_start timestamptz;v_status jsonb;v_denied boolean:=false;v_ms bigint;
begin
 insert into auth.users(id,raw_user_meta_data) values(v_owner,'{"full_name":"Streak rollback QA"}'),(v_other,'{"full_name":"Streak rollback QA other"}');
 update public.profiles set timezone='UTC' where id in(v_owner,v_other);
 v_start:=v_today::timestamp at time zone 'UTC';
 insert into public.timer_runs(user_id,client_id,mode,status,accumulated_ms,started_at,ended_at)
 values(v_owner,gen_random_uuid(),'lockin','discarded',599999,v_start,v_start+interval '599999 milliseconds')returning id into v_run;
 insert into public.timer_run_segments(run_id,user_id,started_at,ended_at,credited_ms)values(v_run,v_owner,v_start,v_start+interval '599999 milliseconds',599999);
 perform set_config('request.jwt.claim.sub',v_owner::text,true);
 execute 'set local role authenticated';
 v_status:=public.study_streak_status(false);
 assert not(v_status->>'qualified')::boolean,'599999ms must not qualify';
 assert (v_status->>'current_streak')::integer=0,'Unexpected initial streak';
 execute 'reset role';
 insert into public.timer_runs(user_id,client_id,mode,status,accumulated_ms,started_at,ended_at)
 values(v_owner,gen_random_uuid(),'lockin','discarded',1,v_start+interval '601 seconds',v_start+interval '601.001 seconds')returning id into v_run;
 insert into public.timer_run_segments(run_id,user_id,started_at,ended_at,credited_ms)values(v_run,v_owner,v_start+interval '601 seconds',v_start+interval '601.001 seconds',1);
 -- Yesterday's earned date must be included before today's reward is inserted.
 v_start:=(v_today-1)::timestamp at time zone 'UTC';
 insert into public.timer_runs(user_id,client_id,mode,status,accumulated_ms,started_at,ended_at)
 values(v_owner,gen_random_uuid(),'lockin','discarded',600000,v_start,v_start+interval '10 minutes')returning id into v_run;
 insert into public.timer_run_segments(run_id,user_id,started_at,ended_at,credited_ms)values(v_run,v_owner,v_start,v_start+interval '10 minutes',600000);
 execute 'set local role authenticated';
 v_status:=public.study_streak_status(false);
 assert (v_status->>'qualified')::boolean,'600000ms across rounds must qualify';
 assert (v_status->>'current_streak')::integer=2,'Yesterday and today must yield two days';
 assert (v_status->>'pending_notice')::boolean,'Read must preserve notice';
 assert v_status->'notice'='null'::jsonb,'Read must not claim notice';
 v_status:=public.study_streak_status(true);
 assert (v_status->'notice'->>'previous')::integer=1 and (v_status->'notice'->>'current')::integer=2,'Wrong notification transition';
 assert public.study_streak_status(true)->'notice'='null'::jsonb,'Repeated claim returned a duplicate';
 assert (select count(*)=2 from public.study_streak_days where user_id=v_owner),'Award row duplicated';
 begin
  insert into public.study_streak_days(user_id,local_date,achieved_at,previous_streak,new_streak)values(v_owner,v_today+1,v_now,2,3);
 exception when insufficient_privilege then v_denied:=true;
 end;
 assert v_denied,'Client was allowed to forge earned day';
 perform set_config('request.jwt.claim.sub',v_other::text,true);
 assert (select count(*)=0 from public.study_streak_days),'Owner isolation failed';
 assert (public.study_streak_status(true)->>'current_streak')::integer=0,'Other owner inherited a streak';
 execute 'reset role';
 perform set_config('request.jwt.claim.sub','',true);
 -- A running round qualifies without creating a saved session.
 insert into public.timer_runs(user_id,client_id,mode,status,started_at,resumed_at)
 values(v_other,gen_random_uuid(),'lockin','running',v_now-interval '610 seconds',v_now-interval '610 seconds')returning id into v_run;
 select sum(study_ms) into v_ms from private.study_streak_totals(v_other,v_now);
 assert v_ms=610000,'Running Lock in did not use server elapsed time';
 assert (select count(*)=0 from public.study_sessions where user_id=v_other),'Unexpected saved session';
 assert not has_function_privilege('anon','public.study_streak_status(boolean)','execute'),'Anonymous RPC access is enabled';
 assert not has_function_privilege('authenticated','private.study_streak_totals(uuid,timestamp with time zone)','execute'),'Private calculator is exposed';
end;
$$;
rollback;
select 'passed: hosted threshold, aggregation, consecutive days, one-time claim, RLS, write denial, running Lock in and permissions; fixtures rolled back' as verification;
