import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const query = async (sql,args=[]) => (await db.query(sql,args)).rows;
async function owner() { const id=randomUUID(); await query("insert into auth.users(id)values($1)",[id]); return id; }
async function asUser(id,sql,args=[]) {
 await query("select set_config('request.jwt.claim.sub',$1,false)",[id??""]);
 await db.exec(`set role ${id ? "authenticated" : "anon"}`);
 try { return await query(sql,args); } finally { await db.exec("reset role"); await query("select set_config('request.jwt.claim.sub','',false)"); }
}
const command = async(u,op,item) => (await asUser(u,"select public.cosmetics_command($1,$2) s",[op,item]))[0].s;
const state = async(u) => (await asUser(u,"select public.cosmetics_state() s"))[0].s;
const credit = async(u,n) => query("insert into public.coin_ledger(user_id,source_key,amount)values($1,$2,$3)",[u,randomUUID(),n]);
before(async()=>{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;
 grant usage on schema auth to anon,authenticated;create table auth.users(id uuid primary key,raw_user_meta_data jsonb default '{}');
 create function auth.uid()returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;`);
 for(const file of(await readdir(new URL("../supabase/migrations/",import.meta.url))).sort()) await db.exec(await readFile(new URL("../supabase/migrations/"+file,import.meta.url),"utf8"));
});
after(async()=>{await db.close();});
test("catalog has nine free colors and account selections default safely",async()=>{
 const u=await owner(),s=await state(u);
 assert.equal(s.balance,0); assert.deepEqual(s.owned,[]);
 assert.deepEqual(s.appearance,{clock_skin:"default",site_theme:"default",focus_background:"default"});
 assert.equal(s.catalog.filter(i=>i.kind==="color"&&i.price===0).length,9);
 await command(u,"equip","clock:default"); await command(u,"equip","theme:default");
 assert.equal((await state(u)).appearance.site_theme,"default");
});
test("guests and direct client writes cannot mint coins, entitlements, preferences or catalog items",async()=>{
 const u=await owner();
 await assert.rejects(command(null,"buy","clock:orbit"),/permission denied/);
 for(const sql of[
  "insert into public.coin_ledger(user_id,source_key,amount)values(auth.uid(),'forged',99999)",
  "insert into public.cosmetic_inventory(user_id,item_id)values(auth.uid(),'clock:orbit')",
  "insert into public.cosmetic_preferences(user_id,clock_skin)values(auth.uid(),'orbit')",
  "update public.cosmetic_catalog set price=0 where id='clock:orbit'",
 ]) await assert.rejects(asUser(u,sql),/permission denied/);
 await assert.rejects(command(u,"equip","clock:orbit"),/locked/);
 assert.equal((await state(u)).balance,0);
});
test("purchases are atomic, idempotent and never permit spending past the balance",async()=>{
 const u=await owner(); await credit(u,200);
 let s=await command(u,"buy","clock:orbit"); assert.equal(s.balance,100);
 s=await command(u,"buy","clock:orbit"); assert.equal(s.balance,100);
 assert.equal(s.owned.filter(i=>i==="clock:orbit").length,1);
 await assert.rejects(command(u,"buy","clock:flip"),/Not enough coins/);
 s=await command(u,"equip","clock:orbit"); assert.equal(s.appearance.clock_skin,"orbit");
 s=await command(u,"buy","icon:rocket"); assert.equal(s.balance,0);
 await assert.rejects(command(u,"buy","color:gold"),/Not enough coins/);
 assert.equal((await state(u)).balance,0);
});
test("another account cannot inherit purchases, balances or selections",async()=>{
 const a=await owner(),b=await owner(); await credit(a,500); await command(a,"buy","theme:halloween"); await command(a,"equip","theme:halloween");
 const s=await state(b); assert.equal(s.balance,0); assert.deepEqual(s.owned,[]); assert.equal(s.appearance.site_theme,"default");
 for(const table of["coin_ledger","cosmetic_inventory","cosmetic_preferences"])assert.equal((await asUser(b,`select * from public.${table} where user_id=$1`,[a])).length,0);
 await assert.rejects(command(b,"equip","theme:halloween"),/locked/);
});
test("Track writes validate purchases in PostgreSQL and reject forged decorations",async()=>{
 const u=await owner(),a=await owner();
 await assert.rejects(asUser(u,"insert into public.tracks(name,color)values('Subject','gold')"),/locked or invalid/);
 await assert.rejects(asUser(u,"insert into public.tracks(name,background)values('Subject','aurora')"),/locked or invalid/);
 await assert.rejects(asUser(u,"insert into public.tracks(name,color)values('Subject','red; background:url(x)')"),/locked or invalid/);
 await credit(u,750); for(const id of["color:gold","icon:rocket","background:aurora"])await command(u,"buy",id);
 const track=(await asUser(u,"insert into public.tracks(name,color,icon,background)values('Subject','gold','rocket','aurora')returning id"))[0];
 assert.ok(track.id);
 await assert.rejects(asUser(a,"insert into public.tracks(name,color)values('Subject','gold')"),/locked or invalid/);
 assert.equal((await asUser(a,"update public.tracks set color='mint' where id=$1 returning id",[track.id])).length,0);
});
test("unknown categories and event items cannot bypass the unlock path",async()=>{
 const u=await owner(); await credit(u,999);
 await assert.rejects(command(u,"buy","clock:frost"),/event first/);
 await assert.rejects(command(u,"equip","clock:frost"),/locked/);
 await assert.rejects(command(u,"equip","color:mint"),/Track editor/);
 await assert.rejects(command(u,"buy","clock:fake"),/Invalid item/);
 await assert.rejects(command(u,"refund","clock:orbit"),/Invalid operation/);
 assert.equal((await state(u)).balance,999);
});
test("clock, Focus Space and website theme are independent account selections",async()=>{
 const u=await owner(),other=await owner(); await credit(u,1000);
 for(const id of["clock:flip","space:garden","space:night","theme:christmas"])await command(u,"buy",id);
 for(const id of["clock:flip","space:garden","theme:christmas"])await command(u,"equip",id);
 assert.deepEqual((await state(u)).appearance,{clock_skin:"flip",focus_background:"garden",site_theme:"christmas"});
 await command(u,"equip","space:night");
 assert.deepEqual((await state(u)).appearance,{clock_skin:"flip",focus_background:"night",site_theme:"christmas"});
 await command(u,"equip","theme:default");
 assert.deepEqual((await state(u)).appearance,{clock_skin:"flip",focus_background:"night",site_theme:"default"});
 await assert.rejects(command(other,"equip","space:night"),/locked/);
 assert.deepEqual((await state(other)).appearance,{clock_skin:"default",focus_background:"default",site_theme:"default"});
});
