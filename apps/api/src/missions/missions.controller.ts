import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MissionsService } from './missions.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('missions')
@Controller('missions')
export class MissionsController {
  constructor(private readonly service: MissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all missions (Public)' })
  findAll() {
    return this.service.findAll();
  }

  @Get('active')
  @ApiOperation({ summary: 'Get currently active mission (Public)' })
  findActive() {
    return this.service.findActive();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get mission by ID (Public)' })
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create new mission (Admin only)' })
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update mission (Admin only)' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete mission (Admin only)' })
  remove(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
