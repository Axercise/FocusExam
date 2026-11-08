-- Track rows survive archiving so future study history keeps its subject.
create table public.tracks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 280),
  color text not null default 'mint' check (color in ('mint','blue','peach','lavender','rose')),
  icon text not null default 'book' check (icon in ('book','math','language','science','code','art','music','globe')),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Covers ownership policies, FK cascades and each user's stable list order.
create index tracks_owner_created_idx on public.tracks (user_id, created_at desc, id desc);
create index tracks_owner_active_idx on public.tracks (user_id, created_at desc, id desc)
  where archived_at is null;

alter table public.tracks enable row level security;
revoke all on public.tracks from public, anon, authenticated;
grant select on public.tracks to authenticated;
grant insert (user_id, name, description, color, icon) on public.tracks to authenticated;
grant update (name, description, color, icon, archived_at) on public.tracks to authenticated;
grant all on public.tracks to service_role;

create policy tracks_read_own_or_log_admin on public.tracks
for select to authenticated
using ((select auth.uid()) = user_id or (select private.has_permission('study_logs.read')));
create policy tracks_insert_own on public.tracks
for insert to authenticated with check ((select auth.uid()) = user_id);
create policy tracks_update_own on public.tracks
for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create function private.validate_track()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  new.name := btrim(new.name);
  new.description := btrim(new.description);
  if tg_op = 'UPDATE' and new.archived_at is distinct from old.archived_at
     and new.archived_at is not null then
    new.archived_at := pg_catalog.clock_timestamp();
  end if;
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function private.validate_track() from public, anon, authenticated, service_role;
create trigger validate_track_before_write before insert or update on public.tracks
for each row execute function private.validate_track();
comment on table public.tracks is
  'Personal subjects; archive rather than delete. Admin study-log permission is SELECT only.';
