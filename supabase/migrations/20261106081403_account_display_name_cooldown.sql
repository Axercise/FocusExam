-- First rename is available immediately; subsequent changes require 168 hours.
alter table public.profiles add column display_name_changed_at timestamptz;
comment on column public.profiles.display_name_changed_at is
  'Database-maintained rename timestamp. Authenticated API clients cannot write this column.';

create or replace function private.validate_profile()
returns trigger language plpgsql security invoker
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Invalid profile timezone' using errcode = '22023';
  end if;
  new.display_name := btrim(new.display_name);
  if tg_op = 'UPDATE' and new.display_name is distinct from old.display_name then
    if old.display_name_changed_at is not null
       and old.display_name_changed_at + interval '168 hours' > pg_catalog.clock_timestamp() then
      raise exception 'display_name_cooldown' using errcode = 'P0001';
    end if;
    new.display_name_changed_at := pg_catalog.clock_timestamp();
  end if;
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;
revoke all on function private.validate_profile() from public, anon, authenticated, service_role;
-- Existing column-level grants intentionally exclude display_name_changed_at.
