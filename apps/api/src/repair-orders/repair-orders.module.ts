import { Module } from '@nestjs/common';
import { RepairOrdersService } from './repair-orders.service';
import { RepairOrdersController } from './repair-orders.controller';
import { QueueModule } from '../queue/queue.module';
import { WebSocketModule } from '../websocket/websocket.module';
import { CustomersModule } from '../customers/customers.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [QueueModule, WebSocketModule, CustomersModule, NotificationsModule],
  providers: [RepairOrdersService],
  controllers: [RepairOrdersController],
  exports: [RepairOrdersService],
})
export class RepairOrdersModule {}
