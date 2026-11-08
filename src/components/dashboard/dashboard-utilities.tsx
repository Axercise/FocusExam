"use client";
import {useEffect,useState} from "react";
import {BarChart3,Headphones} from "lucide-react";
import {usePreferences} from "@/lib/preferences";
import {statisticsCopy} from "@/lib/statistics/copy";
import {ambientCopy} from "@/lib/ambient/copy";
import {useAmbient} from "@/lib/ambient/store";
import type {StudyStatistics} from "@/lib/statistics/model";
import AmbientControls from "@/components/ambient/ambient-controls";
import SideDrawer from "./side-drawer";
import StatisticsOverview from "./statistics-overview";
import {dashboardPanelEvent,type DashboardPanel} from "./utility-events";
export default function DashboardUtilities({statistics}:{statistics:StudyStatistics|null}){
 const {locale}=usePreferences(),audio=useAmbient();
 const [panel,setPanel]=useState<DashboardPanel|null>(null),t=statisticsCopy[locale],sound=ambientCopy[locale];
 const statisticsLabel=locale==="th"?"เปิดสถิติการเรียน":"Open study statistics",soundLabel=locale==="th"?"เปิดมุมเสียงโฟกัส":"Open focus soundscape";
 useEffect(()=>{
  const open=(event:Event)=>{const value=(event as CustomEvent).detail;if(value==="sound"||value==="statistics")setPanel(value);};
  const hash=()=>{if(location.hash==="#music")setPanel("sound");else if(location.hash==="#insights")setPanel("statistics");};
  const frame=requestAnimationFrame(hash);
  window.addEventListener(dashboardPanelEvent,open);window.addEventListener("hashchange",hash);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener(dashboardPanelEvent,open);window.removeEventListener("hashchange",hash);};
 },[]);
 return <div className="dashboard-utilities"><nav className="dashboard-fabs" aria-label={locale==="th"?"เมนูลัดโฟกัส":"Focus quick access"}>
  <button type="button" className="dashboard-fab statistics-fab" onClick={()=>setPanel("statistics")} aria-label={statisticsLabel} aria-haspopup="dialog" aria-expanded={panel==="statistics"} aria-controls="dashboard-utility-drawer"><BarChart3 size={23}/><span className="dashboard-fab-label">{t.title}</span></button>
  <button type="button" className={`dashboard-fab sound-fab ${audio.status==="playing"?"is-playing":""}`} onClick={()=>setPanel("sound")} aria-label={soundLabel} aria-haspopup="dialog" aria-expanded={panel==="sound"} aria-controls="dashboard-utility-drawer"><Headphones size={23}/>{audio.status==="playing"&&<i aria-hidden="true"/>}<span className="dashboard-fab-label">{sound.title}</span></button>
 </nav>
 {panel&&<SideDrawer title={panel==="statistics"?t.title:sound.title} closeLabel={sound.close} onClose={()=>setPanel(null)}>
  <div className="drawer-tabs" role="group" aria-label={locale==="th"?"เลือกแผงเครื่องมือ":"Choose a panel"}><button type="button" aria-pressed={panel==="statistics"} onClick={()=>setPanel("statistics")}><BarChart3 size={16}/>{locale==="th"?"สถิติ":"Statistics"}</button><button type="button" aria-pressed={panel==="sound"} onClick={()=>setPanel("sound")}><Headphones size={16}/>{locale==="th"?"เสียงโฟกัส":"Soundscape"}</button></div>
  <div className="drawer-content" key={panel}>{panel==="statistics"?<><p className="drawer-intro">{t.intro}</p><StatisticsOverview statistics={statistics} locale={locale}/></>:<><p className="drawer-intro">{sound.intro}</p><AmbientControls locale={locale}/></>}</div>
 </SideDrawer>}
 </div>;
}

