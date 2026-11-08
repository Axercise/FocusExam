-- Run as postgres. All fixture users and tracks roll back.
begin;
set local "request.jwt.claims" = '{}';
do $$
declare
  owner_id uuid := gen_random_uuid();
  other_id uuid := gen_random_uuid();
  admin_id uuid := gen_random_uuid();
  own_track uuid;
  other_track uuid;
  affected integer;
begin
  insert into auth.users (id,aud,role,email,raw_user_meta_data) values
    (owner_id,'authenticated','authenticated',owner_id||'@example.invalid','{"role":"admin"}'),
    (other_id,'authenticated','authenticated',other_id||'@example.invalid','{}'),
    (admin_id,'authenticated','authenticated',admin_id||'@example.invalid','{}');
  update public.user_roles set role='admin' where user_id=admin_id;
  insert into public.tracks(user_id,name) values(other_id,'Other subject') returning id into other_track;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_id,'role','authenticated','app_metadata',jsonb_build_object('role','admin'))::text,true);
  execute 'set local role authenticated';
  insert into public.tracks(name,description,color,icon) values('  Mathematics  ','  Study algebra  ','blue','math') returning id into own_track;
  if (select name from public.tracks where id=own_track)<>'Mathematics'
    or (select description from public.tracks where id=own_track)<>'Study algebra' then
    raise exception 'Track trimming failed';
  end if;
  if (select count(*) from public.tracks where id in(own_track,other_track))<>1 then
    raise exception 'Cross-user read or metadata role escalation';
  end if;
  update public.tracks set name='Edited',color='rose',icon='art' where id=own_track;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Owner cannot edit'; end if;
  update public.tracks set archived_at=now() where id=own_track;
  if (select archived_at from public.tracks where id=own_track) is null then raise exception 'Archive failed'; end if;
  update public.tracks set archived_at=null where id=own_track;
  if (select archived_at from public.tracks where id=own_track) is not null then raise exception 'Restore failed'; end if;
  update public.tracks set name='Intrusion',archived_at=now() where id=other_track;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Cross-user edit succeeded'; end if;
  begin
    insert into public.tracks(user_id,name) values(other_id,'Spoofed owner');
    raise exception 'Inserted another owner';
  exception when insufficient_privilege then null; end;
  begin
    update public.tracks set user_id=other_id where id=own_track;
    raise exception 'Reassigned ownership';
  exception when insufficient_privilege then null; end;
  begin
    update public.tracks set created_at=now() where id=own_track;
    raise exception 'Client overwrote audit timestamp';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.tracks where id=own_track;
    raise exception 'Hard deletion allowed';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.tracks(name) values('   ');
    raise exception 'Blank name allowed';
  exception when check_violation then null; end;
  begin
    insert into public.tracks(name) values(repeat('ก',81));
    raise exception 'Long name allowed';
  exception when check_violation then null; end;
  begin
    insert into public.tracks(name,description) values('Long description',repeat('x',281));
    raise exception 'Long description allowed';
  exception when check_violation then null; end;
  begin
    update public.tracks set color='injected-css' where id=own_track;
    raise exception 'Unknown color allowed';
  exception when check_violation then null; end;
  begin
    update public.tracks set icon='injected-html' where id=own_track;
    raise exception 'Unknown icon allowed';
  exception when check_violation then null; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  if (select count(*) from public.tracks where id in(own_track,other_track))<>2 then
    raise exception 'Admin log context read failed';
  end if;
  update public.tracks set name='Admin intrusion',archived_at=now() where id=own_track;
  get diagnostics affected=row_count;
  if affected<>0 then raise exception 'Admin edited another user track'; end if;
  begin
    insert into public.tracks(user_id,name) values(owner_id,'Admin insert');
    raise exception 'Admin created another user track';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
  update public.user_roles set role='user' where user_id=admin_id;
  execute 'set local role authenticated';
  if exists(select 1 from public.tracks where id in(own_track,other_track)) then
    raise exception 'Admin revocation not immediate';
  end if;
  execute 'set local role anon';
  perform set_config('request.jwt.claims','{}',true);
  begin
    perform 1 from public.tracks;
    raise exception 'Guest read succeeded';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
end;
$$;
rollback;
select 'tracks ownership/admin/validation/archive tests passed; fixtures rolled back' as result;
