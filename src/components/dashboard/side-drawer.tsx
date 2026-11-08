"use client";
import {useEffect,useId,useRef,useState,type ReactNode} from "react";
import {X} from "lucide-react";
export default function SideDrawer({title,closeLabel,onClose,children}:{title:string;closeLabel:string;onClose:()=>void;children:ReactNode}){
 const dialog=useRef<HTMLDialogElement>(null),closeButton=useRef<HTMLButtonElement>(null),timeout=useRef<ReturnType<typeof setTimeout>|null>(null);
 const closingRef=useRef(false),outside=useRef(false),titleId=useId(),[closing,setClosing]=useState(false);
 useEffect(()=>{
  const el=dialog.current,original=document.activeElement instanceof HTMLElement?document.activeElement:null,overflow=document.body.style.overflow;
  el?.showModal();document.body.style.overflow="hidden";closeButton.current?.focus({preventScroll:true});
  return()=>{if(timeout.current)clearTimeout(timeout.current);el?.close();document.body.style.overflow=overflow;if(original?.isConnected)original.focus({preventScroll:true});};
 },[]);
 function dismiss(){
  if(closingRef.current)return;closingRef.current=true;
  if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){dialog.current?.close();return;}
  setClosing(true);timeout.current=setTimeout(()=>dialog.current?.close(),220);
 }
 return <dialog ref={dialog} id="dashboard-utility-drawer" className={`dashboard-drawer ${closing?"is-closing":""}`} onClose={onClose} onCancel={event=>{event.preventDefault();dismiss();}} aria-labelledby={titleId}
 onPointerDown={event=>{outside.current=event.target===event.currentTarget;}} onClick={event=>{if(outside.current&&event.target===event.currentTarget)dismiss();}}>
  <section className="dashboard-drawer-panel"><header className="dashboard-drawer-header"><div><span className="drawer-eyebrow">FOCUS / QUICK ACCESS</span><h2 id={titleId}>{title}</h2></div><button ref={closeButton} className="drawer-close" type="button" aria-label={closeLabel} onClick={dismiss}><X size={21}/></button></header><div className="dashboard-drawer-scroll">{children}</div></section>
 </dialog>;
}

