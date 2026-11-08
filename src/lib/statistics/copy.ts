export const statisticsCopy={
 th:{
 title:"สถิติการเรียน",intro:"เห็นเวลาที่ตั้งใจ และการเติบโตในทุกวัน",
 day:"รายวัน",week:"7 วัน",month:"รายเดือน",study:"เวลาเรียน",rest:"เวลาพัก",
 active:"วันที่เรียน",streak:"Streak ปัจจุบัน",longest:"ต่อเนื่องสูงสุด",days:"วัน",all:"ทุก Track",
 track:"กรองวิชา",archived:"เก็บถาวร",more:"โหลด Track เพิ่ม",loading:"กำลังโหลด…",loadError:"โหลดไม่สำเร็จ ลองอีกครั้ง",
 apply:"แสดงสถิติ",back:"กลับหน้าจับเวลา",history:"ประวัติการบันทึก",today:"วันนี้",previous:"ช่วงก่อนหน้า",next:"ช่วงถัดไป",
 period:"ช่วงเวลา",date:"วันที่",monthInput:"เดือน / ปี",empty:"ยังไม่มีเวลาที่บันทึกในช่วงนี้",
 emptyNote:"จับเวลาแล้วบันทึกลง Track เพื่อเริ่มเห็นสถิติของคุณ",detail:"รายละเอียดวันที่เลือก",
 timezone:"นับวันตามเขตเวลาที่ตั้งไว้ตอนเริ่มจับเวลา",snapshot:"เปลี่ยนเขตเวลาภายหลังจะไม่ย้ายวันที่ของรายการเดิม",
 scope:"ตัวกรอง Track ใช้กับเวลาเรียน • เวลาพักและ Streak รวมทั้งบัญชี",
 legacy:"รายการเก่าที่แยกวันไม่ได้",legacyNote:"ยอดเดิมยังอยู่ใน Track และประวัติ แต่ไม่รวมกราฟและ Streak เพราะไม่มีข้อมูลช่วงพักที่ครบถ้วน",
 saved:"สถิติจากเวลาที่บันทึกจริง",weekly:"7 วันที่ผ่านมา",view:"ดูสถิติทั้งหมด",
 precise:"แยกวันตามเวลาจริง",old:"ข้อมูลเดิม · แยกวันไม่ได้",savedZone:"เขตเวลาเมื่อเริ่ม",
 selected:"เลือกวันที่",chart:"กราฟเวลาเรียนและเวลาพัก เลือกแท่งเพื่อดูรายละเอียด",accountStreak:"ทั้งบัญชี",streakRule:"Streak เพิ่มวันละ 1 เมื่อเรียนจริงรวมครบ 10 นาที รวมรอบที่ยังไม่บันทึก ไม่นับเวลาพัก",
 },
 en:{
 title:"Study statistics",intro:"A clearer view of your time, one day at a time.",
 day:"Day",week:"7 days",month:"Month",study:"Study time",rest:"Break time",
 active:"Study days",streak:"Current streak",longest:"Longest streak",days:"days",all:"All Tracks",
 track:"Filter Track",archived:"Archived",more:"Load more Tracks",loading:"Loading…",loadError:"Could not load. Try again.",
 apply:"Show statistics",back:"Back to timer",history:"Saved history",today:"Today",previous:"Previous period",next:"Next period",
 period:"Period",date:"Date",monthInput:"Month / year",empty:"No saved time in this period yet",
 emptyNote:"Start a timer and save it to a Track to see your progress.",detail:"Selected day",
 timezone:"Days follow the timezone captured when each timer starts",snapshot:"Changing timezone later never moves existing study dates.",
 scope:"Track filters apply to study time. Breaks and streaks include your whole account.",
 legacy:"Older sessions without daily allocation",legacyNote:"Their totals remain in Tracks and history. Charts and streaks exclude them because their complete pause timeline is unavailable.",
 saved:"Your saved study time",weekly:"Last 7 days",view:"Explore statistics",
 precise:"Allocated by actual study date",old:"Older session · date allocation unavailable",savedZone:"Timezone at start",
 selected:"Select date",chart:"Study and break time chart. Select a bar for details.",accountStreak:"Whole account",streakRule:"Earn one streak day after 10 minutes of actual study, including unsaved rounds. Breaks do not count.",
 }
} as const;

