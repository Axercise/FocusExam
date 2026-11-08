"use client";
import {useEffect,useRef,useState,type ReactNode} from "react";
import {Headphones,Pause,Play,SlidersHorizontal,X} from "lucide-react";
import {usePreferences} from "@/lib/preferences";
import {dismissAmbient,mountAmbient,toggleAmbient} from "@/lib/ambient/store";
import {useAudioStatus} from "./ambient-controls";
import AmbientDialog from "./ambient-dialog";
export default function AmbientHost({children}:{children:ReactNode}){
 const {locale}=usePreferences(),{state,text,t}=useAudioStatus(locale);
 const [settings,setSettings]=useState(false),trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>mountAmbient(),[]);
 const active=state.status==="playing"||state.status==="loading";
 return <>{children}<div className="ambient-host-surface">{state.engaged&&<aside className="ambient-dock" aria-label={t.title}><span className={`ambient-dock-art ${state.status==="playing"?"is-playing":""}`}><Headphones size={20}/></span><div className="ambient-dock-info"><strong>{t.sounds[state.sound].name}</strong><span role="status">{text}</span></div><button className="ambient-dock-play" onClick={toggleAmbient} aria-label={state.status==="loading"?t.cancel:active?t.pause:t.play}>{active?<Pause size={19}/>:<Play size={19}/>}</button><button ref={trigger} className="ambient-icon-button" onClick={()=>setSettings(true)} aria-label={t.settings} aria-haspopup="dialog" aria-expanded={settings}><SlidersHorizontal size={18}/></button><button className="ambient-icon-button" onClick={dismissAmbient} aria-label={locale==="th"?"หยุดเสียงและซ่อนแถบเล่น":"Pause audio and hide player"}><X size={18}/></button></aside>}{settings&&<AmbientDialog locale={locale} onClose={()=>{setSettings(false);trigger.current?.focus();}}/>}</div></>;
}

