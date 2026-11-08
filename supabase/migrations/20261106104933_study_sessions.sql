create table public.timer_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null,
  mode text not null check (mode in ('focus','break','lockin')),
  duration_seconds integer,
  status text not null default 'running' check (status in ('running','paused','completed','saved','discarded')),
  accumulated_ms bigint not null default 0 check (accumulated_ms >= 0),
  started_at timestamptz not null default clock_timestamp(),
  resumed_at timestamptz,
  ended_at timestamptz,
  updated_at timestamptz not null default clock_timestamp(),
  unique(user_id,client_id),
  check ((mode='lockin' and duration_seconds is null) or
    (mode<>'lockin' and duration_seconds between 1 and 10800)),
  check ((status='running') = (resumed_at is not null)),
  check ((status in ('completed','saved','discarded')) = (ended_at is not null))
);
create unique index timer_runs_one_pending_per_owner on public.timer_runs(user_id)
  where status in ('running','paused','completed');

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  run_id uuid not null unique references public.timer_runs(id) on delete cascade,
  track_id uuid references public.tracks(id) deferrable initially deferred,
  mode text not null check (mode in ('focus','break','lockin')),
  duration_seconds bigint not null check (duration_seconds >= 1),
  recap text not null default '' check (char_length(recap) <= 2000),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  recorded_at timestamptz not null default clock_timestamp(),
  check ((mode='break' and track_id is null) or (mode<>'break' and track_id is not null)),
  check (ended_at >= started_at and duration_seconds <= floor(extract(epoch from ended_at-started_at)))
);
create index study_sessions_owner_ended_idx on public.study_sessions(user_id,ended_at desc,id desc);
create index study_sessions_track_owner_idx on public.study_sessions(track_id,user_id);

alter table public.timer_runs enable row level security;
alter table public.study_sessions enable row level security;
revoke all on public.timer_runs,public.study_sessions from public,anon,authenticated;
grant select on public.timer_runs,public.study_sessions to authenticated;
grant all on public.timer_runs,public.study_sessions to service_role;
create policy timer_runs_read on public.timer_runs for select to authenticated
using ((select auth.uid())=user_id or (select private.has_permission('study_logs.read')));
create policy study_sessions_read on public.study_sessions for select to authenticated
using ((select auth.uid())=user_id or (select private.has_permission('study_logs.read')));

-- Only this private implementation can change timing or credited study data.
-- Its public invoker wrapper below never accepts elapsed time or a user ID.
create function private.timer_command(
  p_client_id uuid,p_operation text,p_mode text default null,p_duration_seconds integer default null,
  p_track_id uuid default null,p_recap text default ''
) returns jsonb language plpgsql security definer set search_path=''
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz;
  v_run public.timer_runs%rowtype;
  v_elapsed bigint;
  v_saved uuid;
  v_track_name text;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_client_id is null or p_operation is null or p_operation not in
    ('start','pause','resume','finish','discard','sync','save') then
    raise exception 'invalid_timer_command' using errcode='22023';
  end if;
  -- Per-owner transaction lock serializes starts, saves and retries, including
  -- the first insert where no row exists to lock. No external I/O while locked.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('focusexam-timer:'||v_uid::text,0));
  v_now := pg_catalog.clock_timestamp();
  select * into v_run from public.timer_runs where user_id=v_uid and client_id=p_client_id for update;
  if not found and p_operation='start' then
    select * into v_run from public.timer_runs where user_id=v_uid
      and status in ('running','paused','completed') for update;
    if not found then
      if p_mode is null or p_mode not in ('focus','break','lockin') or
        (p_mode<>'lockin' and (p_duration_seconds is null or p_duration_seconds not between 1 and 10800)) then
        raise exception 'invalid_timer_duration' using errcode='22023';
      end if;
      insert into public.timer_runs(user_id,client_id,mode,duration_seconds,started_at,resumed_at,updated_at)
      values(v_uid,p_client_id,p_mode,case when p_mode='lockin' then null else p_duration_seconds end,v_now,v_now,v_now)
      returning * into v_run;
    end if;
  elsif not found then
    raise exception 'timer_not_found' using errcode='P0001';
  end if;

  v_elapsed := v_run.accumulated_ms;
  if v_run.status='running' then
    v_elapsed := v_elapsed+greatest(0,trunc(extract(epoch from v_now-v_run.resumed_at)*1000)::bigint);
    if v_run.duration_seconds is not null and v_elapsed>=v_run.duration_seconds::bigint*1000 then
      update public.timer_runs set status='completed',accumulated_ms=duration_seconds::bigint*1000,
        ended_at=resumed_at+pg_catalog.make_interval(secs=>(duration_seconds::bigint*1000-accumulated_ms)::double precision/1000),
        resumed_at=null,updated_at=v_now where id=v_run.id returning * into v_run;
      v_elapsed := v_run.accumulated_ms;
    end if;
  end if;

  if p_operation='pause' and v_run.status='running' then
    update public.timer_runs set status='paused',accumulated_ms=v_elapsed,resumed_at=null,updated_at=v_now
      where id=v_run.id returning * into v_run;
  elsif p_operation='resume' and v_run.status='paused' then
    update public.timer_runs set status='running',resumed_at=v_now,updated_at=v_now
      where id=v_run.id returning * into v_run;
  elsif p_operation='finish' and v_run.status in ('running','paused') then
    if v_elapsed<1000 then raise exception 'timer_too_short' using errcode='P0001'; end if;
    update public.timer_runs set status='completed',accumulated_ms=v_elapsed,resumed_at=null,
      ended_at=v_now,updated_at=v_now where id=v_run.id returning * into v_run;
  elsif p_operation='discard' and v_run.status in ('running','paused','completed') then
    update public.timer_runs set status='discarded',accumulated_ms=v_elapsed,resumed_at=null,
      ended_at=coalesce(ended_at,v_now),updated_at=v_now where id=v_run.id returning * into v_run;
  elsif p_operation='save' then
    if v_run.status not in ('completed','saved') then raise exception 'timer_not_completed' using errcode='P0001'; end if;
    if v_run.status='completed' then
      if v_run.accumulated_ms<1000 then raise exception 'timer_too_short' using errcode='P0001'; end if;
      if p_recap is null or char_length(p_recap)>2000 then raise exception 'invalid_recap' using errcode='22023'; end if;
      if v_run.mode<>'break' then
        perform 1 from public.tracks where id=p_track_id and user_id=v_uid and archived_at is null for share;
        if not found then raise exception 'track_unavailable' using errcode='P0001'; end if;
      end if;
      insert into public.study_sessions(user_id,run_id,track_id,mode,duration_seconds,recap,started_at,ended_at)
      values(v_uid,v_run.id,case when v_run.mode='break' then null else p_track_id end,
        v_run.mode,v_run.accumulated_ms/1000,btrim(p_recap),v_run.started_at,v_run.ended_at);
      update public.timer_runs set status='saved',updated_at=v_now where id=v_run.id returning * into v_run;
    end if;
  end if;
  select s.id,t.name into v_saved,v_track_name from public.study_sessions s
    left join public.tracks t on t.id=s.track_id where s.run_id=v_run.id and s.user_id=v_uid;
  return jsonb_build_object('id',v_run.id,'client_id',v_run.client_id,'mode',v_run.mode,
    'duration_seconds',v_run.duration_seconds,'status',v_run.status,
    'elapsed_ms',v_elapsed,'started_at',v_run.started_at,'ended_at',v_run.ended_at,
    'server_now',v_now,'saved_session_id',v_saved,'saved_track_name',v_track_name);
end;
$$;
revoke all on function private.timer_command(uuid,text,text,integer,uuid,text) from public,anon,authenticated,service_role;
grant execute on function private.timer_command(uuid,text,text,integer,uuid,text) to authenticated;
create function public.timer_command(
  p_client_id uuid,p_operation text,p_mode text default null,p_duration_seconds integer default null,
  p_track_id uuid default null,p_recap text default ''
) returns jsonb language sql security invoker set search_path=''
as $$ select private.timer_command(p_client_id,p_operation,p_mode,p_duration_seconds,p_track_id,p_recap); $$;
revoke all on function public.timer_command(uuid,text,text,integer,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.timer_command(uuid,text,text,integer,uuid,text) to authenticated;

create function public.track_study_totals(p_track_ids uuid[])
returns table(track_id uuid,total_seconds bigint) language sql stable security invoker set search_path=''
as $$
  select s.track_id,sum(s.duration_seconds)::bigint from public.study_sessions s
  where s.user_id=(select auth.uid()) and s.track_id=any(p_track_ids) group by s.track_id;
$$;
revoke all on function public.track_study_totals(uuid[]) from public,anon,authenticated,service_role;
grant execute on function public.track_study_totals(uuid[]) to authenticated;
