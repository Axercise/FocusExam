# FocusExam

เว็บพื้นที่อ่านหนังสือสไตล์ startup ใช้พื้นขาว/ดำและเทากลาง เขียวเป็นสีหลัก ม่วงเป็นสีเวลาพัก รองรับมือถือ ภาษาไทย/อังกฤษ และ Light/Dark

## Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS (PostCSS) และ CSS variables สำหรับธีม
- Lucide React สำหรับไอคอน
- Supabase PostgreSQL + Auth, `@supabase/supabase-js` 2.119.0 และ `@supabase/ssr` 0.12.7 (ระบุเวอร์ชันและมี lockfile)

## ของตกแต่งและ Coin

- เลือกสกินนาฬิกา พื้นหลังพื้นที่จับเวลา ธีมเว็บไซต์ และของตกแต่ง Track แยกกัน พร้อมดูตัวอย่างก่อนใช้
- มีพื้นหลัง Default/สวนยามเช้า/กลางคืน ธีม Christmas/Halloween และสี Track ฟรี 9 สี พร้อมไอเทมปลดล็อกเพิ่มเติม
- กรอบการ์ด Track และ Glow ตอน hover/focus ใช้สีประจำวิชา รองรับ Light/Dark และการลดการเคลื่อนไหว
- Daily Quest นับ Focus/Lock in ที่เซฟตามวันที่เรียนจริง: 10/30/60/120 นาที รับเพิ่ม 5/10/20/30 Coin รวมสูงสุด 65 Coin/วัน
- แต่ละ Track สะสมครบทุก 10 ชั่วโมง รับอีก 50 Coin โดยตรวจรางวัลและการซื้อในฐานข้อมูล ป้องกันแจกหรือหักซ้ำ
- รายละเอียดและผลตรวจอยู่ใน [Cosmetics checkpoint 2](docs/checkpoints/cosmetics-checkpoint-2.md) และ [Track color glow](docs/checkpoints/track-card-color-glow.md)

## เปิดใช้งานบน Windows

ต้องมี Node.js ที่ Next.js รองรับ และ npm เครื่องที่ใช้พัฒนามี Node.js 26 และ npm 11 อยู่แล้ว

```powershell
rtk proxy npm.cmd ci
rtk proxy npm.cmd run dev
```

เปิด http://localhost:3000 ใช้ `npm.cmd` เพื่อหลีกเลี่ยงข้อจำกัด PowerShell ที่บล็อก `npm.ps1` โดยไม่ต้องเปลี่ยนนโยบายเครื่อง หากไม่มี RTK สามารถเรียก `npm.cmd` โดยตรงได้

สำหรับเครื่องใหม่ สร้าง `.env.local` ตาม `.env.example` โดยใส่ Project URL และ publishable key ของ Supabase พร้อมสร้าง `ACCOUNT_SECURITY_KEY` สำหรับเซิร์ฟเวอร์ตามหัวข้อ Account settings ด้านล่าง เครื่องที่พัฒนาอยู่มีไฟล์นี้แล้ว ไม่ต้องเขียนทับ ใช้เฉพาะ publishable key (หรือ legacy anon สำหรับ compatibility) ในหน้าเว็บ ไม่มีการส่ง server secret/service-role key ไปยังเบราว์เซอร์

`NEXT_PUBLIC_SITE_URL` เป็น origin ของเว็บสำหรับลิงก์ Auth ค่าเริ่มต้นคือ `http://localhost:3000` จึงใช้ไฟล์เดิมได้ตอนพัฒนา ก่อน build สำหรับโดเมนจริงให้ตั้งตัวแปรนี้เป็น HTTPS origin จริง พร้อมอัปเดต Site URL/Redirect URLs ใน Supabase และ origin ใน Google OAuth

```powershell
rtk proxy npm.cmd run lint
rtk proxy npm.cmd run typecheck
rtk proxy npm.cmd run check:supabase
rtk proxy npm.cmd run test:account
rtk proxy npm.cmd run test:tracks
rtk proxy npm.cmd run test:timer
rtk proxy npm.cmd run test:statistics
rtk proxy npm.cmd run test:goals
rtk proxy npm.cmd run test:ambient
rtk proxy npm.cmd run test:cosmetics
rtk proxy npm.cmd run test:rewards
rtk npm run build
rtk proxy npm.cmd run start
```

## สิ่งที่ทำในขั้นนี้

- Dashboard สมาชิกใช้เวลาเรียน/พักวันนี้ Streak กราฟ 7 วัน Track และ Daily Goals จริงเฉพาะบัญชี; guest แสดงข้อมูลตัวอย่างที่มีป้ายกำกับ
- สลับภาษาไทย/อังกฤษและธีมสว่าง/มืด เก็บการตั้งค่าใน `localStorage`; หาก storage ถูกบล็อกยังสลับได้ภายในหน้าที่เปิดอยู่
- เมนูลัดไปแต่ละส่วน รองรับคีย์บอร์ด และปรับ layout ตามขนาดจอ
- ปุ่มเต็มหน้าจอบนการ์ดจับเวลา ขยายเฉพาะพื้นที่จับเวลาและตัวเลข พร้อมออกด้วยปุ่มมุมบนขวาหรือ Esc รองรับทั้งสองภาษา/ธีม หากเบราว์เซอร์ปฏิเสธหรือไม่รองรับ Fullscreen API จะขยายเต็มพื้นที่หน้าเว็บแทน
- ภาพสวนวาดด้วย SVG ในโปรเจกต์ ไม่เรียกภาพ เพลง หรือฟอนต์จากบริการภายนอก

ตัวจับเวลาโฟกัส/พัก/Lock in ใช้งานจริงแล้ว ตั้งเวลาเป็นนาทีและวินาทีได้ จับเวลาบนเซิร์ฟเวอร์และเลือก Track พร้อม Recap เพื่อบันทึก ยอดเวลา ประวัติ สถิติรายวัน/7 วัน/เดือน Streak และ Daily Goals ใช้ข้อมูลจริงเฉพาะบัญชีหลังเข้าสู่ระบบ มีเสียง Background 3 แบบสำหรับทั้ง guest และสมาชิก

## Checkpoint 2.1: Supabase และ Role

- เชื่อมผ่าน browser client และ server client แบบแยก request พร้อม Proxy สำหรับ refresh session cookie โดยผู้เข้าชม Dashboard ตัวอย่างยังไม่ต้องล็อกอิน
- สร้าง `profiles` เก็บชื่อ รูป ภาษา ธีม เขตเวลา และเวลาแก้ไข ใช้ค่าเริ่มต้นไทย/สว่าง/Asia/Bangkok; รหัสผ่านและข้อมูลเข้าสู่ระบบอยู่ใน Supabase Auth
- สร้าง `user_roles` แยกจากโปรไฟล์ ทุกบัญชีใหม่เริ่มเป็น `user` ผ่าน trigger อัตโนมัติ ค่า role ใน user metadata หรือ JWT ไม่สามารถเปลี่ยนสิทธิ์จริงได้
- เปิด RLS และ GRANT เฉพาะที่จำเป็น พร้อม generated TypeScript types จากฐานข้อมูลจริง
- `getCurrentAccount()` ตรวจตัวตนกับ Supabase และอ่าน Role จากฐานข้อมูลใหม่ ส่วน `requireAdminPermission()` เตรียมไว้สำหรับ server actions ในขั้นถัดไป การถอนสิทธิ์จึงไม่ต้องรอ JWT refresh

| ความสามารถในขั้นนี้ | user | admin |
| --- | --- | --- |
| อ่าน/แก้ไขข้อมูลโปรไฟล์ | เฉพาะตนเอง | ทุกบัญชี |
| อ่าน Role | เฉพาะตนเอง | ทุกบัญชี |
| เปลี่ยน Role ผ่านเว็บ | ไม่ได้ | ไม่ได้ |
| สิทธิ์เตรียมไว้สำหรับอ่าน Track/log | เฉพาะข้อมูลตนเองเมื่อเพิ่มตาราง | `study_logs.read` สำหรับอ่านข้อมูลทุกคนเมื่อเพิ่มตาราง |
| สิทธิ์แก้/ลบข้อมูลการเรียนของคนอื่น | ไม่ได้ | ไม่ได้ |

การแต่งตั้ง admin ทำผ่าน MCP/ผู้ดูแลฐานข้อมูลที่เชื่อถือได้เมื่อมีบัญชีจริง ไม่มีการยกบัญชีแรกเป็น admin อัตโนมัติ หน้าจัดการบัญชีสำหรับ admin การระงับบัญชี และหน้าดู Track/log ยังไม่อยู่ใน 2.1/2.2; ตอนนี้เตรียม Role และสิทธิ์ไว้ก่อน ตาราง Track/ประวัติการเรียนจะมี RLS แบบอ่านอย่างเดียวสำหรับ admin เมื่อสร้างใน Checkpoint นั้น

Migration อยู่ใน `supabase/migrations/20261106060958_profiles_and_roles.sql` ตรงกับ migration history บน Supabase โปรเจกต์ `dcvzksaknhtwtzolezks` ใช้ imperative migrations; สร้างไฟล์ใหม่ด้วย Supabase CLI `migration new` หลังตรวจ `--help` และเมื่อ apply ผ่าน MCP ให้ใช้เลข version จริงจาก `list_migrations` เพื่อรักษาประวัติ local/remote ให้ตรงกัน อย่าใช้ `db push` ซ้ำกับ migration ที่ apply ไปแล้ว

ชุดทดสอบ `supabase/tests/profiles_roles.sql` ใช้ใน SQL Editor หรือ MCP ด้วยสิทธิ์ postgres สร้างบัญชีชั่วคราวใน transaction และ rollback ทั้งหมด ทดสอบ ownership, admin, การปลอม Role ใน metadata/JWT, การป้องกันยกระดับสิทธิ์, สิทธิ์ guest, validation และการถอนสิทธิ์ทันที ไม่สร้างบัญชีทดสอบถาวร

## Checkpoint 2.2: Login/Register และ Google Login

| URL | การใช้งาน |
| --- | --- |
| `/login` | อีเมล/รหัสผ่าน หรือ Google |
| `/register` | สมัครด้วยอีเมล/รหัสผ่าน ยืนยันรหัสผ่าน และยืนยันอีเมล หรือใช้ Google |
| `/forgot-password` | ขออีเมลตั้งรหัสผ่านใหม่ |
| `/auth/callback` | แลก PKCE code เป็น session cookie สำหรับ Google, email confirmation และ recovery |
| `/reset-password` | ตั้งรหัสผ่านใหม่หลังยืนยันลิงก์อีเมลล่าสุด |
| `/account` | เข้าหน้าโปรไฟล์โดยอัตโนมัติ รองรับลิงก์สถานะเดิม |
| `/account/profile` | ตั้งค่าโปรไฟล์ แก้ชื่อ และดูอีเมลบางส่วน |
| `/account/security` | ยืนยันอีเมลและเปลี่ยนรหัสผ่าน |
| `/history` | ประวัติรอบที่บันทึกจริง พร้อมเวลา วิชา และ Recap เฉพาะบัญชี |
| `/goals` | จัดการเป้าหมายรายวัน ผูก Track ติ๊กสำเร็จ และเลือกวันที่ย้อนหลัง/ล่วงหน้า |

- Dashboard เปิดดูตัวอย่างได้ทั้ง guest และสมาชิก ปุ่มเข้าสู่ระบบอยู่แถบบน เมื่อเข้าสู่ระบบแล้วจะแสดงชื่อ/Role และปุ่มออกจากระบบ
- ทุกหน้า Auth รองรับไทย/อังกฤษและ Light/Dark ใช้การตั้งค่าร่วมกับ Dashboard
- รหัสผ่านตรวจทั้งเบราว์เซอร์และ Server Action การสมัคร/เปลี่ยนรหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร; รหัสผ่านไม่ถูกส่งกลับมาใน form state
- Server Actions ใช้ cookie client ที่เขียน cookies ได้จริง ออกจากระบบด้วย POST action เฉพาะ session ปัจจุบัน และ invalidate router cache
- หน้าเกี่ยวกับบัญชีใช้ dynamic rendering และ private/no-store จึงไม่แชร์ข้อมูลระหว่างผู้ใช้; ตรวจตัวตนผ่าน `getUser()` และอ่าน Role จาก DB ทุกครั้ง
- Callback รับเฉพาะผลแลก code ที่สำเร็จ ไม่ใช้ `next` หรือ redirect URL จาก query string จึงไม่ redirect ไปโดเมนที่ผู้ใช้กรอก
- ใช้ callback ที่ allowlist ไว้เพียง `http://localhost:3000/auth/callback` การกู้รหัสผ่านใช้ PKCE ที่เก็บ verifier แบบเข้ารหัสฝั่งเซิร์ฟเวอร์ แทน intent cookie เดิม
- ลิงก์ยืนยัน/กู้รหัสผ่านต้องเปิดในเบราว์เซอร์เดิมที่เริ่มคำขอ เพราะใช้ PKCE หากลิงก์หมดอายุ ถูกยกเลิก หรือ browser ไม่ตรงกัน จะแสดงข้อความให้เริ่มใหม่

เปิด Google provider และ email provider แล้ว โดยตรวจพบว่าบัญชีอีเมลต้องยืนยันก่อนเข้าใช้งาน Google OAuth Client ID/Secret อยู่ใน Supabase ไม่อยู่ใน repository และไม่ได้เปลี่ยนการตั้งค่า Auth ของโปรเจกต์ในขั้นนี้

ทดสอบอีเมลด้วยที่อยู่ที่ Supabase อนุญาต หากยังใช้ SMTP เริ่มต้นจะส่งได้เฉพาะสมาชิกทีมและมี rate limit; ก่อนให้ผู้ใช้ทั่วไปสมัครด้วยอีเมลต้องตั้ง custom SMTP ตาม [เอกสาร Supabase](https://supabase.com/docs/guides/auth/auth-smtp) ไม่ได้สมัครหรือเปิดบริการส่งอีเมลเพิ่มในขั้นนี้

## Account settings redesign

- หน้า Account ใช้ layout ตั้งค่าบัญชีแยกจาก Login/Register แยกโปรไฟล์กับความปลอดภัยเป็นคนละ route และคนละ component จริง ใช้ `src/app/account/layout.tsx` กับ `src/components/account/account-shell.tsx` ร่วมกัน เมนูใช้ Next Link และ `aria-current` ตามหน้าปัจจุบัน เพิ่มหมวดใหม่ได้โดยสร้าง route/component แล้วเพิ่มเมนูใน sections รองรับไทย/อังกฤษ Light/Dark และมือถือ ไม่ส่ง Role มาเป็น props หรือแสดง Role ในหน้านี้
- หน้าย่อยแต่ละหน้าตรวจบัญชีฝั่งเซิร์ฟเวอร์ด้วย helper ร่วมที่ memoize เฉพาะ request หน้าโปรไฟล์รับเฉพาะข้อมูลโปรไฟล์ ส่วนสิทธิ์เปลี่ยนรหัสถูกอ่านเฉพาะหน้าความปลอดภัย Callback ยืนยันอีเมล/บันทึกรหัสผ่าน/การเข้าหน้า reset โดยไม่มีสิทธิ์กลับไป `/account/security` และยังรองรับลิงก์ `/account?status=...` เดิม
- แก้ชื่อที่แสดงได้ 1–80 ตัวอักษร ครั้งแรกได้ทันที ครั้งต่อไปต้องครบ 168 ชั่วโมงนับจากการเปลี่ยนจริง ฐานข้อมูลบังคับด้วย trigger รวมถึง API/admin; บันทึกชื่อเดิมไม่ใช้สิทธิ์ เปลี่ยน timestamp ผ่าน authenticated API ไม่ได้
- Migration `20261106081403_account_display_name_cooldown.sql` เพิ่ม `display_name_changed_at` และอัปเดต generated types ตรงกับ Supabase แล้ว ไม่เปลี่ยนชื่อบัญชีจริงที่มีอยู่
- อีเมลถูกปิดบังทั้งชื่อและโดเมนก่อนส่งเป็น Account props ไม่ใส่อีเมลเต็มใน hidden field ผู้รับลิงก์ยืนยันถูกอ่านจาก `getUser()` ฝั่งเซิร์ฟเวอร์
- ก่อนเปลี่ยนรหัสผ่านต้องกดส่งลิงก์ เปิดลิงก์ล่าสุดในเบราว์เซอร์เดิม แล้วตั้งรหัสผ่านใหม่ภายใน 10 นาที ใช้เทมเพลต Recovery email ของ Supabase เดิม หากตั้งเทมเพลตเองให้คงลิงก์ `{{ .ConfirmationURL }}` ที่รองรับ PKCE
- Callback ตรวจ encrypted PKCE challenge ที่เบราว์เซอร์อ่าน verifier ไม่ได้ แล้วออก HttpOnly grant ที่ผูกกับ user/session/account version เปิด URL ตรง ๆ ปลอม status/intent หรือ callback Google ไม่ปลดล็อก Server Action ตรวจ grant ซ้ำ และล้าง grant หลังบันทึก/ออกจากระบบ รหัสผ่านที่เปลี่ยนแล้วทำให้ grant เดิมใช้ซ้ำไม่ได้

ต้องมี `ACCOUNT_SECURITY_KEY` ฝั่งเซิร์ฟเวอร์ (เพิ่มใน `.env.local` ของเครื่องนี้แล้ว) สร้างแยกสำหรับ deployment ด้วย `rtk proxy node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('base64url'))"` แล้วใส่ใน secret environment ห้ามใช้ชื่อ `NEXT_PUBLIC_...` ห้าม commit key และใช้ค่าเดียวกันทุก instance หากเปลี่ยน key ลิงก์/การยืนยันที่ค้างอยู่ต้องเริ่มใหม่ ไม่ต้องเพิ่ม package

ขอบเขตความปลอดภัย: การบังคับยืนยันอีเมลทุกครั้งนี้อยู่ที่หน้าเว็บ/Server Actions ของแอป ส่วน Supabase Auth API โดยตรงยังใช้กติกาของ provider; Secure password change ของ Supabase อาจไม่ขอ reauthentication สำหรับ session อายุไม่ถึง 24 ชั่วโมง จึงไม่ได้อ้างว่าบล็อกการเรียก Auth API โดยตรงทุกกรณี และไม่ได้แก้ตารางภายใน Auth เพื่อเปลี่ยนนโยบายนี้ ดู [Supabase password security](https://supabase.com/docs/guides/auth/password-security)

ผลตรวจ:

- lint, TypeScript และ production build ผ่าน; `npm run test:account` ทดสอบ encrypted token (tamper/expiry/purpose/key), email masking และขอบเขต 168 ชั่วโมงผ่าน
- SQL `supabase/tests/account_settings.sql` ผ่าน: first rename, trim/no-op, cooldown, ป้องกันแก้ timestamp, ownership, admin และครบกำหนดแล้วเปลี่ยนได้ ใช้ transaction rollback ทั้งหมด; ชุด profiles/roles เดิมผ่านด้วย
- บัญชี QA ชั่วคราวบน Supabase จริง: เปลี่ยนชื่อแล้ว UI ล็อกพร้อมวันถัดไป อีเมลเต็มไม่อยู่ใน Account HTML/props ไม่แสดง Role ตรวจ 12 แบบ (375/768/1440 × ไทย/อังกฤษ × Light/Dark) ไม่มี overflow/JavaScript error
- ตรวจเปิด reset URL ตรง ๆ, ปลอม status/intent, challenge เสีย และการส่งคำขอเมื่อไม่มี grant ถูกปฏิเสธ ใช้ grant ที่จำลองโดยเซิร์ฟเวอร์เฉพาะ QA ทดสอบบันทึกรหัสผ่านจริง/ล้าง grant/ปฏิเสธ grant เดิมและ grant ต่าง session แล้วล็อกอินด้วยรหัสใหม่ได้ นี่ไม่ใช่ผลทดสอบการรับอีเมลจริง
- การส่งไปอีเมล QA ที่ใช้รับจดหมายไม่ได้แสดงข้อผิดพลาดและไม่ปลดล็อก ยังต้องตรวจการรับลิงก์และ callback อีเมลจริงกับบัญชีผู้ใช้ ไม่ได้ส่งอีเมลไปยังบัญชีจริงแทนผู้ใช้
- ออกจากระบบและลบเฉพาะบัญชี QA/sessions/profile/role แล้ว เหลือ QA 0 แถว บัญชีจริงเดิม 2 บัญชีอยู่ครบ
- หลังแยกหน้า ตรวจ 24 แบบ (2 หน้า × 375/768/1440 × ไทย/อังกฤษ × Light/Dark) แสดงเฉพาะหมวดที่เปิด เมนูเลือกถูก ไม่มี overflow/อีเมลเต็มใน HTML/JavaScript error ตรวจ direct URL, reload, Back, ลิงก์สถานะเก่า, guest protection และบันทึกชื่อแล้ว sidebar/cooldown อัปเดตได้ ออกจากระบบและลบ QA รอบนี้ครบ โดยไม่แก้ข้อมูลบัญชีจริง
- Performance Advisor ไม่พบรายการเตือน; Security Advisor แจ้งว่า Leaked Password Protection ยังปิดอยู่ ดู [วิธีตั้งค่า Supabase](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) ไม่มีการเปลี่ยนแพ็กเกจหรือเปิดบริการเสียเงิน

## Checkpoint 2.3: Track วิชาส่วนตัว

- `/tracks` ต้องเข้าสู่ระบบ เพิ่ม/แก้ชื่อ คำอธิบาย สี 5 แบบ และไอคอน 8 แบบ เลือกดูรายการใช้งานหรือเก็บไว้ แสดงหน้าละ 12 รายการพร้อมจำนวนและ pagination
- Track ที่เก็บไว้ยังอยู่ในฐานข้อมูล นำกลับมาใช้ได้โดยใช้ ID เดิม ไม่มีสิทธิ์ hard delete ผ่าน client เพื่อรักษาการอ้างอิงประวัติในขั้นถัดไป ชื่อซ้ำได้ ชื่อที่ผู้ใช้กรอกไม่เปลี่ยนตามภาษา UI
- บัญชีใหม่แสดง empty state และปุ่มสร้าง Track แรก Dashboard แสดง Track ใช้งานล่าสุดสูงสุด 3 รายการพร้อมทางไปจัดการ แทนข้อมูลวิชาตัวอย่างของสมาชิก ไม่มีการสร้าง Track ตัวอย่างลงบัญชีจริง
- ชื่อ 1–80 ตัวอักษร คำอธิบายไม่เกิน 280 ตัวอักษร ตรวจทั้ง Server Action/constraint ค่า color/icon ใช้ allowlist เท่านั้น แสดงชื่อ/คำอธิบายเป็นข้อความและไม่ใช้ raw HTML
- Migration `supabase/migrations/20261106091438_tracks.sql` ตรงกับ Supabase history และ generated types แล้ว ตาราง `tracks` เปิด RLS มี index owner/list และ active tracks เจ้าของเท่านั้นที่ insert/update ได้ จำกัดคอลัมน์ ไม่เปลี่ยนเจ้าของ/ID/audit timestamps ผ่าน API
- Admin อ่าน Track ของผู้ใช้เพื่อรองรับการดู log ผ่าน `study_logs.read` เดิมได้ แต่สร้าง/แก้/เก็บ Track ของคนอื่นไม่ได้ หน้าเว็บปกติกรองแสดงเฉพาะ Track ของตนเอง ยังไม่มีหน้าผู้ดูแล/log
- ไม่เพิ่ม package/บริการเสียเงิน และไม่เปลี่ยนข้อมูล/Role ของบัญชีจริง ตัวจับเวลา เวลาเรียน Recap และ Streak ยังไม่บันทึกจริง มีข้อความแยกชัดเจนจาก Track ที่บันทึกจริงแล้ว

ผลตรวจ 2.3:

- lint, TypeScript และ production build ผ่าน; `test:tracks` ผ่าน 4 กลุ่ม ครอบคลุม Unicode limits, whitespace, malicious options/fields และ route inputs
- `supabase/tests/tracks.sql` ทดสอบบน Supabase จริงด้วย rollback fixtures ผ่าน: ownership, guest, metadata role spoof, admin อ่านอย่างเดียว/ถอนสิทธิ์, ป้องกันเปลี่ยนเจ้าของ/เวลา, validation, archive/restore และห้าม hard delete
- Data API จริงผ่าน 10 checks ด้วย QA สองบัญชี: cross-user read/update/insert ปฏิเสธ, protected columns และ delete ปฏิเสธ, invalid color ปฏิเสธ, รายการ 14 แถวแบ่งหน้า 12 แถวถูกต้อง
- Browser QA: create/edit/color/icon, เก็บ/นำกลับมาใช้, refresh persistence, empty account, guest protection, Dashboard ล่าสุด 3 รายการ, การปลอม trackId ของอีกบัญชีใน Server Action ถูกปฏิเสธโดยข้อมูลปลายทางไม่เปลี่ยน
- ตรวจ pagination หน้า 2, page เกินขอบเขต และเก็บรายการสุดท้ายของหน้าจนกลับหน้าที่มีข้อมูลได้ ชื่อยาวและ HTML-like name แสดงเป็นข้อความ ไม่มี script/alert ทำงาน
- หน้ารายการ/ฟอร์มตรวจ 375/768/1440 × ไทย/อังกฤษ × Light/Dark รวม 12 รูปแบบต่อสถานะ รวมทั้งรายการยาว ไม่มี overflow/JavaScript error ภาพอยู่ใน `.playwright-mcp/`
- Dashboard สมาชิกตรวจ 12 รูปแบบเช่นกัน แสดง Track จริงสูงสุด 3 รายการ guest ยังเห็นตัวอย่างเดิม ตรวจ focus ใน dialog/Shift+Tab/Escape และ final-build create ผ่าน หน้า `/tracks` ตอบ private/no-store
- ออกจากระบบและลบ QA ทั้งสองบัญชีพร้อม sessions/Track ที่ cascade แล้ว ตรวจ QA เหลือ 0 แถว บัญชีจริงเดิม 2 บัญชีอยู่ครบ และไม่ได้เพิ่ม Track ตัวอย่างลงบัญชีจริง
- ไม่มี schema/RLS security warning ใหม่ Security Advisor ยังแจ้ง Leaked Password Protection เดิมตามลิงก์ข้างบน; index ใหม่มี INFO ว่ายังไม่ได้ใช้ในช่วงข้อมูลน้อย ซึ่งเก็บไว้รองรับ ownership/list queries ดู [Unused index advisory](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)

## Checkpoint 2.4: ตัวจับเวลาจริง

หัวข้อนี้บันทึกสถานะเมื่อจบ 2.4 ปัจจุบันเพิ่มระบบเซิร์ฟเวอร์และการบันทึกจริงใน 2.5 ด้านล่างแล้ว

- โฟกัสเริ่มต้น 25 นาที พัก 5 นาที เลือก preset หรือกำหนดเอง 1–180 นาที การตั้งค่าของสองโหมดแยกกัน เปลี่ยนโหมด/เวลาได้เมื่อพร้อมเริ่มรอบเท่านั้น
- เริ่ม หยุดชั่วคราว ทำต่อ จบรอบก่อนเวลา และล้างรอบได้ โดยขอยืนยันก่อนล้างเวลาที่ยังไม่จบ เมื่อจบแสดงสรุปเวลาจริงและเลือกเตรียมรอบใหม่/เปลี่ยนโหมดได้ ไม่มีการเริ่มรอบถัดไปอัตโนมัติ
- คำนวณจาก timestamp ไม่ได้นับจำนวน interval ticks เวลาที่หยุดชั่วคราวไม่ถูกนับ จำกัดเวลาที่สะสมไม่เกินระยะรอบและเก็บ completedAt เป็น deadline จริงเมื่อกลับมาหลังครบกำหนด
- เก็บสถานะใน localStorage แยก key `focusexam-timer:v1:<user UUID หรือ guest>` กู้หลัง refresh/navigation และซิงก์หลายแท็บผ่าน storage event ใช้ Web Locks เพื่อ serialize การเปลี่ยนสถานะเมื่อรองรับ หาก storage/locks ถูกบล็อกใช้ memory/synchronous fallback พร้อมข้อความแจ้งว่ากู้หลัง reload ไม่ได้
- โหมดเต็มหน้าจอเดิมใช้ได้ทั้ง native และ fallback มีปุ่มเสียง/ปุ่มออก โฟกัสคีย์บอร์ดอยู่ในพื้นที่จับเวลา และ dialog ล้างเวลารับ Escape ก่อนออกจาก fallback fullscreen
- สรุปรอบแบบ aria-live และเสียง Web Audio สองโน้ตเมื่อผู้ใช้เปิดเสียงและ browser อนุญาต เสียงเป็น best-effort หากเครื่องพัก/แท็บถูก suspend การแสดงผลและเสียงอาจรอจน browser กลับมารัน JavaScript ไม่มีการขอสิทธิ์ OS notification
- ตัวเลขถึง 180:00 รองรับจอเล็ก ภาษาไทย/อังกฤษ และ Light/Dark ใช้การตั้งค่าร่วมกับ Dashboard

ขอบเขต: เป็น timer ในเบราว์เซอร์ ไม่ซิงก์ข้ามเครื่อง ไม่เขียน session/Recap/Streak ลง Supabase และไม่นำตัวเลขไปเพิ่ม Track/รางวัล สถานะ local ไม่ใช่หลักฐานเวลาเรียนที่เชื่อถือได้และขึ้นกับนาฬิกาเครื่อง รอบใหม่แทนที่สรุปรอบล่าสุด ไม่ใช่ประวัติถาวร ไม่มี migration/package ใหม่ใน 2.4 รายละเอียดและผลตรวจอยู่ใน `docs/checkpoints/2.4-timer.md`

ผลตรวจ 2.4:

- lint/TypeScript/production build ผ่าน และ unit tests รวม 17 ข้อผ่าน (timer 9 + account/track 8)
- Browser จำลองเวลาทดสอบเริ่ม/หยุด/ทำต่อ จบก่อนเวลา refresh/navigation กลับมาหลัง deadline สรุปรอบ เสียง 2 โน้ต/ปิดเสียง และตั้งเวลา 120 นาทีผ่าน
- หลายแท็บซิงก์ state และ resume พร้อมกันยังเป็นรอบเดียว ทดสอบ storage/locks ถูกบล็อกและ randomUUID ไม่รองรับแล้ว fallback ใช้งานได้
- QA สองบัญชีและ guest แยก timer คนละ key กลับมาล็อกอินบัญชีเดิมได้เวลาของตนเอง ลบ QA/sessions/profile/role ครบ บัญชีจริงเดิม 2 บัญชีอยู่ครบ ไม่แก้ Track จริง
- ตรวจ native/fallback fullscreen 32 แบบ (4 ขนาด × 2 ภาษา × 2 ธีม × 2 วิธี) รวมตัวเลข 180:00 ไม่มี overflow/JavaScript error และตรวจการตั้งเวลา/dialog/focus ในจอตั้ง/แนวนอนซ้ำ 16 แบบผ่าน ตรวจภาพจริงแล้ว ไม่ได้อ้างว่าได้ทดสอบ OS wake-up/เสียงจากลำโพง/มือถือจริงหรือ Safari

## Checkpoint 2.5: วินาที, Lock in และบันทึกลง Track

- ตั้ง countdown เป็นนาที/วินาทีได้ 00:01–180:00; Lock in นับขึ้น HH:MM:SS ต่อเนื่อง ไม่มี deadline/บังคับพัก และไม่จำกัดที่ 8 ชั่วโมง เวลาที่ pause ไม่ถูกนับ
- รอบใหม่หลังเข้าสู่ระบบใช้ `timer_runs` กับ RPC ที่คำนวณเวลาฝั่ง DB มีรอบค้างได้หนึ่งรอบต่อบัญชี ปิดสิทธิ์ client insert/update/delete ตรง ๆ ใช้ private SECURITY DEFINER ที่ตรวจ auth.uid() และ public SECURITY INVOKER wrapper โดย revoke EXECUTE จาก anon/PUBLIC
- จบรอบแล้วเลือก Track ของตัวเองที่ยังใช้งาน เขียน Recap ไม่บังคับสูงสุด 2,000 ตัวอักษร แล้วเซฟลง `study_sessions` เวลาที่เครดิตมาจากเซิร์ฟเวอร์ ไม่รับชั่วโมงจากฟอร์ม รอบพักเซฟแยกได้โดยไม่เพิ่มเวลาเรียนใน Track
- Saved sessions เป็น immutable ผ่าน client; unique run_id และ transaction lock กัน retry/double save ยอด Track ใช้ผลรวมจริงแทน counter ที่ client แก้ได้ Admin อ่าน log ตาม `study_logs.read` เดิมได้ แต่ควบคุม/แก้/เซฟรอบของคนอื่นไม่ได้
- Track picker แบ่งโหลดครั้งละ 25 รองรับ Track มากกว่าหน้าแรก มี refresh รายการ; Save error คงเวลา/Recap ให้แก้แล้วลองใหม่ ก่อนทิ้งรอบที่ยังไม่เซฟต้องยืนยัน
- Dashboard กับหน้า Track แสดงเวลาสะสมจริง และ `/history` แสดงวิชา เวลา โหมด Recap และวันที่บันทึกเฉพาะบัญชี พร้อม pagination
- Migration `20261106104933_study_sessions.sql` และ `20261106105107_timer_duration_constraint.sql` ตรงกับ remote history พร้อม generated types แล้ว ไม่เพิ่ม dependency/บริการเสียเงิน
- รอบก่อนอัปเกรด/guest ยังจับเวลาต่อได้ แต่ไม่แปลงข้อมูล local ที่ไม่มี server anchor เป็นเครดิตย้อนหลัง มีข้อความแจ้งให้เริ่มรอบใหม่หลังเข้าสู่ระบบ รอบใหม่ที่เซิร์ฟเวอร์ยังค้างอยู่จะกู้เมื่อกด Start แทนสร้างรอบซ้ำ
- ต้องเชื่อมต่อสำหรับคำสั่งจับเวลาของสมาชิกและการเซฟ หากล้มเหลวรอบยังอยู่ ให้ลองใหม่หลังต่อเน็ต เวลาเป็น elapsed time ไม่ใช่หลักฐานว่าผู้ใช้กำลังอ่านจริง ไม่มีการเฝ้าดูพฤติกรรม

ผลตรวจ: lint/TypeScript/build และ unit tests 20 ข้อผ่าน; SQL rollback suite และ Data API จริง 17 checks ผ่าน รวม retry พร้อมกัน 5 ครั้ง เครดิตไม่ซ้ำ, owner/admin/guest, archived Track, การปลอม elapsed time และ immutable logs ตรวจ UI กรณีจำลอง 8 ชั่วโมง เซฟได้ 28,800 วินาที และ countdown จริง 1 วินาทีเพิ่ม Dashboard เป็น 08:00:01 ทันที โหลด Track 25→27 วิชา, Recap ยาว/เน็ตหลุด/ลองใหม่, ประวัติแยกบัญชีผ่าน

หน้าฟอร์ม/ประวัติตรวจอย่างละ 12 แบบ (375/768/1440 × ไทย/อังกฤษ × Light/Dark) และ native/fallback fullscreen ทั้งจอตั้ง/แนวนอน ไม่มี overflow/page error ตรวจภาพแล้ว ลบ QA ทั้งสองบัญชีพร้อม timer_runs/study_sessions/Track ครบเหลือ 0 แถว บัญชีจริงเดิม 2 บัญชีอยู่ครบ ไม่แก้ข้อมูล Track จริง การทดสอบ 8 ชั่วโมงใช้ model clock และ fixture DB เฉพาะ QA ไม่ใช่ทิ้งเครื่องจริง 8 ชั่วโมง ผลละเอียดใน `docs/checkpoints/2.5-lock-in-sessions.md`

Supabase advisors ไม่พบ schema/RLS/performance warning ใหม่ ส่วน Leaked Password Protection ที่ยังปิดอยู่เป็นรายการเดิม ดู [วิธีตั้งค่า](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

## Checkpoint 2.6: สถิติตามวันที่เรียนจริงและธีม startup

- `/statistics`: รายวัน, 7 วันย้อนหลัง, เดือนตามปฏิทิน เลือกเดือน/ปีและ Track รวมวิชาที่เก็บถาวรได้ โหลดตัวเลือกเพิ่มครั้งละ 25 รายการ
- ใช้เวลาจากเซิร์ฟเวอร์และเก็บช่วงที่จับจริงตอนเริ่ม/พัก/ต่อ/จบ ไม่มีการเขียนฐานข้อมูลทุกวินาที รอบที่ยังไม่บันทึกไม่เข้าในสถิติ
- แยกช่วงจับเวลาตามเที่ยงคืนในเขตเวลาที่บันทึกตอนเริ่ม รองรับข้ามเดือน/ปีและ DST 23/25 ชั่วโมง ตัดช่วง pause ออก และรวมเศษมิลลิวินาทีก่อนคิดเป็นวินาทีเพื่อให้ยอดรายวันรวมตรงกับรอบเสมอ
- Streak นับเฉพาะวันที่มีเวลาเรียนที่บันทึกแล้วอย่างน้อย 1 วินาที ไม่นับเวลาพัก และยังรักษา Streak ของเมื่อวานจนสิ้นวันนี้ แสดงค่าสูงสุดด้วย
- ตัวกรองวิชาใช้กับเวลาเรียน; เวลาพักและ Streak รวมทั้งบัญชี มีคำอธิบายในหน้าเว็บ
- ข้อมูลเดิมคงยอดใน Track/ประวัติ แต่ติดป้ายว่าแยกวันไม่ได้และไม่เข้าในกราฟ/Streak เพราะไม่มี timeline ช่วงพักครบถ้วน ไม่คาดเดาหรือย้ายทั้งหมดไปวันกด Save
- ธีมใช้สัดส่วนเชิงออกแบบ 70% neutral / 25% green / 5% violet พร้อม glow เบา ๆ, hover/press, chart selection, reduced motion; พื้น Account/Auth/Tracks/History ใช้ระบบสีร่วมกัน
- Migration `20261106170348_precise_statistics.sql` ใช้กับ Supabase แล้ว พร้อม generated TypeScript types, owner/admin read-only log RLS และ rollback tests ใน `supabase/tests/statistics.sql`

ผลตรวจ: lint, TypeScript, production build, unit tests 24 ข้อ และ guest Data API checks ผ่าน; SQL ทดสอบข้ามวัน/เดือน/ปี, pause, เศษวินาที, DST, เปลี่ยน timezone หลังเริ่ม, save ซ้ำ, legacy และสิทธิ์ข้ามบัญชีผ่าน Browser QA ตรวจ Dashboard/Statistics 24 รูปแบบ (375/768/1440 × ไทย/อังกฤษ × Light/Dark), Account/Tracks/History อีก 16 รูปแบบ, Auth บนมือถือ, Track ตัวเลือกมากกว่า 25/เก็บถาวร, บัญชีว่าง, และบันทึก countdown 1 วินาทีจริง โหมด fullscreen fallback ผ่านแนวตั้ง/แนวนอนและ Esc; browser ทดสอบนี้ไม่เปิด native fullscreen จึงยังควรลอง native บนเครื่องจริงอีกครั้ง ไม่มี package ใหม่

## Checkpoint 2.7: Daily Goals

- `/goals`: เพิ่ม/แก้ไข/ลบและติ๊กสำเร็จเอง ผูก Track ได้ เลือกวันที่ตามปฏิทินเพื่อดูย้อนหลังหรือวางแผนล่วงหน้า ครั้งละ 12 รายการ; ความคืบหน้านับทุกเป้าหมายของวันที่เลือก
- Dashboard แสดงวันนี้จริงสูงสุด 5 รายการ เพิ่มและติ๊กสำเร็จได้ทันที พร้อมลิงก์จัดการทั้งหมด ตัวจับเวลาที่กำลังทำงานไม่รีเซ็ตเมื่อบันทึกเป้าหมาย
- วันปัจจุบันอ้างอิง timezone ของโปรไฟล์จากฐานข้อมูล เป้าหมายเก็บวันที่ที่เลือกและ snapshot timezone เมื่อสร้าง เปลี่ยน timezone ภายหลังไม่ย้ายเป้าหมายเดิม เมื่อขึ้นวันใหม่แสดงรายการของวันใหม่โดยเก็บรายการเดิมไว้
- ตรวจวันที่ในเบราว์เซอร์ทุก 15 วินาที (ไม่เรียกฐานข้อมูลทุกครั้ง) และรีเฟรชจากเซิร์ฟเวอร์เมื่อวันเปลี่ยนหรือกลับมาที่แท็บ แท็บที่เลือกวันที่เฉพาะจะยังอยู่วันนั้น
- ผูกได้เฉพาะ Track ของตนที่ใช้งานอยู่ ลิงก์เดิมกับ Track ที่เก็บถาวรยังดู/แก้ไขเป้าหมาย/ถอดการผูกได้ เป้าหมายไม่เพิ่มเวลาเรียนหรือ Streak
- ตาราง `daily_goals` ใช้ owner-only RLS รวมถึง admin; completion timestamp/updated timestamp/revision ใช้ฐานข้อมูลกำหนดและตรวจ revision ก่อนแก้ไขเพื่อป้องกันแท็บเก่าเขียนทับ
- ใช้ migration `20261106175957_daily_goals.sql` และ `20261106180832_daily_goals_timezone_default.sql` พร้อม generated types และ rollback suite `supabase/tests/daily_goals.sql`; ไม่เพิ่ม package

ผลตรวจ: lint, TypeScript และ production build ผ่าน; unit tests รวม 27 ข้อและ SQL rollback suite ผ่าน Browser QA ครบ Dashboard/Goals 24 รูปแบบ (375/768/1440 × ไทย/อังกฤษ × Light/Dark) พร้อม dialog ทั้ง 12 รูปแบบ ตรวจ CRUD, ลบ/ยกเลิก, focus/Esc, ตัวเลือก Track มากกว่า 25 รายการ, Track เก็บถาวร, revision conflict, pagination, วันที่ผิด, วันย้อนหลัง/ล่วงหน้า, บัญชีว่าง/ไม่เห็นข้อมูลอีกบัญชี, guest redirect, reduced motion, focus refresh ข้ามแท็บ และ fullscreen fallback ข้อมูลทดสอบใช้บัญชีชั่วคราวและล้างออกหลังตรวจ

## Checkpoint 2.8: เสียงบรรยากาศ

- เสียงฝน คลื่นทะเล และ White Noise แบบ CC0 มีที่มา/ผู้สร้าง/ลิงก์ใบอนุญาตในเครื่องเล่นและ `public/audio/CREDITS.md` รายละเอียดไฟล์และ SHA-256 อยู่ใน `public/audio/licenses.json`
- ใช้ public HQ preview ของต้นฉบับจาก Freesound ตัดเป็นเสียงวน 59 วินาที crossfade 1 วินาที ปรับ loudness และบีบอัด MP3 mono 32 kHz/96 kbps ไฟล์ละประมาณ 709 KB รวมประมาณ 2.13 MB ไม่เรียก Freesound หรือ YouTube ขณะใช้งานเว็บ
- โหลดและ decode เฉพาะเมื่อกดเปิดเสียง ใช้ Web Audio looping buffer และ GainNode เปิด/หยุด เล่นต่อจากจุดเดิม สลับเสียง ปิดเสียง และปรับความดังได้ พร้อม loading/error/retry
- Host ที่ root layout รักษาเสียงระหว่างเปลี่ยนหน้าผ่านลิงก์ภายในเว็บ มีแถบควบคุมลอยและตั้งค่าเสียงจากตัวจับเวลา/เต็มจอ แยกความดัง Background จากแจ้งเตือนเวลาและลด Background ชั่วครู่เมื่อมีเสียงเตือน
- จำเสียง/ความดัง/สถานะปิดเสียง/ความดังแจ้งเตือนในอุปกรณ์ ไม่จำสถานะกำลังเล่น และไม่เริ่มเล่นเองหลังรีเฟรช มีการประสานผ่าน BroadcastChannel/Storage เพื่อหยุดแท็บเก่าเมื่อเริ่มจากแท็บใหม่
- หากเบราว์เซอร์พัก AudioContext แสดงสถานะให้กดเล่นต่อ ความสามารถเมื่อสลับแอป/ล็อกหน้าจอบนมือถือขึ้นกับเบราว์เซอร์และ OS; การทดสอบนี้ไม่รับรองการเล่นต่อขณะ OS ระงับแท็บ
- ไม่มีการเพิ่ม package หรือแก้ฐานข้อมูล การสร้างไฟล์เสียงใหม่ใช้ `rtk proxy node scripts/prepare-ambient-audio.mjs` และ FFmpeg ที่ติดตั้งอยู่แล้ว ขั้นตอนรันเว็บใช้ไฟล์สำเร็จรูปได้เลย

ผลตรวจ: unit tests รวม 35 ข้อ, lint, TypeScript และ production build ผ่าน ตรวจ hash/ถอดรหัสไฟล์เสียงครบทุกไฟล์และสัญญาณเสียงจริงในเบราว์เซอร์; UI 12 รูปแบบ (375/768/1440 × ไทย/อังกฤษ × Light/Dark), dock/dialog, เปิดครบ 3 เสียง, ปรับความดัง/ปิดเสียง, pause/resume, navigation ต่อเนื่อง, reload ไม่ autoplay, ข้ามแท็บ, ยกเลิกโหลด, ไฟล์โหลดผิดพลาดแล้ว retry, storage ถูกบล็อก, unsupported audio และ fullscreen fallback แนวตั้ง/แนวนอนพร้อม Esc รวมทั้ง countdown 1 วินาทีที่แจ้งเตือนแยกจาก Background ใช้บริบท guest แยกสำหรับ QA ไม่แก้ข้อมูลผู้ใช้

## Dashboard: แผงลอยสถิติและเสียง

- หน้าแรกวางตัวจับเวลากับ Daily Goals เป็นส่วนหลัก และย้ายกราฟรายสัปดาห์/มุมเสียงไปอยู่ในแผงเปิดจากปุ่มกลมสองปุ่มด้านขวาล่าง
- แผงสไลด์จากขอบขวาพร้อมฉากหลังโปร่งแสงค่อย ๆ fade/blur; สลับสถิติ/เสียงในแผงเดียวได้ ปิดด้วย X, Esc หรือคลิกด้านนอก และรองรับ reduced motion
- เก็บโฟกัสคีย์บอร์ดภายใน modal ล็อกการเลื่อนพื้นหลังและคืนโฟกัสเมื่อปิด ปุ่มเสียงมีจุดสถานะกำลังเล่น; หน้าแรกใช้ปุ่มกลมแทนแถบเล่นยาว ส่วนหน้าอื่นยังมีแถบเล่นเสียง
- เปิด/ปิดแผงไม่รีเซ็ตตัวจับเวลาหรือหยุดเสียง Daily Goals อยู่ถัดจากตัวจับเวลาทันทีบนจอเล็ก และ Track overview อยู่ถัดจากกลุ่มหลัก
- เมนูเสียงด้านข้างและลิงก์ `/#music` เปิดแผงเสียงได้ หน้าสถิติแบบเต็มยังใช้งานได้ตามเดิม
- ตรวจ 12 รูปแบบจอ/ภาษา/ธีม พร้อม keyboard, backdrop, deep link, scroll/landscape, audio continuity และ fullscreen fallback; lint/TypeScript/production build ผ่าน ไม่มี package หรือ database change

## Checkpoint 2.9: รายละเอียด Track และประวัติรายวิชา

- เปิดจากการ์ด Track ในหน้าแรกหรือรายการ Track ไปยัง `/tracks/[trackId]` แสดงชื่อ สี ไอคอน คำอธิบาย และสถานะเก็บถาวร
- สรุปเวลาเรียนสะสม วันนี้ สัปดาห์นี้ (จันทร์ถึงวันนี้) และเดือนนี้ โดยใช้รอบที่บันทึกลงวิชานั้นจริง
- กราฟรายวัน / 7 วัน / รายเดือน พร้อม tooltip เฉพาะเวลาเรียน; เวลาพักไม่มี Track จึงไม่รวมในหน้านี้
- ประวัติพร้อม Recap เลือกช่วงวันที่หรือดูทั้งหมด แบ่งหน้า 12 รอบ กรองจากวันที่เรียนจริงใน `session_day_allocations` รอบข้ามวันไม่ซ้ำรายการ และแสดงเวลาเฉพาะช่วงเทียบกับเวลาทั้งรอบ
- ข้อมูลเก่าที่แยกวันไม่ได้ยังรวมในยอดสะสมและประวัติทั้งหมด พร้อมคำอธิบาย ส่วนกราฟใช้ข้อมูลที่แยกวันได้แม่นยำ
- ตรวจเจ้าของทั้งหน้าเว็บและ RPC แบบ SECURITY INVOKER; Track ของบัญชีอื่นและ ID ที่ไม่ถูกต้องแสดงหน้าไม่พบข้อมูล บัญชี admin ต้องดูข้อมูลของตนเองใน flow นี้เช่นกัน
- ใช้ข้อมูลและ package เดิม เพิ่ม migration `20261108041501_track_detail_statistics.sql` และ generated types จาก Supabase จริง รายละเอียดการตรวจอยู่ใน `docs/checkpoints/2.9-track-details.md`

## ขั้นต่อไป

ทบทวนความพร้อมใช้งานจริงและเลือกขอบเขต checkpoint ถัดไปกับผู้ใช้ ยังไม่รวมระบบเตือนเว็บนอกการเรียน เหรียญ ร้านค้า หรือสกิน และยังไม่เพิ่มเพลง/อัปโหลดไฟล์ของผู้ใช้ในขั้นนี้

Supabase มีแผนฟรีพร้อมข้อจำกัดการใช้งาน: https://supabase.com/pricing ไม่ได้สมัครหรือเปิดบริการเสียเงินใด ๆ ในขั้นนี้

## ผลตรวจ Checkpoint 01

- ผ่าน ESLint, `tsc --noEmit` และ `next build` (Turbopack)
- ตรวจ lockfile ด้วย `npm ci --dry-run --offline --no-audit` สำเร็จ
- ตรวจใน Chromium ที่ 375, 768 และ 1440 พิกเซล ครบไทย/อังกฤษ × Light/Dark รวม 12 ชุด ไม่มีเนื้อหาล้นแนวนอนหรือ JavaScript error
- ปุ่มภาษา/ธีมใช้งานได้และคงค่าหลังรีเฟรช หากค่าที่เก็บเสียหายจะกลับไปใช้ไทย/สว่าง และหาก storage ถูกบล็อกยังสลับได้ในหน้าปัจจุบัน
- ตรวจการเข้าถึงเนื้อหาด้วยปุ่ม Tab และ skip link พร้อมตรวจภาพหน้า Desktop และ Mobile ทั้ง Light/Dark
- ตรวจ Full Screen จริงใน Chrome: เข้าได้และออกได้ด้วยปุ่มหรือ Esc; ตรวจโหมดสำรองเมื่อเบราว์เซอร์ปฏิเสธ Fullscreen API ครบสองภาษา/สองธีม ที่ 375×900, 768×1000, 1440×1000 และแนวนอน 812×375 รวม 16 ชุด ปุ่มออกไม่ถูกตัด โฟกัสคีย์บอร์ดอยู่ในหน้าจับเวลา และคืนการใช้งาน Dashboard หลังออก

ผลนี้ตรวจบนเครื่องพัฒนา Windows/Chromium ยังไม่ได้ทดสอบ Safari หรืออุปกรณ์มือถือจริง ภาพสำหรับตรวจอยู่ใน `.playwright-mcp/` ซึ่งไม่รวมใน source control

## ผลตรวจ Checkpoint 2.1

- Migration local และ Supabase history ตรงกัน ทั้ง `profiles` และ `user_roles` เปิด RLS
- ชุดทดสอบ SQL ผ่านและ rollback บัญชี/โปรไฟล์/Role ชั่วคราวทั้งหมด หลังจบยังมีบัญชีจริง 0 บัญชี จึงยังไม่มี admin จริง
- `npm run check:supabase` เชื่อม Data API จริงด้วยคีย์ใน `.env.local` สำเร็จ และยืนยันว่า guest ไม่มีสิทธิ์อ่านทั้งสองตาราง
- Security Advisor และ Performance Advisor ไม่พบรายการเตือนหลัง migration
- ผ่าน lint, TypeScript และ production build พร้อม Proxy
- Browser smoke test: Dashboard ตัวอย่างเปิดได้ สลับภาษา/ธีมและเข้า–ออก Full Screen ได้ ไม่มี JavaScript error

## ผลตรวจ Checkpoint 2.2

- ผ่าน lint, TypeScript และ production build
- ทดสอบกับ Supabase จริงด้วยบัญชี QA ชั่วคราวที่ยืนยันอีเมลไว้: login สำเร็จ, รหัสผ่านผิด, session หลัง reload, หน้าบัญชี, logout, การป้องกัน `/account` และ private/no-store ผ่าน
- เปลี่ยนรหัสผ่าน QA ผ่านหน้าเว็บแล้วใช้รหัสใหม่เข้าสู่ระบบได้ ทดสอบ Role user/admin จาก DB; การปลอม Role/ชื่อใน cookie ไม่เปลี่ยนสิทธิ์หรือชื่อจริง และ session ที่หมดอายุต่ออายุผ่าน Proxy ได้
- ตรวจ Google OAuth ถึงหน้า Google sign-in พร้อม PKCE S256 และ callback ตรงกับ allowlist โดยไม่มี invalid client/redirect URI error; ไม่ได้กรอกบัญชี Google จริงหรือกดอนุญาตแทนผู้ใช้
- ตรวจ registration validation: รหัสผ่านไม่ตรงกันแสดงข้อผิดพลาดและยังคงชื่อ/อีเมลไว้ ตรวจ callback ที่ยกเลิก/โค้ดผิด/พยายาม redirect ภายนอกและการป้องกัน `/reset-password` สำหรับ guest ผ่าน
- ตรวจ Login/Register/Forgot password รวม 36 ชุด ที่ 375/768/1440 พิกเซล × ไทย/อังกฤษ × Light/Dark ไม่มี overflow หรือ JavaScript error พร้อมตรวจภาพ Desktop/Mobile
- ออกจากระบบ QA และลบเฉพาะบัญชี QA พร้อม sessions/profile/role ที่เกี่ยวข้องแล้ว ตรวจเหลือ QA 0 แถว ไม่มี admin ทดสอบค้างอยู่
- ยังต้องตรวจการรับอีเมลยืนยัน/อีเมล recovery จริงและการยืนยัน Google ด้วยบัญชีผู้ใช้จริง จึงไม่ได้อ้างว่าทดสอบการส่งเมลหรือ consent ของ Google ครบวงจรแล้ว
