import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

const LINE_API_URL = 'https://api.line.me/v2/bot/message/push';

@Injectable()
export class LineService {
  private readonly logger = new Logger(LineService.name);
  private readonly token: string;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.token = this.config.get<string>('LINE_CHANNEL_ACCESS_TOKEN', '');
    if (!this.token) {
      this.logger.warn('LINE_CHANNEL_ACCESS_TOKEN not set — notifications disabled');
    }
  }

  /**
   * Send a LINE push message to a specific userId or groupId.
   */
  async sendLineMessage(to: string, message: string, repairOrderId?: string): Promise<void> {
    if (!this.token) {
      this.logger.debug(`[LINE MOCK] To: ${to} | Message: ${message}`);
      await this.recordNotification(to, message, 'SENT', repairOrderId);
      return;
    }

    try {
      await axios.post(
        LINE_API_URL,
        {
          to,
          messages: [{ type: 'text', text: message }],
        },
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        },
      );

      await this.recordNotification(to, message, 'SENT', repairOrderId);
      this.logger.log(`LINE push sent to ${to}`);
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message ?? err.message;
      this.logger.error(`LINE push failed to ${to}: ${errorMessage}`);
      await this.recordNotification(to, message, 'FAILED', repairOrderId, errorMessage);
    }
  }

  /**
   * Notify a team based on centerId and tradeCode.
   * Looks up the center's LINE group ID and sends to that group.
   */
  async notifyTeam(centerId: string, tradeCode: string, message: string, repairOrderId?: string): Promise<void> {
    try {
      const center = await this.prisma.serviceCenter.findUnique({
        where: { id: centerId },
        select: { lineGroupId: true, name: true },
      });

      if (!center?.lineGroupId) {
        this.logger.debug(`No LINE group configured for center ${centerId}`);
        return;
      }

      const teamMessage = `[${tradeCode === 'ELECTRICAL' ? 'ไฟฟ้า' : tradeCode === 'ELECTRONICS' ? 'อิเล็กทรอนิกส์' : 'ยานยนต์'}]\n${message}`;
      await this.sendLineMessage(center.lineGroupId, teamMessage, repairOrderId);
    } catch (err: any) {
      this.logger.error(`notifyTeam failed: ${err.message}`);
    }
  }

  /**
   * Get notification history for a repair order.
   */
  async getHistory(repairOrderId?: string) {
    return this.prisma.notification.findMany({
      where: repairOrderId ? { repairOrderId } : {},
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  private async recordNotification(
    recipient: string,
    message: string,
    status: 'SENT' | 'FAILED' | 'PENDING',
    repairOrderId?: string,
    errorMessage?: string,
  ) {
    try {
      await this.prisma.notification.create({
        data: {
          repairOrderId,
          channel: 'LINE',
          status,
          recipient,
          message,
          errorMessage,
          sentAt: status === 'SENT' ? new Date() : undefined,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record notification: ${err.message}`);
    }
  }
}
