"use client";
import {useEffect,useRef} from "react";
import {Headphones,X} from "lucide-react";
import type {Locale} from "@/lib/copy";
import {ambientCopy} from "@/lib/ambient/copy";
import AmbientControls from "./ambient-controls";
export default function AmbientDialog({locale,onClose}:{locale:Locale;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),close=useRef<HTMLButtonElement>(null),t=ambientCopy[locale];
 useEffect(()=>{const el=dialog.current;el?.showModal();close.current?.focus();return()=>el?.close();},[]);
 return <dialog className="ambient-dialog" ref={dialog} onClose={onClose} aria-labelledby="ambient-dialog-heading"><div className="ambient-dialog-heading"><h2 id="ambient-dialog-heading"><Headphones size={20}/>{t.settings}</h2><button ref={close} className="ambient-icon-button" type="button" aria-label={t.close} onClick={()=>dialog.current?.close()}><X size={20}/></button></div><AmbientControls locale={locale}/></dialog>;
}

