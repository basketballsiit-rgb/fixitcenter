import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request, ForbiddenException
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RepairOrdersService } from './repair-orders.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('repair-orders')
@Controller('repair-orders')
export class RepairOrdersController {
  constructor(private readonly service: RepairOrdersService) {}

  // ── QR scan — public endpoint (no auth needed for scanning) ──────────────
  @Get('qr/:token')
  @ApiOperation({ summary: 'Fetch order by QR token (public — for scanning)' })
  findByQr(@Param('token') token: string) {
    return this.service.findByQrToken(token);
  }

  // ── Track / search orders — public endpoint (for customers & staff) ───────
  @Get('track')
  @ApiOperation({ summary: 'Track orders by queue number, name, phone, or problem' })
  @ApiQuery({ name: 'query', required: true })
  track(@Query('query') query: string) {
    return this.service.track(query);
  }

  // ── Queue number lookup — public endpoint ─────────────────────────────────
  @Get('queue/:queueNumber')
  @ApiOperation({ summary: 'Fetch order by queue number (e.g. E-001)' })
  findByQueue(@Param('queueNumber') queueNumber: string) {
    return this.service.findByQueueNumber(queueNumber);
  }

  // ── Active Alerts endpoint (Waiting parts notifications) ───────────────────
  @Get('alerts/active')
  @ApiOperation({ summary: 'Get active alerts for waiting parts and notifications' })
  @ApiQuery({ name: 'centerId', required: false })
  getActiveAlerts(@Query('centerId') centerId?: string) {
    return this.service.getActiveAlerts(centerId);
  }

  // ── Create repair order (open for registration counter/kiosk) ────────────
  @Post()
  @ApiOperation({ summary: 'Create new repair order (generates atomic queue number)' })
  create(@Body() dto: any, @Request() req: any) {
    return this.service.create(dto, req?.user?.id);
  }

  @Get()
  @ApiOperation({ summary: 'List repair orders with filters and pagination' })
  @ApiQuery({ name: 'centerId',  required: false })
  @ApiQuery({ name: 'missionId', required: false })
  @ApiQuery({ name: 'status',    required: false })
  @ApiQuery({ name: 'tradeCode', required: false })
  @ApiQuery({ name: 'page',      required: false })
  @ApiQuery({ name: 'limit',     required: false })
  @ApiQuery({ name: 'search',    required: false })
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get repair order details' })
  findOne(@Param('id') id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update repair order details and customer info' })
  update(
    @Param('id') id: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.service.update(id, dto, req?.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete repair order and history (Admin only)' })
  remove(
    @Param('id') id: string,
    @Request() req: any,
  ) {
    const user = req?.user;
    // Debug: log actual user payload to diagnose role check issues
    console.log('[DELETE repair-order] req.user =', JSON.stringify(user));
    const roleRaw = user?.role;
    const roleName = (typeof roleRaw === 'string' ? roleRaw : roleRaw?.name) || '';
    console.log('[DELETE repair-order] roleName =', roleName);
    const isAdmin = roleName.toUpperCase() === 'ADMIN';
    const hasPermission = Array.isArray(user?.permissions) && user.permissions.includes('repair_orders:delete');
    if (!isAdmin && !hasPermission) {
      throw new ForbiddenException('เฉพาะผู้ดูแลระบบหลัก (Admin) เท่านั้นที่มีสิทธิ์ลบข้อมูลการลงทะเบียนงานซ่อม');
    }
    return this.service.delete(id, user?.id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Advance repair order status (state machine)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: { status: any; note?: string },
    @Request() req: any,
  ) {
    const user = req?.user;
    const isAdmin = user?.permissions?.includes('repair_orders:delete');
    return this.service.updateStatus(id, dto.status, user?.id, dto.note, isAdmin);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Add repair part/item to order' })
  addItem(@Param('id') id: string, @Body() dto: any) {
    return this.service.addRepairItem(id, dto);
  }

  @Post(':id/signature')
  @ApiOperation({ summary: 'Save canvas signature (supervisor or customer)' })
  saveSignature(@Param('id') id: string, @Body() dto: any) {
    return this.service.saveSignature(id, dto);
  }

  @Post(':id/checklist')
  @ApiOperation({ summary: 'Save QC inspection checklist' })
  saveChecklist(
    @Param('id') id: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.service.saveChecklist(id, dto, req?.user?.id);
  }

  @Patch(':id/economic-value')
  @ApiOperation({ summary: 'Update parts and market cost to recalculate economic value' })
  updateEconomicValue(
    @Param('id') id: string,
    @Body() dto: { partsCost: number; marketRepairCost: number },
  ) {
    return this.service.updateEconomicValue(id, dto);
  }

  @Post(':id/handover')
  @ApiOperation({ summary: 'Complete customer handover and close order' })
  handover(
    @Param('id') id: string,
    @Body() dto: {
      customerSignature: string;
      handoverSignature?: string;
      handoverBy?: string;
      handoverNotes?: string;
    },
  ) {
    return this.service.handover(id, dto);
  }
}
