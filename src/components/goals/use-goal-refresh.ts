"use client";
import {useEffect} from "react";
import {useRouter} from "next/navigation";
export function useGoalRefresh(timezone:string,today:string){
 const router=useRouter();
 useEffect(()=>{
  let refreshing=false;
  const check=()=>{
   const parts=new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
   const part=(type:string)=>parts.find(p=>p.type===type)?.value;
   const date=[part("year"),part("month"),part("day")].join("-");
   if(date!==today&&!refreshing){refreshing=true;router.refresh();}
  };
  const visible=()=>{if(document.visibilityState==="visible"){check();router.refresh();}};
  check();const timer=window.setInterval(check,15000);
  document.addEventListener("visibilitychange",visible);window.addEventListener("focus",visible);
  return()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",visible);window.removeEventListener("focus",visible);};
 },[timezone,today,router]);
}

