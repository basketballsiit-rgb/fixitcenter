import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

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

  @IsInt()
  @Min(1)
  quantity: number;

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
  @Min(1)
  quantity?: number;

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
