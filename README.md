# 🔧 NPC FixIt Center — Field Service Management (FSM) System
**ศูนย์ซ่อมสร้างเพื่อชุมชน (FixIt Center) วิทยาลัยสารพัดช่างน่าน**

![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![NestJS](https://img.shields.io/badge/NestJS-10-red)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)
![Redis](https://img.shields.io/badge/Redis-7-red)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)

ระบบบริหารจัดการงานซ่อมสร้างภาคสนามแบบ Multi-Center พร้อมระบบออกคิวงานอัตโนมัติ กระดานคิวอัจฉริยะ Smart TV เสียงเรียกภาษาไทย และสถิติบริการครัวอาชีวะช่วยเหลือชุมชน

> 📖 **คู่มือฉบับเต็มภาษาไทย**: อ่านเอกสารคู่มือการใช้งานและสถาปัตยกรรมอย่างละเอียดได้ที่ [**SYSTEM_MANUAL.md**](./SYSTEM_MANUAL.md)

---

## 🌟 จุดเด่นและฟีเจอร์หลัก (Key Features)

1. **จุดลงทะเบียนอัจฉริยะ (Smart Registration & Queue)**:
   - เสียบบัตรประจำตัวประชาชน Smart Card หรือสแกน OCR ผ่านกล้องมือถือ/แท็บเล็ต
   - ออกหมายเลขคิวอัตโนมัติแยกตาม 3 แผนกช่าง: ⚡ ไฟฟ้า (`E-xxx`), 💻 อิเล็กทรอนิกส์ (`X-xxx`), 🚗 ช่างยนต์ (`A-xxx`)
   - พิมพ์ใบรับงานซ่อมมาตรฐานราชการ (Official A4 Form) และป้ายแท็กติดเครื่อง (Device Strip Tag) พร้อม QR Code
2. **พื้นที่ปฏิบัติงานช่าง (Technician Workspace)**:
   - สแกน QR Code รับใบงาน ดูประวัติ และขยายภาพถ่ายสภาพเครื่องแบบ Lightbox (Zoom In/Out, Rotate)
   - บันทึกรายการอะไหล่และราคา พร้อมแจ้งเตือน Real-time ไปยังฝ่ายทะเบียนเพื่อโทรขออนุมัติจากลูกค้า
   - ระบบจบงานตรงที่ช่าง (Direct Completion) เพื่อความรวดเร็วและลดขั้นตอนที่ซ้ำซ้อน
3. **กระดานแสดงคิว Smart TV (Live Queue Board)**:
   - หน้าจอ Fullscreen สวยงาม คมชัด ตัวเลขคิวแสดงในบรรทัดเดียว (`Single-Line No Wrap`)
   - สไลด์วนคิวอัตโนมัติทุก 4 วินาทีเมื่อมีช่างหลายคนซ่อมงานพร้อมกัน
   - ระบบเสียงกระดิ่ง Ding-Dong พร้อมสังเคราะห์เสียงภาษาไทยเรียกคิวอัตโนมัติ (Thai Voice Announcement)
   - ค้างแสดงคิวที่ซ่อมเสร็จแล้วจนกว่าจะมีการเซ็นรับเครื่องจริง
4. **การส่งมอบเครื่องดิจิทัล (Digital Handover & Signatures)**:
   - รองรับการเซ็นชื่อบนหน้าจอมือถือ แท็บเล็ต และคอมพิวเตอร์อย่างราบรื่น
   - เมื่อส่งมอบเสร็จสิ้น ระบบจะปิดงาน (`CLOSED`) และตัดคิวออกจากหน้าจอ TV อัตโนมัติ
5. **ระบบครัวอาชีวะ (Relief Kitchen Tracker)**:
   - บันทึกสถิติการผลิตอาหารกล่อง น้ำดื่ม และเสบียงยังชีพแจกจ่ายชุมชน
6. **ความปลอดภัยและสิทธิ์การใช้งาน (Security & PDPA)**:
   - เข้ารหัสข้อมูลส่วนบุคคล (PII) ด้วย AES-256-GCM
   - จำกัดสิทธิ์การลบข้อมูลเฉพาะผู้ดูแลระบบใหญ่ (`ADMIN`) เท่านั้น ส่วนผู้ดูแลศูนย์และฝ่ายทะเบียนสามารถแก้ไขข้อมูลได้

---

## 📐 สถาปัตยกรรมระบบ (Architecture)

```
npc_fixitcenter/
├── apps/
│   ├── api/          # NestJS 10 Backend (REST API + WebSocket Gateway)
│   └── web/          # Next.js 14 Frontend (App Router + Tailwind + shadcn/ui)
├── packages/
│   └── shared/       # Shared TypeScript types & DTOs
├── prisma/           # PostgreSQL Schema, Migrations & Seeds
├── SYSTEM_MANUAL.md  # คู่มือการใช้งานระบบฉบับละเอียด
└── docker-compose.yml
```

---

## 🚀 การติดตั้งและเริ่มใช้งาน (Quick Start)

### ความต้องการของระบบ:
- Node.js ≥ 18
- pnpm ≥ 8 (`npm install -g pnpm`)
- PostgreSQL 15 (Port 5432)
- Redis 7 (Port 6379)

### 1. ติดตั้ง Dependencies
```bash
pnpm install
```

### 2. ตั้งค่าฐานข้อมูลและรัน Migration
```bash
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### 3. รันระบบ Development
```bash
pnpm dev
```
- 🌐 Frontend: [http://localhost:3000](http://localhost:3000)
- 🔌 Backend API: [http://localhost:3001/api](http://localhost:3001/api)
- 📚 Swagger Docs: [http://localhost:3001/api/docs](http://localhost:3001/api/docs)

---

## 👤 บัญชีผู้ใช้งานเริ่มต้น (Default Test Accounts)

| Username | Password | Role | บทบาท |
|---|---|---|---|
| `admin` | `NPC@2024!` | ADMIN | ผู้ดูแลระบบใหญ่ |
| `supervisor1` | `NPC@2024!` | SUPERVISOR | ผู้ดูแลประจำศูนย์ |
| `tech01` | `NPC@2024!` | TECHNICIAN | ช่างซ่อมประจำแผนก |
| `registrar1` | `NPC@2024!` | REGISTRAR | เจ้าหน้าที่รับลงทะเบียน |

---

## 🔄 คำสั่ง Auto-Sync ขึ้น GitHub
```bash
# Sync และ Push การเปลี่ยนแปลงขึ้น GitHub อัตโนมัติในคำสั่งเดียว
pnpm sync
```

---
*ระบบสารสนเทศบริหารจัดการงานซ่อม NPC FixIt Center — วิทยาลัยสารพัดช่างน่าน*
