import { Injectable } from '@nestjs/common';
import { EventsGateway } from './events.gateway';

@Injectable()
export class EventsService {
  constructor(private readonly gateway: EventsGateway) {}

  /**
   * Broadcast a new repair order to all clients in a center room.
   */
  broadcastOrderNew(centerId: string, order: any): void {
    if (!this.gateway.server) return;
    this.gateway.server.to(`center:${centerId}`).emit('order:new', { order });
  }

  /**
   * Broadcast a status change to center room and dashboard.
   */
  broadcastStatusChange(centerId: string, orderId: string, status: string, queueNumber: string): void {
    if (!this.gateway.server) return;
    const payload = { orderId, status, queueNumber, centerId };
    this.gateway.server.to(`center:${centerId}`).emit('order:status', payload);
    this.gateway.server.to('dashboard').emit('order:status', payload);
  }

  /**
   * Broadcast queue counter update.
   */
  broadcastQueueUpdate(centerId: string, tradeCode: string, count: number): void {
    if (!this.gateway.server) return;
    this.gateway.server.to(`center:${centerId}`).emit('queue:update', { centerId, tradeCode, count });
  }

  /**
   * Broadcast dashboard summary update to all dashboard viewers.
   */
  /**
   * Broadcast real-time notification (e.g. WAITING_PARTS with parts cost) to center, dashboard, and global rooms.
   */
  broadcastNotification(centerId: string, notification: any): void {
    if (!this.gateway.server) return;
    this.gateway.server.to(`center:${centerId}`).emit('notification:new', notification);
    this.gateway.server.to('dashboard').emit('notification:new', notification);
    this.gateway.server.emit('notification:global', notification);
  }
}
