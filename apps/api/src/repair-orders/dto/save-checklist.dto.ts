import { IsArray, IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChecklistCriterionDto {
  @ApiProperty()
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsBoolean()
  passed: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class SaveChecklistDto {
  @ApiProperty({ type: [ChecklistCriterionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistCriterionDto)
  criteria: ChecklistCriterionDto[];

  @ApiProperty()
  @IsBoolean()
  overallPassed: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
