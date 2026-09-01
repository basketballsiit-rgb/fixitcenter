import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

function subDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - days);
  return d;
}
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(centerId?: string, missionId?: string) {
    const where: any = {
      ...(centerId  ? { centerId  } : {}),
      ...(missionId ? { missionId } : {}),
    };

    // ── Aggregate counts ──────────────────────────────────────────────────
    const [totalRepairs, completedRepairs, inProgressRepairs, pendingRepairs] = await Promise.all([
      this.prisma.repairOrder.count({ where }),
      this.prisma.repairOrder.count({ where: { ...where, status: { in: ['COMPLETED', 'CLOSED'] } } }),
      this.prisma.repairOrder.count({ where: { ...where, status: { in: ['DIAGNOSING', 'REPAIRING', 'WAITING_PARTS', 'QC_PENDING'] } } }),
      this.prisma.repairOrder.count({ where: { ...where, status: 'PENDING' } }),
    ]);

    // ── Economic value saved ───────────────────────────────────────────────
    const econAgg = await this.prisma.repairOrder.aggregate({
      where: { ...where, status: { in: ['COMPLETED', 'CLOSED'] } },
      _sum: { economicValueSaved: true },
    });
    const economicValueSaved = Number(econAgg._sum.economicValueSaved ?? 0);

    // ── Trade breakdown & status stats ─────────────────────────────────────
    const tradeGroupBy = await this.prisma.repairOrder.groupBy({
      by: ['tradeCode'],
      where,
      _count: { tradeCode: true },
    });
    const tradeBreakdown = { ELECTRICAL: 0, ELECTRONICS: 0, AUTOMOTIVE: 0 };
    for (const row of tradeGroupBy) {
      tradeBreakdown[row.tradeCode] = row._count.tradeCode;
    }

    const [
      elecCompleted, elecInProgress,
      elec0Completed, elec0InProgress,
      autoCompleted, autoInProgress
    ] = await Promise.all([
      this.prisma.repairOrder.count({ where: { ...where, tradeCode: 'ELECTRICAL', status: { in: ['COMPLETED', 'CLOSED'] } } }),
      this.prisma.repairOrder.count({ where: { ...where, tradeCode: 'ELECTRICAL', status: { in: ['PENDING', 'DIAGNOSING', 'REPAIRING', 'WAITING_PARTS', 'QC_PENDING'] } } }),
      this.prisma.repairOrder.count({ where: { ...where, tradeCode: 'ELECTRONICS', status: { in: ['COMPLETED', 'CLOSED'] } } }),
      this.prisma.repairOrder.count({ where: { ...where, tradeCode: 'ELECTRONICS', status: { in: ['PENDING', 'DIAGNOSING', 'REPAIRING', 'WAITING_PARTS', 'QC_PENDING'] } } }),
      this.prisma.repairOrder.count({ where: { ...where, tradeCode: 'AUTOMOTIVE', status: { in: ['COMPLETED', 'CLOSED'] } } }),
      this.prisma.repairOrder.count({ where: { ...where, tradeCode: 'AUTOMOTIVE', status: { in: ['PENDING', 'DIAGNOSING', 'REPAIRING', 'WAITING_PARTS', 'QC_PENDING'] } } }),
    ]);

    const tradeStats = {
      ELECTRICAL: {
        total: tradeBreakdown.ELECTRICAL,
        completed: elecCompleted,
        inProgress: elecInProgress,
      },
      ELECTRONICS: {
        total: tradeBreakdown.ELECTRONICS,
        completed: elec0Completed,
        inProgress: elec0InProgress,
      },
      AUTOMOTIVE: {
        total: tradeBreakdown.AUTOMOTIVE,
        completed: autoCompleted,
        inProgress: autoInProgress,
      },
    };

    // ── Daily repairs (last 30 days) ───────────────────────────────────────
    const thirtyDaysAgo = subDays(new Date(), 30);
    const dailyRaw = await this.prisma.repairOrder.groupBy({
      by: ['registeredAt'],
      where: { ...where, registeredAt: { gte: thirtyDaysAgo } },
      _count: { id: true },
    });

    // Bucket by date
    const dailyMap = new Map<string, number>();
    for (const row of dailyRaw) {
      const dateKey = formatDate(new Date(row.registeredAt));
      dailyMap.set(dateKey, (dailyMap.get(dateKey) ?? 0) + row._count.id);
    }
    const dailyRepairs = Array.from({ length: 30 }, (_, i) => {
      const d = formatDate(subDays(new Date(), 29 - i));
      return { date: d, count: dailyMap.get(d) ?? 0 };
    });

    // ── Center breakdown ───────────────────────────────────────────────────
    const centerGroupBy = await this.prisma.repairOrder.groupBy({
      by: ['centerId'],
      where,
      _count: { id: true },
    });
    const centerIds = centerGroupBy.map((r) => r.centerId);
    const centers = await this.prisma.serviceCenter.findMany({
      where: { id: { in: centerIds } },
      select: { id: true, name: true },
    });
    const centerMap = new Map(centers.map((c) => [c.id, c.name]));
    const centerBreakdown = centerGroupBy.map((r) => ({
      centerId: r.centerId,
      centerName: centerMap.get(r.centerId) ?? r.centerId,
      count: r._count.id,
    }));

    // ── All Service Centers with Live Scoped Stats ─────────────────────────
    const allCenters = await this.prisma.serviceCenter.findMany({
      where: {
        ...(missionId ? { missionId } : {}),
      },
      include: {
        mission: { select: { name: true, fiscalYear: true } },
        _count: { select: { repairOrders: true, users: true } },
      },
      orderBy: { code: 'asc' },
    });

    const centersWithStats = await Promise.all(
      allCenters.map(async (c) => {
        const cWhere = { centerId: c.id, ...(missionId ? { missionId } : {}) };
        const [cCompleted, cInProgress, cEcon] = await Promise.all([
          this.prisma.repairOrder.count({ where: { ...cWhere, status: 'COMPLETED' } }),
          this.prisma.repairOrder.count({ where: { ...cWhere, status: { in: ['DIAGNOSING', 'REPAIRING', 'WAITING_PARTS', 'QC_PENDING'] } } }),
          this.prisma.repairOrder.aggregate({
            where: { ...cWhere, status: { in: ['COMPLETED', 'CLOSED'] } },
            _sum: { economicValueSaved: true },
          }),
        ]);
        return {
          id: c.id,
          name: c.name,
          code: c.code,
          region: c.region,
          phone: c.phone,
          address: c.address,
          isActive: c.isActive,
          missionName: c.mission?.name,
          totalRepairs: c._count.repairOrders,
          completedRepairs: cCompleted,
          inProgressRepairs: cInProgress,
          economicValueSaved: Number(cEcon._sum.economicValueSaved ?? 0),
          technicianCount: c._count.users,
        };
      })
    );

    return {
      totalRepairs,
      completedRepairs,
      inProgressRepairs,
      pendingRepairs,
      economicValueSaved,
      tradeBreakdown,
      tradeStats,
      dailyRepairs,
      centerBreakdown,
      centers: centersWithStats,
    };
  }

  async getQueueBoard(centerId?: string, missionId?: string) {
    const where: any = {
      status: { in: ['PENDING', 'DIAGNOSING', 'WAITING_PARTS', 'REPAIRING', 'QC_PENDING', 'COMPLETED'] },
      ...(missionId ? { missionId } : {}),
    };
    if (centerId && centerId !== 'ALL' && centerId !== 'all') {
      where.centerId = centerId;
    }

    const orders = await this.prisma.repairOrder.findMany({
      where,
      select: {
        id: true,
        queueNumber: true,
        tradeCode: true,
        status: true,
        deviceCategory: true,
        deviceBrand: true,
        registeredAt: true,
        center: { select: { id: true, name: true, code: true } },
      },
      orderBy: { registeredAt: 'asc' },
    });

    const center = centerId && centerId !== 'ALL' && centerId !== 'all'
      ? await this.prisma.serviceCenter.findUnique({
          where: { id: centerId },
          select: { id: true, name: true, code: true, region: true, phone: true },
        })
      : null;

    const queues = {
      ELECTRICAL:  orders.filter((o) => o.tradeCode === 'ELECTRICAL'),
      ELECTRONICS: orders.filter((o) => o.tradeCode === 'ELECTRONICS'),
      AUTOMOTIVE:  orders.filter((o) => o.tradeCode === 'AUTOMOTIVE'),
      KITCHEN:     orders.filter((o) => (o.tradeCode as any) === 'KITCHEN'),
    };

    return {
      centerId: centerId || 'ALL',
      centerName: center?.name ?? 'ภาพรวมทุกศูนย์บริการ FixIt Center',
      centerCode: center?.code ?? 'ALL',
      region: center?.region ?? '',
      phone: center?.phone ?? '',
      queues,
      orders,
    };
  }
}
