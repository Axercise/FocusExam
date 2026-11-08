import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createHash} from "node:crypto";
import {DEFAULT_AUDIO,parseAudioSettings,audioSettingsJson} from "../src/lib/ambient/model.ts";
import {AmbientEngine} from "../src/lib/ambient/engine.ts";

const tick=()=>new Promise(resolve=>setImmediate(resolve));
class Param{value=0;setValueAtTime(value){this.value=value;}linearRampToValueAtTime(value){this.value=value;}cancelScheduledValues(){}}
class Context extends EventTarget{
 state="running";currentTime=0;destination={};sources=[];gains=[];
 resume(){return Promise.resolve();}close(){this.state="closed";return Promise.resolve();}
 decodeAudioData(){return Promise.resolve({duration:59});}
 createGain(){const node={gain:new Param(),connect(){},disconnect(){}};this.gains.push(node);return node;}
 createBufferSource(){const node={buffer:null,loop:false,connect(){},disconnect(){},start(at,offset){this.startOffset=offset;this.started=true;},stop(){this.stopped=true;this.onended?.();}};this.sources.push(node);return node;}
}
const catalog=[{id:"rain",src:"/audio/rain.mp3"},{id:"ocean",src:"/audio/ocean.mp3"},{id:"noise",src:"/audio/noise.mp3"}];
function setup(extra={}){const context=new Context();let loads=0;const engine=new AmbientEngine(catalog,{...DEFAULT_AUDIO},{createContext:()=>context,fetchAudio:async()=>{loads++;return new ArrayBuffer(1);},...extra});return {context,engine,loads:()=>loads};}
test("saved preferences validate IDs/volume and never restore playback state",()=>{
 assert.deepEqual(parseAudioSettings("broken"),DEFAULT_AUDIO);
 assert.deepEqual(parseAudioSettings(null),DEFAULT_AUDIO);
 const settings=parseAudioSettings(JSON.stringify({version:1,sound:"https://evil.invalid/audio",volume:200,muted:true,alarmVolume:-2,playing:true}));
 assert.deepEqual(settings,{sound:"rain",volume:1,muted:true,alarmVolume:0});
 const keys=Object.keys(JSON.parse(audioSettingsJson({...settings,status:"playing",engaged:true})));
 assert.deepEqual(keys.sort(),["version","sound","volume","muted","alarmVolume"].sort());
});
test("nothing loads before Play, pause/resume retains position and reuses one decoded buffer",async()=>{
 const {context,engine,loads}=setup();assert.equal(loads(),0);assert.equal(context.sources.length,0);
 await engine.play();assert.equal(engine.getSnapshot().status,"playing");assert.equal(context.sources[0].loop,true);
 context.currentTime=12;engine.pause();assert.equal(context.sources[0].stopped,true);
 await engine.play();assert.equal(context.sources[1].startOffset,12);assert.equal(loads(),1);
 engine.destroy();
});
test("rapid switching cannot start an obsolete fetch after the selected sound",async()=>{
 const pending=new Map();const {context,engine}=setup({fetchAudio:(url)=>new Promise(resolve=>pending.set(url,resolve))});
 const old=engine.play();await tick();engine.select("ocean");await tick();
 pending.get("/audio/ocean.mp3")(new ArrayBuffer(1));await tick();
 pending.get("/audio/rain.mp3")(new ArrayBuffer(1));await old;await tick();
 assert.equal(engine.getSnapshot().sound,"ocean");assert.equal(engine.getSnapshot().status,"playing");assert.equal(context.sources.length,1);
 engine.destroy();
});
test("pause during loading prevents delayed audio and source creation",async()=>{
 let resolve;const {context,engine}=setup({fetchAudio:()=>new Promise(done=>{resolve=done;})});
 const task=engine.play();await tick();engine.pause();resolve(new ArrayBuffer(1));await task;
 assert.equal(engine.getSnapshot().status,"paused");assert.equal(context.sources.length,0);engine.destroy();
});
test("mute/volume are independent of timer alert volume; interruption requires explicit resume",async()=>{
 const {context,engine}=setup();await engine.play();
 engine.applySettings({...DEFAULT_AUDIO,volume:.5,alarmVolume:0});assert.equal(context.gains.at(-1).gain.value,.25);
 engine.applySettings({...DEFAULT_AUDIO,volume:.5,muted:true,alarmVolume:1});assert.equal(context.gains.at(-1).gain.value,0);
 context.state="suspended";context.dispatchEvent(new Event("statechange"));
 assert.equal(engine.getSnapshot().status,"paused");assert.equal(engine.getSnapshot().reason,"interrupted");assert.equal(context.sources.length,1);engine.destroy();
});
test("failed loads allow retry and a lost tab claim cannot start a source",async()=>{
 let fail=true;const {engine,context}=setup({fetchAudio:async()=>{if(fail)throw new Error("offline");return new ArrayBuffer(1);}});
 await engine.play();assert.equal(engine.getSnapshot().reason,"load");assert.equal(context.sources.length,0);
 fail=false;await engine.play();assert.equal(engine.getSnapshot().status,"playing");engine.destroy();
 const lost=setup({canPlay:()=>false});await lost.engine.play();assert.equal(lost.engine.getSnapshot().reason,"otherTab");assert.equal(lost.context.sources.length,0);lost.engine.destroy();
});
test("browser permission and unsupported audio failures never load or start audio",async()=>{
 const ctx=new Context();ctx.resume=()=>Promise.reject(new DOMException("Gesture required","NotAllowedError"));
 let loads=0;
 const blocked=new AmbientEngine(catalog,{...DEFAULT_AUDIO},{createContext:()=>ctx,fetchAudio:async()=>{loads++;return new ArrayBuffer(1);}});
 await blocked.play();assert.equal(blocked.getSnapshot().reason,"blocked");assert.equal(loads,0);assert.equal(ctx.sources.length,0);blocked.destroy();
 const unsupported=new AmbientEngine(catalog,{...DEFAULT_AUDIO},{createContext:()=>{throw new ReferenceError("AudioContext unavailable");}});
 await unsupported.play();assert.equal(unsupported.getSnapshot().reason,"unsupported");unsupported.destroy();
});
test("all bundled sounds have matching license provenance and verified asset hashes",()=>{
 const records=JSON.parse(fs.readFileSync("public/audio/licenses.json","utf8"));
 assert.deepEqual(records.map(r=>r.id),["rain","ocean","noise"]);
 for(const record of records){
  assert.equal(record.license,"CC0-1.0");assert.ok(record.page.startsWith("https://freesound.org/people/"));
  const bytes=fs.readFileSync("public"+record.asset);assert.equal(bytes.length,record.bytes);
  assert.equal(createHash("sha256").update(bytes).digest("hex"),record.assetSha256);
  assert.ok(bytes.length>100000&&bytes.length<1000000);
 }
});
