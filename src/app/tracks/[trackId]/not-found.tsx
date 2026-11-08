"use client";
import Link from "next/link";
import {BookOpen} from "lucide-react";
import {usePreferences} from "@/lib/preferences";
export default function Unavailable(){
 const {locale}=usePreferences(),th=locale==="th";
 return <main className="tracks-main"><section className="tracks-empty" style={{marginTop:50}}><BookOpen size={34}/><h1>{th?"ไม่พบ Track นี้":"Track unavailable"}</h1><p>{th?"กลับไปเลือก Track ในบัญชีของคุณได้เลย":"Choose a Track from your account to continue."}</p><Link className="track-primary" href="/tracks">{th?"ไปที่ Track ของฉัน":"Go to my Tracks"}</Link></section></main>;
}
