"use client";
import Link from "next/link";
import {usePreferences} from "@/lib/preferences";
export default function TrackError({retry}:{retry:()=>void}){
 const {locale}=usePreferences(),th=locale==="th";
 return <main className="tracks-main"><section className="tracks-empty" style={{marginTop:50}}><h1>{th?"โหลดรายละเอียดไม่สำเร็จ":"Could not load this Track"}</h1><p>{th?"ลองโหลดข้อมูลอีกครั้ง":"Please try loading your data again."}</p><button className="track-primary" onClick={retry}>{th?"ลองอีกครั้ง":"Try again"}</button><Link href="/tracks">{th?"Track ของฉัน":"My Tracks"}</Link></section></main>;
}
