export type LocalizedText = { th: string; en: string };
export type Track = { id: string; name: LocalizedText; detail: LocalizedText; totalSeconds: number; progress: number; color: "mint" | "blue" | "peach"; icon: "math" | "language" | "science" };
export type DailyGoal = { id: string; title: LocalizedText; complete: boolean };
export type DailyStats = { studySeconds: number; breakSeconds: number; streakDays: number; weeklySeconds: number[] };

export const tracks: Track[] = [
  { id: "math", name: { th: "คณิตศาสตร์", en: "Mathematics" }, detail: { th: "ค่อย ๆ แก้ ทีละโจทย์", en: "One problem at a time" }, totalSeconds: 45000, progress: 62, color: "mint", icon: "math" },
  { id: "english", name: { th: "ภาษาอังกฤษ", en: "English" }, detail: { th: "เปิดโลกด้วยคำศัพท์ใหม่", en: "A world of new words" }, totalSeconds: 28800, progress: 40, color: "blue", icon: "language" },
  { id: "science", name: { th: "วิทยาศาสตร์", en: "Science" }, detail: { th: "ให้ความสงสัยพาเราไป", en: "Stay a little curious" }, totalSeconds: 19800, progress: 28, color: "peach", icon: "science" },
];
export const goals: DailyGoal[] = [
  { id: "1", title: { th: "ทบทวนสมการกำลังสอง", en: "Review quadratic equations" }, complete: true },
  { id: "2", title: { th: "ท่องศัพท์ภาษาอังกฤษ 20 คำ", en: "Learn 20 new English words" }, complete: false },
  { id: "3", title: { th: "อ่านสรุปเรื่องเซลล์", en: "Read the notes on cells" }, complete: false },
];
export const stats: DailyStats = { studySeconds: 9000, breakSeconds: 1800, streakDays: 7, weeklySeconds: [3600, 7200, 5400, 10800, 6300, 1800, 9000] };
