import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get KPI summary (multi-center or specific center)' })
  @ApiQuery({ name: 'centerId',  required: false })
  @ApiQuery({ name: 'missionId', required: false })
  getSummary(
    @Query('centerId')  centerId?:  string,
    @Query('missionId') missionId?: string,
  ) {
    return this.service.getSummary(centerId, missionId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get KPI summary (alias for getSummary)' })
  @ApiQuery({ name: 'centerId',  required: false })
  @ApiQuery({ name: 'missionId', required: false })
  getStats(
    @Query('centerId')  centerId?:  string,
    @Query('missionId') missionId?: string,
  ) {
    return this.service.getSummary(centerId, missionId);
  }

  @Get('queue-board')
  @ApiOperation({ summary: 'Get live queue board data for a center (Public for Smart TV)' })
  @ApiQuery({ name: 'centerId',  required: true })
  @ApiQuery({ name: 'missionId', required: false })
  getQueueBoard(
    @Query('centerId')  centerId:   string,
    @Query('missionId') missionId?: string,
  ) {
    return this.service.getQueueBoard(centerId, missionId);
  }
}
