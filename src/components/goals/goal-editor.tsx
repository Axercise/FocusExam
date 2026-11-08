"use client";
import {useActionState,useEffect,useRef,useState,useTransition} from "react";
import {Check,Target,X} from "lucide-react";
import {goalAction} from "@/lib/goals/actions";
import {loadTimerTracksAction} from "@/lib/sessions/actions";
import {goalsCopy} from "@/lib/goals/copy";
import type {GoalActionState,DailyGoal,GoalMessage} from "@/lib/goals/model";
import type {TimerTrackPage} from "@/lib/sessions/types";
import type {Locale} from "@/lib/copy";
export default function GoalEditor({id,goal,date,ownerId,choices,locale,onClose,onSaved}:{id:string;goal?:DailyGoal;date:string;ownerId:string;choices:TimerTrackPage;locale:Locale;onClose:()=>void;onSaved:(message:GoalMessage)=>void}){
 const t=goalsCopy[locale],dialog=useRef<HTMLDialogElement>(null),input=useRef<HTMLInputElement>(null);
 const [title,setTitle]=useState(goal?.title??""),[track,setTrack]=useState(goal?.track_id??"");
 const [options,setOptions]=useState(goal?.track_id&&!choices.tracks.some(x=>x.id===goal.track_id)?[{id:goal.track_id,name:goal.tracks?.name??t.archived},...choices.tracks]:choices.tracks);
 const [loaded,setLoaded]=useState(choices.tracks.length),[page,setPage]=useState(0),[morePending,startMore]=useTransition(),[loadError,setLoadError]=useState(false);
 const [state,action,pending]=useActionState<GoalActionState,FormData>(async(previous,form)=>{
  try{const result=await goalAction(previous,form);if(result.success&&result.message){dialog.current?.close();onSaved(result.message);}return result;}catch{return {message:"unavailable"};}
 },{});
 useEffect(()=>{const el=dialog.current;el?.showModal();input.current?.focus();return()=>el?.close();},[]);
 function more(){setLoadError(false);startMore(async()=>{try{const data=await loadTimerTracksAction(page+1,ownerId);if(!data){setLoadError(true);return;}setOptions(old=>[...old,...data.tracks.filter(x=>!old.some(y=>y.id===x.id))]);setLoaded(n=>n+data.tracks.length);setPage(data.page);}catch{setLoadError(true);}});}
 return <dialog ref={dialog} className="track-dialog goal-dialog" onClose={onClose} onCancel={event=>{if(pending)event.preventDefault();}} aria-labelledby="goal-editor-title">
  <div className="track-dialog-heading"><span className="stat-icon mint"><Target size={24}/></span><div><p>{date}</p><h2 id="goal-editor-title">{goal?t.edit:t.add}</h2></div><button className="track-icon-button" type="button" onClick={()=>dialog.current?.close()} disabled={pending} aria-label={t.close}><X size={20}/></button></div>
  <form action={action} className="track-form goal-form">
   <input type="hidden" name="operation" value={goal?"edit":"create"}/><input type="hidden" name="goalId" value={id}/><input type="hidden" name="ownerId" value={ownerId}/><input type="hidden" name="date" value={date}/><input type="hidden" name="revision" value={goal?.revision??0}/>
   <label htmlFor="goal-title">{t.name}</label><input ref={input} id="goal-title" name="title" value={title} onChange={e=>setTitle(e.target.value)} required placeholder={t.hint} aria-describedby="goal-title-help" disabled={pending}/>
   <p id="goal-title-help" className="track-field-help">{t.limit}<span>{[...title].length}/200</span></p>
   <label htmlFor="goal-track">{t.track} <small>{t.optional}</small></label><select id="goal-track" name="trackId" value={track} onChange={e=>setTrack(e.target.value)} disabled={pending}>
    <option value="">{t.none}</option>{options.map(option=><option key={option.id} value={option.id}>{option.name}{goal?.tracks?.archived_at&&option.id===goal.track_id?` · ${t.archived}`:""}</option>)}
   </select>
   {loaded<choices.count&&<button type="button" className="text-button goal-load-more" onClick={more} disabled={pending||morePending}>{morePending?t.pending:t.more} ({loaded}/{choices.count})</button>}
   {loadError&&<p role="alert" className="track-notice error">{t.messages.unavailable}</p>}
   {state.message&&!state.success&&<p role="alert" className="track-notice error">{t.messages[state.message]}</p>}
   <div className="track-dialog-actions"><button type="button" className="track-secondary" disabled={pending} onClick={()=>dialog.current?.close()}>{t.cancel}</button><button className="track-primary" disabled={pending||!title.trim()||[...title.trim()].length>200}>{pending?t.pending:t.save}<Check size={16}/></button></div>
  </form>
 </dialog>;
}

