import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

export interface ExtractedThaiIdCard {
  nationalId: string;
  title: string;
  firstName: string;
  lastName: string;
  address: string;
  birthDate?: string;
  expireDate?: string;
  rawText?: string;
  confidence: number;
  provider: 'gemini' | 'local';
}

@Injectable()
export class OcrService implements OnModuleInit {
  private readonly logger = new Logger(OcrService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      // Ensure system_settings table exists
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key VARCHAR(255) PRIMARY KEY,
          value TEXT NOT NULL,
          description TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      this.logger.log('✅ system_settings table initialized successfully');
    } catch (err: any) {
      this.logger.warn(`Notice on system_settings init: ${err?.message}`);
    }
  }

  async getGeminiApiKey(): Promise<string | null> {
    try {
      const row: any = await this.prisma.systemSetting.findUnique({
        where: { key: 'GEMINI_API_KEY' },
      });
      if (row && row.value && row.value.trim().length > 0) {
        return row.value.trim();
      }
    } catch {}
    return process.env.GEMINI_API_KEY || null;
  }

  async setGeminiApiKey(key: string): Promise<{ success: boolean; message: string }> {
    const cleanKey = (key || '').trim();
    await this.prisma.systemSetting.upsert({
      where: { key: 'GEMINI_API_KEY' },
      update: { value: cleanKey, updatedAt: new Date() },
      create: {
        key: 'GEMINI_API_KEY',
        value: cleanKey,
        description: 'Google Gemini Vision AI API Key for Thai ID Card OCR',
      },
    });
    return { success: true, message: 'บันทึก Google Gemini API Key เรียบร้อยแล้ว' };
  }

  async getOcrConfig(): Promise<{ hasKey: boolean; maskedKey: string; provider: string }> {
    const apiKey = await this.getGeminiApiKey();
    if (!apiKey) {
      return { hasKey: false, maskedKey: '', provider: 'local' };
    }
    const masked =
      apiKey.length > 8
        ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`
        : '******';
    return { hasKey: true, maskedKey: masked, provider: 'gemini' };
  }

  async testGeminiKey(apiKey: string): Promise<{ success: boolean; message: string }> {
    if (!apiKey || apiKey.trim().length < 10) {
      return { success: false, message: 'API Key ไม่ถูกต้อง หรือสั้นเกินไป' };
    }
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`;
      const res = await axios.post(
        url,
        {
          contents: [
            {
              parts: [{ text: 'Ping test. Reply with: OK' }],
            },
          ],
        },
        { timeout: 10000 }
      );
      if (res.status === 200) {
        return { success: true, message: 'เชื่อมต่อ Google Gemini AI สำเร็จพร้อมใช้งาน!' };
      }
      return { success: false, message: `Google API status: ${res.status}` };
    } catch (err: any) {
      const errMsg = err?.response?.data?.error?.message || err?.message || 'ไม่สามารถเชื่อมต่อได้';
      return { success: false, message: `เกิดข้อผิดพลาด: ${errMsg}` };
    }
  }

  async scanThaiIdCardWithGemini(imageBase64: string): Promise<ExtractedThaiIdCard | null> {
    const apiKey = await this.getGeminiApiKey();
    if (!apiKey) {
      return null;
    }

    try {
      // Clean base64 prefix if exists (e.g. data:image/jpeg;base64,...)
      let mimeType = 'image/jpeg';
      let cleanBase64 = imageBase64;
      if (imageBase64.includes(';base64,')) {
        const parts = imageBase64.split(';base64,');
        mimeType = parts[0].replace('data:', '') || 'image/jpeg';
        cleanBase64 = parts[1];
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

      const systemPrompt = `You are a high-precision OCR AI engine specialized in reading official Thai Citizen ID Cards (บัตรประจำตัวประชาชนไทย).
Analyze the ID card image with extreme precision. Extract:
1. "nationalId": 13-digit Thai identification number (digits only, no spaces/hyphens).
2. "title": Thai title prefix (e.g. "นาย", "นาง", "นางสาว", "เด็กชาย", "เด็กหญิง").
3. "firstName": Thai first name (e.g. "นิพนธ์", "สมชาย").
4. "lastName": Thai last name (e.g. "ร่องพืช", "ใจดี").
5. "address": Full Thai address printed on the card (e.g. "275/2 หมู่ที่ 1 ต.หนองม่วงไข่ อ.หนองม่วงไข่ จ.แพร่").
6. "birthDate": Birth date text if visible (e.g. "5 พ.ค. 2514").
7. "expireDate": Expiry date text if visible.

Output MUST BE ONLY a single raw valid JSON object without markdown fences, without \`\`\`json, matching this schema:
{
  "nationalId": "3540600210162",
  "title": "นาย",
  "firstName": "นิพนธ์",
  "lastName": "ร่องพืช",
  "address": "275/2 หมู่ที่ 1 ต.หนองม่วงไข่ อ.หนองม่วงไข่ จ.แพร่",
  "birthDate": "5 พ.ค. 2514",
  "expireDate": "5 พ.ค. 2575"
}`;

      const payload = {
        contents: [
          {
            parts: [
              { text: systemPrompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      };

      const response = await axios.post(url, payload, { timeout: 25000 });
      const rawResponseText =
        response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

      if (!rawResponseText) {
        return null;
      }

      // Parse JSON response
      const cleanedJson = rawResponseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();

      const parsed = JSON.parse(cleanedJson);

      return {
        nationalId: (parsed.nationalId || '').replace(/\D/g, ''),
        title: parsed.title || '',
        firstName: parsed.firstName || '',
        lastName: parsed.lastName || '',
        address: parsed.address || '',
        birthDate: parsed.birthDate || '',
        expireDate: parsed.expireDate || '',
        rawText: rawResponseText,
        confidence: 98,
        provider: 'gemini',
      };
    } catch (err: any) {
      this.logger.error(`Gemini Vision OCR error: ${err?.message}`);
      return null;
    }
  }
}
