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
import { KitchenService } from './kitchen.service';
import { CreateKitchenLogDto, UpdateKitchenLogDto } from './dto/create-kitchen-log.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('kitchen')
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Get('summary')
  async getSummary(@Query('centerId') centerId?: string, @Query('missionId') missionId?: string, @Req() req?: any) {
    const user = req?.user;
    const isCenterAdmin = user?.role === 'CENTER_ADMIN' || user?.role?.name === 'CENTER_ADMIN';
    const effectiveCenterId = isCenterAdmin && user?.centerId ? user.centerId : centerId;

    return this.kitchenService.getSummary(effectiveCenterId, missionId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query('centerId') centerId?: string, @Query('missionId') missionId?: string, @Req() req?: any) {
    const user = req?.user;
    const isCenterAdmin = user?.role === 'CENTER_ADMIN' || user?.role?.name === 'CENTER_ADMIN';
    const effectiveCenterId = isCenterAdmin && user?.centerId ? user.centerId : centerId;

    return this.kitchenService.findAll(effectiveCenterId, missionId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id') id: string) {
    return this.kitchenService.findById(id);
  }

  @Post()
  async create(@Body() dto: CreateKitchenLogDto, @Req() req?: any) {
    const user = req?.user;
    const isCenterAdmin = user?.role === 'CENTER_ADMIN' || user?.role?.name === 'CENTER_ADMIN';
    if (isCenterAdmin && user?.centerId) {
      dto.centerId = user.centerId;
    }
    return this.kitchenService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateKitchenLogDto, @Req() req?: any) {
    const user = req?.user;
    const isCenterAdmin = user?.role === 'CENTER_ADMIN' || user?.role?.name === 'CENTER_ADMIN';
    if (isCenterAdmin && user?.centerId) {
      const existing = await this.kitchenService.findById(id);
      if (existing.centerId !== user.centerId) {
        throw new ForbiddenException('ท่านไม่มีสิทธิ์แก้ไขข้อมูลของศูนย์อื่น');
      }
      dto.centerId = user.centerId;
    }
    return this.kitchenService.update(id, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req?: any) {
    const user = req?.user;
    const isCenterAdmin = user?.role === 'CENTER_ADMIN' || user?.role?.name === 'CENTER_ADMIN';
    if (isCenterAdmin && user?.centerId) {
      const existing = await this.kitchenService.findById(id);
      if (existing.centerId !== user.centerId) {
        throw new ForbiddenException('ท่านไม่มีสิทธิ์ลบข้อมูลของศูนย์อื่น');
      }
    }
    return this.kitchenService.delete(id);
  }
}
