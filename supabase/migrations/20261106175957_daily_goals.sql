create table public.daily_goals (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 goal_date date not null check(goal_date between date '1900-01-01' and date '9998-12-31'),
 timezone text not null,
 title text not null check(char_length(title) between 1 and 200 and title=btrim(title)),
 track_id uuid references public.tracks(id) on delete set null,
 completed_at timestamptz,
 revision integer not null default 0 check(revision>=0),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index daily_goals_owner_date_idx on public.daily_goals(user_id,goal_date,created_at,id);
create index daily_goals_track_idx on public.daily_goals(track_id) where track_id is not null;
alter table public.daily_goals enable row level security;
revoke all on public.daily_goals from public,anon,authenticated;
grant select,delete on public.daily_goals to authenticated;
grant insert(id,user_id,goal_date,title,track_id) on public.daily_goals to authenticated;
grant update(title,track_id,completed_at) on public.daily_goals to authenticated;
grant all on public.daily_goals to service_role;
create policy goals_select on public.daily_goals for select to authenticated using((select auth.uid())=user_id);
create policy goals_insert on public.daily_goals for insert to authenticated with check((select auth.uid())=user_id);
create policy goals_update on public.daily_goals for update to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy goals_delete on public.daily_goals for delete to authenticated using((select auth.uid())=user_id);

create function private.prepare_daily_goal() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 new.title:=btrim(new.title);
 if tg_op='INSERT' then
   select timezone into new.timezone from public.profiles where id=new.user_id;
   if new.timezone is null then raise exception 'goal_profile_unavailable' using errcode='22023';end if;
   new.goal_date:=coalesce(new.goal_date,(clock_timestamp() at time zone new.timezone)::date);
   new.created_at:=clock_timestamp();new.updated_at:=new.created_at;new.revision:=0;new.completed_at:=null;
 elsif new.id<>old.id or new.user_id<>old.user_id or new.goal_date<>old.goal_date
   or new.timezone<>old.timezone or new.created_at<>old.created_at then
   raise exception 'goal_identity_immutable' using errcode='22023';
 else
   new.updated_at:=clock_timestamp();new.revision:=old.revision+1;
   if new.completed_at is not null then new.completed_at:=coalesce(old.completed_at,clock_timestamp());end if;
 end if;
 if new.track_id is not null and (tg_op='INSERT' or new.track_id is distinct from old.track_id) then
   perform 1 from public.tracks where id=new.track_id and user_id=new.user_id and archived_at is null for share;
   if not found then raise exception 'goal_track_unavailable' using errcode='22023';end if;
 end if;
 return new;
end;
$$;
revoke all on function private.prepare_daily_goal() from public,anon,authenticated,service_role;
create trigger prepare_daily_goal before insert or update on public.daily_goals for each row execute function private.prepare_daily_goal();

create function public.goal_day_summary(p_date date default null) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare v_uid uuid:=auth.uid();v_zone text;v_today date;v_date date;v_total bigint;v_done bigint;
begin
 if v_uid is null then raise exception 'Authentication required' using errcode='42501';end if;
 select timezone into v_zone from public.profiles where id=v_uid;
 if v_zone is null then raise exception 'goal_profile_unavailable' using errcode='22023';end if;
 v_today:=(now() at time zone v_zone)::date;v_date:=coalesce(p_date,v_today);
 if v_date<date '1900-01-01' or v_date>date '9998-12-31' then raise exception 'invalid_goal_date' using errcode='22023';end if;
 select count(*),count(*) filter(where completed_at is not null) into v_total,v_done
 from public.daily_goals where user_id=v_uid and goal_date=v_date;
 return jsonb_build_object('today',v_today,'date',v_date,'timezone',v_zone,'total',v_total,'completed',v_done);
end;
$$;
revoke all on function public.goal_day_summary(date) from public,anon,authenticated,service_role;
grant execute on function public.goal_day_summary(date) to authenticated;

