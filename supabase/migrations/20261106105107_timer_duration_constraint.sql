alter table public.timer_runs add constraint timer_runs_countdown_duration_required check (mode='lockin' or duration_seconds is not null);
