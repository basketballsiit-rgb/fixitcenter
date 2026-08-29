import { Injectable, NotFoundException, ConflictException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateCategoryDto {
  code: string;
  name: string;
  tradeCode: 'ELECTRICAL' | 'ELECTRONICS' | 'AUTOMOTIVE' | 'KITCHEN';
  standardBudget?: number;
  description?: string;
}

export interface UpdateCategoryDto {
  code?: string;
  name?: string;
  tradeCode?: 'ELECTRICAL' | 'ELECTRONICS' | 'AUTOMOTIVE' | 'KITCHEN';
  standardBudget?: number;
  description?: string;
  isActive?: boolean;
}

export interface CategoryRecord {
  id: string;
  code: string;
  name: string;
  tradeCode: string;
  standardBudget: number;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      // 1. Auto-create column if not exists
      await this.prisma.$executeRawUnsafe(
        `ALTER TABLE repair_categories ADD COLUMN IF NOT EXISTS standard_budget NUMERIC(10, 2) DEFAULT 100;`
      );

      // 2. Pre-fill standard budget defaults for known categories if currently null
      await this.prisma.$executeRawUnsafe(`
        UPDATE repair_categories 
        SET standard_budget = CASE
          WHEN trade_code = 'AUTOMOTIVE' AND (name ILIKE '%มอเตอร์ไซค์%' OR name ILIKE '%จักรยานยนต์%') THEN 300
          WHEN trade_code = 'AUTOMOTIVE' AND (name ILIKE '%ยนต์%' OR name ILIKE '%รถยนต์%' OR name ILIKE '%กระบะ%') THEN 500
          WHEN trade_code = 'AUTOMOTIVE' AND (name ILIKE '%เกษตร%' OR name ILIKE '%ตัดหญ้า%' OR name ILIKE '%สูบน้ำ%') THEN 350
          WHEN trade_code = 'AUTOMOTIVE' THEN 300
          WHEN trade_code = 'ELECTRICAL' AND (name ILIKE '%พัดลม%' OR name ILIKE '%หม้อหุงข้าว%' OR name ILIKE '%เตารีด%') THEN 100
          WHEN trade_code = 'ELECTRICAL' AND (name ILIKE '%ตู้เย็น%' OR name ILIKE '%ซักผ้า%' OR name ILIKE '%ปั๊มน้ำ%') THEN 200
          WHEN trade_code = 'ELECTRICAL' THEN 150
          WHEN trade_code = 'ELECTRONICS' AND (name ILIKE '%ทีวี%' OR name ILIKE '%โทรทัศน์%' OR name ILIKE '%คอมพิวเตอร์%') THEN 200
          WHEN trade_code = 'ELECTRONICS' THEN 150
          WHEN trade_code = 'KITCHEN' AND name ILIKE '%ข้าว%' THEN 50
          WHEN trade_code = 'KITCHEN' AND name ILIKE '%น้ำ%' THEN 7
          WHEN trade_code = 'KITCHEN' AND (name ILIKE '%ถุง%' OR name ILIKE '%ยังชีพ%') THEN 500
          WHEN trade_code = 'KITCHEN' THEN 50
          ELSE 100
        END
        WHERE standard_budget IS NULL;
      `);
    } catch (err) {
      console.warn('[CategoriesService] Auto-migration standard_budget notice:', err);
    }
  }

  private mapRow(row: any): CategoryRecord {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      tradeCode: row.trade_code,
      standardBudget: row.standard_budget !== null && row.standard_budget !== undefined ? Number(row.standard_budget) : 100,
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

    const budget = typeof dto.standardBudget === 'number' && !isNaN(dto.standardBudget) ? dto.standardBudget : 100;
    const id = `cat_${code.toLowerCase()}_${Date.now()}`;
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO repair_categories (id, code, name, trade_code, standard_budget, description, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4::"TradeCode", $5, $6, true, NOW(), NOW())`,
      id,
      code,
      dto.name.trim(),
      dto.tradeCode,
      budget,
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
    const standardBudget = dto.standardBudget !== undefined && !isNaN(Number(dto.standardBudget)) ? Number(dto.standardBudget) : current.standardBudget;
    const description = dto.description !== undefined ? dto.description.trim() : current.description;
    const isActive = dto.isActive !== undefined ? dto.isActive : current.isActive;

    await this.prisma.$executeRawUnsafe(
      `UPDATE repair_categories
       SET code = $1, name = $2, trade_code = $3::"TradeCode", standard_budget = $4, description = $5, is_active = $6, updated_at = NOW()
       WHERE id = $7`,
      code,
      name,
      tradeCode,
      standardBudget,
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
