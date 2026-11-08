"use client";
import Link from "next/link";
import {useActionState,useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowUpRight,Check,Pencil,Plus,Target,Trash2,X} from "lucide-react";
import {goalAction} from "@/lib/goals/actions";
import {goalsCopy} from "@/lib/goals/copy";
import {goalProgress,type DailyGoal,type GoalActionState,type GoalDay,type GoalMessage} from "@/lib/goals/model";
import type {Locale} from "@/lib/copy";
import type {TimerTrackPage} from "@/lib/sessions/types";
import GoalEditor from "./goal-editor";
function GoalFields({goal,ownerId}:{goal:DailyGoal;ownerId:string}){
 return <><input type="hidden" name="ownerId" value={ownerId}/><input type="hidden" name="goalId" value={goal.id}/><input type="hidden" name="date" value={goal.goal_date}/><input type="hidden" name="revision" value={goal.revision}/></>;
}
function GoalToggle({goal,ownerId,locale,onSaved}:{goal:DailyGoal;ownerId:string;locale:Locale;onSaved:(message:GoalMessage)=>void}){
 const t=goalsCopy[locale];
 const [state,action,pending]=useActionState<GoalActionState,FormData>(async(previous,form)=>{try{const result=await goalAction(previous,form);if(result.success&&result.message)onSaved(result.message);return result;}catch{return {message:"unavailable"};}},{});
 return <form action={action} className="goal-toggle-form"><GoalFields goal={goal} ownerId={ownerId}/><input type="hidden" name="operation" value="complete"/><input type="hidden" name="done" value={goal.completed_at?"false":"true"}/>
 <button type="submit" className={`real-goal-checkbox ${goal.completed_at?"done":""}`} aria-label={`${goal.completed_at?t.reopen:t.complete}: ${goal.title}`} aria-pressed={!!goal.completed_at} disabled={pending}>{goal.completed_at&&<Check size={16}/>}</button>
 {state.message&&!state.success&&<span role="alert" className="goal-row-error">{t.messages[state.message]}</span>}</form>;
}
function GoalDelete({goal,ownerId,locale,onClose,onSaved}:{goal:DailyGoal;ownerId:string;locale:Locale;onClose:()=>void;onSaved:(message:GoalMessage)=>void}){
 const t=goalsCopy[locale],dialog=useRef<HTMLDialogElement>(null),cancel=useRef<HTMLButtonElement>(null);
 const [state,action,pending]=useActionState<GoalActionState,FormData>(async(previous,form)=>{try{const result=await goalAction(previous,form);if(result.success&&result.message){dialog.current?.close();onSaved(result.message);}return result;}catch{return {message:"unavailable"};}},{});
 useEffect(()=>{const el=dialog.current;el?.showModal();cancel.current?.focus();return()=>el?.close();},[]);
 return <dialog className="track-dialog goal-delete-dialog" ref={dialog} onClose={onClose} onCancel={e=>{if(pending)e.preventDefault();}} aria-labelledby="goal-delete-title"><div className="goal-delete-heading"><h2 id="goal-delete-title">{t.deleteTitle}</h2><button className="track-icon-button" type="button" disabled={pending} onClick={()=>dialog.current?.close()} aria-label={t.close}><X size={20}/></button></div><p>{t.deleteNote}</p><blockquote>{goal.title}</blockquote>
 <form action={action}><GoalFields goal={goal} ownerId={ownerId}/><input type="hidden" name="operation" value="delete"/>{state.message&&!state.success&&<p role="alert" className="track-notice error">{t.messages[state.message]}</p>}<div className="track-dialog-actions"><button ref={cancel} type="button" className="track-secondary" disabled={pending} onClick={()=>dialog.current?.close()}>{t.cancel}</button><button className="track-secondary goal-delete-submit" disabled={pending}>{pending?t.pending:t.delete}<Trash2 size={16}/></button></div></form></dialog>;
}
export default function GoalCollection({data,ownerId,choices,locale,compact=false}:{data:GoalDay;ownerId:string;choices:TimerTrackPage;locale:Locale;compact?:boolean}){
 const t=goalsCopy[locale],router=useRouter();
 const [editor,setEditor]=useState<{id:string;goal?:DailyGoal}|null>(null),[deleting,setDeleting]=useState<DailyGoal|null>(null),[message,setMessage]=useState<GoalMessage|null>(null);
 const trigger=useRef<HTMLButtonElement|null>(null);
 const saved=(value:GoalMessage)=>{setMessage(value);router.refresh();};
 const restore=()=>requestAnimationFrame(()=>trigger.current?.isConnected&&trigger.current.focus());
 const progress=goalProgress(data.summary.completed,data.summary.total);
 return <section id={compact?"goals":undefined} className={`real-goals ${compact?"goals-card card":"goals-content"}`}>
 {compact&&<div className="compact-heading"><h2><Target size={18}/>{t.title}</h2><span className="count-pill">{data.summary.completed} / {data.summary.total}</span></div>}
 <div className="goal-progress-summary"><div><span>{t.progress}</span><strong>{data.summary.completed} / {data.summary.total}</strong></div><div className="real-goal-progress" role="progressbar" aria-label={t.progress} aria-valuemin={0} aria-valuemax={data.summary.total||1} aria-valuenow={data.summary.completed}><span style={{width:`${progress}%`}}/></div></div>
 {message&&<p className="goal-success" role="status">{t.messages[message]}</p>}
 {data.goals.length?<ul className="real-goal-list">{data.goals.map(goal=><li className={`real-goal-row ${goal.completed_at?"is-done":""}`} key={goal.id}><GoalToggle goal={goal} ownerId={ownerId} locale={locale} onSaved={saved}/><div className="real-goal-text"><p>{goal.title}</p>{goal.tracks&&<span>{goal.tracks.name}{goal.tracks.archived_at?` · ${t.archived}`:""}</span>}</div>{!compact&&<div className="real-goal-tools"><button className="track-icon-button" onClick={e=>{trigger.current=e.currentTarget;setEditor({id:goal.id,goal});}} aria-label={`${t.edit}: ${goal.title}`}><Pencil size={17}/></button><button className="track-icon-button" onClick={e=>{trigger.current=e.currentTarget;setDeleting(goal);}} aria-label={`${t.delete}: ${goal.title}`}><Trash2 size={17}/></button></div>}</li>)}</ul>
 :<div className="goals-empty"><Target size={compact?25:35}/><h2>{data.summary.date===data.summary.today?t.empty:t.dateEmpty}</h2><p>{t.emptyNote}</p></div>}
 <div className="goal-collection-footer"><button className={compact?"add-goal-real":"track-primary"} onClick={e=>{trigger.current=e.currentTarget;setEditor({id:crypto.randomUUID()});}}><Plus size={17}/>{t.add}</button>{compact&&<Link href="/goals" className="goals-manage-link">{t.all}<ArrowUpRight size={15}/></Link>}</div>
 <p className="goal-manual-note">{t.manual}</p>
 {editor&&<GoalEditor id={editor.id} goal={editor.goal} date={data.summary.date} ownerId={ownerId} choices={choices} locale={locale} onClose={()=>{setEditor(null);restore();}} onSaved={saved}/>}
 {deleting&&<GoalDelete goal={deleting} ownerId={ownerId} locale={locale} onClose={()=>{setDeleting(null);restore();}} onSaved={saved}/>}
 </section>;
}

