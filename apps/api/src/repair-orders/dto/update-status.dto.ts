import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type RepairStatus =
  | 'PENDING'
  | 'DIAGNOSING'
  | 'WAITING_PARTS'
  | 'REPAIRING'
  | 'QC_PENDING'
  | 'COMPLETED'
  | 'CLOSED'
  | 'CANCELLED';

const VALID_STATUSES: RepairStatus[] = [
  'PENDING',
  'DIAGNOSING',
  'WAITING_PARTS',
  'REPAIRING',
  'QC_PENDING',
  'COMPLETED',
  'CLOSED',
  'CANCELLED',
];

export class UpdateStatusDto {
  @ApiProperty({ enum: VALID_STATUSES })
  @IsIn(VALID_STATUSES)
  status: RepairStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}
