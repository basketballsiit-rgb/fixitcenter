import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { QueueService } from '../queue/queue.service';
import { EventsService } from '../websocket/events.service';
import { LineService } from '../notifications/line.service';
import { AesService } from '../common/encryption/aes.service';
import { CustomersService } from '../customers/customers.service';
import { RepairStatus, TradeCode, SignatureType, Prisma } from '@prisma/client';

// ─── State Machine Transition Rules ──────────────────────────────────────────
const ALLOWED_TRANSITIONS: Partial<Record<RepairStatus, RepairStatus[]>> = {
  PENDING:       ['DIAGNOSING', 'REPAIRING', 'CANCELLED'],
  DIAGNOSING:    ['WAITING_PARTS', 'REPAIRING', 'COMPLETED', 'CANCELLED'],
  WAITING_PARTS: ['REPAIRING', 'COMPLETED', 'CANCELLED'],
  REPAIRING:     ['COMPLETED', 'WAITING_PARTS', 'QC_PENDING', 'CANCELLED'],
  QC_PENDING:    ['COMPLETED', 'DIAGNOSING', 'CANCELLED'],
  COMPLETED:     ['CLOSED', 'CANCELLED'],
};

@Injectable()
export class RepairOrdersService {
  private readonly logger = new Logger(RepairOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    private readonly events: EventsService,
    private readonly line: LineService,
    private readonly aes: AesService,
    private readonly customersService: CustomersService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────

  async create(dto: any, userId?: string) {
    // 1. Resolve Mission ID
    let missionId = dto.missionId;
    if (!missionId) {
      const activeMission = await this.prisma.mission.findFirst({ where: { isActive: true } });
      missionId = activeMission?.id;
      if (!missionId) {
        const anyMission = await this.prisma.mission.findFirst();
        missionId = anyMission?.id;
      }
    }

    // 2. Resolve Center ID
    let centerId = dto.centerId;
    if (!centerId) {
      const firstCenter = await this.prisma.serviceCenter.findFirst({ where: { isActive: true } });
      centerId = firstCenter?.id;
    }

    // 3. Resolve Customer ID
    let customerId = dto.customerId;
    if (!customerId && dto.customer) {
      const cust = await this.customersService.create({
        firstName: dto.customer.firstName || 'ไม่ระบุ',
        lastName: dto.customer.lastName || '',
        nationalId: dto.customer.nationalId || '0000000000000',
        phone: dto.customer.phone,
        address: dto.customer.address,
      });
      customerId = cust.id;
    }

    // 4. Resolve Trade & Category
    let tradeCode: TradeCode = dto.tradeCode || dto.trade;
    if (!tradeCode) {
      const devTrade = dto.device?.tradeCode || '';
      if (devTrade.startsWith('E')) tradeCode = 'ELECTRICAL';
      else if (devTrade.startsWith('X')) tradeCode = 'ELECTRONICS';
      else tradeCode = 'AUTOMOTIVE';
    }

    const deviceCategory = dto.deviceCategory || dto.device?.tradeCode || 'อุปกรณ์ทั่วไป';
    const deviceBrand = dto.deviceBrand || dto.device?.brand || '-';
    const deviceModel = dto.deviceModel || dto.device?.model || '-';
    const serialNumber = dto.serialNumber || dto.device?.serial || '';
    const problemDesc = dto.problemDesc || dto.device?.problemDesc || 'ไม่ระบุอาการเสีย';
    const deviceCondition = dto.deviceCondition || dto.device?.deviceCondition || '';
    const problemImages = dto.problemImages || dto.device?.problemImages || (dto.device?.problemImage ? [dto.device.problemImage] : []);
    const accessories = dto.accessories || dto.device?.accessories || '';
    const additionalDetails = dto.additionalDetails || dto.device?.additionalDetails || '';
    const idCardImage = dto.idCardImage || dto.customer?.idCardImage || dto.device?.idCardImage || null;

    // 5. Generate atomic queue number (E-001, X-001, A-001...)
    const queueNumber = await this.queue.getNextNumber(centerId, missionId, tradeCode);

    const order = await this.prisma.repairOrder.create({
      data: {
        missionId,
        centerId,
        customerId,
        tradeCode,
        deviceCategory,
        deviceBrand,
        deviceModel,
        serialNumber,
        problemDesc,
        deviceCondition,
        problemImages,
        accessories,
        additionalDetails,
        idCardImage,
        queueNumber,
        status: 'PENDING',
      },
      include: this.defaultInclude(),
    });

    // Record status history
    await this.prisma.statusHistory.create({
      data: {
        repairOrderId: order.id,
        toStatus: 'PENDING',
        changedById: userId,
        note: 'Order created',
      },
    });

    // Audit log
    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          repairOrderId: order.id,
          action: 'CREATE_ORDER',
          details: { queueNumber, tradeCode: dto.tradeCode },
        },
      });
    }

    // Broadcast to center room
    this.events.broadcastOrderNew(order.centerId, this.formatOrder(order));

    // LINE notification to center group
    this.line.notifyTeam(
      order.centerId,
      order.tradeCode,
      `🔧 รับงานใหม่ [${queueNumber}]\nอุปกรณ์: ${dto.deviceCategory}\nสถานะ: รอดำเนินการ`,
    ).catch((err) => this.logger.warn(`LINE notify failed: ${err.message}`));

    return this.formatOrder(order);
  }

  // ── Find All (paginated) ──────────────────────────────────────────────────

  async findAll(query: {
    centerId?: string;
    missionId?: string;
    status?: string;
    tradeCode?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page  = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Number(query.limit) || 50);
    const skip  = (page - 1) * limit;

    let matchedCustomerIds: string[] = [];
    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      const allCustomers = await this.prisma.customer.findMany({
        take: 1000,
        select: { id: true, firstNameEnc: true, lastNameEnc: true, nationalIdEnc: true, phone: true },
      });
      for (const c of allCustomers) {
        let isMatch = false;
        if (c.phone && c.phone.includes(s)) isMatch = true;
        try {
          const fn = this.aes.decrypt(c.firstNameEnc);
          const ln = this.aes.decrypt(c.lastNameEnc);
          const nid = this.aes.decrypt(c.nationalIdEnc);
          if (
            fn.toLowerCase().includes(s.toLowerCase()) ||
            ln.toLowerCase().includes(s.toLowerCase()) ||
            `${fn} ${ln}`.toLowerCase().includes(s.toLowerCase()) ||
            nid.includes(s)
          ) {
            isMatch = true;
          }
        } catch (e) {}
        if (isMatch) matchedCustomerIds.push(c.id);
      }
    }

    const where: Prisma.RepairOrderWhereInput = {
      ...(query.centerId && query.centerId !== 'ALL'   ? { centerId:  query.centerId  } : {}),
      ...(query.missionId && query.missionId !== 'ALL' ? { missionId: query.missionId } : {}),
      ...(query.status && query.status !== 'ALL'       ? { status:    query.status as RepairStatus } : {}),
      ...(query.tradeCode && query.tradeCode !== 'ALL' ? { tradeCode: query.tradeCode as TradeCode } : {}),
      ...(query.search && query.search.trim() ? {
        OR: [
          { queueNumber:    { contains: query.search.trim(), mode: 'insensitive' } },
          { deviceCategory: { contains: query.search.trim(), mode: 'insensitive' } },
          { deviceBrand:    { contains: query.search.trim(), mode: 'insensitive' } },
          { problemDesc:    { contains: query.search.trim(), mode: 'insensitive' } },
          { customer: { phone: { contains: query.search.trim() } } },
          ...(matchedCustomerIds.length > 0 ? [{ customerId: { in: matchedCustomerIds } }] : []),
        ],
      } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.repairOrder.findMany({
        where,
        include: this.defaultInclude(),
        orderBy: { registeredAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.repairOrder.count({ where }),
    ]);

    return {
      data: data.map((o) => this.formatOrder(o)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ── Public Tracking / Search ──────────────────────────────────────────────

  async track(query: string) {
    if (!query || !query.trim()) return [];
    const q = query.trim();

    let matchedCustomerIds: string[] = [];
    const allCustomers = await this.prisma.customer.findMany({
      take: 1000,
      select: { id: true, firstNameEnc: true, lastNameEnc: true, nationalIdEnc: true, phone: true },
    });
    for (const c of allCustomers) {
      let isMatch = false;
      if (c.phone && c.phone.includes(q)) isMatch = true;
      try {
        const fn = this.aes.decrypt(c.firstNameEnc);
        const ln = this.aes.decrypt(c.lastNameEnc);
        const nid = this.aes.decrypt(c.nationalIdEnc);
        if (
          fn.toLowerCase().includes(q.toLowerCase()) ||
          ln.toLowerCase().includes(q.toLowerCase()) ||
          `${fn} ${ln}`.toLowerCase().includes(q.toLowerCase()) ||
          nid.includes(q)
        ) {
          isMatch = true;
        }
      } catch (e) {}
      if (isMatch) matchedCustomerIds.push(c.id);
    }

    const orders = await this.prisma.repairOrder.findMany({
      where: {
        OR: [
          { queueNumber:    { contains: q, mode: 'insensitive' } },
          { qrToken:        { contains: q, mode: 'insensitive' } },
          { deviceCategory: { contains: q, mode: 'insensitive' } },
          { deviceBrand:    { contains: q, mode: 'insensitive' } },
          { problemDesc:    { contains: q, mode: 'insensitive' } },
          { customer: { phone: { contains: q } } },
          ...(matchedCustomerIds.length > 0 ? [{ customerId: { in: matchedCustomerIds } }] : []),
        ],
      },
      include: {
        ...this.defaultInclude(),
        statusHistory: { orderBy: { changedAt: 'asc' } },
        repairItems: true,
        signatures: true,
      },
      orderBy: { registeredAt: 'desc' },
      take: 30,
    });

    return orders.map((o) => this.formatOrder(o));
  }

  // ── Find by ID ────────────────────────────────────────────────────────────

  async findById(id: string) {
    const order = await this.prisma.repairOrder.findUnique({
      where: { id },
      include: {
        ...this.defaultInclude(),
        statusHistory: { orderBy: { changedAt: 'asc' } },
        repairItems: true,
        signatures: true,
        checklists: true,
        notifications: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!order) throw new NotFoundException('Repair order not found');
    return this.formatOrder(order);
  }

  // ── Find by Queue Number ──────────────────────────────────────────────────

  async findByQueueNumber(queueNumber: string) {
    const order = await this.prisma.repairOrder.findFirst({
      where: { queueNumber: { equals: queueNumber, mode: 'insensitive' } },
      include: {
        ...this.defaultInclude(),
        statusHistory: { orderBy: { changedAt: 'asc' } },
        repairItems: true,
        signatures: true,
        checklists: true,
        notifications: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!order) throw new NotFoundException(`Repair order ${queueNumber} not found`);
    return this.formatOrder(order);
  }

  // ── Find by QR Token (public — for QR scanner) ────────────────────────────

  async findByQrToken(token: string) {
    const cleanToken = token?.trim();
    if (!cleanToken) throw new NotFoundException('Invalid QR code');
    const order = await this.prisma.repairOrder.findFirst({
      where: {
        OR: [
          { qrToken: { equals: cleanToken, mode: 'insensitive' } },
          { queueNumber: { equals: cleanToken, mode: 'insensitive' } },
          { id: cleanToken },
        ],
      },
      include: this.defaultInclude(),
    });
    if (!order) throw new NotFoundException('Invalid QR code or order not found');
    return this.formatOrder(order);
  }

  // ── Update Repair Order (CRUD Update) ───────────────────────────────────

  async update(id: string, dto: any, userId?: string) {
    const existing = await this.prisma.repairOrder.findUnique({
      where: { id },
      include: { customer: true },
    });
    if (!existing) {
      throw new NotFoundException(`Repair order ${id} not found`);
    }

    // Update Customer info if provided
    if (dto.customer || dto.firstName || dto.lastName || dto.phone || dto.address || dto.nationalId) {
      const custData: any = {};
      const firstName = dto.customer?.firstName || dto.firstName;
      const lastName = dto.customer?.lastName || dto.lastName;
      const nationalId = dto.customer?.nationalId || dto.nationalId;
      const phone = dto.customer?.phone || dto.phone;
      const address = dto.customer?.address || dto.address;

      if (firstName) custData.firstNameEnc = this.aes.encrypt(firstName.trim());
      if (lastName) custData.lastNameEnc = this.aes.encrypt(lastName.trim());
      if (nationalId) custData.nationalIdEnc = this.aes.encrypt(nationalId.trim());
      if (phone !== undefined) {
        custData.phone = phone;
        custData.phoneHash = crypto.createHash('sha256').update(phone).digest('hex');
      }
      if (address !== undefined) custData.address = address;

      if (Object.keys(custData).length > 0) {
        await this.prisma.customer.update({
          where: { id: existing.customerId },
          data: custData,
        });
      }
    }

    // Update RepairOrder fields
    const orderData: any = {};
    if (dto.deviceCategory !== undefined) orderData.deviceCategory = dto.deviceCategory;
    if (dto.deviceBrand !== undefined) orderData.deviceBrand = dto.deviceBrand;
    if (dto.deviceModel !== undefined) orderData.deviceModel = dto.deviceModel;
    if (dto.serialNumber !== undefined) orderData.serialNumber = dto.serialNumber;
    if (dto.problemDesc !== undefined) orderData.problemDesc = dto.problemDesc;
    if (dto.deviceCondition !== undefined) orderData.deviceCondition = dto.deviceCondition;
    if (dto.accessories !== undefined) orderData.accessories = dto.accessories;
    if (dto.additionalDetails !== undefined) orderData.additionalDetails = dto.additionalDetails;
    if (dto.problemImages !== undefined) orderData.problemImages = dto.problemImages;
    if (dto.idCardImage !== undefined) orderData.idCardImage = dto.idCardImage;
    if (dto.handoverBy !== undefined) orderData.handoverBy = dto.handoverBy;
    if (dto.customerSignature !== undefined) orderData.customerSignature = dto.customerSignature;
    if (dto.handoverSignature !== undefined) orderData.handoverSignature = dto.handoverSignature;
    if (dto.handoverNotes !== undefined) orderData.handoverNotes = dto.handoverNotes;
    if (dto.tradeCode !== undefined) orderData.tradeCode = dto.tradeCode;
    if (dto.status !== undefined) orderData.status = dto.status;
    if (dto.centerId !== undefined) orderData.centerId = dto.centerId;
    if (dto.assignedToId !== undefined) orderData.assignedToId = dto.assignedToId;

    const updated = await this.prisma.repairOrder.update({
      where: { id },
      data: orderData,
      include: this.defaultInclude(),
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          userId,
          repairOrderId: id,
          action: 'UPDATE_ORDER',
          details: { dto },
        },
      });
    }

    // Broadcast update
    this.events.broadcastStatusChange(
      updated.centerId,
      updated.id,
      updated.status,
      updated.queueNumber,
    );

    return this.formatOrder(updated);
  }

  // ── Complete Handover (Delivery with Customer Signature) ──────────────────

  async handover(
    id: string,
    dto: {
      customerSignature: string;
      handoverSignature?: string;
      handoverBy?: string;
      handoverNotes?: string;
    },
    user?: any,
  ) {
    const order = await this.prisma.repairOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`Repair order ${id} not found`);

    const handoverBy = dto.handoverBy || user?.fullName || user?.username || 'เจ้าหน้าที่ผู้ส่งมอบ';
    const closedAt = new Date();

    // Save customer signature in signatures table
    if (dto.customerSignature) {
      await this.saveSignature(id, {
        type: 'CUSTOMER',
        dataBase64: dto.customerSignature,
        signerName: 'ผู้รับบริการ / เจ้าของอุปกรณ์',
      });
    }

    const updated = await this.prisma.repairOrder.update({
      where: { id },
      data: {
        status: 'CLOSED',
        closedAt,
        handoverBy,
        customerSignature: dto.customerSignature,
        handoverSignature: dto.handoverSignature,
        handoverNotes: dto.handoverNotes,
      },
      include: this.defaultInclude(),
    });

    await this.prisma.statusHistory.create({
      data: {
        repairOrderId: id,
        fromStatus: order.status,
        toStatus: 'CLOSED',
        changedById: user?.id,
        note: `ส่งมอบเครื่องเรียบร้อย โดย ${handoverBy}${dto.handoverNotes ? ` (${dto.handoverNotes})` : ''}`,
      },
    });

    if (user?.id) {
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          repairOrderId: id,
          action: 'HANDOVER_COMPLETED',
          details: { handoverBy, closedAt },
        },
      });
    }

    this.events.broadcastStatusChange(updated.centerId, updated.id, 'CLOSED', updated.queueNumber);
    return this.formatOrder(updated);
  }

  // ── Delete Repair Order (CRUD Delete) ───────────────────────────────────

  async delete(id: string, userId?: string) {
    const existing = await this.prisma.repairOrder.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Repair order ${id} not found`);
    }

    // Delete child records first
    await this.prisma.statusHistory.deleteMany({ where: { repairOrderId: id } });
    await this.prisma.repairItem.deleteMany({ where: { repairOrderId: id } });
    await this.prisma.signature.deleteMany({ where: { repairOrderId: id } });
    await this.prisma.inspectionChecklist.deleteMany({ where: { repairOrderId: id } });
    await this.prisma.notification.deleteMany({ where: { repairOrderId: id } });
    await this.prisma.auditLog.deleteMany({ where: { repairOrderId: id } });

    // Delete repair order
    await this.prisma.repairOrder.delete({
      where: { id },
    });

    return { success: true, message: `Deleted repair order ${existing.queueNumber}` };
  }

  // ── Update Status (State Machine) ─────────────────────────────────────────

  async updateStatus(
    id: string,
    newStatus: RepairStatus,
    userId: string,
    note?: string,
    isAdmin = false,
  ) {
    const order = await this.prisma.repairOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Repair order not found');

    // Validate transition
    const allowed = ALLOWED_TRANSITIONS[order.status] || [];
    if (newStatus === 'CANCELLED' && !isAdmin) {
      throw new ForbiddenException('Only admins can cancel orders');
    }
    if (!allowed.includes(newStatus) && !(newStatus === 'CANCELLED' && isAdmin)) {
      throw new BadRequestException(
        `Cannot transition from ${order.status} to ${newStatus}. Allowed: ${allowed.join(', ')}`,
      );
    }

    // Timestamp updates based on new status
    const timestamps: any = {};
    if (newStatus === 'DIAGNOSING' && !order.startedAt) timestamps.startedAt = new Date();
    if (newStatus === 'COMPLETED') timestamps.completedAt = new Date();
    if (newStatus === 'CLOSED') timestamps.closedAt = new Date();

    const updated = await this.prisma.repairOrder.update({
      where: { id },
      data: { status: newStatus, ...timestamps },
      include: this.defaultInclude(),
    });

    // Status history
    await this.prisma.statusHistory.create({
      data: {
        repairOrderId: id,
        fromStatus: order.status,
        toStatus: newStatus,
        changedById: userId,
        note,
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        repairOrderId: id,
        action: 'UPDATE_STATUS',
        details: { from: order.status, to: newStatus, note },
      },
    });

    // Broadcast via WebSocket
    this.events.broadcastStatusChange(order.centerId, id, newStatus, order.queueNumber);

    const formatted = this.formatOrder(updated);

    // If entering WAITING_PARTS, trigger real-time notification with customer phone and parts cost
    if (newStatus === 'WAITING_PARTS') {
      const cust = formatted.customer;
      const totalCostNumber = Number(updated.partsCost || 0);
      const notif = {
        id: `alert_parts_${id}_${Date.now()}`,
        orderId: id,
        queueNumber: order.queueNumber,
        deviceCategory: order.deviceCategory,
        deviceBrand: order.deviceBrand || '-',
        customerName: cust ? `${cust.firstName} ${cust.lastName}`.trim() : 'ผู้รับบริการ',
        customerPhone: cust?.phone || '-',
        partsCost: totalCostNumber,
        type: 'WAITING_PARTS',
        message: `คิว ${order.queueNumber} (${order.deviceCategory} ${order.deviceBrand || ''}) รออะไหล่ — ยอดค่าอะไหล่ ฿${totalCostNumber.toLocaleString()} (กรุณาโทรติดต่อลูกค้า: ${cust?.phone || '-'})`,
        createdAt: new Date().toISOString(),
      };
      this.events.broadcastNotification(order.centerId, notif);
    }

    // If entering COMPLETED (Direct completion without QC), trigger real-time notification to inform registrar/admin!
    if (newStatus === 'COMPLETED') {
      const cust = formatted.customer;
      const totalCostNumber = Number(updated.partsCost || 0);
      const notif = {
        id: `alert_completed_${id}_${Date.now()}`,
        orderId: id,
        queueNumber: order.queueNumber,
        deviceCategory: order.deviceCategory,
        deviceBrand: order.deviceBrand || '-',
        customerName: cust ? `${cust.firstName} ${cust.lastName}`.trim() : 'ผู้รับบริการ',
        customerPhone: cust?.phone || '-',
        partsCost: totalCostNumber,
        type: 'COMPLETED',
        message: `🎉 คิว ${order.queueNumber} (${order.deviceCategory} ${order.deviceBrand || ''}) ซ่อมเสร็จเรียบร้อยแล้ว — กรุณาติดต่อลูกค้า (${cust ? `${cust.firstName} ${cust.lastName}` : 'ผู้รับบริการ'} 📞 ${cust?.phone || '-'}) มารับเครื่องคืน`,
        createdAt: new Date().toISOString(),
      };
      this.events.broadcastNotification(order.centerId, notif);

      // LINE notification
      this.line.notifyTeam(
        order.centerId,
        order.tradeCode,
        `🎉 ซ่อมเสร็จแล้ว [${order.queueNumber}]\nอุปกรณ์: ${order.deviceCategory} ${order.deviceBrand || ''}\nลูกค้า: ${cust?.firstName || ''} (${cust?.phone || '-'})\nพร้อมส่งมอบเครื่องคืน`,
      ).catch((err) => this.logger.warn(`LINE notify failed: ${err.message}`));
    }

    return formatted;
  }

  // ── Active Alerts Query (for bell icon initial load) ───────────────────────

  async getActiveAlerts(centerId?: string) {
    const where: any = { status: { in: ['WAITING_PARTS', 'COMPLETED'] } };
    if (centerId) where.centerId = centerId;
    const orders = await this.prisma.repairOrder.findMany({
      where,
      include: this.defaultInclude(),
      orderBy: { updatedAt: 'desc' },
      take: 40,
    });

    return orders.map((o) => {
      const formatted = this.formatOrder(o);
      const cust = formatted.customer;
      const totalCostNumber = Number(o.partsCost || 0);
      const isCompleted = o.status === 'COMPLETED';

      return {
        id: `alert_${o.id}`,
        orderId: o.id,
        queueNumber: o.queueNumber,
        deviceCategory: o.deviceCategory,
        deviceBrand: o.deviceBrand || '-',
        customerName: cust ? `${cust.firstName} ${cust.lastName}`.trim() : 'ผู้รับบริการ',
        customerPhone: cust?.phone || '-',
        partsCost: totalCostNumber,
        type: isCompleted ? 'COMPLETED' : 'WAITING_PARTS',
        message: isCompleted
          ? `🎉 คิว ${o.queueNumber} (${o.deviceCategory} ${o.deviceBrand || ''}) ซ่อมเสร็จเรียบร้อยแล้ว — กรุณาติดต่อลูกค้า (${cust ? `${cust.firstName} ${cust.lastName}` : 'ผู้รับบริการ'} 📞 ${cust?.phone || '-'}) มารับเครื่องคืน`
          : `คิว ${o.queueNumber} (${o.deviceCategory} ${o.deviceBrand || ''}) รออะไหล่ — ยอดค่าอะไหล่ ฿${totalCostNumber.toLocaleString()} (กรุณาโทรติดต่อลูกค้า: ${cust?.phone || '-'})`,
        createdAt: o.updatedAt.toISOString(),
      };
    });
  }

  // ── Add Repair Item ────────────────────────────────────────────────────────

  async addRepairItem(
    orderId: string,
    dto: any,
  ) {
    const order = await this.prisma.repairOrder.findUnique({
      where: { id: orderId },
      include: { customer: true },
    });
    if (!order) throw new NotFoundException('Repair order not found');

    const rawList = Array.isArray(dto.items)
      ? dto.items
      : Array.isArray(dto)
      ? dto
      : [dto];

    // Delete existing items for clean sync if a list was passed
    if (Array.isArray(dto.items) || Array.isArray(dto)) {
      await this.prisma.repairItem.deleteMany({ where: { repairOrderId: orderId } });
    }

    for (const item of rawList) {
      const desc = item.description || item.name;
      if (!desc || !String(desc).trim()) continue;
      const quantity = Math.max(1, Number(item.quantity) || 1);
      const unitCost = Math.max(0, Number(item.unitCost ?? item.cost) || 0);
      const totalCost = quantity * unitCost;

      await this.prisma.repairItem.create({
        data: {
          repairOrderId: orderId,
          description: String(desc).trim(),
          quantity,
          unitCost,
          totalCost,
          isProcured: !!item.isProcured,
        },
      });
    }

    // Recalculate total parts cost
    const allItems = await this.prisma.repairItem.aggregate({
      where: { repairOrderId: orderId },
      _sum: { totalCost: true },
    });
    const totalCostNumber = Number(allItems._sum.totalCost ?? 0);

    const updated = await this.prisma.repairOrder.update({
      where: { id: orderId },
      data: { partsCost: totalCostNumber },
      include: this.defaultInclude(),
    });

    const formatted = this.formatOrder(updated);

    // If order is WAITING_PARTS or has parts cost, trigger real-time notification
    if (order.status === 'WAITING_PARTS' || totalCostNumber > 0) {
      const cust = formatted.customer;
      const notif = {
        orderId,
        queueNumber: order.queueNumber,
        deviceCategory: order.deviceCategory,
        deviceBrand: order.deviceBrand || '-',
        customerName: cust ? `${cust.firstName} ${cust.lastName}`.trim() : 'ผู้รับบริการ',
        customerPhone: cust?.phone || '-',
        partsCost: totalCostNumber,
        type: 'WAITING_PARTS',
        message: `คิว ${order.queueNumber} (${order.deviceCategory}) รออะไหล่ — ยอดค่าอะไหล่ ฿${totalCostNumber.toLocaleString()} (โทรติดต่อลูกค้า: ${cust?.phone || '-'})`,
        createdAt: new Date().toISOString(),
      };
      this.events.broadcastNotification(order.centerId, notif);
    }

    return formatted;
  }

  // ── Save Signature ─────────────────────────────────────────────────────────

  async saveSignature(
    orderId: string,
    dto: { type: SignatureType; dataBase64: string; signerName?: string },
  ) {
    const order = await this.prisma.repairOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Repair order not found');

    // Upsert — replace if signature of same type already exists
    const existing = await this.prisma.signature.findFirst({
      where: { repairOrderId: orderId, type: dto.type },
    });

    if (existing) {
      return this.prisma.signature.update({
        where: { id: existing.id },
        data: { dataBase64: dto.dataBase64, signerName: dto.signerName, signedAt: new Date() },
      });
    }

    return this.prisma.signature.create({
      data: { repairOrderId: orderId, ...dto },
    });
  }

  // ── Save Inspection Checklist ──────────────────────────────────────────────

  async saveChecklist(
    orderId: string,
    dto: {
      criteria: Array<{ id: string; label: string; passed: boolean; notes?: string }>;
      overallPassed: boolean;
      notes?: string;
    },
    userId?: string,
  ) {
    const order = await this.prisma.repairOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Repair order not found');

    return this.prisma.inspectionChecklist.create({
      data: {
        repairOrderId: orderId,
        criteria: dto.criteria as any,
        overallPassed: dto.overallPassed,
        notes: dto.notes,
        checkedById: userId,
      },
    });
  }

  // ── Update Economic Value ──────────────────────────────────────────────────

  async updateEconomicValue(
    orderId: string,
    dto: { partsCost: number; marketRepairCost: number },
  ) {
    const order = await this.prisma.repairOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Repair order not found');

    const economicValueSaved = Math.max(0, dto.marketRepairCost - dto.partsCost);

    return this.prisma.repairOrder.update({
      where: { id: orderId },
      data: {
        partsCost: dto.partsCost,
        marketRepairCost: dto.marketRepairCost,
        economicValueSaved,
      },
      select: { id: true, partsCost: true, marketRepairCost: true, economicValueSaved: true },
    });
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private defaultInclude() {
    return {
      customer: true,
      repairItems: true,
      center: { select: { id: true, name: true, code: true } },
      mission: { select: { id: true, name: true, fiscalYear: true } },
      assignedTo: { select: { id: true, fullName: true, username: true } },
    };
  }

  private formatOrder(order: any) {
    const customer = order.customer
      ? {
          id: order.customer.id,
          firstName: order.customer.firstNameEnc
            ? this.aes.decrypt(order.customer.firstNameEnc)
            : '',
          lastName: order.customer.lastNameEnc
            ? this.aes.decrypt(order.customer.lastNameEnc)
            : '',
          nationalId: order.customer.nationalIdEnc
            ? this.aes.decrypt(order.customer.nationalIdEnc)
            : '',
          phone: order.customer.phone || '',
          address: order.customer.address || '',
        }
      : null;

    const items = (order.repairItems || []).map((item: any) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitCost: item.unitCost ? Number(item.unitCost) : 0,
      cost: item.unitCost ? Number(item.unitCost) : 0,
      totalCost: item.totalCost ? Number(item.totalCost) : 0,
      isProcured: item.isProcured,
    }));

    return {
      ...order,
      customer,
      items,
      parts: items,
      economicValueSaved: order.economicValueSaved ? Number(order.economicValueSaved) : null,
      partsCost: order.partsCost ? Number(order.partsCost) : null,
      marketRepairCost: order.marketRepairCost ? Number(order.marketRepairCost) : null,
    };
  }
}
