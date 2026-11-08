"use client";
import {useRef,useState} from "react";
import {Headphones} from "lucide-react";
import type {Locale} from "@/lib/copy";
import {ambientCopy} from "@/lib/ambient/copy";
import {useAmbient} from "@/lib/ambient/store";
import AmbientDialog from "./ambient-dialog";
export default function TimerAmbientButton({locale}:{locale:Locale}){
 const [open,setOpen]=useState(false),trigger=useRef<HTMLButtonElement>(null),audio=useAmbient(),t=ambientCopy[locale];
 return <><button ref={trigger} className={`timer-ambient-button ${audio.status==="playing"?"is-playing":""}`} type="button" aria-haspopup="dialog" aria-expanded={open} aria-label={t.settings} title={t.settings} onClick={()=>setOpen(true)}><Headphones size={17}/>{audio.status==="playing"&&<i/>}</button>{open&&<AmbientDialog locale={locale} onClose={()=>{setOpen(false);trigger.current?.focus();}}/>}</>;
}

