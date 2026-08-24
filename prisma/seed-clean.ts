import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Clearing mock data and setting up clean production database...');

  // 1. Delete transactional data
  await prisma.inspectionChecklist.deleteMany();
  await prisma.signature.deleteMany();
  await prisma.repairItem.deleteMany();
  await prisma.statusHistory.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.repairOrder.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.tradeQueueCounter.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.serviceCenter.deleteMany();
  await prisma.mission.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

  console.log('  ✓ Cleaned all mock tables');

  // 2. Setup Permissions
  const permissionDefs = [
    { action: 'dashboard:view', description: 'ดูแดชบอร์ดสรุปผล' },
    { action: 'repair_orders:create', description: 'ลงทะเบียนรับงานซ่อม' },
    { action: 'repair_orders:read', description: 'ดูข้อมูลใบงานซ่อม' },
    { action: 'repair_orders:update', description: 'อัปเดตสถานะงานซ่อม' },
    { action: 'repair_orders:delete', description: 'ยกเลิก/ลบใบงานซ่อม' },
    { action: 'customers:create', description: 'บันทึกข้อมูลลูกค้า' },
    { action: 'customers:read', description: 'ดูข้อมูลลูกค้า' },
    { action: 'customers:pii:decrypt', description: 'ดูข้อมูลบัตรประชาชน' },
    { action: 'checklist:manage', description: 'บันทึกการตรวจสอบ QC' },
    { action: 'signature:manage', description: 'บันทึกลายเซ็นดิจิทัล' },
    { action: 'users:manage', description: 'จัดการผู้ใช้งาน' },
    { action: 'centers:manage', description: 'จัดการศูนย์บริการ' },
    { action: 'missions:manage', description: 'จัดการภารกิจและช่วงเวลา' },
    { action: 'notifications:send', description: 'ส่งการแจ้งเตือน LINE' },
    { action: 'queue_board:view', description: 'เปิดหน้าจอกระดานคิว TV' },
  ];

  const permissions: Record<string, string> = {};
  for (const p of permissionDefs) {
    const record = await prisma.permission.create({ data: p });
    permissions[p.action] = record.id;
  }
  console.log(`  ✓ ${Object.keys(permissions).length} permissions created`);

  // 3. Setup Roles
  const adminRole = await prisma.role.create({
    data: {
      name: 'ADMIN',
      description: 'ผู้ดูแลระบบสูงสุด จัดการข้อมูลได้ทุกส่วน',
    },
  });

  const supervisorRole = await prisma.role.create({
    data: {
      name: 'SUPERVISOR',
      description: 'หัวหน้าช่าง ตรวจสอบและอนุมัติ QC',
    },
  });

  const techRole = await prisma.role.create({
    data: {
      name: 'TECHNICIAN',
      description: 'ช่างซ่อมประจำศูนย์ วินิจฉัยและซ่อมอุปกรณ์',
    },
  });

  const registrarRole = await prisma.role.create({
    data: {
      name: 'REGISTRAR',
      description: 'เจ้าหน้าที่รับแจ้ง ลงทะเบียนและออกคิว',
    },
  });

  const centerAdminRole = await prisma.role.create({
    data: {
      name: 'CENTER_ADMIN',
      description: 'ผู้ดูแลประจำศูนย์ บริหารจัดการบุคลากรและงานภายในศูนย์',
    },
  });

  const viewerRole = await prisma.role.create({
    data: {
      name: 'VIEWER',
      description: 'ผู้รับชม ดูแดชบอร์ดและกระดานคิว',
    },
  });

  // Assign permissions to roles
  const assignPerms = async (roleId: string, actions: string[]) => {
    await prisma.rolePermission.createMany({
      data: actions.map((action) => ({ roleId, permissionId: permissions[action] })),
    });
  };

  await assignPerms(adminRole.id, Object.keys(permissions));
  await assignPerms(centerAdminRole.id, [
    'dashboard:view', 'repair_orders:create', 'repair_orders:read', 'repair_orders:update',
    'customers:create', 'customers:read', 'checklist:manage', 'signature:manage',
    'users:manage', 'queue_board:view', 'notifications:send'
  ]);
  await assignPerms(supervisorRole.id, [
    'dashboard:view', 'repair_orders:read', 'repair_orders:update',
    'customers:read', 'checklist:manage', 'signature:manage', 'queue_board:view',
  ]);
  await assignPerms(techRole.id, [
    'repair_orders:read', 'repair_orders:update', 'customers:read',
    'checklist:manage', 'queue_board:view',
  ]);
  await assignPerms(registrarRole.id, [
    'repair_orders:create', 'repair_orders:read', 'customers:create',
    'customers:read', 'signature:manage', 'queue_board:view',
  ]);
  await assignPerms(viewerRole.id, ['dashboard:view', 'queue_board:view']);

  console.log('  ✓ 6 standard roles configured (including CENTER_ADMIN)');

  // 4. Default Mission (ภารกิจเริ่มต้น)
  const mission = await prisma.mission.create({
    data: {
      name: 'ศูนย์ซ่อมสร้างเพื่อชุมชน (FixIt Center) ประจำปีงบประมาณ 2567',
      fiscalYear: 2567,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      description: 'โครงการศูนย์ซ่อมสร้างเพื่อชุมชน วิทยาลัยสารพัดช่างน่าน',
      isActive: true,
    },
  });
  console.log(`  ✓ Initial Mission: ${mission.name}`);

  // 5. Initial Service Center (ศูนย์บริการหลัก)
  const mainCenter = await prisma.serviceCenter.create({
    data: {
      name: 'ศูนย์บริการ วิทยาลัยสารพัดช่างน่าน (ศูนย์หลัก)',
      code: 'NAN-01',
      region: 'อำเภอเมืองน่าน',
      address: 'วิทยาลัยสารพัดช่างน่าน ต.ในเวียง อ.เมือง จ.น่าน 55000',
      phone: '054-710259',
      missionId: mission.id,
      isActive: true,
    },
  });
  console.log(`  ✓ Initial Service Center: ${mainCenter.name}`);

  // 6. Default Admin User
  const passwordHash = await bcrypt.hash('NPC@2024!', 12);
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      passwordHash,
      fullName: 'ผู้ดูแลระบบ วิทยาลัยสารพัดช่างน่าน',
      email: 'admin@nanpoly.ac.th',
      phone: '054-710259',
      roleId: adminRole.id,
      centerId: mainCenter.id,
      isActive: true,
    },
  });
  console.log(`  ✓ Admin user created: ${adminUser.username} (Password: NPC@2024!)`);

  // Initialize queue counters for main center
  await prisma.tradeQueueCounter.createMany({
    data: [
      { centerId: mainCenter.id, missionId: mission.id, tradeCode: 'ELECTRICAL', currentValue: 0 },
      { centerId: mainCenter.id, missionId: mission.id, tradeCode: 'ELECTRONICS', currentValue: 0 },
      { centerId: mainCenter.id, missionId: mission.id, tradeCode: 'AUTOMOTIVE', currentValue: 0 },
    ],
  });

  console.log('\n✨ Database is clean and ready for production!');
  console.log('   Login with: admin / NPC@2024!\n');
}

main()
  .catch((e) => {
    console.error('Error seeding clean DB:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
