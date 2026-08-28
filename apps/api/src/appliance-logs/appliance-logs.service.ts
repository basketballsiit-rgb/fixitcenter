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
}
