
# BKK ULQ – District Heat Platform (0–1)

## เครื่องมือฟรีและยั่งยืน
- Google Forms → ประชาชนกรอกข้อมูล
- Google Sheets → เก็บคำตอบ
- Google Apps Script → คำนวณ 0–1 + Aggregate รายเขต (ดูไฟล์ apps_script_mapping_district.gs)
- GitHub Pages → โฮสต์เว็บแผนที่ฟรี

## ใช้ยังไง (สั้นที่สุด)
1) สร้าง Mapping (THAI_QUESTION,CODE) + Form Responses 1
2) วางโค้ด Apps Script แล้วตั้ง Trigger: From spreadsheet → On form submit
3) โค้ดจะสร้าง Aggregated_District (DISTRICT,SCORE,INTERVAL)
4) Publish ชีต Aggregated_District เป็น CSV
5) อัปโหลดเว็บนี้ขึ้น GitHub Pages แล้วเปิดเว็บ
6) วาง URL CSV และอัปโหลด GeoJSON/centroids (ถ้ามี) → เห็น Heat map + Choropleth + ตัวเลข

## CSV ที่เว็บต้องการ
DISTRICT|เขต, SCORE|คะแนน, INTERVAL|ช่วงชั้น

## ทดสอบด้วยไฟล์ตัวอย่าง
- sample-aggregated.csv
- sample-districts.geojson
- sample-centroids.csv
