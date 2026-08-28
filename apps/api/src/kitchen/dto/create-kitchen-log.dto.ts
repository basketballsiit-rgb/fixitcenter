import { IsString, IsNotEmpty, IsOptional, IsInt, IsNumber, Min } from 'class-validator';

export class CreateKitchenLogDto {
  @IsString()
  @IsNotEmpty()
  missionId: string;

  @IsString()
  @IsNotEmpty()
  centerId: string;

  @IsOptional()
  @IsString()
  serviceDate?: string;

  @IsString()
  @IsNotEmpty()
  menuName: string;

  @IsOptional()
  @IsString()
  categoryCode?: string;

  @IsOptional()
  @IsInt()
  quantity?: number;

  @IsOptional()
  @IsInt()
  boxQty?: number;

  @IsOptional()
  @IsInt()
  waterQty?: number;

  @IsOptional()
  @IsInt()
  reliefQty?: number;

  @IsOptional()
  @IsNumber()
  budgetPerUnit?: number;

  @IsOptional()
  @IsNumber()
  totalBudget?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsString()
  @IsNotEmpty()
  targetLocation: string;

  @IsOptional()
  @IsString()
  recipientOrg?: string;

  @IsOptional()
  @IsString()
  coordinatorName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateKitchenLogDto {
  @IsOptional()
  @IsString()
  missionId?: string;

  @IsOptional()
  @IsString()
  centerId?: string;

  @IsOptional()
  @IsString()
  serviceDate?: string;

  @IsOptional()
  @IsString()
  menuName?: string;

  @IsOptional()
  @IsString()
  categoryCode?: string;

  @IsOptional()
  @IsInt()
  quantity?: number;

  @IsOptional()
  @IsInt()
  boxQty?: number;

  @IsOptional()
  @IsInt()
  waterQty?: number;

  @IsOptional()
  @IsInt()
  reliefQty?: number;

  @IsOptional()
  @IsNumber()
  budgetPerUnit?: number;

  @IsOptional()
  @IsNumber()
  totalBudget?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  targetLocation?: string;

  @IsOptional()
  @IsString()
  recipientOrg?: string;

  @IsOptional()
  @IsString()
  coordinatorName?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
