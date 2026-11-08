-- The BEFORE INSERT trigger always replaces this default with the owner's profile timezone.
alter table public.daily_goals alter column timezone set default 'UTC';

