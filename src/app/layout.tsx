import type { Metadata } from "next";
import "./globals.css";
import "./auth.css";
import "./account.css";
import "./tracks.css";
import "./timer.css";
import "./sessions.css";
import "./statistics.css";
import "./goals.css";
import "./startup.css";
import "./ambient.css";
import "./dashboard-drawers.css";
import "./streak.css";
import "./track-detail.css";
import "./cosmetics.css";
import "./focus-space.css";
import "./track-card-colors.css";
import AmbientHost from "@/components/ambient/ambient-host";
import CosmeticsProvider from "@/components/cosmetics/cosmetics-provider";
import { getCosmetics } from "@/lib/cosmetics/data";

export const metadata: Metadata = {
  title: "FocusExam — Your little space to grow",
  description: "พื้นที่เล็ก ๆ สำหรับการเรียนรู้ จับเวลาอ่านหนังสือและเติบโตไปด้วยกัน",
};

// Apply saved preferences before paint. Preferences are optional when storage is blocked.
const preferencesScript = `(function(){try{var p=JSON.parse(localStorage.getItem('focusexam-preferences')||'{}');document.documentElement.dataset.theme=p.theme==='dark'?'dark':'light';document.documentElement.lang=p.locale==='en'?'en':'th'}catch(e){}})()`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { ownerId, data } = await getCosmetics();
  return (
    <html lang="th" data-theme="light" data-space-theme={data.appearance.site_theme} suppressHydrationWarning>
      <body><script dangerouslySetInnerHTML={{ __html: preferencesScript }} /><CosmeticsProvider key={ownerId ?? "guest"} ownerId={ownerId} appearance={data.appearance} owned={data.owned}><AmbientHost>{children}</AmbientHost></CosmeticsProvider></body>
    </html>
  );
}
