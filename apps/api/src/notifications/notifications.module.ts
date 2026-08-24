import { Module } from '@nestjs/common';
import { LineService } from './line.service';
import { NotificationsController } from './notifications.controller';

@Module({
  providers: [LineService],
  controllers: [NotificationsController],
  exports: [LineService],
})
export class NotificationsModule {}
