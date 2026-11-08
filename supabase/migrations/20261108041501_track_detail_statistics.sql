-- Read-only subject insights, based on actual allocated study dates.
create function public.track_detail_statistics(
 p_track_id uuid,p_from date default null,p_to date default null,
 p_page integer default 1,p_all_history boolean default false
) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare
 v_uid uuid:=auth.uid();v_zone text;v_today date;v_from date;v_to date;v_week date;v_month date;
 v_all bigint;v_sessions bigint;v_legacy_count bigint;v_legacy_seconds bigint;
 v_today_seconds bigint;v_week_seconds bigint;v_month_seconds bigint;v_days jsonb;v_history jsonb;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='42501';end if;
 if p_track_id is null or not exists(select 1 from public.tracks where id=p_track_id and user_id=v_uid) then
  raise exception 'track_unavailable' using errcode='42501';
 end if;
 select timezone into v_zone from public.profiles where id=v_uid;
 if v_zone is null then raise exception 'Missing profile' using errcode='42501';end if;
 v_today:=(pg_catalog.now()at time zone v_zone)::date;
 v_from:=coalesce(p_from,v_today-6);v_to:=coalesce(p_to,v_today);
 if v_to<v_from or v_to-v_from>30 or v_from<'1900-01-01'::date or v_to>'9998-12-31'::date
  or p_page is null or p_page<1 or p_page>1000000 or p_all_history is null then
  raise exception 'invalid_track_detail_range' using errcode='22023';
 end if;
 v_week:=pg_catalog.date_trunc('week',v_today::timestamp)::date;
 v_month:=pg_catalog.date_trunc('month',v_today::timestamp)::date;
 select coalesce(sum(duration_seconds),0),count(*),
  count(*)filter(where allocation_status='legacy_unallocated'),
  coalesce(sum(duration_seconds)filter(where allocation_status='legacy_unallocated'),0)
 into v_all,v_sessions,v_legacy_count,v_legacy_seconds
 from public.study_sessions where user_id=v_uid and track_id=p_track_id and mode in('focus','lockin');
 select coalesce(sum(a.study_seconds)filter(where a.local_date=v_today),0),
  coalesce(sum(a.study_seconds)filter(where a.local_date between v_week and v_today),0),
  coalesce(sum(a.study_seconds)filter(where a.local_date between v_month and v_today),0)
 into v_today_seconds,v_week_seconds,v_month_seconds
 from public.session_day_allocations a join public.study_sessions s on s.id=a.session_id and s.user_id=v_uid
 where a.user_id=v_uid and s.track_id=p_track_id and s.mode in('focus','lockin')
  and a.local_date between least(v_week,v_month)and v_today;
 with daily as(
  select a.local_date,sum(a.study_seconds)::bigint seconds
  from public.session_day_allocations a join public.study_sessions s on s.id=a.session_id and s.user_id=v_uid
  where a.user_id=v_uid and s.track_id=p_track_id and s.mode in('focus','lockin')
   and a.local_date between v_from and v_to group by a.local_date
 ), dates as(select v_from+n as day from generate_series(0,v_to-v_from)n)
 select jsonb_agg(jsonb_build_object('date',d.day,'study_seconds',coalesce(x.seconds,0),'break_seconds',0)order by d.day)
 into v_days from dates d left join daily x on x.local_date=d.day;
 with eligible as materialized(
  select s.id,s.mode,s.duration_seconds,s.recap,s.started_at,s.ended_at,s.timezone,s.allocation_status,
   coalesce(sum(a.study_seconds)filter(where a.local_date between v_from and v_to),0)::bigint range_seconds,
   min(a.local_date)first_date,max(a.local_date)last_date,
   min(a.local_date)filter(where a.local_date between v_from and v_to)range_first_date,
   max(a.local_date)filter(where a.local_date between v_from and v_to)range_last_date
  from public.study_sessions s left join public.session_day_allocations a on a.session_id=s.id and a.user_id=v_uid
  where s.user_id=v_uid and s.track_id=p_track_id and s.mode in('focus','lockin')
  group by s.id
  having p_all_history or coalesce(sum(a.study_seconds)filter(where a.local_date between v_from and v_to),0)>0
 ), total as(select count(*)n from eligible), meta as(
  select n,greatest(1,ceil(n::numeric/12))::integer pages,
   least(p_page,greatest(1,ceil(n::numeric/12))::integer)page from total
 ), records as(
  select e.* from eligible e
  order by case when not p_all_history then range_last_date end desc nulls last,ended_at desc,id desc
  limit 12 offset(select(page-1)*12 from meta)
 )
 select jsonb_build_object('page',m.page,'pages',m.pages,'total',m.n,'all',p_all_history,
  'sessions',coalesce((select jsonb_agg(to_jsonb(r)order by case when not p_all_history then r.range_last_date end desc nulls last,r.ended_at desc,r.id desc)from records r),'[]'::jsonb))
 into v_history from meta m;
 return jsonb_build_object('today',v_today,'timezone',v_zone,'from',v_from,'to',v_to,'days',v_days,
  'summary',jsonb_build_object('all_seconds',v_all,'session_count',v_sessions,'today_seconds',v_today_seconds,
   'week_seconds',v_week_seconds,'month_seconds',v_month_seconds,'week_from',v_week,'month_from',v_month,
   'legacy_count',v_legacy_count,'legacy_seconds',v_legacy_seconds),'history',v_history);
end;
$$;
revoke all on function public.track_detail_statistics(uuid,date,date,integer,boolean) from public,anon,authenticated,service_role;
grant execute on function public.track_detail_statistics(uuid,date,date,integer,boolean) to authenticated;
