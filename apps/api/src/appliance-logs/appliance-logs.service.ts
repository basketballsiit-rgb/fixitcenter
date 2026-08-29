import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplianceLogDto, UpdateApplianceLogDto } from './dto/create-appliance-log.dto';

@Injectable()
export class ApplianceLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(centerId?: string, missionId?: string) {
    const where: any = {};
    if (centerId) where.centerId = centerId;
    if (missionId) where.missionId = missionId;

    return this.prisma.applianceLog.findMany({
      where,
      include: {
        center: { select: { id: true, name: true, code: true } },
        mission: { select: { id: true, name: true, fiscalYear: true } },
      },
      orderBy: { serviceDate: 'desc' },
    });
  }

  async findById(id: string) {
    const log = await this.prisma.applianceLog.findUnique({
      where: { id },
      include: {
        center: true,
        mission: true,
      },
    });
    if (!log) throw new NotFoundException('ไม่พบรายการบันทึกงานบริการเครื่องใช้ไฟฟ้า');
    return log;
  }

  async getSummary(centerId?: string, missionId?: string) {
    const where: any = {};
    if (centerId) where.centerId = centerId;
    if (missionId) where.missionId = missionId;

    const [totalEntries, serviceCountAgg, completedCountAgg, budgetAgg] = await Promise.all([
      this.prisma.applianceLog.count({ where }),
      this.prisma.applianceLog.aggregate({
        where,
        _sum: { serviceCount: true },
      }),
      this.prisma.applianceLog.aggregate({
        where,
        _sum: { completedCount: true },
      }),
      this.prisma.applianceLog.aggregate({
        where,
        _sum: { totalBudget: true },
      }),
    ]);

    // Also get counts from ELECTRICAL and ELECTRONICS repair orders for complete visibility
    const electOrderWhere: any = { tradeCode: { in: ['ELECTRICAL', 'ELECTRONICS'] } };
    if (centerId) electOrderWhere.centerId = centerId;
    if (missionId) electOrderWhere.missionId = missionId;

    const [electOrderTotal, electOrderCompleted] = await Promise.all([
      this.prisma.repairOrder.count({ where: electOrderWhere }),
      this.prisma.repairOrder.count({
        where: { ...electOrderWhere, status: { in: ['COMPLETED', 'CLOSED'] } },
      }),
    ]);

    return {
      totalEntries,
      totalServices: (serviceCountAgg._sum.serviceCount || 0) + electOrderTotal,
      totalCompleted: (completedCountAgg._sum.completedCount || 0) + electOrderCompleted,
      totalBudget: Number(budgetAgg._sum.totalBudget || 0),
    };
  }

  async create(dto: CreateApplianceLogDto) {
    const serviceCount = dto.serviceCount ?? 1;
    const completedCount = dto.completedCount ?? serviceCount;
    const budgetPerUnit = dto.budgetPerUnit ? Number(dto.budgetPerUnit) : null;
    const totalBudget = dto.totalBudget
      ? Number(dto.totalBudget)
      : budgetPerUnit
      ? budgetPerUnit * serviceCount
      : null;

    return this.prisma.applianceLog.create({
      data: {
        missionId: dto.missionId,
        centerId: dto.centerId,
        serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : new Date(),
        serviceDetails: dto.serviceDetails,
        applianceType: dto.applianceType || 'เครื่องใช้ไฟฟ้าทั่วไป',
        serviceCount,
        completedCount,
        budgetPerUnit,
        totalBudget,
        targetLocation: dto.targetLocation || null,
        recipientOrg: dto.recipientOrg || null,
        coordinatorName: dto.coordinatorName || null,
        notes: dto.notes || null,
      },
      include: {
        center: { select: { id: true, name: true, code: true } },
        mission: { select: { id: true, name: true, fiscalYear: true } },
      },
    });
  }

  async update(id: string, dto: UpdateApplianceLogDto) {
    await this.findById(id);
    const data: any = { ...dto };
    if (dto.serviceDate) data.serviceDate = new Date(dto.serviceDate);
    if (dto.budgetPerUnit !== undefined) data.budgetPerUnit = dto.budgetPerUnit ? Number(dto.budgetPerUnit) : null;
    if (dto.totalBudget !== undefined) data.totalBudget = dto.totalBudget ? Number(dto.totalBudget) : null;

    return this.prisma.applianceLog.update({
      where: { id },
      data,
      include: {
        center: { select: { id: true, name: true, code: true } },
        mission: { select: { id: true, name: true, fiscalYear: true } },
      },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    await this.prisma.applianceLog.delete({ where: { id } });
    return { success: true };
  }

  async syncFromOrders(centerId?: string, missionId?: string) {
    const where: any = { tradeCode: { in: ['ELECTRICAL', 'ELECTRONICS'] } };
    if (centerId) where.centerId = centerId;
    if (missionId) where.missionId = missionId;

    const orders = await this.prisma.repairOrder.findMany({
      where,
      include: { center: true, mission: true },
      orderBy: { registeredAt: 'asc' },
    });

    if (orders.length === 0) return { count: 0, message: 'ไม่มีข้อมูลงานซ่อมในระบบ' };

    // Group by Date (YYYY-MM-DD), CenterId, and ApplianceType/Category
    const groups: Record<string, {
      missionId: string;
      centerId: string;
      centerName: string;
      targetLocation: string;
      dateStr: string;
      applianceType: string;
      serviceCount: number;
      completedCount: number;
      totalBudget: number;
      problems: string[];
    }> = {};

    for (const order of orders) {
      const d = new Date(order.registeredAt || (order as any).createdAt || Date.now());
      const dateStr = d.toISOString().split('T')[0];
      const appType = order.deviceCategory || 'เครื่องใช้ไฟฟ้าทั่วไป';
      const key = `${dateStr}_${order.centerId}_${appType}`;

      if (!groups[key]) {
        groups[key] = {
          missionId: order.missionId,
          centerId: order.centerId,
          centerName: order.center?.name || '',
          targetLocation: order.center?.address || '',
          dateStr,
          applianceType: appType,
          serviceCount: 0,
          completedCount: 0,
          totalBudget: 0,
          problems: [],
        };
      }

      groups[key].serviceCount += 1;
      if (['COMPLETED', 'CLOSED'].includes(order.status)) {
        groups[key].completedCount += 1;
      }
      const pCost = Number(order.partsCost || 0);
      groups[key].totalBudget += pCost > 0 ? pCost : 100;

      if (order.problemDesc && groups[key].problems.length < 3) {
        groups[key].problems.push(order.problemDesc);
      }
    }

    let createdCount = 0;
    for (const key of Object.keys(groups)) {
      const g = groups[key];
      const serviceDate = new Date(g.dateStr);
      const budgetPerUnit = g.serviceCount > 0 ? Math.round((g.totalBudget / g.serviceCount) * 100) / 100 : 100;
      const serviceDetails = g.problems.length > 0
        ? `ล้างทำความสะอาด ตรวจเช็ค ซ่อม-เปลี่ยนอะไหล่ (${g.problems.join(', ')})`
        : 'ล้างทำความสะอาด ตรวจเช็ค ซ่อม-เปลี่ยนอะไหล่ เครื่องใช้ไฟฟ้า /อุปกรณ์วิชาชีพ';

      const existing = await this.prisma.applianceLog.findFirst({
        where: {
          centerId: g.centerId,
          applianceType: g.applianceType,
          serviceDate: {
            gte: new Date(`${g.dateStr}T00:00:00.000Z`),
            lte: new Date(`${g.dateStr}T23:59:59.999Z`),
          },
        },
      });

      if (existing) {
        await this.prisma.applianceLog.update({
          where: { id: existing.id },
          data: {
            serviceCount: g.serviceCount,
            completedCount: g.completedCount,
            budgetPerUnit,
            totalBudget: g.totalBudget,
            serviceDetails,
          },
        });
      } else {
        await this.prisma.applianceLog.create({
          data: {
            missionId: g.missionId,
            centerId: g.centerId,
            serviceDate,
            applianceType: g.applianceType,
            serviceDetails,
            serviceCount: g.serviceCount,
            completedCount: g.completedCount,
            budgetPerUnit,
            totalBudget: g.totalBudget,
            targetLocation: g.targetLocation || null,
          },
        });
        createdCount++;
      }
    }

    return { count: Object.keys(groups).length, createdCount };
  }
}
