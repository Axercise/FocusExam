alter table public.cosmetic_catalog drop constraint cosmetic_catalog_kind_check;
alter table public.cosmetic_catalog add constraint cosmetic_catalog_kind_check check(kind in ('clock','space','theme','color','icon','background'));
insert into public.cosmetic_catalog(id,kind,value,name_th,name_en,price) values
 ('space:default','space','default','พื้นที่เรียบง่าย','Essential space',0),
 ('space:garden','space','garden','สวนยามเช้า','Morning garden',100),
 ('space:night','space','night','ท้องฟ้ากลางคืน','Midnight sky',200);
alter table public.cosmetic_preferences add column focus_background text not null default 'default';

create or replace function public.cosmetics_state() returns jsonb language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object(
  'balance',coalesce((select sum(amount) from public.coin_ledger where user_id=auth.uid()),0),
  'owned',coalesce((select jsonb_agg(item_id order by item_id) from public.cosmetic_inventory where user_id=auth.uid()),'[]'::jsonb),
  'appearance',coalesce((select jsonb_build_object('clock_skin',clock_skin,'site_theme',site_theme,'focus_background',focus_background) from public.cosmetic_preferences where user_id=auth.uid()),'{"clock_skin":"default","site_theme":"default","focus_background":"default"}'::jsonb),
  'catalog',coalesce((select jsonb_agg(to_jsonb(c) order by kind,price,id) from public.cosmetic_catalog c),'[]'::jsonb)
 ) where auth.uid() is not null;
$$;

create or replace function private.cosmetics_command(p_operation text,p_item_id text) returns jsonb
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
  if v_item.kind not in ('clock','space','theme') then raise exception 'Choose this item in your Track editor' using errcode='22023'; end if;
  if (v_item.price>0 or v_item.event is not null) and not exists(select 1 from public.cosmetic_inventory where user_id=v_user and item_id=p_item_id) then raise exception 'Item locked' using errcode='42501'; end if;
  insert into public.cosmetic_preferences(user_id) values(v_user) on conflict do nothing;
  if v_item.kind='clock' then update public.cosmetic_preferences set clock_skin=v_item.value,updated_at=now() where user_id=v_user;
  elsif v_item.kind='space' then update public.cosmetic_preferences set focus_background=v_item.value,updated_at=now() where user_id=v_user;
  else update public.cosmetic_preferences set site_theme=v_item.value,updated_at=now() where user_id=v_user; end if;
 end if;
 return public.cosmetics_state();
end;
$$;
