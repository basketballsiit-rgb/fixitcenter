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
import { ApplianceLogsService } from './appliance-logs.service';
import { CreateApplianceLogDto, UpdateApplianceLogDto } from './dto/create-appliance-log.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('appliance-logs')
export class ApplianceLogsController {
  constructor(private readonly applianceLogsService: ApplianceLogsService) {}

  @Get('summary')
  async getSummary(@Query('centerId') centerId?: string, @Query('missionId') missionId?: string, @Req() req?: any) {
    const user = req?.user;
    const isCenterAdmin = user?.role === 'CENTER_ADMIN' || user?.role?.name === 'CENTER_ADMIN';
    const effectiveCenterId = isCenterAdmin && user?.centerId ? user.centerId : centerId;

    return this.applianceLogsService.getSummary(effectiveCenterId, missionId);
  }

  @Post('sync')
  async syncFromOrders(@Query('centerId') centerId?: string, @Query('missionId') missionId?: string, @Req() req?: any) {
    const user = req?.user;
    const isCenterAdmin = user?.role === 'CENTER_ADMIN' || user?.role?.name === 'CENTER_ADMIN';
    const effectiveCenterId = isCenterAdmin && user?.centerId ? user.centerId : centerId;

    return this.applianceLogsService.syncFromOrders(effectiveCenterId, missionId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('centerId') centerId?: string, @Query('missionId') missionId?: string, @Req() req?: any) {
    const user = req?.user;
    const isCenterAdmin = user?.role === 'CENTER_ADMIN' || user?.role?.name === 'CENTER_ADMIN';
    const effectiveCenterId = isCenterAdmin && user?.centerId ? user.centerId : centerId;

    return this.applianceLogsService.findAll(effectiveCenterId, missionId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id') id: string) {
    return this.applianceLogsService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateApplianceLogDto, @Req() req?: any) {
    const user = req?.user;
    const isCenterAdmin = user?.role === 'CENTER_ADMIN' || user?.role?.name === 'CENTER_ADMIN';
    if (isCenterAdmin && user?.centerId) {
      dto.centerId = user.centerId;
    }
    return this.applianceLogsService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateApplianceLogDto, @Req() req?: any) {
    const user = req?.user;
    const isCenterAdmin = user?.role === 'CENTER_ADMIN' || user?.role?.name === 'CENTER_ADMIN';
    if (isCenterAdmin && user?.centerId) {
      const existing = await this.applianceLogsService.findById(id);
      if (existing.centerId !== user.centerId) {
        throw new ForbiddenException('ท่านไม่มีสิทธิ์แก้ไขข้อมูลของศูนย์อื่น');
      }
      dto.centerId = user.centerId;
    }
    return this.applianceLogsService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req?: any) {
    const user = req?.user;
    const isCenterAdmin = user?.role === 'CENTER_ADMIN' || user?.role?.name === 'CENTER_ADMIN';
    if (isCenterAdmin && user?.centerId) {
      const existing = await this.applianceLogsService.findById(id);
      if (existing.centerId !== user.centerId) {
        throw new ForbiddenException('ท่านไม่มีสิทธิ์ลบข้อมูลของศูนย์อื่น');
      }
    }
    return this.applianceLogsService.delete(id);
  }
}
