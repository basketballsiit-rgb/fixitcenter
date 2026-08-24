import { IsString, IsOptional, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ description: 'Thai National ID (13 digits)', example: '1234567890123' })
  @IsString()
  @IsNotEmpty()
  @Length(13, 13)
  nationalId: string; // raw, will be encrypted at service layer

  @ApiProperty({ example: 'สมชาย' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'ใจดี' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: '0891234567' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '123 ถ.พหลโยธิน กรุงเทพ' })
  @IsOptional()
  @IsString()
  address?: string;
}
