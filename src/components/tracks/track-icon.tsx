import { BookOpen, Code2, FlaskConical, Globe2, Languages, Music2, Palette, Sigma, Rocket, GraduationCap, Sparkles } from "lucide-react";
import type { TrackIconName } from "@/lib/tracks/model";
const icons = { book: BookOpen, math: Sigma, language: Languages, science: FlaskConical, code: Code2, art: Palette, music: Music2, globe: Globe2, rocket: Rocket, graduation: GraduationCap, sparkles: Sparkles };
export default function TrackIcon({ name, size = 23 }: { name: TrackIconName; size?: number }) {
  const Icon = icons[name];
  return <Icon size={size} aria-hidden="true" />;
}
