import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SaveSignatureDto {
  @ApiProperty({ enum: ['SUPERVISOR', 'CUSTOMER', 'REGISTRAR'] })
  @IsIn(['SUPERVISOR', 'CUSTOMER', 'REGISTRAR'])
  type: 'SUPERVISOR' | 'CUSTOMER' | 'REGISTRAR';

  @ApiProperty({ description: 'Base64-encoded signature image data' })
  @IsString()
  @IsNotEmpty()
  dataBase64: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signerName?: string;
}
