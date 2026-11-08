alter table public.timer_runs add column timezone text not null default 'Asia/Bangkok',
  add column segments_complete boolean not null default false;
alter table public.study_sessions add column timezone text not null default 'Asia/Bangkok',
  add column allocation_status text not null default 'legacy_unallocated'
    check(allocation_status in ('precise','legacy_unallocated'));

create table public.timer_run_segments (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.timer_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz,
  credited_ms bigint,
  check((ended_at is null)=(credited_ms is null)),
  check(ended_at is null or (ended_at>=started_at and credited_ms>=0
    and credited_ms=trunc(extract(epoch from ended_at-started_at)*1000)::bigint))
);
create index timer_segments_owner_run_idx on public.timer_run_segments(user_id,run_id,started_at);
create index timer_segments_run_idx on public.timer_run_segments(run_id);
create unique index timer_segments_one_open_idx on public.timer_run_segments(run_id) where ended_at is null;

create table public.session_day_allocations (
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  local_date date not null,
  study_seconds bigint not null default 0 check(study_seconds>=0),
  break_seconds bigint not null default 0 check(break_seconds>=0),
  primary key(session_id,local_date),
  check(study_seconds+break_seconds>0)
);
create index session_days_owner_date_idx on public.session_day_allocations(user_id,local_date);
alter table public.timer_run_segments enable row level security;
alter table public.session_day_allocations enable row level security;
revoke all on public.timer_run_segments,public.session_day_allocations from public,anon,authenticated;
grant select on public.timer_run_segments,public.session_day_allocations to authenticated;
grant all on public.timer_run_segments,public.session_day_allocations to service_role;
create policy timer_segments_read on public.timer_run_segments for select to authenticated
using((select auth.uid())=user_id or (select private.has_permission('study_logs.read')));
create policy session_days_read on public.session_day_allocations for select to authenticated
using((select auth.uid())=user_id or (select private.has_permission('study_logs.read')));

create function private.initialize_precise_run() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  select p.timezone into new.timezone from public.profiles p where p.id=new.user_id;
  if new.timezone is null then raise exception 'Missing timer profile' using errcode='22023'; end if;
  new.segments_complete:=true;
  return new;
end;
$$;
revoke all on function private.initialize_precise_run() from public,anon,authenticated,service_role;
create trigger initialize_precise_run before insert on public.timer_runs
for each row execute function private.initialize_precise_run();

create function private.capture_timer_segment() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v_end timestamptz; v_rows integer;
begin
  if not new.segments_complete then return new; end if;
  if tg_op='INSERT' then
    if new.status='running' then
      insert into public.timer_run_segments(run_id,user_id,started_at) values(new.id,new.user_id,new.resumed_at);
    end if;
  elsif old.status='running' and new.status<>'running' then
    v_end:=case when new.status in('completed','discarded') then new.ended_at else new.updated_at end;
    update public.timer_run_segments set ended_at=v_end,credited_ms=new.accumulated_ms-old.accumulated_ms
      where run_id=new.id and ended_at is null and user_id=new.user_id;
    get diagnostics v_rows=row_count;
    if v_rows<>1 then raise exception 'Missing active timer segment'; end if;
  elsif old.status='paused' and new.status='running' then
    insert into public.timer_run_segments(run_id,user_id,started_at) values(new.id,new.user_id,new.resumed_at);
  end if;
  return new;
end;
$$;
revoke all on function private.capture_timer_segment() from public,anon,authenticated,service_role;
create trigger capture_timer_segment after insert or update on public.timer_runs
for each row execute function private.capture_timer_segment();

create function private.prepare_session_allocation() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v_run public.timer_runs%rowtype;
begin
  select * into v_run from public.timer_runs where id=new.run_id and user_id=new.user_id;
  if not found or v_run.status not in('completed','saved') or new.mode<>v_run.mode
    or new.duration_seconds<>v_run.accumulated_ms/1000
    or new.started_at<>v_run.started_at or new.ended_at<>v_run.ended_at then
    raise exception 'Saved timer source mismatch';
  end if;
  new.timezone:=v_run.timezone;
  new.allocation_status:=case when v_run.segments_complete then 'precise' else 'legacy_unallocated' end;
  return new;
end;
$$;
revoke all on function private.prepare_session_allocation() from public,anon,authenticated,service_role;
create trigger prepare_session_allocation before insert on public.study_sessions
for each row execute function private.prepare_session_allocation();

create function private.allocate_session_days() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v_ms bigint; v_credited bigint;
begin
  if new.allocation_status<>'precise' then return new; end if;
  if exists(select 1 from public.timer_run_segments where run_id=new.run_id and ended_at is null)
    or exists(
      select 1 from (select started_at,lag(ended_at) over(order by started_at,id) previous_end
        from public.timer_run_segments where run_id=new.run_id) x where x.started_at<x.previous_end
    ) then raise exception 'Incomplete or overlapping timer timeline'; end if;
  select coalesce(sum(credited_ms),0) into v_ms from public.timer_run_segments
    where run_id=new.run_id and user_id=new.user_id;
  if v_ms/1000<>new.duration_seconds then raise exception 'Timer timeline total mismatch'; end if;
  with pieces as (
    select g.id,g.started_at,((g.started_at at time zone new.timezone)::date+d.n) as local_date,
      least(g.credited_ms,trunc(extract(epoch from least(g.ended_at,
        (((g.started_at at time zone new.timezone)::date+d.n+1)::timestamp at time zone new.timezone))-g.started_at)*1000)::bigint)
      -least(g.credited_ms,trunc(extract(epoch from greatest(g.started_at,
        (((g.started_at at time zone new.timezone)::date+d.n)::timestamp at time zone new.timezone))-g.started_at)*1000)::bigint) as piece_ms
    from public.timer_run_segments g cross join lateral generate_series(0,
      (g.ended_at at time zone new.timezone)::date-(g.started_at at time zone new.timezone)::date) d(n)
    where g.run_id=new.run_id and g.user_id=new.user_id and g.ended_at is not null
  ), cumulative as (
    select *,sum(piece_ms) over(order by started_at,id,local_date rows unbounded preceding) as active_ms
    from pieces
  ), credited as (
    select local_date,floor(active_ms/1000)-floor((active_ms-piece_ms)/1000) as seconds from cumulative
  )
  insert into public.session_day_allocations(session_id,user_id,local_date,study_seconds,break_seconds)
    select new.id,new.user_id,local_date,
      case when new.mode='break' then 0 else sum(seconds)::bigint end,
      case when new.mode='break' then sum(seconds)::bigint else 0 end
    from credited group by local_date having sum(seconds)>0;
  select coalesce(sum(study_seconds+break_seconds),0) into v_credited from public.session_day_allocations where session_id=new.id;
  if v_credited<>new.duration_seconds then raise exception 'Daily allocation conservation failed'; end if;
  return new;
end;
$$;
revoke all on function private.allocate_session_days() from public,anon,authenticated,service_role;
create trigger allocate_session_days after insert on public.study_sessions
for each row execute function private.allocate_session_days();

create function public.study_statistics(p_from date default null,p_to date default null,p_track_id uuid default null)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
  v_uid uuid:=auth.uid(); v_timezone text; v_today date; v_from date; v_to date;
  v_days jsonb; v_current integer; v_longest integer; v_last date;
  v_legacy_count bigint; v_legacy_seconds bigint; v_today_study bigint; v_today_break bigint;
begin
  if v_uid is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select timezone into v_timezone from public.profiles where id=v_uid;
  v_today:=(pg_catalog.now() at time zone v_timezone)::date;
  v_from:=coalesce(p_from,v_today-6);v_to:=coalesce(p_to,v_today);
  if v_to<v_from or v_to-v_from>30 then raise exception 'invalid_statistics_range' using errcode='22023'; end if;
  if p_track_id is not null and not exists(select 1 from public.tracks where id=p_track_id and user_id=v_uid) then
    raise exception 'invalid_statistics_track' using errcode='22023';
  end if;
  with daily as (
    select a.local_date,sum(case when p_track_id is null or s.track_id=p_track_id then a.study_seconds else 0 end)::bigint study,
      sum(a.break_seconds)::bigint rest
    from public.session_day_allocations a join public.study_sessions s on s.id=a.session_id
    where a.user_id=v_uid and a.local_date between v_from and v_to group by a.local_date
  ), dates as (select v_from+n as day from generate_series(0,v_to-v_from)n)
  select jsonb_agg(jsonb_build_object('date',d.day,'study_seconds',coalesce(x.study,0),'break_seconds',coalesce(x.rest,0)) order by d.day)
    into v_days from dates d left join daily x on x.local_date=d.day;
  with days as (
    select local_date from public.session_day_allocations where user_id=v_uid and study_seconds>0 group by local_date
  ), islands as (
    select local_date,local_date-(row_number() over(order by local_date))::integer as grp from days
  ), streaks as (
    select count(*)::integer length,max(local_date) last_day from islands group by grp
  )
  select coalesce(max(length) filter(where last_day in(v_today,v_today-1)),0),coalesce(max(length),0),max(last_day)
    into v_current,v_longest,v_last from streaks;
  select count(*),coalesce(sum(duration_seconds),0) into v_legacy_count,v_legacy_seconds
    from public.study_sessions where user_id=v_uid and allocation_status='legacy_unallocated'
      and (p_track_id is null or track_id=p_track_id or mode='break');
  select coalesce(sum(study_seconds),0),coalesce(sum(break_seconds),0) into v_today_study,v_today_break
    from public.session_day_allocations where user_id=v_uid and local_date=v_today;
  return jsonb_build_object('timezone',v_timezone,'today',v_today,'from',v_from,'to',v_to,'days',v_days,
    'current_streak',v_current,'longest_streak',v_longest,'last_study_date',v_last,
    'today_study_seconds',v_today_study,'today_break_seconds',v_today_break,
    'unallocated_sessions',v_legacy_count,'unallocated_seconds',v_legacy_seconds);
end;
$$;
revoke all on function public.study_statistics(date,date,uuid) from public,anon,authenticated,service_role;
grant execute on function public.study_statistics(date,date,uuid) to authenticated;
