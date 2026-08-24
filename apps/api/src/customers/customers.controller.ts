import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('customers')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly service: CustomersService) {}

  @Post()
  @ApiOperation({ summary: 'Register customer (PII encrypted at rest)' })
  create(@Body() dto: any) {
    return this.service.create(dto);
  }

  @Get('lookup')
  @ApiOperation({ summary: 'Lookup customer by phone for deduplication' })
  @ApiQuery({ name: 'phone', required: true })
  lookup(@Query('phone') phone: string) {
    return this.service.findByPhone(phone);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID (masked PII)' })
  findOne(@Param('id') id: string) {
    return this.service.findById(id, false);
  }
}
