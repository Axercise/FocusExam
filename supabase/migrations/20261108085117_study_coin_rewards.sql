-- Reward writes occur only when an immutable, server-validated study session is saved.
-- Serialize migration/backfill with session inserts; existing timer reads continue normally.
lock table public.study_sessions in share row exclusive mode;
create table public.daily_quest_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 local_date date not null,
 study_seconds bigint not null check(study_seconds>=0),
 primary key(user_id,local_date)
);
create table public.track_reward_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 track_id uuid not null references public.tracks(id) on delete cascade,
 study_seconds bigint not null check(study_seconds>=0),
 primary key(user_id,track_id)
);
create index track_reward_progress_track_idx on public.track_reward_progress(track_id);
alter table public.daily_quest_progress enable row level security;
alter table public.track_reward_progress enable row level security;
revoke all on public.daily_quest_progress,public.track_reward_progress from public,anon,authenticated;
grant select on public.daily_quest_progress,public.track_reward_progress to authenticated;
grant all on public.daily_quest_progress,public.track_reward_progress to service_role;
create policy daily_quest_read_own on public.daily_quest_progress for select to authenticated using((select auth.uid())=user_id);
create policy track_reward_read_own on public.track_reward_progress for select to authenticated using((select auth.uid())=user_id);

-- Preserve real saved progress: precise day allocations for quests, saved Track totals for milestones.
insert into public.daily_quest_progress(user_id,local_date,study_seconds)
 select a.user_id,a.local_date,sum(a.study_seconds) from public.session_day_allocations a
 join public.study_sessions s on s.id=a.session_id and s.user_id=a.user_id
 where s.mode in ('focus','lockin') and a.study_seconds>0 group by a.user_id,a.local_date;
insert into public.coin_ledger(user_id,source_key,amount)
 select p.user_id,'daily:'||p.local_date::text||':'||q.minutes::text,q.coins
 from public.daily_quest_progress p cross join (values(10,600,5),(30,1800,10),(60,3600,20),(120,7200,30))q(minutes,seconds,coins)
 where p.study_seconds>=q.seconds on conflict(user_id,source_key) do nothing;
insert into public.track_reward_progress(user_id,track_id,study_seconds)
 select user_id,track_id,sum(duration_seconds) from public.study_sessions
 where mode in ('focus','lockin') and track_id is not null group by user_id,track_id;
insert into public.coin_ledger(user_id,source_key,amount)
 select user_id,'track:'||track_id::text||':'||(study_seconds/36000)::text,((study_seconds/36000)*50)::integer
 from public.track_reward_progress where study_seconds>=36000 on conflict(user_id,source_key) do nothing;

create function private.award_saved_study_rewards() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_day record; v_total bigint; v_before bigint; v_milestones bigint;
begin
 if new.mode not in ('focus','lockin') then return new; end if;
 -- Same lock as purchases, so a credit and simultaneous spend see a consistent balance.
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,94821));
 for v_day in select local_date,study_seconds from public.session_day_allocations
  where session_id=new.id and user_id=new.user_id and study_seconds>0 order by local_date
 loop
  insert into public.daily_quest_progress(user_id,local_date,study_seconds)
   values(new.user_id,v_day.local_date,v_day.study_seconds)
   on conflict(user_id,local_date) do update set study_seconds=public.daily_quest_progress.study_seconds+excluded.study_seconds
   returning study_seconds into v_total;
  insert into public.coin_ledger(user_id,source_key,amount)
   select new.user_id,'daily:'||v_day.local_date::text||':'||q.minutes::text,q.coins
   from (values(10,600,5),(30,1800,10),(60,3600,20),(120,7200,30))q(minutes,seconds,coins)
   where v_total>=q.seconds on conflict(user_id,source_key) do nothing;
 end loop;
 if new.track_id is not null then
  select study_seconds into v_before from public.track_reward_progress where user_id=new.user_id and track_id=new.track_id;
  v_before:=coalesce(v_before,0);
  insert into public.track_reward_progress(user_id,track_id,study_seconds) values(new.user_id,new.track_id,new.duration_seconds)
   on conflict(user_id,track_id) do update set study_seconds=public.track_reward_progress.study_seconds+excluded.study_seconds
   returning study_seconds into v_total;
  v_milestones:=v_total/36000;
  if v_milestones>v_before/36000 then
   insert into public.coin_ledger(user_id,source_key,amount)
    values(new.user_id,'track:'||new.track_id::text||':'||v_milestones::text,((v_milestones-v_before/36000)*50)::integer);
  end if;
 end if;
 return new;
end;
$$;
revoke all on function private.award_saved_study_rewards() from public,anon,authenticated,service_role;
-- AFTER row triggers run alphabetically: allocate_session_days must complete first.
create trigger zz_award_saved_study_rewards after insert on public.study_sessions
for each row execute function private.award_saved_study_rewards();

create function public.study_rewards(p_page integer default 1) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare v_user uuid:=auth.uid(); v_zone text; v_today date; v_seconds bigint; v_quests jsonb; v_tracks jsonb; v_count integer; v_page integer; v_pages integer;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_page is null or p_page<1 or p_page>100000 then raise exception 'Invalid reward page' using errcode='22023'; end if;
 select timezone into v_zone from public.profiles where id=v_user;
 v_today:=(now() at time zone v_zone)::date;
 select coalesce(sum(study_seconds),0) into v_seconds from public.daily_quest_progress where user_id=v_user and local_date=v_today;
 select jsonb_agg(jsonb_build_object('minutes',q.minutes,'required_seconds',q.seconds,'coins',q.coins,
  'awarded',exists(select 1 from public.coin_ledger l where l.user_id=v_user and l.source_key='daily:'||v_today::text||':'||q.minutes::text)) order by q.seconds)
  into v_quests from (values(10,600,5),(30,1800,10),(60,3600,20),(120,7200,30))q(minutes,seconds,coins);
 select count(*) into v_count from public.tracks where user_id=v_user;
 v_pages:=greatest(1,(v_count+5)/6);v_page:=least(p_page,v_pages);
 select coalesce(jsonb_agg(to_jsonb(x) order by x.archived,x.created_at desc,x.track_id desc),'[]'::jsonb) into v_tracks from (
  select t.id track_id,t.name,t.created_at,t.archived_at is not null archived,coalesce(p.study_seconds,0) study_seconds,
   coalesce(p.study_seconds,0)/36000 milestones,36000-mod(coalesce(p.study_seconds,0),36000) seconds_to_next
  from public.tracks t left join public.track_reward_progress p on p.track_id=t.id and p.user_id=v_user
  where t.user_id=v_user order by t.archived_at is not null,t.created_at desc,t.id desc limit 6 offset (v_page-1)*6
 )x;
 return jsonb_build_object('today',v_today,'timezone',v_zone,'server_now',now(),'next_midnight_at',((v_today+1)::timestamp at time zone v_zone),
  'study_seconds',v_seconds,'quests',v_quests,'tracks',v_tracks,'track_count',v_count,'page',v_page,'pages',v_pages);
end;
$$;
revoke all on function public.study_rewards(integer) from public,anon;
grant execute on function public.study_rewards(integer) to authenticated;
comment on table public.daily_quest_progress is 'Saved focus seconds grouped by immutable actual study date. Four automatic rewards per date; no client writes.';
comment on table public.track_reward_progress is 'Saved focus totals per Track. Every 36000 seconds awards 50 Coin; archive/restore preserves progress.';
