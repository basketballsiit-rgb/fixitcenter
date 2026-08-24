import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KITCHEN_CATEGORIES = [
  { code: 'K01', name: 'ข้าวกล่องปรุงสุกพร้อมรับประทาน (แจกจ่ายผู้ประสบภัย/ชุมชน)', tradeCode: 'KITCHEN', description: 'อาหารปรุงสด ข้าวกล่อง เมนูประจำวัน สำหรับแจกจ่ายบรรเทาทุกข์' },
  { code: 'K02', name: 'น้ำดื่มและเครื่องดื่มบริการประชาชน', tradeCode: 'KITCHEN', description: 'น้ำดื่มบรรจุขวด เครื่องดื่มสมุนไพร ชา กาแฟ บริการประชาชน' },
  { code: 'K03', name: 'ถุงยังชีพและอาหารแห้ง', tradeCode: 'KITCHEN', description: 'ข้าวสาร อาหารแห้ง บะหมี่กึ่งสำเร็จรูป ปลากระป๋อง' },
  { code: 'K99', name: 'บริการครัวอาชีวะอื่นๆ (ระบุรายละเอียด)', tradeCode: 'KITCHEN', description: 'งานบริการด้านโภชนาการและการแจกจ่ายอื่นๆ' },
  { code: 'E99', name: 'อุปกรณ์เครื่องใช้ไฟฟ้าอื่นๆ (ระบุรายละเอียด)', tradeCode: 'ELECTRICAL', description: 'เครื่องใช้ไฟฟ้าที่อยู่นอกเหนือรายการข้างต้น' },
  { code: 'X99', name: 'อุปกรณ์อิเล็กทรอนิกส์อื่นๆ (ระบุรายละเอียด)', tradeCode: 'ELECTRONICS', description: 'อุปกรณ์อิเล็กทรอนิกส์เบ็ดเตล็ด นอกเหนือรายการข้างต้น' },
  { code: 'A99', name: 'ยานยนต์/เครื่องยนต์อื่นๆ (ระบุรายละเอียด)', tradeCode: 'AUTOMOTIVE', description: 'ยานพาหนะหรือเครื่องยนต์การเกษตรอื่นๆ นอกเหนือรายการข้างต้น' },
];

async function main() {
  console.log('Seeding Kitchen & Other categories...');
  for (const cat of KITCHEN_CATEGORIES) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO repair_categories (id, code, name, trade_code, description, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4::"TradeCode", $5, true, NOW(), NOW())
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, trade_code = EXCLUDED.trade_code, description = EXCLUDED.description, is_active = true, updated_at = NOW()`,
      `cat_${cat.code.toLowerCase()}`,
      cat.code,
      cat.name,
      cat.tradeCode,
      cat.description
    );
    console.log(`  ✓ ${cat.code}: ${cat.name} (${cat.tradeCode})`);
  }
  console.log('Done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
