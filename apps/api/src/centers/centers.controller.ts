import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CentersService } from './centers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('centers')
@Controller('centers')
export class CentersController {
  constructor(private readonly service: CentersService) {}

  @Get()
  @ApiOperation({ summary: 'List all service centers (Public)' })
  @ApiQuery({ name: 'missionId', required: false })
  findAll(@Query('missionId') missionId?: string) {
    return this.service.findAll(missionId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service center by ID (Public)' })
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Post()
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create service center (Admin only)' })
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update service center (Admin only)' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Delete service center (Admin only)' })
  remove(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
