"use client";
import {Headphones} from "lucide-react";
import {usePreferences} from "@/lib/preferences";
import {ambientCopy} from "@/lib/ambient/copy";
import AmbientControls from "./ambient-controls";
export default function AmbientPanel(){
 const {locale}=usePreferences(),t=ambientCopy[locale];
 return <section id="music" className="ambient-panel card"><div className="compact-heading"><h2><Headphones size={18}/>{t.title}</h2><span className="ambient-cc0">CC0</span></div><p className="ambient-intro">{t.intro}</p><AmbientControls locale={locale}/></section>;
}

