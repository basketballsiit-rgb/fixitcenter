import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CentersService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(missionId?: string) {
    return this.prisma.serviceCenter.findMany({
      where: missionId ? { missionId } : undefined,
      include: {
        mission: { select: { id: true, name: true, fiscalYear: true } },
        _count: { select: { repairOrders: true, users: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findById(id: string) {
    const center = await this.prisma.serviceCenter.findUnique({
      where: { id },
      include: {
        mission: true,
        users: {
          select: { id: true, username: true, fullName: true, role: true, isActive: true },
        },
        _count: { select: { repairOrders: true, users: true } },
      },
    });
    if (!center) throw new NotFoundException('Service center not found');
    return center;
  }

  create(dto: {
    name: string;
    code: string;
    region?: string;
    address?: string;
    phone?: string;
    missionId: string;
    lineGroupId?: string;
    isActive?: boolean;
  }) {
    return this.prisma.serviceCenter.create({
      data: {
        ...dto,
        isActive: dto.isActive ?? true,
      },
      include: {
        mission: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: Partial<{
    name: string; code: string; region: string; address: string; phone: string;
    missionId: string; lineGroupId: string; isActive: boolean;
  }>) {
    const center = await this.prisma.serviceCenter.findUnique({ where: { id } });
    if (!center) throw new NotFoundException('Service center not found');
    return this.prisma.serviceCenter.update({
      where: { id },
      data: dto,
      include: {
        mission: { select: { id: true, name: true } },
      },
    });
  }

  async delete(id: string) {
    const center = await this.prisma.serviceCenter.findUnique({
      where: { id },
      include: { _count: { select: { repairOrders: true, users: true } } },
    });
    if (!center) throw new NotFoundException('Service center not found');

    if (center._count.repairOrders > 0) {
      throw new BadRequestException('ไม่สามารถลบศูนย์บริการที่มีงานซ่อมผูกอยู่ได้ กรุณาปิดการใช้งาน (Inactive) แทน');
    }

    // Unassign users from this center
    await this.prisma.user.updateMany({
      where: { centerId: id },
      data: { centerId: null },
    });

    return this.prisma.serviceCenter.delete({ where: { id } });
  }
}
