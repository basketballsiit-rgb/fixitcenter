import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const STANDARD_CATEGORIES = [
  // ─── แผนกช่างไฟฟ้า (ELECTRICAL) ───────────────────────────
  { code: 'E01', name: 'พัดลม (ทุกชนิด)', tradeCode: 'ELECTRICAL', description: 'พัดลมตั้งโต๊ะ, พัดลมติดผนัง, พัดลมไอเย็น' },
  { code: 'E02', name: 'หม้อหุงข้าวไฟฟ้า', tradeCode: 'ELECTRICAL', description: 'หม้อหุงข้าวดิจิทัล, หม้อหุงข้าวอุ่นทิพย์' },
  { code: 'E03', name: 'เตารีดผ้า', tradeCode: 'ELECTRICAL', description: 'เตารีดแห้ง, เตารีดไอน้ำ' },
  { code: 'E04', name: 'กาน้ำร้อนไฟฟ้า / กระติกน้ำร้อน', tradeCode: 'ELECTRICAL', description: 'กระติกน้ำร้อนระบบปั๊ม, กาต้มน้ำไฟฟ้า' },
  { code: 'E05', name: 'เครื่องซักผ้า', tradeCode: 'ELECTRICAL', description: 'ฝาบน, ฝาหน้า, 2 ถัง' },
  { code: 'E06', name: 'ตู้เย็น / ตู้แช่', tradeCode: 'ELECTRICAL', description: 'ตู้เย็น 1 ประตู, 2 ประตู, ตู้แช่แข็ง' },
  { code: 'E07', name: 'เครื่องปรับอากาศ', tradeCode: 'ELECTRICAL', description: 'แอร์บ้าน, แอร์เคลื่อนที่' },
  { code: 'E08', name: 'เครื่องปั่นน้ำผลไม้ / เครื่องบดสับ', tradeCode: 'ELECTRICAL', description: 'เครื่องปั่นอเนกประสงค์' },
  { code: 'E09', name: 'เตาไมโครเวฟ / เตาอบไฟฟ้า', tradeCode: 'ELECTRICAL', description: 'ไมโครเวฟ, หม้อทอดไร้น้ำมัน' },
  { code: 'E10', name: 'เครื่องทำน้ำอุ่นไฟฟ้า', tradeCode: 'ELECTRICAL', description: 'เครื่องทำน้ำอุ่นระบบหม้อต้ม' },
  { code: 'E99', name: 'เครื่องใช้ไฟฟ้าทั่วไปอื่นๆ', tradeCode: 'ELECTRICAL', description: 'อุปกรณ์ไฟฟ้าเบ็ดเตล็ด' },

  // ─── แผนกช่างอิเล็กทรอนิกส์ (ELECTRONICS) ────────────────
  { code: 'X01', name: 'โทรทัศน์ / Smart TV', tradeCode: 'ELECTRONICS', description: 'ทีวี LED, LCD, OLED, Android TV' },
  { code: 'X02', name: 'เครื่องเสียง / ลำโพง / แอมป์ขยาย', tradeCode: 'ELECTRONICS', description: 'ลำโพงบลูทูธ, แอมป์คาราโอเกะ, มิกเซอร์' },
  { code: 'X03', name: 'คอมพิวเตอร์ / โน้ตบุ๊ก', tradeCode: 'ELECTRONICS', description: 'PC ตั้งโต๊ะ, All-in-One, Laptop' },
  { code: 'X04', name: 'สมาร์ทโฟน / แท็บเล็ต', tradeCode: 'ELECTRONICS', description: 'โทรศัพท์มือถือ, แท็บเล็ต iPad/Android' },
  { code: 'X05', name: 'เครื่องพิมพ์ / พรินเตอร์ / สแกนเนอร์', tradeCode: 'ELECTRONICS', description: 'Inkjet, Laser, Dot Matrix' },
  { code: 'X06', name: 'กล้องวงจรปิด / อุปกรณ์เครือข่าย', tradeCode: 'ELECTRONICS', description: 'CCTV, Router Wi-Fi, กล่องรับสัญญาณ' },
  { code: 'X99', name: 'อุปกรณ์อิเล็กทรอนิกส์ทั่วไปอื่นๆ', tradeCode: 'ELECTRONICS', description: 'อุปกรณ์อิเล็กทรอนิกส์เบ็ดเตล็ด' },

  // ─── แผนกช่างยนต์ (AUTOMOTIVE) ───────────────────────────
  { code: 'A01', name: 'รถจักรยานยนต์ — ระบบเครื่องยนต์', tradeCode: 'AUTOMOTIVE', description: 'เครื่องยนต์สตาร์ทไม่ติด, เดินเบาดับ, ล้างคาร์บู/หัวฉีด' },
  { code: 'A02', name: 'รถจักรยานยนต์ — ระบบไฟฟ้า/สตาร์ท', tradeCode: 'AUTOMOTIVE', description: 'แบตเตอรี่, ไดสตาร์ท, ระบบไฟเลี้ยว/ไฟหน้า' },
  { code: 'A03', name: 'รถจักรยานยนต์ — เปลี่ยนถ่ายของเหลว/ไส้กรอง', tradeCode: 'AUTOMOTIVE', description: 'เปลี่ยนน้ำมันเครื่อง, น้ำมันเกียร์, ไส้กรองอากาศ' },
  { code: 'A04', name: 'รถจักรยานยนต์ — ระบบเบรกและช่วงล่าง', tradeCode: 'AUTOMOTIVE', description: 'เปลี่ยนผ้าเบรก, ปรับตั้งโซ่, ซ่อมโช้ค' },
  { code: 'A05', name: 'เครื่องยนต์การเกษตร / เครื่องตัดหญ้า', tradeCode: 'AUTOMOTIVE', description: 'เครื่องตัดหญ้าสะพาย, ปั๊มน้ำการเกษตร, เครื่องพ่นยา' },
  { code: 'A06', name: 'รถยนต์ขนาดเล็ก — ตรวจเช็กเบื้องต้น', tradeCode: 'AUTOMOTIVE', description: 'ตรวจเช็กแบตเตอรี่, ไฟส่องสว่าง, ลมยาง' },
  { code: 'A99', name: 'ยานยนต์และเครื่องยนต์ทั่วไปอื่นๆ', tradeCode: 'AUTOMOTIVE', description: 'งานบริการเครื่องยนต์และยานยนต์เบ็ดเตล็ด' },
];

async function seedCategories() {
  console.log('Seeding repair categories via SQL...');
  for (const cat of STANDARD_CATEGORIES) {
    const id = `cat_${cat.code.toLowerCase()}`;
    await prisma.$executeRawUnsafe(`
      INSERT INTO repair_categories (id, code, name, trade_code, description, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4::"TradeCode", $5, true, NOW(), NOW())
      ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name, trade_code = EXCLUDED.trade_code, description = EXCLUDED.description, updated_at = NOW();
    `, id, cat.code, cat.name, cat.tradeCode, cat.description);
  }
  const result: any[] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int as count FROM repair_categories;`);
  console.log(`✓ Seeded ${result[0]?.count} standard repair categories successfully.`);
}

seedCategories()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
