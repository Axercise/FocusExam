-- Run as postgres through MCP/SQL Editor. Fixtures never survive the rollback.
begin;
set local "request.jwt.claims" = '{}';
do $$
declare
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  admin_id uuid := gen_random_uuid();
  affected integer;
begin
  insert into auth.users (id, aud, role, email, raw_user_meta_data)
  values
    (user_a, 'authenticated', 'authenticated', user_a || '@example.invalid', '{"role":"admin","full_name":"Test A"}'),
    (user_b, 'authenticated', 'authenticated', user_b || '@example.invalid', '{"full_name":"Test B","avatar_url":"javascript:bad"}'),
    (admin_id, 'authenticated', 'authenticated', admin_id || '@example.invalid', '{}');

  if (select count(*) from public.profiles where id in (user_a, user_b, admin_id)) <> 3 then
    raise exception 'Signup trigger did not initialize profiles';
  end if;
  if (select count(*) from public.user_roles where user_id in (user_a, user_b, admin_id) and role = 'user') <> 3 then
    raise exception 'Signup must default to user, even when metadata requests admin';
  end if;
  if (select avatar_url from public.profiles where id = user_b) is not null then
    raise exception 'Invalid signup avatar must be ignored';
  end if;
  update public.user_roles set role = 'admin' where user_id = admin_id;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_a, 'role', 'authenticated', 'app_metadata', jsonb_build_object('role', 'admin'))::text, true);
  execute 'set local role authenticated';
  if (select count(*) from public.profiles where id in (user_a, user_b, admin_id)) <> 1 then
    raise exception 'User can see another profile';
  end if;
  if (select count(*) from public.user_roles where user_id in (user_a, user_b, admin_id)) <> 1 then
    raise exception 'User can see another role';
  end if;
  if private.has_permission('accounts.read') then
    raise exception 'JWT metadata must not override the database role';
  end if;
  update public.profiles set display_name = 'Edited A', locale = 'en', theme = 'dark' where id = user_a;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner update failed'; end if;
  update public.profiles set display_name = 'Should not change' where id = user_b;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'User updated another profile'; end if;
  begin
    update public.user_roles set role = 'admin' where user_id = user_a;
    raise exception 'User promoted themselves';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.user_roles (user_id, role) values (user_a, 'admin');
    raise exception 'User inserted a role';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set id = user_b where id = user_a;
    raise exception 'User changed profile ownership';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.profiles set timezone = 'Invalid/Zone' where id = user_a;
    raise exception 'Invalid timezone accepted';
  exception when invalid_parameter_value then null;
  end;
  begin
    update public.profiles set theme = 'invalid' where id = user_a;
    raise exception 'Invalid theme accepted';
  exception when check_violation then null;
  end;
  begin
    delete from public.profiles where id = user_a;
    raise exception 'Client deleted a profile directly';
  exception when insufficient_privilege then null;
  end;

  perform set_config('request.jwt.claims', jsonb_build_object('sub', admin_id, 'role', 'authenticated')::text, true);
  if (select count(*) from public.profiles where id in (user_a, user_b, admin_id)) <> 3 then
    raise exception 'Admin cannot inspect user accounts';
  end if;
  if not private.has_permission('accounts.update') or not private.has_permission('study_logs.read') then
    raise exception 'Admin permissions missing';
  end if;
  if private.has_permission('study_logs.update') or private.has_permission('study_logs.delete') then
    raise exception 'Admin must not have study write permissions';
  end if;
  update public.profiles set display_name = 'Admin edited B' where id = user_b;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Admin account update failed'; end if;
  begin
    update public.user_roles set role = 'admin' where user_id = user_b;
    raise exception 'App client changed a protected role';
  exception when insufficient_privilege then null;
  end;

  execute 'set local role postgres';
  update public.user_roles set role = 'user' where user_id = admin_id;
  execute 'set local role authenticated';
  if private.has_permission('accounts.read') or private.has_permission('study_logs.read') then
    raise exception 'Role revocation must take effect immediately';
  end if;

  execute 'set local role anon';
  perform set_config('request.jwt.claims', '{}', true);
  begin
    perform 1 from public.profiles;
    raise exception 'Guest accessed profiles';
  exception when insufficient_privilege then null;
  end;
  execute 'set local role postgres';
end;
$$;
rollback;
select 'profiles/roles/RLS/admin permissions tests passed; all fixtures rolled back' as result;
