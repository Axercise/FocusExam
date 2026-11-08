-- Postgres-only fixture setup. All users, timers and logs roll back.
begin;
set local "request.jwt.claims"='{}';
do $$
declare
  a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); admin_id uuid:=gen_random_uuid();
  track_a uuid; track_b uuid; client_a uuid:=gen_random_uuid(); client_b uuid:=gen_random_uuid();
  out1 jsonb; out2 jsonb; n bigint; original_run uuid;
begin
  insert into auth.users(id,aud,role,email,raw_user_meta_data) values
    (a,'authenticated','authenticated',a||'@example.invalid','{"role":"admin"}'),
    (b,'authenticated','authenticated',b||'@example.invalid','{}'),
    (admin_id,'authenticated','authenticated',admin_id||'@example.invalid','{}');
  update public.user_roles set role='admin' where user_id=admin_id;
  insert into public.tracks(user_id,name) values(a,'Study A') returning id into track_a;
  insert into public.tracks(user_id,name) values(b,'Study B') returning id into track_b;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  out1:=public.timer_command(client_a,'start','lockin');
  original_run:=(out1->>'id')::uuid;
  out2:=public.timer_command(gen_random_uuid(),'start','focus',10);
  if out2->>'id'<>out1->>'id' then raise exception 'Parallel start created another pending round'; end if;
  begin
    insert into public.timer_runs(user_id,client_id,mode,resumed_at) values(a,gen_random_uuid(),'lockin',now());
    raise exception 'Direct timer mutation allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform public.timer_command(client_a,'save',p_track_id=>track_a);
    raise exception 'Unfinished timer was saved';
  exception when raise_exception then if sqlerrm<>'timer_not_completed' then raise; end if; end;
  execute 'reset role';
  update public.timer_runs set segments_complete=false,started_at=clock_timestamp()-interval '8 hours',resumed_at=clock_timestamp()-interval '8 hours' where id=original_run;
  execute 'set local role authenticated';
  out1:=public.timer_command(client_a,'finish');
  if (out1->>'elapsed_ms')::bigint<28800000 then raise exception 'Eight-hour Lock in was capped'; end if;
  begin
    perform public.timer_command(client_a,'save',p_track_id=>track_b);
    raise exception 'Saved to another owner track';
  exception when raise_exception then if sqlerrm<>'track_unavailable' then raise; end if; end;
  update public.tracks set archived_at=now() where id=track_a;
  begin
    perform public.timer_command(client_a,'save',p_track_id=>track_a);
    raise exception 'Saved to archived track';
  exception when raise_exception then if sqlerrm<>'track_unavailable' then raise; end if; end;
  update public.tracks set archived_at=null where id=track_a;
  out1:=public.timer_command(client_a,'save',p_track_id=>track_a,p_recap=>'  Eight hours of algebra  ');
  out2:=public.timer_command(client_a,'save',p_track_id=>track_b,p_recap=>'retry must not move credit');
  if out1->>'saved_session_id'<>out2->>'saved_session_id' then raise exception 'Duplicate save created another session'; end if;
  if (select count(*) from public.study_sessions where run_id=original_run)<>1 then raise exception 'Duplicate credited time'; end if;
  select duration_seconds into n from public.study_sessions where run_id=original_run;
  if n<28800 or n>28802 then raise exception 'Wrong eight-hour credit: %',n; end if;
  if (select recap from public.study_sessions where run_id=original_run)<>'Eight hours of algebra' then raise exception 'Recap changed on retry'; end if;
  if (select total_seconds from public.track_study_totals(array[track_a]))<>n then raise exception 'Wrong saved Track total'; end if;
  begin
    update public.study_sessions set duration_seconds=999999 where user_id=a;
    raise exception 'Direct history edit allowed';
  exception when insufficient_privilege then null; end;
  begin
    delete from public.study_sessions where user_id=a;
    raise exception 'Direct history delete allowed';
  exception when insufficient_privilege then null; end;

  -- A two-second countdown resumed eight seconds ago ends at two seconds.
  out2:=public.timer_command(client_b,'start','focus',2);
  execute 'reset role';
  update public.timer_runs set segments_complete=false,started_at=clock_timestamp()-interval '8 seconds',resumed_at=clock_timestamp()-interval '8 seconds'
    where id=(out2->>'id')::uuid;
  execute 'set local role authenticated';
  out2:=public.timer_command(client_b,'sync');
  if out2->>'status'<>'completed' or (out2->>'elapsed_ms')::bigint<>2000 then raise exception 'Countdown over-credited'; end if;
  out2:=public.timer_command(client_b,'save',p_track_id=>track_a);

  -- The paused hour is excluded; only previous active time + resumed time count.
  client_b:=gen_random_uuid();out2:=public.timer_command(client_b,'start','lockin');
  execute 'reset role';
  update public.timer_runs set segments_complete=false,started_at=clock_timestamp()-interval '1 hour',accumulated_ms=10000,
    resumed_at=clock_timestamp()-interval '1 second' where id=(out2->>'id')::uuid;
  execute 'set local role authenticated';
  out2:=public.timer_command(client_b,'pause');
  if (out2->>'elapsed_ms')::bigint<11000 or (out2->>'elapsed_ms')::bigint>12000 then raise exception 'Paused time included'; end if;
  out2:=public.timer_command(client_b,'finish');out2:=public.timer_command(client_b,'save',p_track_id=>track_a);

  perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
  if exists(select 1 from public.study_sessions where user_id=a) then raise exception 'User read another history'; end if;
  begin
    perform public.timer_command(client_a,'save',p_track_id=>track_b);
    raise exception 'User controlled another timer';
  exception when raise_exception then if sqlerrm<>'timer_not_found' then raise; end if; end;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated')::text,true);
  if (select count(*) from public.study_sessions where user_id=a)<>3 then raise exception 'Admin cannot read logs'; end if;
  begin
    perform public.timer_command(client_a,'discard');
    raise exception 'Admin changed another timer';
  exception when raise_exception then if sqlerrm<>'timer_not_found' then raise; end if; end;
  execute 'set local role anon';
  perform set_config('request.jwt.claims','{}',true);
  begin
    perform public.timer_command(gen_random_uuid(),'start','lockin');
    raise exception 'Guest invoked timer RPC';
  exception when insufficient_privilege then null; end;
  execute 'reset role';
end;
$$;
rollback;
select 'server-clock timers, 8h Lock in, ownership, immutable logs and idempotent saves passed' as result;
