import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleLogDto, UpdateVehicleLogDto } from './dto/create-vehicle-log.dto';

@Injectable()
export class VehicleLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(centerId?: string, missionId?: string) {
    const where: any = {};
    if (centerId) where.centerId = centerId;
    if (missionId) where.missionId = missionId;

    return this.prisma.vehicleLog.findMany({
      where,
      include: {
        center: { select: { id: true, name: true, code: true } },
        mission: { select: { id: true, name: true, fiscalYear: true } },
      },
      orderBy: { serviceDate: 'desc' },
    });
  }

  async findById(id: string) {
    const log = await this.prisma.vehicleLog.findUnique({
      where: { id },
      include: {
        center: true,
        mission: true,
      },
    });
    if (!log) throw new NotFoundException('ไม่พบรายการบันทึกงานบริการยานพาหนะ');
    return log;
  }

  async getSummary(centerId?: string, missionId?: string) {
    const where: any = {};
    if (centerId) where.centerId = centerId;
    if (missionId) where.missionId = missionId;

    const [totalEntries, serviceCountAgg, completedCountAgg, budgetAgg] = await Promise.all([
      this.prisma.vehicleLog.count({ where }),
      this.prisma.vehicleLog.aggregate({
        where,
        _sum: { serviceCount: true },
      }),
      this.prisma.vehicleLog.aggregate({
        where,
        _sum: { completedCount: true },
      }),
      this.prisma.vehicleLog.aggregate({
        where,
        _sum: { totalBudget: true },
      }),
    ]);

    // Also get counts from automotive repair orders for complete visibility
    const autoOrderWhere: any = { tradeCode: 'AUTOMOTIVE' };
    if (centerId) autoOrderWhere.centerId = centerId;
    if (missionId) autoOrderWhere.missionId = missionId;

    const [autoOrderTotal, autoOrderCompleted] = await Promise.all([
      this.prisma.repairOrder.count({ where: autoOrderWhere }),
      this.prisma.repairOrder.count({
        where: { ...autoOrderWhere, status: { in: ['COMPLETED', 'CLOSED'] } },
      }),
    ]);

    return {
      totalEntries,
      totalServices: (serviceCountAgg._sum.serviceCount || 0) + autoOrderTotal,
      totalCompleted: (completedCountAgg._sum.completedCount || 0) + autoOrderCompleted,
      totalBudget: Number(budgetAgg._sum.totalBudget || 0),
    };
  }

  async create(dto: CreateVehicleLogDto) {
    const serviceCount = dto.serviceCount ?? 1;
    const completedCount = dto.completedCount ?? serviceCount;
    const budgetPerUnit = dto.budgetPerUnit ? Number(dto.budgetPerUnit) : null;
    const totalBudget = dto.totalBudget
      ? Number(dto.totalBudget)
      : budgetPerUnit
      ? budgetPerUnit * serviceCount
      : null;

    return this.prisma.vehicleLog.create({
      data: {
        missionId: dto.missionId,
        centerId: dto.centerId,
        serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : new Date(),
        serviceDetails: dto.serviceDetails,
        vehicleType: dto.vehicleType || 'รถจักรยานยนต์',
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

  async update(id: string, dto: UpdateVehicleLogDto) {
    await this.findById(id);
    const data: any = { ...dto };
    if (dto.serviceDate) data.serviceDate = new Date(dto.serviceDate);
    if (dto.budgetPerUnit !== undefined) data.budgetPerUnit = dto.budgetPerUnit ? Number(dto.budgetPerUnit) : null;
    if (dto.totalBudget !== undefined) data.totalBudget = dto.totalBudget ? Number(dto.totalBudget) : null;

    return this.prisma.vehicleLog.update({
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
    await this.prisma.vehicleLog.delete({ where: { id } });
    return { success: true };
  }
}
