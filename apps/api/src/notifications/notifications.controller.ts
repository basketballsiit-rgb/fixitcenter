import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LineService } from './line.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@ApiTags('notifications')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly line: LineService) {}

  @Post('test')
  @Permissions('notifications:send')
  @ApiOperation({ summary: 'Send test LINE push notification' })
  async test(@Body() dto: { to: string; message: string }) {
    await this.line.sendLineMessage(dto.to, dto.message);
    return { success: true };
  }

  @Get()
  @ApiOperation({ summary: 'Get notification history' })
  getHistory(@Query('repairOrderId') repairOrderId?: string) {
    return this.line.getHistory(repairOrderId);
  }
}
