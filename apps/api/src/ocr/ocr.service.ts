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
  provider: 'gemini' | 'openai' | 'local';
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
    const cleanKey = (apiKey || '').trim();
    if (!cleanKey || cleanKey.length < 10) {
      return { success: false, message: 'API Key ไม่ถูกต้อง หรือสั้นเกินไป' };
    }

    const candidateModels = [
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro',
    ];

    let lastError = '';

    // 1. Try Google Gemini API
    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
        const res = await axios.post(
          url,
          {
            contents: [
              {
                parts: [{ text: 'Ping test. Reply with: OK' }],
              },
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': cleanKey,
            },
            timeout: 10000,
          }
        );
        if (res.status === 200) {
          return { success: true, message: `✓ เชื่อมต่อ Google Gemini AI (${model}) สำเร็จพร้อมใช้งาน!` };
        }
      } catch (err: any) {
        lastError = err?.response?.data?.error?.message || err?.message || 'ไม่สามารถเชื่อมต่อได้';
      }
    }

    // 2. Try OpenAI API if key starts with sk-
    if (cleanKey.startsWith('sk-')) {
      try {
        const res = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'Ping test. Reply with: OK' }],
            max_tokens: 5,
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${cleanKey}`,
            },
            timeout: 10000,
          }
        );
        if (res.status === 200) {
          return { success: true, message: '✓ เชื่อมต่อ OpenAI Vision (GPT-4o-mini) สำเร็จพร้อมใช้งาน!' };
        }
      } catch (oErr: any) {
        lastError = oErr?.response?.data?.error?.message || oErr?.message || lastError;
      }
    }

    return {
      success: false,
      message: `เชื่อมต่อไม่สำเร็จ: ${lastError} (สำหรับ Google Gemini คีย์จะขึ้นต้นด้วย "AIzaSy..." จาก https://aistudio.google.com/app/apikey)`,
    };
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

      const candidateModels = [
        'gemini-1.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-pro',
      ];

      const systemPrompt = `คุณคือระบบ AI OCR อัจฉริยะความแม่นยำสูงพิเศษสำหรับการอ่านข้อมูลบัตรประจำตัวประชาชนไทย (Thai Citizen ID Card)
หน้าที่ของคุณคือวิเคราะห์รูปภาพบัตรประชาชน และสกัดข้อมูลสำคัญ 3 ส่วนนี้เท่านั้น โดยต้องมีความถูกต้องแม่นยำสูงสุด 100%:

1. "nationalId": เลขประจำตัวประชาชน 13 หลัก (เฉพาะตัวเลข 13 ตัวเท่านั้น ห้ามมีขีดหรือช่องว่าง เช่น "3540600210162")
2. "title": คำนำหน้าชื่อภาษาไทย (เช่น "นาย", "นาง", "นางสาว", "เด็กชาย", "เด็กหญิง")
3. "firstName": ชื่อจริงภาษาไทยเท่านั้น ห้ามใส่ภาษาอังกฤษ และห้ามมีคำนำหน้าปน (เช่น "นิพนธ์", "สมชาย")
4. "lastName": นามสกุลภาษาไทยเท่านั้น ห้ามใส่ภาษาอังกฤษ (เช่น "ร่องพืช", "ใจดี")
5. "address": ที่อยู่ภาษาไทยตามที่ระบุบนบัตรประชาชนอย่างครบถ้วน (เช่น "275/2 หมู่ที่ 1 ต.หนองม่วงไข่ อ.หนองม่วงไข่ จ.แพร่")

กฎสำคัญ:
- ห้ามดึงข้อมูลภาษาอังกฤษ (ห้ามดึง Name Mr. ... หรือ Last name ...) ชื่อและนามสกุลต้องเป็นภาษาไทยที่ถูกต้องและสะกดตรงตามบัตรเท่านั้น
- ข้อมูลที่อยู่ ให้ดึงเฉพาะข้อความที่อยู่ภาษาไทยตั้งแต่บ้านเลขที่ จนถึงตำบล อำเภอ จังหวัด
- ตอบกลับเป็น JSON object รูปแบบนี้เท่านั้น ห้ามใส่คำอธิบายอื่น และห้ามใส่ markdown \`\`\`json:
{
  "nationalId": "3540600210162",
  "title": "นาย",
  "firstName": "นิพนธ์",
  "lastName": "ร่องพืช",
  "address": "275/2 หมู่ที่ 1 ต.หนองม่วงไข่ อ.หนองม่วงไข่ จ.แพร่"
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

      for (const model of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const response = await axios.post(url, payload, {
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
            timeout: 25000,
          });
          const rawResponseText =
            response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

          if (rawResponseText) {
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
              confidence: 99,
              provider: 'gemini',
            };
          }
        } catch (mErr: any) {
          this.logger.warn(`Model ${model} try notice: ${mErr?.message}`);
        }
      }

      // If OpenAI key (sk-...)
      if (apiKey.startsWith('sk-')) {
        try {
          const res = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: systemPrompt,
                },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'image_url',
                      image_url: {
                        url: `data:${mimeType};base64,${cleanBase64}`,
                      },
                    },
                  ],
                },
              ],
              temperature: 0.1,
              max_tokens: 1024,
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              timeout: 25000,
            }
          );
          const rawText = res.data?.choices?.[0]?.message?.content || '';
          if (rawText) {
            const cleanedJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanedJson);
            return {
              nationalId: (parsed.nationalId || '').replace(/\D/g, ''),
              title: parsed.title || '',
              firstName: parsed.firstName || '',
              lastName: parsed.lastName || '',
              address: parsed.address || '',
              birthDate: parsed.birthDate || '',
              expireDate: parsed.expireDate || '',
              rawText,
              confidence: 99,
              provider: 'openai',
            };
          }
        } catch (oErr: any) {
          this.logger.warn(`OpenAI vision error: ${oErr?.message}`);
        }
      }

      return null;
    } catch (err: any) {
      this.logger.error(`AI Vision OCR error: ${err?.message}`);
      return null;
    }
  }
}
