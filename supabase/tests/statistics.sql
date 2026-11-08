-- Trusted, isolated fixtures; every row and helper is rolled back.
begin;
create function pg_temp.saved_fixture(p_user uuid,p_track uuid,p_starts timestamptz[],p_ends timestamptz[],p_mode text default 'lockin',p_legacy boolean default false)
returns uuid language plpgsql as $$
declare r uuid; s uuid; ms bigint:=0; i integer;
begin
 for i in 1..array_length(p_starts,1) loop ms:=ms+trunc(extract(epoch from p_ends[i]-p_starts[i])*1000)::bigint; end loop;
 insert into public.timer_runs(user_id,client_id,mode,duration_seconds,status,started_at,ended_at,accumulated_ms)
 values(p_user,gen_random_uuid(),p_mode,case when p_mode='break' then 10800 else null end,'completed',p_starts[1],p_ends[array_length(p_ends,1)],ms) returning id into r;
 if p_legacy then update public.timer_runs set segments_complete=false where id=r;
 else
  for i in 1..array_length(p_starts,1) loop
   insert into public.timer_run_segments(run_id,user_id,started_at,ended_at,credited_ms)
    values(r,p_user,p_starts[i],p_ends[i],trunc(extract(epoch from p_ends[i]-p_starts[i])*1000)::bigint);
  end loop;
 end if;
 insert into public.study_sessions(user_id,run_id,track_id,mode,duration_seconds,started_at,ended_at)
 values(p_user,r,case when p_mode='break' then null else p_track end,p_mode,ms/1000,p_starts[1],p_ends[array_length(p_ends,1)]) returning id into s;
 update public.timer_runs set status='saved' where id=r;
 return s;
end;
$$;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();ad uuid:=gen_random_uuid();t uuid;tb uuid;s uuid;out1 jsonb;out2 jsonb;cl uuid:=gen_random_uuid();today date:=(now() at time zone 'Asia/Bangkok')::date;
begin
 insert into auth.users(id,aud,role,email,raw_user_meta_data) values
 (a,'authenticated','authenticated',a||'@example.invalid','{}'),
 (b,'authenticated','authenticated',b||'@example.invalid','{}'),
 (ad,'authenticated','authenticated',ad||'@example.invalid','{}');
 update public.user_roles set role='admin' where user_id=ad;
 insert into public.tracks(user_id,name) values(a,'Precise A') returning id into t;
 insert into public.tracks(user_id,name) values(b,'Private B') returning id into tb;
 -- Paused midnight: 50 minutes before, 50 after, 20 uncredited minutes.
 s:=pg_temp.saved_fixture(a,t,array['2026-01-31 23:00+07','2026-02-01 00:10+07']::timestamptz[],array['2026-01-31 23:50+07','2026-02-01 01:00+07']::timestamptz[]);
 if (select study_seconds from public.session_day_allocations where session_id=s and local_date='2026-01-31')<>3000
 or (select study_seconds from public.session_day_allocations where session_id=s and local_date='2026-02-01')<>3000 then raise exception 'Paused midnight allocation';end if;
 -- Year boundary and eight-hour Lock in.
 s:=pg_temp.saved_fixture(a,t,array['2025-12-31 20:00+07']::timestamptz[],array['2026-01-01 04:00+07']::timestamptz[]);
 if (select sum(study_seconds) from public.session_day_allocations where session_id=s)<>28800
 or (select count(*) from public.session_day_allocations where session_id=s)<>2 then raise exception '8h year boundary';end if;
 -- Fractional seconds carry across days: .6 + .6 = one whole credited second.
 s:=pg_temp.saved_fixture(a,t,array['2026-02-28 23:59:59.4+07','2026-03-01 00:10+07']::timestamptz[],array['2026-03-01 00:00+07','2026-03-01 00:10:00.6+07']::timestamptz[]);
 if (select sum(study_seconds) from public.session_day_allocations where session_id=s)<>1
 or exists(select 1 from public.session_day_allocations where session_id=s and local_date='2026-02-28') then raise exception 'Fractional conservation';end if;
 -- DST calendar days must be 23 and 25 hours, not assumed 24.
 update public.profiles set timezone='America/New_York' where id=a;
 s:=pg_temp.saved_fixture(a,t,array['2026-03-08 00:00 America/New_York']::timestamptz[],array['2026-03-09 00:00 America/New_York']::timestamptz[]);
 if (select study_seconds from public.session_day_allocations where session_id=s)<>82800 then raise exception 'DST spring';end if;
 s:=pg_temp.saved_fixture(a,t,array['2026-11-01 00:00 America/New_York']::timestamptz[],array['2026-11-02 00:00 America/New_York']::timestamptz[]);
 if (select study_seconds from public.session_day_allocations where session_id=s)<>90000 then raise exception 'DST fall';end if;
 update public.profiles set timezone='Asia/Bangkok' where id=a;
 if (select timezone from public.study_sessions where id=s)<>'America/New_York' then raise exception 'Timezone changed historical session';end if;
 -- Legacy time remains in totals with no guessed calendar allocation.
 s:=pg_temp.saved_fixture(a,t,array['2026-01-02 09:00+07']::timestamptz[],array['2026-01-02 10:00+07']::timestamptz[],'lockin',true);
 if exists(select 1 from public.session_day_allocations where session_id=s) then raise exception 'Guessed legacy allocation';end if;
 -- Three consecutive real study days; breaks today do not extend them.
 perform pg_temp.saved_fixture(a,t,array[((today-2)::text||' 08:00+07')::timestamptz],array[((today-2)::text||' 08:01+07')::timestamptz]);
 perform pg_temp.saved_fixture(a,t,array[((today-1)::text||' 08:00+07')::timestamptz],array[((today-1)::text||' 08:01+07')::timestamptz]);
 perform pg_temp.saved_fixture(a,t,array[(today::text||' 08:00+07')::timestamptz],array[(today::text||' 08:01+07')::timestamptz],'break');
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 out1:=public.study_statistics('2026-01-01','2026-01-31');
 if jsonb_array_length(out1->'days')<>31 or (out1->>'current_streak')::integer<>2 or (out1->>'unallocated_sessions')::integer<>1 then raise exception 'Monthly/streak/legacy summary: %',out1;end if;
 begin perform public.study_statistics('2026-01-01','2026-02-01');raise exception 'Range guard missing';
 exception when invalid_parameter_value then null;end;
 begin perform public.study_statistics(p_track_id=>tb);raise exception 'Foreign Track allowed';
 exception when invalid_parameter_value then null;end;
 begin insert into public.session_day_allocations(session_id,user_id,local_date,study_seconds) values(s,a,today,99);raise exception 'Direct allocation edit';
 exception when insufficient_privilege then null;end;
 begin delete from public.timer_run_segments where user_id=a;raise exception 'Direct segment delete';
 exception when insufficient_privilege then null;end;
 -- Exercise real timer transitions and idempotent save, without editing clock source.
 out1:=public.timer_command(cl,'start','lockin');
 execute 'reset role';
 update public.profiles set timezone='America/New_York' where id=a;
 execute 'set local role authenticated';
 perform pg_sleep(1.05);
 out1:=public.timer_command(cl,'pause');
 out1:=public.timer_command(cl,'resume');
 out1:=public.timer_command(cl,'finish');
 out1:=public.timer_command(cl,'save',p_track_id=>t);
 out2:=public.timer_command(cl,'save',p_track_id=>t);
 if out1->>'saved_session_id'<>out2->>'saved_session_id' then raise exception 'Duplicate save';end if;
 if (select count(*) from public.timer_run_segments where run_id=(out1->>'id')::uuid)<>2 then raise exception 'Missing pause/resume segments';end if;
 if (select sum(study_seconds) from public.session_day_allocations where session_id=(out1->>'saved_session_id')::uuid)<>1 then raise exception 'Live allocation';end if;
 if (select timezone from public.study_sessions where id=(out1->>'saved_session_id')::uuid)<>'Asia/Bangkok' then raise exception 'Timezone was not captured at start';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 if exists(select 1 from public.session_day_allocations where user_id=a) or exists(select 1 from public.timer_run_segments where user_id=a) then raise exception 'Cross-user timeline read';end if;
 out1:=public.study_statistics();if (out1->>'current_streak')::integer<>0 then raise exception 'Cross-user statistics';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ad,'role','authenticated')::text,true);
 if not exists(select 1 from public.session_day_allocations where user_id=a) then raise exception 'Admin logs unavailable';end if;
 begin update public.session_day_allocations set study_seconds=999 where user_id=a;raise exception 'Admin logs writable';
 exception when insufficient_privilege then null;end;
 execute 'set local role anon';perform set_config('request.jwt.claims','{}',true);
 begin perform public.study_statistics();raise exception 'Anonymous statistics call';
 exception when insufficient_privilege then null;end;
 execute 'reset role';
end;
$$;
rollback;
select 'PASS: midnight, pauses, month/year, fractional seconds, DST, legacy, live save, streak, RLS' as result;

