"use client";
import {useSyncExternalStore} from "react";
import {AmbientEngine,type AudioSnapshot} from "./engine";
import {ambientSounds} from "./catalog";
import {DEFAULT_AUDIO,audioSettingsJson,parseAudioSettings,clampVolume,type AmbientSettings,type SoundId} from "./model";
const settingsKey="focusexam-audio-v1",claimKey="focusexam-audio-claim";
let tabId="",claimId="",channel:BroadcastChannel|null=null,claimed=false,storedClaim=false;
const initial:AudioSnapshot={...DEFAULT_AUDIO,status:"idle",reason:null,engaged:false};
const engine=new AmbientEngine(ambientSounds,DEFAULT_AUDIO,{
 claim:()=>{
  claimed=true;claimId=tabId+":"+crypto.randomUUID();
  storedClaim=false;
  try{localStorage.setItem(claimKey,claimId);storedClaim=true;}catch{/* Coordination can still use BroadcastChannel. */}
  channel?.postMessage({type:"claim",tabId});
 },
 canPlay:()=>{if(!storedClaim)return true;try{const owner=localStorage.getItem(claimKey);return !owner||owner===claimId;}catch{return true;}}
});
function persist(){try{localStorage.setItem(settingsKey,audioSettingsJson(engine.getSnapshot()));}catch{/* Session preferences remain usable. */}}
export function mountAmbient(){
 tabId=crypto.randomUUID();
 try{engine.applySettings(parseAudioSettings(localStorage.getItem(settingsKey)));}catch{/* Defaults when storage is blocked. */}
 const otherTab=()=>{if(claimed&&(engine.getSnapshot().status==="playing"||engine.getSnapshot().status==="loading")){claimed=false;engine.pause("otherTab");}};
 try{channel=new BroadcastChannel("focusexam-audio");channel.onmessage=event=>{if(event.data?.type==="claim"&&event.data.tabId!==tabId)otherTab();};}catch{/* Storage events provide the fallback. */}
 const storage=(event:StorageEvent)=>{
  if(event.key===claimKey&&event.newValue&&event.newValue!==claimId)otherTab();
  if(event.key===settingsKey&&event.newValue)engine.applySettings(parseAudioSettings(event.newValue));
 };
 const pageHide=()=>engine.pause();
 window.addEventListener("storage",storage);window.addEventListener("pagehide",pageHide);
 return()=>{window.removeEventListener("storage",storage);window.removeEventListener("pagehide",pageHide);channel?.close();channel=null;claimed=false;engine.destroy();};
}
export function useAmbient(){return useSyncExternalStore(engine.subscribe,engine.getSnapshot,()=>initial);}
export function toggleAmbient(){const status=engine.getSnapshot().status;if(status==="playing"||status==="loading")engine.pause();else void engine.play();}
export function selectAmbient(sound:SoundId){engine.select(sound);persist();}
export function updateAudio(next:Partial<Omit<AmbientSettings,"sound">>){
 const before=engine.getSnapshot();engine.applySettings({sound:before.sound,volume:next.volume===undefined?before.volume:clampVolume(next.volume),muted:next.muted??before.muted,alarmVolume:next.alarmVolume===undefined?before.alarmVolume:clampVolume(next.alarmVolume)});persist();
}
export function getAlarmVolume(){return engine.getSnapshot().alarmVolume;}
export function duckAmbient(){engine.duck();}
export function dismissAmbient(){engine.dismiss();}

