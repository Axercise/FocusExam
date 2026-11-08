-- FocusExam 2.1: private-by-default profiles and database-backed roles.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create type public.app_role as enum ('user', 'admin');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Focus friend'
    check (char_length(btrim(display_name)) between 1 and 80),
  avatar_url text check (avatar_url is null or
    (char_length(avatar_url) <= 2048 and avatar_url ~ '^https?://')),
  locale text not null default 'th' check (locale in ('th', 'en')),
  theme text not null default 'light' check (theme in ('light', 'dark')),
  timezone text not null default 'Asia/Bangkok',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Separate from editable profiles. Only trusted database administration may
-- assign roles, including the first admin; never trust user_metadata/JWT roles.
create table public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
revoke all on public.profiles, public.user_roles from public, anon, authenticated;
grant select on public.profiles, public.user_roles to authenticated;
grant update (display_name, avatar_url, locale, theme, timezone)
  on public.profiles to authenticated;
grant all on public.profiles, public.user_roles to service_role;

create function private.has_permission(requested_permission text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and requested_permission in ('accounts.read', 'accounts.update', 'study_logs.read')
    and exists (
      select 1 from public.user_roles
      where user_id = (select auth.uid()) and role = 'admin'::public.app_role
    );
$$;
revoke all on function private.has_permission(text) from public, anon, authenticated, service_role;
grant execute on function private.has_permission(text) to authenticated;
comment on function private.has_permission(text) is
  'Reads the current caller role from the database. Future study-log policies may grant admin SELECT only, never study writes.';

create policy profiles_read_own_or_admin on public.profiles
for select to authenticated
using ((select auth.uid()) = id or (select private.has_permission('accounts.read')));

create policy profiles_update_own_or_admin on public.profiles
for update to authenticated
using ((select auth.uid()) = id or (select private.has_permission('accounts.update')))
with check ((select auth.uid()) = id or (select private.has_permission('accounts.update')));

create policy user_roles_read_own_or_admin on public.user_roles
for select to authenticated
using ((select auth.uid()) = user_id or (select private.has_permission('accounts.read')));

create function private.validate_profile()
returns trigger language plpgsql security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Invalid profile timezone' using errcode = '22023';
  end if;
  new.display_name := btrim(new.display_name);
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function private.validate_profile() from public, anon, authenticated, service_role;
create trigger validate_profile_before_write
before insert or update on public.profiles
for each row execute function private.validate_profile();

create function private.touch_role_timestamp()
returns trigger language plpgsql security invoker
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function private.touch_role_timestamp() from public, anon, authenticated, service_role;
create trigger touch_user_role_before_update
before update on public.user_roles
for each row execute function private.touch_role_timestamp();

-- SECURITY DEFINER is restricted to this internal auth.users trigger. Public
-- API roles cannot insert auth.users or invoke this trigger function directly.
create function private.initialize_user()
returns trigger language plpgsql security definer
set search_path = ''
as $$
declare
  supplied_avatar text := coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture');
begin
  if (select auth.uid()) is not null and (select auth.uid()) <> new.id then
    raise exception 'User identity mismatch' using errcode = '42501';
  end if;
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    left(coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), 'Focus friend'), 80),
    case when supplied_avatar ~ '^https?://' and char_length(supplied_avatar) <= 2048
      then supplied_avatar else null end
  );
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end;
$$;
revoke all on function private.initialize_user() from public, anon, authenticated, service_role;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.initialize_user();

-- Also support users created before this migration, without elevating anyone.
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;
insert into public.user_roles (user_id) select id from auth.users on conflict (user_id) do nothing;
