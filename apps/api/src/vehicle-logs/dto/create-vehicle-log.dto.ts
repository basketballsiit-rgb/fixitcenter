import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateVehicleLogDto {
  @IsString()
  @IsNotEmpty()
  missionId: string;

  @IsString()
  @IsNotEmpty()
  centerId: string;

  @IsDateString()
  @IsOptional()
  serviceDate?: string;

  @IsString()
  @IsNotEmpty()
  serviceDetails: string; // รายละเอียดการดำเนินงาน

  @IsString()
  @IsOptional()
  vehicleType?: string; // รถจักรยานยนต์, รถยนต์, เครื่องยนต์การเกษตร, อื่นๆ

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  serviceCount?: number; // จำนวนที่ให้บริการ

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  completedCount?: number; // จำนวนที่ซ่อมสำเร็จ

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  budgetPerUnit?: number; // งบประมาณ/ชิ้น

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  totalBudget?: number; // งบประมาณทั้งสิ้น

  @IsString()
  @IsOptional()
  targetLocation?: string;

  @IsString()
  @IsOptional()
  recipientOrg?: string;

  @IsString()
  @IsOptional()
  coordinatorName?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateVehicleLogDto {
  @IsString()
  @IsOptional()
  missionId?: string;

  @IsString()
  @IsOptional()
  centerId?: string;

  @IsDateString()
  @IsOptional()
  serviceDate?: string;

  @IsString()
  @IsOptional()
  serviceDetails?: string;

  @IsString()
  @IsOptional()
  vehicleType?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  serviceCount?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  completedCount?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  budgetPerUnit?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  totalBudget?: number;

  @IsString()
  @IsOptional()
  targetLocation?: string;

  @IsString()
  @IsOptional()
  recipientOrg?: string;

  @IsString()
  @IsOptional()
  coordinatorName?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
