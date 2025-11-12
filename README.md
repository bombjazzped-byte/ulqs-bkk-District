
# Aggregated Viewer (0–1) — Bangkok ULQ (รายเขต)

## ใช้ยังไง (คนไม่รู้ IT)
1) อัปโหลดไฟล์ทั้งโฟลเดอร์นี้ขึ้น GitHub Repo (Public) → Settings → Pages → Deploy from branch (main/root)
2) เปิดลิงก์ GitHub Pages ของคุณ
3) วาง URL CSV ที่ Publish จาก Google Sheets (ชีต Aggregated) แล้วกด “โหลดข้อมูล”
4) ถ้ามีปัญหา ให้กด “เลือกไฟล์” เพื่ออัปโหลด CSV จากเครื่องแทน

## CSV ต้องมีคอลัมน์
- DISTRICT (หรือ “เขต”)
- SCORE (หรือ “คะแนน”) — เลข 0–1 ปัด 2 ตำแหน่ง
- INTERVAL (หรือ “ช่วงชั้น”) — แย่มาก/แย่/ปานกลาง/ดี/ดีมาก

## แก้ Failed to fetch
- ห้ามเปิดเว็บไฟล์ด้วย `file://` → ต้องเปิดจาก GitHub Pages (https://…github.io/…)
- ใน Google Sheets ให้ใช้ File → Share → Publish to the web → เลือกชีต Aggregated → CSV
- ตั้งสิทธิ์ Anyone with the link (View)

## ไลบรารี
- Chart.js และ Papa Parse (ผ่าน CDN)
