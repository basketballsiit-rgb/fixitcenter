import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MissionsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.mission.findMany({
      orderBy: { fiscalYear: 'desc' },
      include: {
        centers: true,
        _count: { select: { centers: true, repairOrders: true } },
      },
    });
  }

  findActive() {
    return this.prisma.mission.findFirst({
      where: { isActive: true },
      include: { centers: { where: { isActive: true } } },
    });
  }

  async findById(id: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id },
      include: { centers: true, _count: { select: { repairOrders: true } } },
    });
    if (!mission) throw new NotFoundException('Mission not found');
    return mission;
  }

  async create(dto: {
    name: string;
    fiscalYear: number;
    startDate: string | Date;
    endDate: string | Date;
    description?: string;
    isActive?: boolean;
  }) {
    if (dto.isActive) {
      await this.prisma.mission.updateMany({ where: { isActive: true }, data: { isActive: false } });
    }
    return this.prisma.mission.create({
      data: {
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
  }

  async update(id: string, dto: Partial<{
    name: string; fiscalYear: number; isActive: boolean; startDate: string | Date; endDate: string | Date; description: string;
  }>) {
    const mission = await this.prisma.mission.findUnique({ where: { id } });
    if (!mission) throw new NotFoundException('Mission not found');

    if (dto.isActive === true) {
      await this.prisma.mission.updateMany({ where: { isActive: true }, data: { isActive: false } });
    }

    const data: any = { ...dto };
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    return this.prisma.mission.update({ where: { id }, data });
  }

  async delete(id: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id },
      include: { _count: { select: { repairOrders: true, centers: true } } },
    });
    if (!mission) throw new NotFoundException('Mission not found');

    if (mission._count.repairOrders > 0) {
      throw new BadRequestException('ไม่สามารถลบภารกิจที่มีงานซ่อมผูกอยู่ได้');
    }

    // Delete associated centers first if any
    await this.prisma.serviceCenter.deleteMany({ where: { missionId: id } });
    return this.prisma.mission.delete({ where: { id } });
  }
}
