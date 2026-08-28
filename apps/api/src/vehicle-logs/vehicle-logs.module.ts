import { Module } from '@nestjs/common';
import { VehicleLogsService } from './vehicle-logs.service';
import { VehicleLogsController } from './vehicle-logs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VehicleLogsController],
  providers: [VehicleLogsService],
  exports: [VehicleLogsService],
})
export class VehicleLogsModule {}
