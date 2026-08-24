import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import Redis from 'ioredis';
export type TradeCode = 'ELECTRICAL' | 'ELECTRONICS' | 'AUTOMOTIVE' | 'KITCHEN';

const TRADE_PREFIX: Record<TradeCode, string> = {
  ELECTRICAL:   'E',
  ELECTRONICS:  'X',
  AUTOMOTIVE:   'A',
  KITCHEN:      'K',
};

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private redis: Redis;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const redisUrl = this.config.get<string>('REDIS_URL', 'redis://localhost:6379');
    this.redis = new Redis(redisUrl, {
      lazyConnect: true,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
    });

    this.redis.on('connect', () => this.logger.log('✅ Redis connected'));
    this.redis.on('error', (err) => this.logger.error(`Redis error: ${err.message}`));
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * Atomically increment queue counter and return formatted ticket number.
   * Uses Redis INCR for atomic increment, syncs to PostgreSQL for persistence.
   * Key pattern: queue:{centerId}:{missionId}:{tradeCode}
   */
  async getNextNumber(centerId: string, missionId: string, tradeCode: TradeCode): Promise<string> {
    const key = `queue:${centerId}:${missionId}:${tradeCode}`;
    const prefix = TRADE_PREFIX[tradeCode] || 'E';

    let count: number;

    try {
      count = await this.redis.incr(key);

      // Find highest existing queue number in DB for this trade to avoid collisions
      const existingOrders = await this.prisma.repairOrder.findMany({
        where: {
          tradeCode: tradeCode as any,
          queueNumber: { startsWith: `${prefix}-` },
        },
        select: { queueNumber: true },
      });

      let maxExisting = 0;
      for (const ord of existingOrders) {
        const parts = ord.queueNumber.split('-');
        if (parts.length === 2) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && num > maxExisting) {
            maxExisting = num;
          }
        }
      }

      if (count <= maxExisting) {
        count = maxExisting + 1;
        await this.redis.set(key, count);
      }
    } catch (redisErr) {
      this.logger.warn(`Redis unavailable, falling back to DB counter: ${redisErr}`);
      const updated = await this.prisma.tradeQueueCounter.upsert({
        where: { centerId_missionId_tradeCode: { centerId, missionId, tradeCode: tradeCode as any } },
        create: { centerId, missionId, tradeCode: tradeCode as any, currentValue: 1 },
        update: { currentValue: { increment: 1 } },
      });
      count = updated.currentValue;

      const existingOrders = await this.prisma.repairOrder.findMany({
        where: {
          tradeCode: tradeCode as any,
          queueNumber: { startsWith: `${prefix}-` },
        },
        select: { queueNumber: true },
      });

      let maxExisting = 0;
      for (const ord of existingOrders) {
        const parts = ord.queueNumber.split('-');
        if (parts.length === 2) {
          const num = parseInt(parts[1], 10);
          if (!isNaN(num) && num > maxExisting) {
            maxExisting = num;
          }
        }
      }

      if (count <= maxExisting) {
        count = maxExisting + 1;
      }
    }

    // Async sync to DB
    this.syncToDb(centerId, missionId, tradeCode, count).catch((err) =>
      this.logger.error(`DB sync failed: ${err.message}`),
    );

    const padded = String(count).padStart(3, '0');
    return `${prefix}-${padded}`;
  }

  private async syncToDb(centerId: string, missionId: string, tradeCode: TradeCode, value: number) {
    await this.prisma.tradeQueueCounter.upsert({
      where: { centerId_missionId_tradeCode: { centerId, missionId, tradeCode: tradeCode as any } },
      create: { centerId, missionId, tradeCode: tradeCode as any, currentValue: value },
      update: { currentValue: value },
    });
  }

  /**
   * Get current counter value (for display/reporting).
   */
  async getCurrentCount(centerId: string, missionId: string, tradeCode: TradeCode): Promise<number> {
    const key = `queue:${centerId}:${missionId}:${tradeCode}`;
    try {
      const val = await this.redis.get(key);
      if (val !== null) return parseInt(val, 10);
    } catch {}

    const counter = await this.prisma.tradeQueueCounter.findUnique({
      where: { centerId_missionId_tradeCode: { centerId, missionId, tradeCode: tradeCode as any } },
    });
    return counter?.currentValue ?? 0;
  }

  /**
   * Reset a counter (admin only).
   */
  async resetCounter(centerId: string, missionId: string, tradeCode: TradeCode): Promise<void> {
    const key = `queue:${centerId}:${missionId}:${tradeCode}`;
    try { await this.redis.del(key); } catch {}

    await this.prisma.tradeQueueCounter.upsert({
      where: { centerId_missionId_tradeCode: { centerId, missionId, tradeCode: tradeCode as any } },
      create: { centerId, missionId, tradeCode: tradeCode as any, currentValue: 0 },
      update: { currentValue: 0 },
    });
  }
}
