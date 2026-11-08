"use client";
import {useEffect,useId,useLayoutEffect,useRef,useState} from "react";
import type {Locale} from "@/lib/copy";
import {clockDuration,type StatisticsDay} from "@/lib/statistics/model";
import {statisticsCopy} from "@/lib/statistics/copy";
type ChartTooltip={index:number;kind:"study"|"break"|"all";left:number;top:number;width:number;below:boolean};
export default function TimeChart({days,locale,compact=false,studyOnly=false}:{days:StatisticsDay[];locale:Locale;compact?:boolean;studyOnly?:boolean}) {
 const [selected,setSelected]=useState(()=>{const last=days.findLastIndex(day=>day.study_seconds+day.break_seconds>0);return last>=0?last:days.length-1;});const t=statisticsCopy[locale];
 const [tooltip,setTooltip]=useState<ChartTooltip|null>(null);
 const chart=useRef<HTMLDivElement>(null),hideTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),tooltipId=useId();
 const scroll=useRef<HTMLDivElement>(null);
 useEffect(()=>{const parent=scroll.current,button=parent?.querySelector<HTMLElement>('[aria-pressed="true"]');if(parent&&button)parent.scrollLeft=button.offsetLeft-parent.offsetLeft-parent.clientWidth/2+button.clientWidth/2;},[selected]);
 useEffect(()=>()=>clearTimeout(hideTimer.current),[]);
 useEffect(()=>{const dismiss=()=>setTooltip(null);window.addEventListener("resize",dismiss);return()=>window.removeEventListener("resize",dismiss);},[]);
 const hasTooltip=tooltip!==null;
 useLayoutEffect(()=>{
  if(!hasTooltip)return;
  const dismiss=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();event.stopPropagation();clearTimeout(hideTimer.current);setTooltip(null);}};
  window.addEventListener("keydown",dismiss,true);return()=>window.removeEventListener("keydown",dismiss,true);
 },[hasTooltip]);
 function keepTooltip(){clearTimeout(hideTimer.current);}
 function hideTooltip(){keepTooltip();hideTimer.current=setTimeout(()=>setTooltip(null),120);}
 function position(index:number,kind:ChartTooltip["kind"],anchor:HTMLElement):ChartTooltip|null{
  const container=chart.current?.getBoundingClientRect();if(!container)return null;
  const rect=(anchor.closest(".time-bar")?.querySelector(".time-bar-stack")??anchor).getBoundingClientRect(),width=Math.min(196,container.width-16);
  const below=rect.top-(kind==="all"?104:76)<8;
  return {index,kind,width,below,left:Math.max(8,Math.min(container.width-width-8,rect.left+rect.width/2-container.left-width/2)),top:(below?rect.bottom+10:rect.top-10)-container.top};
 }
 function showTooltip(index:number,kind:ChartTooltip["kind"],anchor:HTMLElement){keepTooltip();setTooltip(position(index,kind,anchor));}
 function repositionTooltip(){
  if(!tooltip||!scroll.current)return;
  const button=scroll.current.querySelectorAll<HTMLElement>(".time-bar")[tooltip.index];
  const anchor=tooltip.kind==="all"?button:button?.querySelector<HTMLElement>(`.time-bar-${tooltip.kind}`);
  if(!anchor)return setTooltip(null);
  const rect=anchor.getBoundingClientRect(),viewport=scroll.current.getBoundingClientRect();
  setTooltip(rect.right<=viewport.left||rect.left>=viewport.right?null:position(tooltip.index,tooltip.kind,anchor));
 }
 const max=Math.max(1,...days.map(d=>d.study_seconds+(studyOnly?0:d.break_seconds)));
 const active=days[selected]??days[0];
 const dayName=(date:string,full=false)=>new Intl.DateTimeFormat(locale==="th"?"th-TH":"en-GB",{day:"numeric",month:full?"short":undefined,year:full?"numeric":undefined,timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));
 const hovered=tooltip?days[tooltip.index]:null;
 return <div ref={chart} className={`time-chart ${compact?"compact":""}`} onPointerLeave={hideTooltip}>
   <div className="chart-legend"><span><i/>{t.study}</span>{!studyOnly&&<span><i/>{t.rest}</span>}<small>{clockDuration(max)}</small></div>
   {days.length>10&&<p className="chart-scroll-hint">{locale==="th"?"← เลื่อนกราฟเพื่อดูวันอื่น →":"← Scroll the chart to explore dates →"}</p>}
   <div ref={scroll} className="time-chart-scroll" role="group" aria-label={t.chart} onScroll={repositionTooltip}>
     <div className="time-chart-bars" style={{minWidth:compact?undefined:Math.max(240,days.length*34)}}>
       {days.map((day,i)=><button type="button" key={day.date} className={`time-bar ${selected===i?"selected":""}`} onClick={()=>setSelected(i)}
          onFocus={event=>{setSelected(i);showTooltip(i,"all",event.currentTarget);}} onBlur={hideTooltip}
          onPointerEnter={event=>showTooltip(i,"all",event.currentTarget)} onPointerLeave={hideTooltip}
          aria-pressed={selected===i} aria-describedby={tooltip?.index===i?tooltipId:undefined}
          aria-label={`${dayName(day.date,true)} · ${t.study} ${clockDuration(day.study_seconds)}${studyOnly?"":` · ${t.rest} ${clockDuration(day.break_seconds)}`}`}>
         <span className="time-bar-plot"><span className="time-bar-stack" style={{height:`${(day.study_seconds+(studyOnly?0:day.break_seconds))/max*100}%`}}>
           {!studyOnly&&<span className="time-bar-break" style={{flex:day.break_seconds}} onPointerEnter={event=>showTooltip(i,"break",event.currentTarget)}/>}<span className="time-bar-study" style={{flex:day.study_seconds}} onPointerEnter={event=>showTooltip(i,"study",event.currentTarget)}/>
         </span><span className="time-bar-zero"/></span><span className="time-bar-date">{dayName(day.date)}</span>
       </button>)}
     </div>
   </div>
   {tooltip&&hovered&&<div id={tooltipId} role="tooltip" className="chart-tooltip" data-below={tooltip.below} style={{left:tooltip.left,top:tooltip.top,width:tooltip.width}} onPointerEnter={keepTooltip} onPointerLeave={hideTooltip}>
     <span className="chart-tooltip-date">{dayName(hovered.date,true)}</span>
     {tooltip.kind!=="break"&&<span className="chart-tooltip-row"><i className="study" aria-hidden="true"/><span>{t.study}</span><strong>{clockDuration(hovered.study_seconds)}</strong></span>}
     {!studyOnly&&tooltip.kind!=="study"&&<span className="chart-tooltip-row"><i className="break" aria-hidden="true"/><span>{t.rest}</span><strong>{clockDuration(hovered.break_seconds)}</strong></span>}
   </div>}
   {active&&<div className="chart-detail" aria-live="polite"><span>{dayName(active.date,true)}</span><strong>{clockDuration(active.study_seconds)} <small>{t.study}</small></strong>{!studyOnly&&<span>{clockDuration(active.break_seconds)} {t.rest}</span>}</div>}
 </div>;
}

