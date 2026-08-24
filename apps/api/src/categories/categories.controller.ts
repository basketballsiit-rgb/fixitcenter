import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService, CreateCategoryDto, UpdateCategoryDto } from './categories.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  private canManageCategories(user: any): boolean {
    const role = typeof user?.role === 'string' ? user.role : user?.role?.name;
    return (
      role === 'ADMIN' ||
      role === 'CENTER_ADMIN' ||
      role === 'SUPERVISOR' ||
      user?.username === 'admin' ||
      user?.permissions?.includes('repair_orders:create') ||
      user?.permissions?.includes('users:manage')
    );
  }

  private isSuperAdmin(user: any): boolean {
    const role = typeof user?.role === 'string' ? user.role : user?.role?.name;
    return role === 'ADMIN' || user?.username === 'admin' || (!user?.centerId && user?.permissions?.length > 10);
  }

  @Get()
  @ApiOperation({ summary: 'Get all repair categories (Public)' })
  findAll(@Query('tradeCode') tradeCode?: string) {
    return this.categoriesService.findAll(tradeCode);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by ID (Public)' })
  findById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new category (Admin & Center Admin)' })
  create(@CurrentUser() user: any, @Body() dto: CreateCategoryDto) {
    if (!this.canManageCategories(user)) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ในการเพิ่มประเภทงานซ่อม/บริการ');
    }
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update category (Admin & Center Admin)' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    if (!this.canManageCategories(user)) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ในการแก้ไขประเภทงานซ่อม/บริการ');
    }
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete category (Super Admin & Center Admin)' })
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    if (!this.canManageCategories(user)) {
      throw new ForbiddenException('คุณไม่มีสิทธิ์ในการลบประเภทงานซ่อม/บริการ');
    }
    return this.categoriesService.remove(id);
  }
}
