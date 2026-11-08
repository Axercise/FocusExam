-- Run as postgres via MCP or SQL Editor. All fixtures roll back.
begin;
set local "request.jwt.claims" = '{}';
do $$
declare
  owner_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  admin_id uuid := gen_random_uuid();
  first_change timestamptz;
  affected integer;
begin
  insert into auth.users (id, aud, role, email, raw_user_meta_data) values
    (owner_id, 'authenticated', 'authenticated', owner_id || '@example.invalid', '{"full_name":"Original"}'),
    (other_id, 'authenticated', 'authenticated', other_id || '@example.invalid', '{"full_name":"Other"}'),
    (admin_id, 'authenticated', 'authenticated', admin_id || '@example.invalid', '{}');
  update public.user_roles set role='admin' where user_id=admin_id;
  if (select display_name_changed_at from public.profiles where id=owner_id) is not null then
    raise exception 'First rename must be immediately available';
  end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  update public.profiles set display_name='  New name  ' where id=owner_id;
  select display_name_changed_at into first_change from public.profiles where id=owner_id;
  if first_change is null or (select display_name from public.profiles where id=owner_id) <> 'New name' then
    raise exception 'First rename did not trim and stamp';
  end if;
  update public.profiles set display_name=' New name ', theme='dark' where id=owner_id;
  if (select display_name_changed_at from public.profiles where id=owner_id) <> first_change then
    raise exception 'No-op consumed another rename';
  end if;
  begin
    update public.profiles set display_name='Too soon' where id=owner_id;
    raise exception 'Cooldown bypassed';
  exception when raise_exception then
    if sqlerrm <> 'display_name_cooldown' then raise; end if;
  end;
  begin
    update public.profiles set display_name_changed_at=null where id=owner_id;
    raise exception 'Timestamp writable by API client';
  exception when insufficient_privilege then null;
  end;
  update public.profiles set display_name='Unauthorized' where id=other_id;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Owner edited another user'; end if;
  execute 'reset role';
  perform set_config('request.jwt.claims', jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  begin
    update public.profiles set display_name='Admin bypass' where id=owner_id;
    raise exception 'Admin bypassed cooldown';
  exception when raise_exception then
    if sqlerrm <> 'display_name_cooldown' then raise; end if;
  end;
  execute 'reset role';
  -- Trusted operator advances only this transaction's fixture past the boundary.
  update public.profiles set display_name_changed_at=clock_timestamp()-interval '168 hours 1 second' where id=owner_id;
  perform set_config('request.jwt.claims', jsonb_build_object('sub',owner_id,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  update public.profiles set display_name='After seven days' where id=owner_id;
  if (select display_name from public.profiles where id=owner_id) <> 'After seven days' then
    raise exception 'Rename after cooldown failed';
  end if;
  begin
    update public.profiles set display_name='Again too soon' where id=owner_id;
    raise exception 'Second cooldown bypassed';
  exception when raise_exception then
    if sqlerrm <> 'display_name_cooldown' then raise; end if;
  end;
  execute 'reset role';
end;
$$;
rollback;
