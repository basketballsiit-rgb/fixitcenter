import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OcrService } from './ocr.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Permissions } from '../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../common/guards/roles.guard';

class SaveApiKeyDto {
  apiKey: string;
}

class TestApiKeyDto {
  apiKey: string;
}

class ScanCardDto {
  imageBase64: string;
}

@Controller('ocr')
export class OcrController {
  constructor(private readonly ocrService: OcrService) {}

  @Get('settings')
  @UseGuards(JwtAuthGuard)
  async getSettings() {
    return this.ocrService.getOcrConfig();
  }

  @Post('settings')
  @UseGuards(JwtAuthGuard)
  async saveSettings(@Body() dto: SaveApiKeyDto) {
    return this.ocrService.setGeminiApiKey(dto.apiKey);
  }

  @Post('test-key')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async testKey(@Body() dto: TestApiKeyDto) {
    return this.ocrService.testGeminiKey(dto.apiKey);
  }

  @Post('scan-id-card')
  @HttpCode(HttpStatus.OK)
  async scanIdCard(@Body() dto: ScanCardDto) {
    if (!dto.imageBase64) {
      return { success: false, message: 'กรุณาส่งรูปภาพ base64' };
    }
    const result = await this.ocrService.scanThaiIdCardWithGemini(dto.imageBase64);
    if (!result) {
      return {
        success: false,
        fallback: true,
        message: 'ไม่ได้เปิดใช้งาน Gemini AI หรือการประมวลผลไม่สำเร็จ กรุณาใช้เอนจินภายในเครื่อง',
      };
    }
    return {
      success: true,
      data: result,
    };
  }
}
