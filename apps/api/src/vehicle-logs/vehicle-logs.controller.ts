import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { VehicleLogsService } from './vehicle-logs.service';
import { CreateVehicleLogDto, UpdateVehicleLogDto } from './dto/create-vehicle-log.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('vehicle-logs')
export class VehicleLogsController {
  constructor(private readonly vehicleLogsService: VehicleLogsService) {}

  @Get('summary')
  async getSummary(@Query('centerId') centerId?: string, @Query('missionId') missionId?: string, @Req() req?: any) {
    const user = req?.user;
    const isCenterAdmin = user?.role === 'CENTER_ADMIN' || user?.role?.name === 'CENTER_ADMIN';
    const effectiveCenterId = isCenterAdmin && user?.centerId ? user.centerId : centerId;

    return this.vehicleLogsService.getSummary(effectiveCenterId, missionId);
  }

  @Post('sync')
  async syncFromOrders(@Query('centerId') centerId?: string, @Query('missionId') missionId?: string, @Req() req?: any) {
    const user = req?.user;
    const isCenterAdmin = user?.role === 'CENTER_ADMIN' || user?.role?.name === 'CENTER_ADMIN';
    const effectiveCenterId = isCenterAdmin && user?.centerId ? user.centerId : centerId;

    return this.vehicleLogsService.syncFromOrders(effectiveCenterId, missionId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('centerId') centerId?: string, @Query('missionId') missionId?: string, @Req() req?: any) {
    const user = req?.user;
    const isCenterAdmin = user?.role === 'CENTER_ADMIN' || user?.role?.name === 'CENTER_ADMIN';
    const effectiveCenterId = isCenterAdmin && user?.centerId ? user.centerId : centerId;

    return this.vehicleLogsService.findAll(effectiveCenterId, missionId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id') id: string) {
    return this.vehicleLogsService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateVehicleLogDto, @Req() req?: any) {
    const user = req?.user;
    const isCenterAdmin = user?.role === 'CENTER_ADMIN' || user?.role?.name === 'CENTER_ADMIN';
    if (isCenterAdmin && user?.centerId) {
      dto.centerId = user.centerId;
    }
    return this.vehicleLogsService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateVehicleLogDto, @Req() req?: any) {
    const user = req?.user;
    const isCenterAdmin = user?.role === 'CENTER_ADMIN' || user?.role?.name === 'CENTER_ADMIN';
    if (isCenterAdmin && user?.centerId) {
      const existing = await this.vehicleLogsService.findById(id);
      if (existing.centerId !== user.centerId) {
        throw new ForbiddenException('ท่านไม่มีสิทธิ์แก้ไขข้อมูลของศูนย์อื่น');
      }
      dto.centerId = user.centerId;
    }
    return this.vehicleLogsService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req?: any) {
    const user = req?.user;
    const isCenterAdmin = user?.role === 'CENTER_ADMIN' || user?.role?.name === 'CENTER_ADMIN';
    if (isCenterAdmin && user?.centerId) {
      const existing = await this.vehicleLogsService.findById(id);
      if (existing.centerId !== user.centerId) {
        throw new ForbiddenException('ท่านไม่มีสิทธิ์ลบข้อมูลของศูนย์อื่น');
      }
    }
    return this.vehicleLogsService.delete(id);
  }
}
