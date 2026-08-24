# 🚀 คู่มือการนำระบบขึ้นติดตั้งบน Server หลักของวิทยาลัย (Deployment Guide)
## NPC FixIt Center — Field Service Management System

เอกสารนี้อธิบายขั้นตอนการนำโค้ดจาก **GitHub (`https://github.com/basketballsiit-rgb/fixitcenter.git`)** ไปติดตั้งและเปิดใช้งานบนเครื่อง Server ของวิทยาลัยอย่างเป็นขั้นตอน เข้าใจง่าย และปลอดภัย

---

## 📋 สารบัญ
1. [การเตรียมเครื่อง Server ของวิทยาลัย (Server Prerequisites)](#1-การเตรียมเครื่อง-server-ของวิทยาลัย-server-prerequisites)
2. [วิธีที่ 1: ติดตั้งผ่าน Docker Compose (วิธีที่แนะนำและง่ายที่สุด)](#2-วิธีที่-1-ติดตั้งผ่าน-docker-compose-วิธีที่แนะนำและง่ายที่สุด)
3. [วิธีที่ 2: ติดตั้งแบบแยก Service (Node.js + PM2 + PostgreSQL)](#3-วิธีที่-2-ติดตั้งแบบแยก-service-nodejs--pm2--postgresql)
4. [การตั้งค่า Nginx Reverse Proxy และเปิดใช้งาน HTTPS (SSL)](#4-การตั้งค่า-nginx-reverse-proxy-และเปิดใช้งาน-https-ssl)
5. [ขั้นตอนการอัปเดตโค้ดเมื่อมีการแก้ไขในอนาคต (Updating the System)](#5-ขั้นตอนการอัปเดตโค้ดเมื่อมีการแก้ไขในอนาคต-updating-the-system)
6. [การตั้งค่า Auto-Deploy อัตโนมัติผ่าน GitHub Actions / Webhook](#6-การตั้งค่า-auto-deploy-อัตโนมัติผ่าน-github-actions--webhook)

---

## 1. การเตรียมเครื่อง Server ของวิทยาลัย (Server Prerequisites)

เครื่อง Server ของวิทยาลัย (เช่น Ubuntu Server 22.04 LTS / Debian หรือ Windows Server) ควรมีคุณสมบัติดังนี้:
* **CPU**: 2 Cores ขึ้นไป (แนะนำ 4 Cores)
* **RAM**: 4 GB ขึ้นไป (แนะนำ 8 GB)
* **พื้นที่เก็บข้อมูล (Storage)**: 20 GB ขึ้นไป
* **การเปิด Port ใน Firewall ของวิทยาลัย**:
  * `Port 80` (HTTP) และ `Port 443` (HTTPS)
  * หากเปิดใช้งานภายในเครือข่ายวิทยาลัย (Intranet): Port `3000` (Frontend) และ `3001` (Backend API)

---

## 2. วิธีที่ 1: ติดตั้งผ่าน Docker Compose (วิธีที่แนะนำและง่ายที่สุด) ⭐

วิธีนี้สะดวกรวดเร็วที่สุด เพราะ Docker จะจัดการติดตั้ง PostgreSQL, Redis, NestJS Backend และ Next.js Frontend ให้ครบในตัวเอง โดยไม่กวนกับโปรแกรมอื่นๆ ใน Server

### ขั้นตอนที่ 1.1: เข้าสู่เครื่อง Server ผ่าน SSH หรือ Terminal
```bash
ssh username@ip-server-วิทยาลัย
```

### ขั้นตอนที่ 1.2: ติดตั้ง Git และ Docker (หากเครื่องยังไม่มี)

* **สำหรับ CentOS 9 Stream / RHEL 9**:
```bash
# 1. ติดตั้ง Git และเครื่องมือพื้นฐาน
sudo dnf install -y git curl dnf-plugins-core

# 2. เพิ่ม Docker Repository สำหรับ CentOS
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

# 3. ติดตั้ง Docker Engine และ Docker Compose Plugin
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 4. เปิดใช้งานและสั่งให้ Docker เริ่มทำงานอัตโนมัติ
sudo systemctl enable --now docker

# 5. เปิด Port ใน Firewall ของ CentOS 9 (firewalld)
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --permanent --add-port=80/tcp
sudo firewall-cmd --permanent --add-port=443/tcp
sudo firewall-cmd --reload
```

* **สำหรับ Ubuntu / Debian**:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl docker.io docker-compose
sudo systemctl enable --now docker
```

### ขั้นตอนที่ 1.3: โคลนโค้ดจาก GitHub (Clone Repository)
```bash
# ไปที่ไดเรกทอรีสำหรับเก็บโปรเจกต์ เช่น /var/www หรือ home directory
cd /var/www
sudo git clone https://github.com/basketballsiit-rgb/fixitcenter.git
cd fixitcenter
```

### ขั้นตอนที่ 1.4: ตั้งค่าตัวแปรสภาพแวดล้อม (Environment Variables)
```bash
# คัดลอกไฟล์ตัวอย่าง .env
cp .env.example .env
```
เปิดแก้ไขไฟล์ `.env` ด้วย nano หรือ vim:
```bash
nano .env
```
> ปรับค่ารหัสผ่านฐานข้อมูล (`POSTGRES_PASSWORD`), `JWT_SECRET` และคีย์ความปลอดภัยตามต้องการ แล้วกด `Ctrl + O` เพื่อบันทึก และ `Ctrl + X` เพื่อออก

### ขั้นตอนที่ 1.5: สั่งรันระบบทั้งหมดด้วย Docker Compose
```bash
sudo docker-compose up -d --build
```

### ขั้นตอนที่ 1.6: เตรียมโครงสร้างฐานข้อมูลเริ่มต้น (Database Migration & Demo Data)
```bash
# สั่ง Migration ตารางฐานข้อมูลภายใน Container
sudo docker-compose exec api pnpm db:migrate

# สร้างข้อมูลศูนย์บริการ และบัญชีผู้ใช้เริ่มต้น
sudo docker-compose exec api pnpm db:seed
```

🎉 **เสร็จสิ้น!** ระบบจะเปิดให้บริการทันที:
* **Frontend เว็บไซต์**: `http://IP-SERVER:3000`
* **Backend API / Swagger**: `http://IP-SERVER:3001/api/docs`

---

## 3. วิธีที่ 2: ติดตั้งแบบแยก Service (Node.js + PM2 + PostgreSQL)

สำหรับ Server ที่ต้องการรันโปรแกรมบนระบบปฏิบัติการโดยตรง

### ขั้นตอนที่ 2.1: ติดตั้ง Node.js 18+, PNPM, PostgreSQL 15, Redis 7
```bash
# ติดตั้ง Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs postgresql postgresql-contrib redis-server

# ติดตั้ง pnpm และ pm2
sudo npm install -g pnpm pm2
```

### ขั้นตอนที่ 2.2: โคลนโค้ดและติดตั้ง Packages
```bash
cd /var/www
sudo git clone https://github.com/basketballsiit-rgb/fixitcenter.git
cd fixitcenter
pnpm install
```

### ขั้นตอนที่ 2.3: สร้างฐานข้อมูล PostgreSQL
```bash
sudo -u postgres psql -c "CREATE USER npc_user WITH PASSWORD 'npc_secret_2024';"
sudo -u postgres psql -c "CREATE DATABASE npc_fixitcenter OWNER npc_user;"
```

### ขั้นตอนที่ 2.4: รัน Migration และ Build ระบบ
```bash
# คัดลอกและตั้งค่า .env
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

# รัน Migration
pnpm db:generate
pnpm db:migrate
pnpm db:seed

# Build ระบบสำหรับ Production
pnpm build
```

### ขั้นตอนที่ 2.5: รัน Background Process ด้วย PM2
```bash
# รัน Backend API
pm2 start apps/api/dist/main.js --name "npc-api"

# รัน Next.js Frontend
pm2 start "pnpm --filter @npc/web start" --name "npc-web"

# บันทึกสถานะให้เริ่มทำงานใหม่อัตโนมัติเมื่อเครื่อง Server รีสตาร์ท
pm2 save
pm2 startup
```

---

## 4. การตั้งค่า Nginx Reverse Proxy และเปิดใช้งาน HTTPS (SSL)

เพื่อให้บุคลากรและประชาชนเข้าใช้งานผ่านชื่อโดเมนของวิทยาลัย เช่น `https://fixit.nanpoly.ac.th` หรือผ่าน `Port 80/443` ได้โดยตรง

### ติดตั้ง Nginx และ Certbot
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### สร้างไฟล์ Config ของ Nginx
```bash
sudo nano /etc/nginx/sites-available/fixitcenter
```
วางเนื้อหาต่อไปนี้ (เปลี่ยน `fixit.nanpoly.ac.th` เป็นโดเมนหรือ IP ของวิทยาลัย):
```nginx
server {
    listen 80;
    server_name fixit.nanpoly.ac.th; # หรือ IP ของ Server

    # Next.js Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # NestJS API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

### เปิดใช้งานและออกใบรับรอง SSL ฟรี (Let's Encrypt)
```bash
sudo ln -s /etc/nginx/sites-available/fixitcenter /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# ขอ SSL HTTPS ฟรี
sudo certbot --nginx -d fixit.nanpoly.ac.th
```

---

## 5. ขั้นตอนการอัปเดตโค้ดเมื่อมีการแก้ไขในอนาคต (Updating the System)

เมื่อมีการพัฒนาหรือแก้ไขโค้ดและ Push ขึ้นสู่ GitHub แล้ว ที่เครื่อง Server วิทยาลัยสามารถอัปเดตได้ด้วยคำสั่งง่ายๆ ดังนี้:

### กรณีใช้งาน Docker Compose (รันสคริปต์ `./deploy.sh` หรือพิมพ์คำสั่ง):
```bash
cd /var/www/fixitcenter
git pull origin main
sudo docker-compose up -d --build
sudo docker-compose exec api pnpm db:migrate
```

### กรณีใช้งาน PM2:
```bash
cd /var/www/fixitcenter
git pull origin main
pnpm install
pnpm db:migrate
pnpm build
pm2 reload all
```

---

## 6. การตั้งค่า Auto-Deploy อัตโนมัติผ่าน GitHub Actions / Webhook

หากต้องการให้ **ทุกครั้งที่นักพัฒนา Push โค้ดขึ้น GitHub แล้ว Server ของวิทยาลัยจะดึงโค้ดและอัปเดตตัวเองอัตโนมัติ 100%**:

### แนวทาง A: ติดตั้ง Webhook Receiver บน Server วิทยาลัย
1. ติดตั้ง Webhook Receiver (เช่น `adnanh/webhook` หรือ Node.js Webhook listener)
2. เมื่อ GitHub มี Event `push` จะส่งสัญญาณมาที่ `http://SERVER-IP:9000/hooks/deploy`
3. Server จะรันสคริปต์ `deploy.sh` อัตโนมัติ

### แนวทาง B: GitHub Actions SSH Deploy
1. สร้างไฟล์ `.github/workflows/deploy.yml` บน GitHub
2. เก็บ SSH Key ของ Server วิทยาลัยไว้ใน **GitHub Repository Secrets** (`SERVER_HOST`, `SERVER_USER`, `SSH_PRIVATE_KEY`)
3. เมื่อมี Commit ใหม่บน Branch `main` GitHub Action จะ SSH เข้าไปที่เครื่อง Server และสั่งรันอัปเดตให้อัตโนมัติ

---
*เอกสารจัดทำเพื่อสนับสนุนการติดตั้งระบบงานซ่อม FixIt Center วิทยาลัยสารพัดช่างน่าน*
