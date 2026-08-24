import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/roles.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('roles')
  @Permissions('users:manage')
  @ApiOperation({ summary: 'Get all available roles' })
  getRoles() {
    return this.usersService.getRoles();
  }

  @Get()
  @Permissions('users:manage')
  @ApiOperation({ summary: 'List all users (admin)' })
  findAll(@Query('centerId') centerId?: string) {
    return this.usersService.findAll(centerId);
  }

  @Get(':id')
  @Permissions('users:manage')
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @Permissions('users:manage')
  @ApiOperation({ summary: 'Create new user' })
  create(@Body() dto: any) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Permissions('users:manage')
  @ApiOperation({ summary: 'Update user' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('users:manage')
  @ApiOperation({ summary: 'Delete user' })
  remove(@Param('id') id: string, @CurrentUser() currentUser: any) {
    return this.usersService.delete(id, currentUser?.id);
  }
}
