# 🔧 NPC FixIt Center — Field Service Management System

ระบบบริหารจัดการงานซ่อมภาคสนาม (Field Service Management System) สำหรับโครงการ NPC

![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![NestJS](https://img.shields.io/badge/NestJS-10-red)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)
![Redis](https://img.shields.io/badge/Redis-7-red)

---

## 📐 Architecture

```
npc_fixitcenter/
├── apps/
│   ├── api/          # NestJS Backend (REST + WebSocket)
│   └── web/          # Next.js 14 Frontend
├── packages/
│   └── shared/       # Shared TypeScript types & constants
├── prisma/           # Database schema & migrations
└── docker-compose.yml
```

**Multi-tenant:** Data isolated by `center_id`  
**Mission-centric:** Grouped by `mission_id` (fiscal year)

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js ≥ 18
- pnpm ≥ 8 → `npm install -g pnpm`
- PostgreSQL 15 running on port 5432
- Redis 7 running on port 6379

### 1. Install dependencies
```bash
pnpm install
```

### 2. Configure environment
```bash
# Copy root env example
copy .env.example .env

# Copy API env
copy apps\api\.env.example apps\api\.env

# Copy Web env
copy apps\web\.env.local.example apps\web\.env.local
```
Edit `.env` with your PostgreSQL & Redis credentials.

### 3. Database setup
```bash
# Generate Prisma client
pnpm db:generate

# Run migrations
pnpm db:migrate

# Seed demo data (Thai demo data + default users)
pnpm db:seed
```

### 4. Start development servers
```bash
pnpm dev
```
- 🌐 Frontend: http://localhost:3000
- 🔌 API: http://localhost:3001
- 📚 Swagger: http://localhost:3001/api/docs

---

## 🐳 Docker (Recommended)

```bash
# Copy env
copy .env.example .env

# Start all services
docker-compose up -d

# Run migrations + seed inside container
docker-compose exec api pnpm db:migrate
docker-compose exec api pnpm db:seed
```

---

## 👤 Default Users (after seed)

| Username | Password | Role | Center |
|---|---|---|---|
| `admin` | `NPC@2024!` | ADMIN | Global |
| `supervisor1` | `NPC@2024!` | SUPERVISOR | ขอนแก่น |
| `tech01` | `NPC@2024!` | TECHNICIAN | ขอนแก่น |
| `tech02` | `NPC@2024!` | TECHNICIAN | ขอนแก่น |
| `registrar1` | `NPC@2024!` | REGISTRAR | ขอนแก่น |

---

## 📱 Modules

### Module A — Registration (PC/Tablet)
`http://localhost:3000/registration`
- Smart Card Reader simulator (WebSocket to PC/SC agent)
- Mobile OCR camera fallback
- Queue ticket generation (E-xxx / X-xxx / A-xxx)
- A4 Thai government print layout with QR code

### Module B — Technician Workspace (Mobile)
`http://localhost:3000/workspace`
- HTML5 QR code scanner
- Job details + status advancement
- Parts request form
- Kanban board view

### Module C — Supervisor QC (Tablet)
`http://localhost:3000/supervisor`
- 8-point safety inspection checklist
- Economic Value Calculator (parts cost vs market cost)
- Dual canvas signature pads
- Order approval workflow

### Module D — Executive Dashboard (PC)
`http://localhost:3000/dashboard`
- Multi-center / global toggle
- KPI cards + Recharts charts
- LINE Messaging API notifications

### Queue Board (Smart TV)
`http://localhost:3000/queue-board`
- Fullscreen dark display
- Real-time WebSocket updates
- 3-column trade layout (E/X/A)

---

## 🔒 Security

| Feature | Implementation |
|---|---|
| Authentication | JWT (access 15m + refresh 7d) |
| Password hashing | bcrypt (cost factor 12) |
| PII encryption | AES-256-GCM (Thai National ID, Name) |
| PII masking | Thai PDPA format: `x-xxxx-xxxxx-xx-x` |
| Authorization | RBAC with granular permissions |
| SQL injection | Prisma ORM parameterized queries |
| XSS | React + Next.js server-side rendering |
| CORS | Configured per environment |

---

## 🗄️ Database

### Key tables
- `users`, `roles`, `permissions`, `role_permissions` — RBAC
- `missions` — Fiscal year scoping
- `service_centers` — Multi-tenant root
- `customers` — AES-256-GCM encrypted PII
- `repair_orders` — Core state machine
- `trade_queue_counters` — Atomic queue (Redis + PostgreSQL sync)
- `status_history` — Full audit trail
- `signatures` — Canvas base64 storage
- `inspection_checklists` — QC JSON data
- `notifications` — LINE push history
- `audit_logs` — Security audit trail

---

## 🔄 Queue State Machine

```
PENDING → DIAGNOSING → WAITING_PARTS → REPAIRING → QC_PENDING → COMPLETED → CLOSED
                    ↘ REPAIRING ↗                 ↘ DIAGNOSING (send back)
Any state → CANCELLED (admin only)
```

---

## 📡 WebSocket Events

| Event | Direction | Payload |
|---|---|---|
| `join:center` | Client → Server | `{ centerId }` |
| `join:dashboard` | Client → Server | — |
| `order:new` | Server → Client | `{ order }` |
| `order:status` | Server → Client | `{ orderId, status, queueNumber }` |
| `queue:update` | Server → Client | `{ tradeCode, count }` |
| `dashboard:update` | Server → Client | `{ summary }` |

---

## 🔔 LINE Notifications

Set `LINE_CHANNEL_ACCESS_TOKEN` in `.env`. Notifications are sent when:
- New order registered (to center's LINE group)
- Order reaches QC_PENDING
- Order completed

---

## 📜 API Reference

Swagger UI: `http://localhost:3001/api/docs`

Key endpoints:
```
POST   /auth/login
POST   /auth/refresh
GET    /missions
GET    /centers?missionId=
POST   /customers
GET    /customers/:id
POST   /repair-orders
GET    /repair-orders?centerId=&status=&tradeCode=
GET    /repair-orders/qr/:token        ← QR scan endpoint
PATCH  /repair-orders/:id/status
POST   /repair-orders/:id/signature
POST   /repair-orders/:id/checklist
GET    /dashboard/summary?centerId=
GET    /dashboard/queue-board?centerId=
```

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui + Radix UI |
| State | Zustand |
| Charts | Recharts |
| Backend | NestJS 10 + TypeScript |
| ORM | Prisma 5 |
| Primary DB | PostgreSQL 15 |
| Cache/Queue | Redis 7 |
| Real-time | Socket.io |
| Auth | JWT + Passport |
| Font | Sarabun (Google Fonts) |
| Monorepo | Turborepo + pnpm workspaces |

---

## 📄 License

Internal NPC project — not for public distribution.
