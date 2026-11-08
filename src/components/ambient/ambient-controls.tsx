"use client";
import {useId} from "react";
import {AudioLines,CloudRain,Pause,Play,Volume2,VolumeX,Waves} from "lucide-react";
import type {Locale} from "@/lib/copy";
import {ambientSounds,CC0_URL} from "@/lib/ambient/catalog";
import {ambientCopy} from "@/lib/ambient/copy";
import {selectAmbient,toggleAmbient,updateAudio,useAmbient} from "@/lib/ambient/store";
export function useAudioStatus(locale:Locale){
 const state=useAmbient(),t=ambientCopy[locale];
 const text=state.reason==="load"?t.error:state.reason?t[state.reason]:state.status==="loading"?t.loading:state.status==="playing"?t.playing:state.status==="paused"?t.paused:t.idle;
 return {state,text,t};
}
export default function AmbientControls({locale,compact=false}:{locale:Locale;compact?:boolean}){
 const {state,text,t}=useAudioStatus(locale),volumeId=useId(),alarmId=useId();
 const active=state.status==="playing"||state.status==="loading";
 return <div className={`ambient-controls ${compact?"is-compact":""}`}>
  <div className="ambient-sounds" role="group" aria-label={t.title}>{ambientSounds.map(sound=>{
   const Icon=sound.id==="rain"?CloudRain:sound.id==="ocean"?Waves:AudioLines;
   return <button type="button" key={sound.id} className={`ambient-sound ${state.sound===sound.id?"selected":""}`} aria-pressed={state.sound===sound.id} onClick={()=>selectAmbient(sound.id)}><Icon size={20}/><span><strong>{t.sounds[sound.id].name}</strong>{!compact&&<small>{t.sounds[sound.id].note}</small>}</span>{state.sound===sound.id&&<i aria-hidden="true"/>}</button>;
  })}</div>
  <div className="ambient-play-row"><button type="button" className="ambient-play" onClick={toggleAmbient} aria-label={state.status==="loading"?t.cancel:active?t.pause:t.play}>{active?<Pause size={18}/>:<Play size={18}/>}<span>{state.status==="loading"?t.cancel:active?t.pause:t.play}</span></button><button type="button" className="ambient-mute" aria-label={state.muted?t.unmute:t.mute} aria-pressed={state.muted} onClick={()=>updateAudio({muted:!state.muted})}>{state.muted||state.volume===0?<VolumeX size={18}/>:<Volume2 size={18}/>}</button><span className={`ambient-status ${state.status==="playing"?"is-playing":""}`} role="status">{text}</span></div>
  <label className="ambient-volume-label" htmlFor={volumeId}>{t.volume}<output>{Math.round(state.volume*100)}%</output></label><input className="ambient-range" id={volumeId} type="range" min="0" max="100" step="1" value={Math.round(state.volume*100)} aria-valuetext={Math.round(state.volume*100)+"%"} onChange={e=>updateAudio({volume:Number(e.target.value)/100})}/>
  {!compact&&<><div className="ambient-alarm"><label className="ambient-volume-label" htmlFor={alarmId}>{t.alarm}<output>{Math.round(state.alarmVolume*100)}%</output></label><input className="ambient-range" id={alarmId} type="range" min="0" max="100" step="1" value={Math.round(state.alarmVolume*100)} aria-valuetext={Math.round(state.alarmVolume*100)+"%"} onChange={e=>updateAudio({alarmVolume:Number(e.target.value)/100})}/><p>{t.alarmNote}</p></div><p className="ambient-remember">{t.remember}</p>
  <details className="ambient-credits"><summary>{t.credits}</summary><p>{t.license} · <a href={CC0_URL} target="_blank" rel="noopener noreferrer">CC0 1.0 ↗</a></p><ul>{ambientSounds.map(sound=><li key={sound.id}><strong>{t.sounds[sound.id].name}</strong><a href={sound.source} target="_blank" rel="noopener noreferrer">{sound.author} · {t.source} ↗</a></li>)}</ul><p>{t.processed}</p></details></>}
 </div>;
}

