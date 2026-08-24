import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKitchenLogDto, UpdateKitchenLogDto } from './dto/create-kitchen-log.dto';

@Injectable()
export class KitchenService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(centerId?: string, missionId?: string) {
    const where: any = {};
    if (centerId) where.centerId = centerId;
    if (missionId) where.missionId = missionId;

    return this.prisma.kitchenLog.findMany({
      where,
      include: {
        center: { select: { id: true, name: true, code: true } },
        mission: { select: { id: true, name: true, fiscalYear: true } },
      },
      orderBy: { serviceDate: 'desc' },
    });
  }

  async findById(id: string) {
    const log = await this.prisma.kitchenLog.findUnique({
      where: { id },
      include: {
        center: true,
        mission: true,
      },
    });
    if (!log) throw new NotFoundException('ไม่พบรายการบันทึกครัวอาชีวะ');
    return log;
  }

  async getSummary(centerId?: string, missionId?: string) {
    const where: any = {};
    if (centerId) where.centerId = centerId;
    if (missionId) where.missionId = missionId;

    const [totalEntries, totalBoxesResult, totalWaterResult, totalReliefResult] = await Promise.all([
      this.prisma.kitchenLog.count({ where }),
      this.prisma.kitchenLog.aggregate({
        where: { ...where, categoryCode: { in: ['K01', 'KITCHEN_BOX', ''] } },
        _sum: { quantity: true },
      }),
      this.prisma.kitchenLog.aggregate({
        where: { ...where, categoryCode: 'K02' },
        _sum: { quantity: true },
      }),
      this.prisma.kitchenLog.aggregate({
        where: { ...where, categoryCode: 'K03' },
        _sum: { quantity: true },
      }),
    ]);

    const totalQuantity = await this.prisma.kitchenLog.aggregate({
      where,
      _sum: { quantity: true },
    });

    return {
      totalEntries,
      totalQuantity: totalQuantity._sum.quantity || 0,
      totalBoxes: totalBoxesResult._sum.quantity || 0,
      totalWater: totalWaterResult._sum.quantity || 0,
      totalRelief: totalReliefResult._sum.quantity || 0,
    };
  }

  async create(dto: CreateKitchenLogDto) {
    return this.prisma.kitchenLog.create({
      data: {
        missionId: dto.missionId,
        centerId: dto.centerId,
        serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : new Date(),
        menuName: dto.menuName,
        categoryCode: dto.categoryCode || 'K01',
        quantity: dto.quantity,
        unit: dto.unit || 'กล่อง',
        targetLocation: dto.targetLocation,
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

  async update(id: string, dto: UpdateKitchenLogDto) {
    await this.findById(id);
    const data: any = { ...dto };
    if (dto.serviceDate) data.serviceDate = new Date(dto.serviceDate);

    return this.prisma.kitchenLog.update({
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
    await this.prisma.kitchenLog.delete({ where: { id } });
    return { success: true };
  }
}
