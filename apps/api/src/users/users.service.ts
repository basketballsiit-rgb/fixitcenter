import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const USER_SELECT = {
  id: true,
  username: true,
  fullName: true,
  email: true,
  phone: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  centerId: true,
  roleId: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true,
      permissions: { select: { permission: { select: { action: true } } } },
    },
  },
  center: { select: { id: true, name: true, code: true } },
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByUsername(username: string) {
    const clean = username.trim();
    return this.prisma.user.findFirst({
      where: {
        username: {
          equals: clean,
          mode: 'insensitive',
        },
      },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
        center: true,
      },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
        center: true,
      },
    });
  }

  async findAll(centerId?: string) {
    return this.prisma.user.findMany({
      where: centerId ? { centerId } : undefined,
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRoles() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { users: true } },
      },
    });
  }

  async create(dto: {
    username: string;
    password: string;
    fullName: string;
    email?: string;
    phone?: string;
    roleId: string;
    centerId?: string;
    isActive?: boolean;
  }) {
    const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existing) throw new ConflictException('ชื่อผู้ใช้นี้มีในระบบแล้ว');

    const { password, ...userData } = dto;
    const passwordHash = await bcrypt.hash(password, 12);
    return this.prisma.user.create({
      data: {
        ...userData,
        passwordHash,
        isActive: dto.isActive ?? true,
      },
      select: USER_SELECT,
    });
  }

  async update(id: string, dto: Partial<{
    fullName: string; email: string; phone: string;
    roleId: string; centerId: string; isActive: boolean; password: string;
  }>) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('ไม่พบผู้ใช้งานนี้');

    const data: any = { ...dto };
    if (dto.password && dto.password.trim() !== '') {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
    }
    delete data.password;

    return this.prisma.user.update({ where: { id }, data, select: USER_SELECT });
  }

  async delete(id: string, currentUserId?: string) {
    if (id === currentUserId) {
      throw new BadRequestException('ไม่สามารถลบบัญชีของตัวเองได้');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    if (!user) throw new NotFoundException('ไม่พบผู้ใช้งานนี้');

    if (user.username === 'admin') {
      throw new BadRequestException('ไม่สามารถลบบัญชีผู้ดูแลระบบหลัก (admin) ได้');
    }

    return this.prisma.user.delete({ where: { id } });
  }

  async updateLastLogin(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    });
  }
}
