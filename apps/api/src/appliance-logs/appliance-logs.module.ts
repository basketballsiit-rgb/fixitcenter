import { Module } from '@nestjs/common';
import { ApplianceLogsService } from './appliance-logs.service';
import { ApplianceLogsController } from './appliance-logs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ApplianceLogsController],
  providers: [ApplianceLogsService],
  exports: [ApplianceLogsService],
})
export class ApplianceLogsModule {}
