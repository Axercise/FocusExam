-- Catalog is shared; inventory, selections and the immutable coin ledger belong to one user.
create table public.cosmetic_catalog (
  id text primary key,
  kind text not null check (kind in ('clock','theme','color','icon','background')),
  value text not null,
  name_th text not null,
  name_en text not null,
  price integer not null check (price between 0 and 100000),
  event text check (event in ('christmas_2h')),
  unique(kind,value),
  check (id = kind || ':' || value),
  check (event is null or price = 0)
);
insert into public.cosmetic_catalog(id,kind,value,name_th,name_en,price,event) values
 ('clock:default','clock','default','เรียบง่าย','Essential',0,null),
 ('clock:orbit','clock','orbit','วงโคจร','Orbit',100,null),
 ('clock:flip','clock','flip','พลิกหน้าวันใหม่','Flip studio',450,null),
 ('clock:frost','clock','frost','คืนหิมะ','Frost night',0,'christmas_2h'),
 ('theme:default','theme','default','FocusExam','FocusExam',0,null),
 ('theme:christmas','theme','christmas','คริสต์มาส','Christmas',200,null),
 ('theme:halloween','theme','halloween','ฮาโลวีน','Halloween',400,null),
 ('color:mint','color','mint','เขียวมิ้นต์','Mint',0,null),
 ('color:blue','color','blue','ฟ้า','Blue',0,null),
 ('color:peach','color','peach','พีช','Peach',0,null),
 ('color:lavender','color','lavender','ลาเวนเดอร์','Lavender',0,null),
 ('color:rose','color','rose','กุหลาบ','Rose',0,null),
 ('color:amber','color','amber','อำพัน','Amber',0,null),
 ('color:teal','color','teal','เขียวน้ำทะเล','Teal',0,null),
 ('color:slate','color','slate','เทาหิน','Slate',0,null),
 ('color:lime','color','lime','มะนาว','Lime',0,null),
 ('color:midnight','color','midnight','ฟ้าราตรี','Midnight',100,null),
 ('color:coral','color','coral','ปะการัง','Coral',100,null),
 ('color:gold','color','gold','ทองอร่าม','Gold',450,null),
 ('icon:book','icon','book','หนังสือ','Book',0,null),
 ('icon:math','icon','math','คณิตศาสตร์','Mathematics',0,null),
 ('icon:language','icon','language','ภาษา','Language',0,null),
 ('icon:science','icon','science','วิทยาศาสตร์','Science',0,null),
 ('icon:code','icon','code','เขียนโปรแกรม','Coding',0,null),
 ('icon:art','icon','art','ศิลปะ','Art',0,null),
 ('icon:music','icon','music','ดนตรี','Music',0,null),
 ('icon:globe','icon','globe','โลก','Globe',0,null),
 ('icon:rocket','icon','rocket','ทะยานสู่ฝัน','Rocket',100,null),
 ('icon:graduation','icon','graduation','วันสำเร็จ','Graduate',200,null),
 ('icon:sparkles','icon','sparkles','ประกายความรู้','Starlight',450,null),
 ('background:plain','background','plain','เรียบง่าย','Plain',0,null),
 ('background:blueprint','background','blueprint','พิมพ์เขียว','Blueprint',100,null),
 ('background:aurora','background','aurora','แสงเหนือ','Aurora',200,null),
 ('background:confetti','background','confetti','เฉลิมฉลอง','Confetti',450,null);

create table public.cosmetic_inventory (
 user_id uuid not null references auth.users(id) on delete cascade,
 item_id text not null references public.cosmetic_catalog(id),
 acquired_at timestamptz not null default now(),
 primary key(user_id,item_id)
);
create table public.cosmetic_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 clock_skin text not null default 'default',
 site_theme text not null default 'default',
 updated_at timestamptz not null default now()
);
create table public.coin_ledger (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 source_key text not null,
 amount integer not null check (amount <> 0),
 created_at timestamptz not null default now(),
 unique(user_id,source_key)
);
alter table public.cosmetic_catalog enable row level security;
alter table public.cosmetic_inventory enable row level security;
alter table public.cosmetic_preferences enable row level security;
alter table public.coin_ledger enable row level security;
revoke all on public.cosmetic_catalog,public.cosmetic_inventory,public.cosmetic_preferences,public.coin_ledger from public,anon,authenticated;
grant select on public.cosmetic_catalog,public.cosmetic_inventory,public.cosmetic_preferences,public.coin_ledger to authenticated;
grant all on public.cosmetic_catalog,public.cosmetic_inventory,public.cosmetic_preferences,public.coin_ledger to service_role;
create policy cosmetic_catalog_read on public.cosmetic_catalog for select to authenticated using(true);
create policy cosmetic_inventory_read on public.cosmetic_inventory for select to authenticated using((select auth.uid())=user_id);
create policy cosmetic_preferences_read on public.cosmetic_preferences for select to authenticated using((select auth.uid())=user_id);
create policy coin_ledger_read on public.coin_ledger for select to authenticated using((select auth.uid())=user_id);
-- The reverse FK index supports future catalog maintenance without scanning every inventory row.
create index cosmetic_inventory_item_idx on public.cosmetic_inventory(item_id);

create function public.cosmetics_state() returns jsonb language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object(
  'balance',coalesce((select sum(amount) from public.coin_ledger where user_id=auth.uid()),0),
  'owned',coalesce((select jsonb_agg(item_id order by item_id) from public.cosmetic_inventory where user_id=auth.uid()),'[]'::jsonb),
  'appearance',coalesce((select jsonb_build_object('clock_skin',clock_skin,'site_theme',site_theme) from public.cosmetic_preferences where user_id=auth.uid()),'{"clock_skin":"default","site_theme":"default"}'::jsonb),
  'catalog',coalesce((select jsonb_agg(to_jsonb(c) order by kind,price,id) from public.cosmetic_catalog c),'[]'::jsonb)
 ) where auth.uid() is not null;
$$;
revoke all on function public.cosmetics_state() from public,anon;
grant execute on function public.cosmetics_state() to authenticated;

create function private.cosmetics_command(p_operation text,p_item_id text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_item public.cosmetic_catalog; v_balance bigint;
begin
 if v_user is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_operation not in ('buy','equip') or p_operation is null then raise exception 'Invalid operation' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,94821));
 select * into v_item from public.cosmetic_catalog where id=p_item_id;
 if not found then raise exception 'Invalid item' using errcode='22023'; end if;
 if p_operation='buy' then
  if exists(select 1 from public.cosmetic_inventory where user_id=v_user and item_id=p_item_id) then return public.cosmetics_state(); end if;
  if v_item.event is not null then raise exception 'Complete the event first' using errcode='42501'; end if;
  select coalesce(sum(amount),0) into v_balance from public.coin_ledger where user_id=v_user;
  if v_balance<v_item.price then raise exception 'Not enough coins' using errcode='P0001'; end if;
  if v_item.price>0 then insert into public.coin_ledger(user_id,source_key,amount) values(v_user,'purchase:'||p_item_id,-v_item.price); end if;
  insert into public.cosmetic_inventory(user_id,item_id) values(v_user,p_item_id) on conflict do nothing;
 else
  if v_item.kind not in ('clock','theme') then raise exception 'Choose this item in your Track editor' using errcode='22023'; end if;
  if (v_item.price>0 or v_item.event is not null) and not exists(select 1 from public.cosmetic_inventory where user_id=v_user and item_id=p_item_id) then raise exception 'Item locked' using errcode='42501'; end if;
  insert into public.cosmetic_preferences(user_id) values(v_user) on conflict do nothing;
  if v_item.kind='clock' then update public.cosmetic_preferences set clock_skin=v_item.value,updated_at=now() where user_id=v_user;
  else update public.cosmetic_preferences set site_theme=v_item.value,updated_at=now() where user_id=v_user; end if;
 end if;
 return public.cosmetics_state();
end;
$$;
revoke all on function private.cosmetics_command(text,text) from public,anon,authenticated,service_role;
grant execute on function private.cosmetics_command(text,text) to authenticated;
create function public.cosmetics_command(p_operation text,p_item_id text) returns jsonb
language sql security invoker set search_path = '' as $$select private.cosmetics_command(p_operation,p_item_id)$$;
revoke all on function public.cosmetics_command(text,text) from public,anon;
grant execute on function public.cosmetics_command(text,text) to authenticated;

alter table public.tracks drop constraint tracks_color_check;
alter table public.tracks drop constraint tracks_icon_check;
alter table public.tracks add column background text not null default 'plain';
grant insert(background),update(background) on public.tracks to authenticated;
create function private.validate_track_cosmetics() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if not exists(select 1 from public.cosmetic_catalog c where c.kind='color' and c.value=new.color and (c.price=0 and c.event is null or exists(select 1 from public.cosmetic_inventory i where i.user_id=new.user_id and i.item_id=c.id)))
 or not exists(select 1 from public.cosmetic_catalog c where c.kind='icon' and c.value=new.icon and (c.price=0 and c.event is null or exists(select 1 from public.cosmetic_inventory i where i.user_id=new.user_id and i.item_id=c.id)))
 or not exists(select 1 from public.cosmetic_catalog c where c.kind='background' and c.value=new.background and (c.price=0 and c.event is null or exists(select 1 from public.cosmetic_inventory i where i.user_id=new.user_id and i.item_id=c.id))) then
  raise exception 'Track decoration is locked or invalid' using errcode='42501';
 end if;
 return new;
end;
$$;
revoke all on function private.validate_track_cosmetics() from public,anon,authenticated,service_role;
create trigger validate_track_cosmetics_before_write before insert or update of color,icon,background on public.tracks for each row execute function private.validate_track_cosmetics();
comment on table public.coin_ledger is 'Immutable per-account coin credits and purchases. No client writes. Unique source keys prevent replay.';
