import {
  PrismaClient,
  TradeCode,
  RepairStatus,
  SignatureType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// ─── AES-256-GCM helpers (mirrors AesService in the API) ───────────────────
const rawKey = (process.env.AES_KEY || '0123456789abcdef0123456789abcdef').padEnd(32, '0').slice(0, 32);
const AES_KEY = Buffer.from(rawKey, 'utf8');

function encrypt(text: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', AES_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

// ─── Seed data ───────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱  Seeding database...');

  // ── Permissions ──────────────────────────────────────────────────────────
  const permissionDefs = [
    { action: 'dashboard:view',         description: 'View executive dashboard' },
    { action: 'repair_orders:create',   description: 'Create repair order' },
    { action: 'repair_orders:read',     description: 'Read repair order' },
    { action: 'repair_orders:update',   description: 'Update repair order' },
    { action: 'repair_orders:delete',   description: 'Delete repair order' },
    { action: 'customers:create',       description: 'Register customer' },
    { action: 'customers:read',         description: 'View customer data' },
    { action: 'customers:pii:decrypt',  description: 'Decrypt PII fields' },
    { action: 'checklist:manage',       description: 'Manage QC checklists' },
    { action: 'signature:manage',       description: 'Capture signatures' },
    { action: 'users:manage',           description: 'Manage system users' },
    { action: 'centers:manage',         description: 'Manage service centers' },
    { action: 'missions:manage',        description: 'Manage missions' },
    { action: 'notifications:send',     description: 'Send LINE notifications' },
    { action: 'queue_board:view',       description: 'View public queue board' },
  ];

  const permissions = await Promise.all(
    permissionDefs.map((p) =>
      prisma.permission.upsert({
        where: { action: p.action },
        update: {},
        create: p,
      }),
    ),
  );
  console.log(`  ✓ ${permissions.length} permissions`);

  // ── Roles ─────────────────────────────────────────────────────────────────
  const rolesData = [
    {
      name: 'ADMIN',
      description: 'System administrator — full access',
      permissions: permissionDefs.map((p) => p.action),
    },
    {
      name: 'SUPERVISOR',
      description: 'Supervisor / QC officer',
      permissions: [
        'dashboard:view','repair_orders:read','repair_orders:update',
        'customers:read','checklist:manage','signature:manage','notifications:send',
      ],
    },
    {
      name: 'TECHNICIAN',
      description: 'Field technician',
      permissions: [
        'repair_orders:read','repair_orders:update','customers:read',
      ],
    },
    {
      name: 'REGISTRAR',
      description: 'Registration desk officer',
      permissions: [
        'repair_orders:create','repair_orders:read','customers:create','customers:read',
        'queue_board:view',
      ],
    },
    {
      name: 'VIEWER',
      description: 'Read-only viewer',
      permissions: ['dashboard:view','repair_orders:read','queue_board:view'],
    },
  ];

  const permMap = new Map(permissions.map((p) => [p.action, p.id]));

  const roles = await Promise.all(
    rolesData.map(async ({ permissions: perms, ...roleData }) => {
      const role = await prisma.role.upsert({
        where: { name: roleData.name },
        update: {},
        create: roleData,
      });
      // Wire permissions
      await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      await prisma.rolePermission.createMany({
        data: perms.map((action) => ({
          roleId: role.id,
          permissionId: permMap.get(action)!,
        })),
      });
      return role;
    }),
  );
  console.log(`  ✓ ${roles.length} roles`);

  // ── Mission ───────────────────────────────────────────────────────────────
  const mission = await prisma.mission.upsert({
    where: { id: 'mission-2567' },
    update: {},
    create: {
      id: 'mission-2567',
      name: 'ปฏิบัติการซ่อม ประจำปีงบประมาณ 2567',
      fiscalYear: 2567,
      startDate: new Date('2024-10-01'),
      endDate:   new Date('2025-09-30'),
      isActive:  true,
      description: 'โครงการซ่อมบำรุงอุปกรณ์ภายใต้ศูนย์ NPC ประจำปีงบประมาณ 2567',
    },
  });
  console.log(`  ✓ Mission: ${mission.name}`);

  // ── Service Centers ───────────────────────────────────────────────────────
  const centersData = [
    { id: 'center-kkn', name: 'ศูนย์บริการ NPC ขอนแก่น',      code: 'NPC-KKN', region: 'ภาคตะวันออกเฉียงเหนือ', phone: '043-000-001' },
    { id: 'center-bkk', name: 'ศูนย์บริการ NPC กรุงเทพมหานคร', code: 'NPC-BKK', region: 'ภาคกลาง',               phone: '02-000-0001'  },
    { id: 'center-cnx', name: 'ศูนย์บริการ NPC เชียงใหม่',     code: 'NPC-CNX', region: 'ภาคเหนือ',              phone: '053-000-001'  },
  ];

  const centers = await Promise.all(
    centersData.map((c) =>
      prisma.serviceCenter.upsert({
        where: { code: c.code },
        update: {},
        create: { ...c, missionId: mission.id },
      }),
    ),
  );
  console.log(`  ✓ ${centers.length} service centers`);

  // ── Users ─────────────────────────────────────────────────────────────────
  const adminRole      = roles.find((r) => r.name === 'ADMIN')!;
  const supervisorRole = roles.find((r) => r.name === 'SUPERVISOR')!;
  const techRole       = roles.find((r) => r.name === 'TECHNICIAN')!;
  const registrarRole  = roles.find((r) => r.name === 'REGISTRAR')!;

  const usersData = [
    { username: 'admin',      fullName: 'ผู้ดูแลระบบ',           roleId: adminRole.id,      centerId: null             },
    { username: 'supervisor1',fullName: 'สมชาย วิทยาสิทธิ์',    roleId: supervisorRole.id, centerId: centers[0].id    },
    { username: 'tech01',     fullName: 'วิชัย มั่นคง',          roleId: techRole.id,       centerId: centers[0].id    },
    { username: 'tech02',     fullName: 'สุดา ใจดี',             roleId: techRole.id,       centerId: centers[0].id    },
    { username: 'registrar1', fullName: 'มาลี สุขสันต์',         roleId: registrarRole.id,  centerId: centers[0].id    },
    { username: 'tech03',     fullName: 'ประยุทธ์ ศรีสมบูรณ์',  roleId: techRole.id,       centerId: centers[1].id    },
    { username: 'supervisor2',fullName: 'รัตนา พงษ์ไพบูลย์',    roleId: supervisorRole.id, centerId: centers[1].id    },
  ];

  const hash = await bcrypt.hash('NPC@2024!', 12);
  await Promise.all(
    usersData.map((u) =>
      prisma.user.upsert({
        where: { username: u.username },
        update: {},
        create: { ...u, passwordHash: hash },
      }),
    ),
  );
  console.log(`  ✓ ${usersData.length} users (password: NPC@2024!)`);

  // ── Queue Counters ────────────────────────────────────────────────────────
  const tradeCodes: TradeCode[] = ['ELECTRICAL', 'ELECTRONICS', 'AUTOMOTIVE'];
  for (const center of centers) {
    for (const trade of tradeCodes) {
      await prisma.tradeQueueCounter.upsert({
        where: { centerId_missionId_tradeCode: { centerId: center.id, missionId: mission.id, tradeCode: trade } },
        update: {},
        create: { centerId: center.id, missionId: mission.id, tradeCode: trade, currentValue: 0 },
      });
    }
  }
  console.log(`  ✓ Queue counters initialized`);

  // ── Demo Customers & Repair Orders ────────────────────────────────────────
  const demoData = [
    { firstName: 'สมศักดิ์',  lastName: 'วงศ์ไพฑูรย์',  nationalId: '1234567890123', phone: '081-111-0001', device: 'พัดลม Panasonic F-M14E5', brand: 'Panasonic', model: 'F-M14E5', trade: 'ELECTRICAL'   as TradeCode, status: 'COMPLETED'    as RepairStatus },
    { firstName: 'ปัทมา',     lastName: 'ทองคำ',          nationalId: '2345678901234', phone: '082-222-0002', device: 'โทรทัศน์ Samsung 43"',      brand: 'Samsung',  model: '43TU7000', trade: 'ELECTRONICS'  as TradeCode, status: 'DIAGNOSING'  as RepairStatus },
    { firstName: 'อนุชา',     lastName: 'ศิริรัตน์',      nationalId: '3456789012345', phone: '083-333-0003', device: 'มอเตอร์ไซค์ Honda Wave 125',  brand: 'Honda',    model: 'Wave 125', trade: 'AUTOMOTIVE'   as TradeCode, status: 'PENDING'      as RepairStatus },
    { firstName: 'กัญญา',     lastName: 'เจริญสุข',       nationalId: '4567890123456', phone: '084-444-0004', device: 'เครื่องซักผ้า LG 8kg',       brand: 'LG',       model: 'T2108VSPM',trade: 'ELECTRICAL'   as TradeCode, status: 'WAITING_PARTS'as RepairStatus },
    { firstName: 'ธนาวุฒิ',   lastName: 'ประสิทธิ์ผล',   nationalId: '5678901234567', phone: '085-555-0005', device: 'วิทยุ Sony CFD-S70',          brand: 'Sony',     model: 'CFD-S70',  trade: 'ELECTRONICS'  as TradeCode, status: 'COMPLETED'    as RepairStatus },
    { firstName: 'ลลิตา',     lastName: 'มงคลสวัสดิ์',    nationalId: '6789012345678', phone: '086-666-0006', device: 'ตู้เย็น Sharp 7 คิว',         brand: 'Sharp',    model: 'SJ-Y22T',  trade: 'ELECTRICAL'   as TradeCode, status: 'COMPLETED'    as RepairStatus },
    { firstName: 'วีรชาติ',   lastName: 'สันติสุข',       nationalId: '7890123456789', phone: '087-777-0007', device: 'รถยนต์ Toyota Yaris',         brand: 'Toyota',   model: 'Yaris',    trade: 'AUTOMOTIVE'   as TradeCode, status: 'REPAIRING'   as RepairStatus },
    { firstName: 'นงลักษณ์',  lastName: 'วัฒนาพร',        nationalId: '8901234567890', phone: '088-888-0008', device: 'เครื่องปรับอากาศ Daikin 12000 BTU', brand: 'Daikin', model: 'FTC35NV2S', trade: 'ELECTRICAL'  as TradeCode, status: 'QC_PENDING'  as RepairStatus },
    { firstName: 'ประดิษฐ์',  lastName: 'เฉลิมวงศ์',      nationalId: '9012345678901', phone: '089-999-0009', device: 'คอมพิวเตอร์ Acer Aspire',     brand: 'Acer',     model: 'Aspire 5', trade: 'ELECTRONICS'  as TradeCode, status: 'PENDING'      as RepairStatus },
    { firstName: 'ศิริพร',    lastName: 'จิตต์บุญ',        nationalId: '0123456789012', phone: '090-000-0010', device: 'มอเตอร์ไซค์ Yamaha NMAX',     brand: 'Yamaha',   model: 'NMAX 155', trade: 'AUTOMOTIVE'   as TradeCode, status: 'CLOSED'      as RepairStatus },
  ];

  const phoneHash = (p: string) => crypto.createHash('sha256').update(p).digest('hex');
  const tradePrefix: Record<TradeCode, string> = { ELECTRICAL: 'E', ELECTRONICS: 'X', AUTOMOTIVE: 'A', KITCHEN: 'K' };
  const tradeCounts: Record<TradeCode, number> = { ELECTRICAL: 0, ELECTRONICS: 0, AUTOMOTIVE: 0, KITCHEN: 0 };

  for (const d of demoData) {
    tradeCounts[d.trade]++;
    const qn = `${tradePrefix[d.trade]}-${String(tradeCounts[d.trade]).padStart(3, '0')}`;

    const existingOrder = await prisma.repairOrder.findUnique({
      where: { queueNumber: qn },
    });

    if (!existingOrder) {
      const customer = await prisma.customer.create({
        data: {
          nationalIdEnc: encrypt(d.nationalId),
          firstNameEnc:  encrypt(d.firstName),
          lastNameEnc:   encrypt(d.lastName),
          phone:         d.phone,
          phoneHash:     phoneHash(d.phone),
          address:       '123 ถ.มิตรภาพ อ.เมือง จ.ขอนแก่น 40000',
        },
      });

      const now = new Date();
      const regAt = new Date(now.getTime() - Math.random() * 30 * 24 * 3600 * 1000);

      await prisma.repairOrder.create({
        data: {
          queueNumber:     qn,
          tradeCode:       d.trade,
          status:          d.status,
          missionId:       mission.id,
          centerId:        centers[0].id,
          customerId:      customer.id,
          deviceCategory:  d.device,
          deviceBrand:     d.brand,
          deviceModel:     d.model,
          problemDesc:     `อุปกรณ์มีปัญหา: ${d.device} — รายงานโดยลูกค้า`,
          partsCost:       d.status === 'COMPLETED' || d.status === 'CLOSED' ? 250 : null,
          marketRepairCost:d.status === 'COMPLETED' || d.status === 'CLOSED' ? 1500 : null,
          economicValueSaved: d.status === 'COMPLETED' || d.status === 'CLOSED' ? 1250 : null,
          registeredAt:    regAt,
          startedAt:       d.status !== 'PENDING' ? new Date(regAt.getTime() + 3600000) : null,
          completedAt:     ['COMPLETED','CLOSED','QC_PENDING'].includes(d.status) ? new Date(regAt.getTime() + 86400000) : null,
          closedAt:        d.status === 'CLOSED' ? new Date(regAt.getTime() + 172800000) : null,
        },
      });
    }
  }
  console.log(`  ✓ Demo repair orders initialized/verified (center: ขอนแก่น)`);

  // Update counter values to match seeded data
  for (const [trade, count] of Object.entries(tradeCounts) as [TradeCode, number][]) {
    await prisma.tradeQueueCounter.update({
      where: { centerId_missionId_tradeCode: { centerId: centers[0].id, missionId: mission.id, tradeCode: trade as TradeCode } },
      data: { currentValue: count },
    });
  }

  console.log('\n✅  Seed complete!');
  console.log('   Default password for all users: NPC@2024!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
