-- Real study earns a day independently of later Track save.
create table public.study_streak_days(
 user_id uuid not null references auth.users(id) on delete cascade,
 local_date date not null,
 id uuid not null default gen_random_uuid() unique,
 achieved_at timestamptz not null,
 previous_streak integer not null check(previous_streak>=0),
 new_streak integer not null check(new_streak=previous_streak+1),
 notified_at timestamptz,
 primary key(user_id,local_date)
);
alter table public.study_streak_days enable row level security;
revoke all on public.study_streak_days from public,anon,authenticated;
grant select on public.study_streak_days to authenticated;
grant all on public.study_streak_days to service_role;
create policy streak_days_read on public.study_streak_days for select to authenticated using((select auth.uid())=user_id);

-- Only internal definer code calls this owner-filtered interval calculation.
create function private.study_streak_totals(p_user uuid,p_now timestamptz)
returns table(local_date date,study_ms bigint,qualified_at timestamptz)
language sql stable security invoker set search_path='' as $$
 with raw as(
  select g.id,g.started_at,r.timezone,
   case when g.ended_at is not null then g.ended_at
    when r.status='running' then least(p_now,case when r.duration_seconds is null then p_now
     else r.resumed_at+pg_catalog.make_interval(secs=>greatest(0,r.duration_seconds::bigint*1000-r.accumulated_ms)::double precision/1000) end)
    else g.started_at end as stop_at,g.credited_ms
  from public.timer_run_segments g join public.timer_runs r on r.id=g.run_id
  where g.user_id=p_user and r.user_id=p_user and r.segments_complete and r.mode in('focus','lockin')
 ), segments as(
  select *,coalesce(credited_ms,greatest(0,trunc(extract(epoch from stop_at-started_at)*1000)::bigint)) as elapsed_ms from raw where stop_at>=started_at
 ), pieces as(
  select s.id,s.started_at,((s.started_at at time zone s.timezone)::date+d.n) as day,
   greatest(s.started_at,(((s.started_at at time zone s.timezone)::date+d.n)::timestamp at time zone s.timezone)) as piece_start,
   least(s.elapsed_ms,trunc(extract(epoch from least(s.stop_at,
    (((s.started_at at time zone s.timezone)::date+d.n+1)::timestamp at time zone s.timezone))-s.started_at)*1000)::bigint)
   -least(s.elapsed_ms,trunc(extract(epoch from greatest(s.started_at,
    (((s.started_at at time zone s.timezone)::date+d.n)::timestamp at time zone s.timezone))-s.started_at)*1000)::bigint) as ms
  from segments s cross join lateral generate_series(0,(s.stop_at at time zone s.timezone)::date-(s.started_at at time zone s.timezone)::date)d(n)
 ), cumulative as(
  select *,sum(ms) over(partition by day order by started_at,id rows unbounded preceding) total_ms from pieces where ms>0
 )
 select day,sum(ms)::bigint,min(piece_start+pg_catalog.make_interval(secs=>(600000-(total_ms-ms))::double precision/1000))
  filter(where total_ms>=600000 and total_ms-ms<600000) from cumulative group by day;
$$;
revoke all on function private.study_streak_totals(uuid,timestamptz) from public,anon,authenticated,service_role;

create function private.study_streak_status(p_claim_notice boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_uid uuid:=auth.uid();v_now timestamptz;v_zone text;v_today date;v_ms bigint;v_current integer;v_longest integer;
 v_day record;v_previous integer;v_notice jsonb;v_pending boolean;v_running boolean;v_next bigint;v_midnight bigint;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('focusexam-timer:'||v_uid::text,0));
 v_now:=clock_timestamp();select timezone into v_zone from public.profiles where id=v_uid;
 if v_zone is null then raise exception 'Missing streak profile' using errcode='42501';end if;
 v_today:=(v_now at time zone v_zone)::date;
 for v_day in select t.* from private.study_streak_totals(v_uid,v_now)t
  where t.study_ms>=600000 and not exists(select 1 from public.study_streak_days d where d.user_id=v_uid and d.local_date=t.local_date)
  order by t.local_date
 loop
  select count(*)::integer into v_previous from(
   select local_date,row_number() over(order by local_date desc)::integer n from public.study_streak_days where user_id=v_uid and local_date<v_day.local_date
  )x where v_day.local_date-x.local_date=x.n;
  insert into public.study_streak_days(user_id,local_date,achieved_at,previous_streak,new_streak,notified_at)
  values(v_uid,v_day.local_date,v_day.qualified_at,v_previous,v_previous+1,case when v_day.local_date=v_today then null else v_now end)
  on conflict(user_id,local_date)do nothing;
 end loop;
 if p_claim_notice then
  update public.study_streak_days set notified_at=v_now where user_id=v_uid and local_date=v_today and notified_at is null
  returning jsonb_build_object('id',id,'date',local_date,'previous',previous_streak,'current',new_streak) into v_notice;
 end if;
 select coalesce(t.study_ms,0) into v_ms from private.study_streak_totals(v_uid,v_now)t where t.local_date=v_today;
 v_ms:=coalesce(v_ms,0);
 with days as(
  select local_date,local_date-(row_number() over(order by local_date))::integer grp from public.study_streak_days where user_id=v_uid and local_date<=v_today
 ), streaks as(
  select count(*)::integer length,max(local_date) last_day from days group by grp
 )
 select coalesce(max(length) filter(where last_day in(v_today,v_today-1)),0),coalesce(max(length),0) into v_current,v_longest from streaks;
 select exists(select 1 from public.study_streak_days where user_id=v_uid and local_date=v_today and notified_at is null) into v_pending;
 select exists(select 1 from public.timer_runs r where r.user_id=v_uid and r.segments_complete and r.status='running' and r.mode in('focus','lockin')
  and (r.duration_seconds is null or r.resumed_at+pg_catalog.make_interval(secs=>greatest(0,r.duration_seconds::bigint*1000-r.accumulated_ms)::double precision/1000)>v_now)) into v_running;
 v_midnight:=greatest(250,ceil(extract(epoch from (((v_today+1)::timestamp at time zone v_zone)-v_now))*1000)::bigint+250);
 v_next:=case when not v_running then null when v_ms>=600000 then v_midnight else least(v_midnight,greatest(250,600000-v_ms+250)) end;
 return jsonb_build_object('today',v_today,'timezone',v_zone,'server_now',v_now,'study_seconds',v_ms/1000,
  'qualified',exists(select 1 from public.study_streak_days where user_id=v_uid and local_date=v_today),
  'current_streak',v_current,'longest_streak',v_longest,'pending_notice',v_pending,'notice',v_notice,'next_check_ms',v_next);
end;
$$;
revoke all on function private.study_streak_status(boolean) from public,anon,authenticated,service_role;
grant execute on function private.study_streak_status(boolean) to authenticated;
create function public.study_streak_status(p_claim_notice boolean default false)
returns jsonb language sql security invoker set search_path='' as $$select private.study_streak_status(p_claim_notice);$$;
revoke all on function public.study_streak_status(boolean) from public,anon,authenticated,service_role;
grant execute on function public.study_streak_status(boolean) to authenticated;

-- Backfill verified timelines; old dates are already acknowledged.
with eligible as(
 select u.id user_id,t.local_date,t.qualified_at,
  (clock_timestamp() at time zone p.timezone)::date today
 from auth.users u join public.profiles p on p.id=u.id
 cross join lateral private.study_streak_totals(u.id,clock_timestamp())t where t.study_ms>=600000
), islands as(
 select *,local_date-(row_number() over(partition by user_id order by local_date))::integer grp from eligible
), numbered as(
 select *,row_number() over(partition by user_id,grp order by local_date)::integer n from islands
)
insert into public.study_streak_days(user_id,local_date,achieved_at,previous_streak,new_streak,notified_at)
 select user_id,local_date,qualified_at,n-1,n,case when local_date=today then null else clock_timestamp()end from numbered;

create or replace function public.study_statistics(p_from date default null,p_to date default null,p_track_id uuid default null)
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
    select local_date from public.study_streak_days where user_id=v_uid and local_date<=v_today
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
