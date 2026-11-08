begin;
do $$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();ad uuid:=gen_random_uuid();ta uuid;tb uuid;g uuid;day date;zone text;stamp timestamptz;rev integer;rows_changed integer;summary jsonb;stats_before jsonb;
begin
 insert into auth.users(id,aud,role,email,raw_user_meta_data) values
 (a,'authenticated','authenticated',a||'@example.invalid','{}'),
 (b,'authenticated','authenticated',b||'@example.invalid','{}'),
 (ad,'authenticated','authenticated',ad||'@example.invalid','{}');
 update public.user_roles set role='admin' where user_id=ad;
 update public.profiles set timezone='Pacific/Kiritimati' where id=a;
 insert into public.tracks(user_id,name) values(a,'Goals A') returning id into ta;
 insert into public.tracks(user_id,name) values(b,'Goals B') returning id into tb;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 execute 'set local role authenticated';
 stats_before:=public.study_statistics();
 insert into public.daily_goals(title,track_id) values('  Solve 20 problems  ',ta) returning id,goal_date,timezone into g,day,zone;
 if zone<>'Pacific/Kiritimati' or day<>(clock_timestamp() at time zone zone)::date then raise exception 'Wrong profile-local date';end if;
 if(select title from public.daily_goals where id=g)<>'Solve 20 problems' then raise exception 'Title not normalized';end if;
 summary:=public.goal_day_summary();
 if (summary->>'total')::int<>1 or (summary->>'completed')::int<>0 then raise exception 'Wrong summary';end if;
 begin insert into public.daily_goals(title,track_id) values('Foreign Track',tb);raise exception 'Foreign Track allowed';
 exception when invalid_parameter_value then if sqlerrm<>'goal_track_unavailable' then raise;end if;end;
 begin insert into public.daily_goals(title) values('  ');raise exception 'Empty title allowed';
 exception when check_violation then null;end;
 begin insert into public.daily_goals(title) values(repeat('ก',201));raise exception 'Oversized title allowed';
 exception when check_violation then null;end;
 begin update public.daily_goals set user_id=b where id=g;raise exception 'Owner mutable';
 exception when insufficient_privilege then null;end;
 begin update public.daily_goals set goal_date=day-1 where id=g;raise exception 'Date mutable';
 exception when insufficient_privilege then null;end;
 begin update public.daily_goals set timezone='UTC' where id=g;raise exception 'Timezone mutable';
 exception when insufficient_privilege then null;end;
 begin update public.daily_goals set revision=100 where id=g;raise exception 'Revision forge allowed';
 exception when insufficient_privilege then null;end;
 update public.daily_goals set completed_at='2000-01-01' where id=g and revision=0;
 get diagnostics rows_changed=row_count;if rows_changed<>1 then raise exception 'First edit failed';end if;
 select completed_at,revision into stamp,rev from public.daily_goals where id=g;
 if rev<>1 or stamp<now()-interval '1 minute' then raise exception 'Server timestamp/revision not enforced';end if;
 update public.daily_goals set title='Stale title' where id=g and revision=0;
 get diagnostics rows_changed=row_count;if rows_changed<>0 then raise exception 'Stale edit overwrote goal';end if;
 summary:=public.goal_day_summary(day);
 if(summary->>'completed')::int<>1 then raise exception 'Complete count';end if;
 update public.daily_goals set completed_at=clock_timestamp() where id=g;
 if (select completed_at from public.daily_goals where id=g)<>stamp then raise exception 'Repeated completion changed timestamp';end if;
 update public.daily_goals set completed_at=null where id=g;
 if (public.goal_day_summary(day)->>'completed')::int<>0 then raise exception 'Reopen count';end if;
 update public.tracks set archived_at=clock_timestamp() where id=ta;
 update public.daily_goals set title='Archived link survives',completed_at=clock_timestamp() where id=g;
 begin insert into public.daily_goals(title,track_id) values('Archived Track',ta);raise exception 'New archived link allowed';
 exception when invalid_parameter_value then if sqlerrm<>'goal_track_unavailable' then raise;end if;end;
 update public.daily_goals set track_id=null where id=g;
 if (select track_id from public.daily_goals where id=g) is not null then raise exception 'Cannot unlink';end if;
 insert into public.daily_goals(title,goal_date) values('Yesterday',day-1),('Tomorrow',day+1);
 if (public.goal_day_summary(day-1)->>'total')::int<>1 or(public.goal_day_summary(day+1)->>'total')::int<>1
 or(public.goal_day_summary(day)->>'total')::int<>1 then raise exception 'Daily isolation';end if;
 if public.study_statistics()<>stats_before then raise exception 'Goals affected study stats';end if;
 -- Later timezone edits must not move stored goals.
 execute 'reset role';update public.profiles set timezone='America/Los_Angeles' where id=a;execute 'set local role authenticated';
 if(select timezone from public.daily_goals where id=g)<>'Pacific/Kiritimati' or(select goal_date from public.daily_goals where id=g)<>day then raise exception 'Date changed with timezone';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',b,'role','authenticated')::text,true);
 if exists(select 1 from public.daily_goals where user_id=a) then raise exception 'Cross-user read';end if;
 update public.daily_goals set title='Foreign mutation' where id=g;get diagnostics rows_changed=row_count;
 if rows_changed<>0 then raise exception 'Cross-user write';end if;
 delete from public.daily_goals where id=g;get diagnostics rows_changed=row_count;
 if rows_changed<>0 then raise exception 'Cross-user delete';end if;
 begin insert into public.daily_goals(user_id,title) values(a,'Spoof owner');raise exception 'Owner spoof';
 exception when insufficient_privilege or invalid_parameter_value then null;end;
 if(public.goal_day_summary(day)->>'total')::int<>0 then raise exception 'Summary leaks goals';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ad,'role','authenticated')::text,true);
 if exists(select 1 from public.daily_goals where user_id=a) then raise exception 'Admin reads personal goals';end if;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',a,'role','authenticated')::text,true);
 delete from public.daily_goals where id=g;
 if(public.goal_day_summary(day)->>'total')::int<>0 then raise exception 'Delete did not update totals';end if;
 execute 'set local role anon';perform set_config('request.jwt.claims','{}',true);
 begin perform 1 from public.daily_goals;raise exception 'Guest reads goals';
 exception when insufficient_privilege then null;end;
 begin perform public.goal_day_summary();raise exception 'Guest summary';
 exception when insufficient_privilege then null;end;
 execute 'reset role';
end;
$$;
rollback;
select 'PASS: goal CRUD, local dates, history, Track links, completion timestamps, revisions, owner/admin/guest isolation' as result;

