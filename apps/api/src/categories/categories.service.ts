import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateCategoryDto {
  code: string;
  name: string;
  tradeCode: 'ELECTRICAL' | 'ELECTRONICS' | 'AUTOMOTIVE' | 'KITCHEN';
  description?: string;
}

export interface UpdateCategoryDto {
  code?: string;
  name?: string;
  tradeCode?: 'ELECTRICAL' | 'ELECTRONICS' | 'AUTOMOTIVE' | 'KITCHEN';
  description?: string;
  isActive?: boolean;
}

export interface CategoryRecord {
  id: string;
  code: string;
  name: string;
  tradeCode: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapRow(row: any): CategoryRecord {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      tradeCode: row.trade_code,
      description: row.description,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findAll(tradeCode?: string): Promise<CategoryRecord[]> {
    let rows: any[];
    if (tradeCode) {
      rows = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM repair_categories WHERE trade_code = $1::"TradeCode" ORDER BY trade_code ASC, code ASC`,
        tradeCode
      );
    } else {
      rows = await this.prisma.$queryRawUnsafe(
        `SELECT * FROM repair_categories ORDER BY trade_code ASC, code ASC`
      );
    }
    return rows.map((r) => this.mapRow(r));
  }

  async findById(id: string): Promise<CategoryRecord> {
    const rows: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT * FROM repair_categories WHERE id = $1 LIMIT 1`,
      id
    );
    if (!rows || rows.length === 0) {
      throw new NotFoundException(`Repair category with ID ${id} not found`);
    }
    return this.mapRow(rows[0]);
  }

  async create(dto: CreateCategoryDto): Promise<CategoryRecord> {
    const code = dto.code.trim().toUpperCase();
    const existing: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT id FROM repair_categories WHERE code = $1 LIMIT 1`,
      code
    );
    if (existing && existing.length > 0) {
      throw new ConflictException(`รหัสประเภทงาน ${code} มีอยู่ในระบบแล้ว`);
    }

    const id = `cat_${code.toLowerCase()}_${Date.now()}`;
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO repair_categories (id, code, name, trade_code, description, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4::"TradeCode", $5, true, NOW(), NOW())`,
      id,
      code,
      dto.name.trim(),
      dto.tradeCode,
      dto.description?.trim() || null
    );

    return this.findById(id);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryRecord> {
    const current = await this.findById(id);

    const code = dto.code ? dto.code.trim().toUpperCase() : current.code;
    if (dto.code && dto.code !== current.code) {
      const existing: any[] = await this.prisma.$queryRawUnsafe(
        `SELECT id FROM repair_categories WHERE code = $1 AND id != $2 LIMIT 1`,
        code,
        id
      );
      if (existing && existing.length > 0) {
        throw new ConflictException(`รหัสประเภทงาน ${code} มีอยู่ในระบบแล้ว`);
      }
    }

    const name = dto.name !== undefined ? dto.name.trim() : current.name;
    const tradeCode = dto.tradeCode !== undefined ? dto.tradeCode : current.tradeCode;
    const description = dto.description !== undefined ? dto.description.trim() : current.description;
    const isActive = dto.isActive !== undefined ? dto.isActive : current.isActive;

    await this.prisma.$executeRawUnsafe(
      `UPDATE repair_categories
       SET code = $1, name = $2, trade_code = $3::"TradeCode", description = $4, is_active = $5, updated_at = NOW()
       WHERE id = $6`,
      code,
      name,
      tradeCode,
      description,
      isActive,
      id
    );

    return this.findById(id);
  }

  async remove(id: string): Promise<{ success: boolean; id: string }> {
    await this.findById(id);
    await this.prisma.$executeRawUnsafe(
      `DELETE FROM repair_categories WHERE id = $1`,
      id
    );
    return { success: true, id };
  }
}
