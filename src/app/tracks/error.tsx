"use client";

import Link from "next/link";
import { tracksCopy } from "@/lib/tracks/copy";
import { usePreferences } from "@/lib/preferences";

export default function TracksError({ reset }: { reset: () => void }) {
  const { locale } = usePreferences();
  const t = tracksCopy[locale];
  return <main className="tracks-main"><div className="tracks-empty"><h1>{t.loadFailed}</h1><button className="track-primary" onClick={reset}>{t.retry}</button><Link href="/">{t.back}</Link></div></main>;
}
