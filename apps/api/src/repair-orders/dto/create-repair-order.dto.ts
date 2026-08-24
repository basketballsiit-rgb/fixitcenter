import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type TradeCode = 'ELECTRICAL' | 'ELECTRONICS' | 'AUTOMOTIVE' | 'KITCHEN';

export class CreateRepairOrderDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  missionId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  centerId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ enum: ['ELECTRICAL', 'ELECTRONICS', 'AUTOMOTIVE', 'KITCHEN'] })
  @IsIn(['ELECTRICAL', 'ELECTRONICS', 'AUTOMOTIVE', 'KITCHEN'])
  tradeCode: TradeCode;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  deviceCategory: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceBrand?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceModel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  serialNumber?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  problemDesc: string;
}
