import * as crypto from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AesService {
  private readonly key: Buffer;

  constructor(private readonly config: ConfigService) {
    const hexKey = this.config.get<string>('AES_KEY', '0123456789abcdef0123456789abcdef');
    this.key = Buffer.from(hexKey.padEnd(32, '0').slice(0, 32), 'utf8');
  }

  /**
   * Encrypt a plaintext string using AES-256-GCM.
   * Output format: ivHex:tagHex:ciphertextHex
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypt a stored AES-256-GCM ciphertext.
   * Input format: ivHex:tagHex:ciphertextHex
   */
  decrypt(stored: string): string {
    try {
      const [ivHex, tagHex, encHex] = stored.split(':');
      if (!ivHex || !tagHex || !encHex) throw new Error('Invalid format');
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const enc = Buffer.from(encHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(tag);
      return decipher.update(enc).toString('utf8') + decipher.final('utf8');
    } catch {
      return '[DECRYPTION_ERROR]';
    }
  }

  /**
   * Mask a Thai National ID for PDPA-compliant display.
   * Format: x-xxxx-xxxxx-xx-x (first digit shown, rest masked)
   * Example: "1234567890123" → "1-xxxx-xxxxx-xx-x"
   */
  maskNationalId(decrypted: string): string {
    if (!decrypted || decrypted.length !== 13) return 'x-xxxx-xxxxx-xx-x';
    return `${decrypted[0]}-xxxx-xxxxx-xx-x`;
  }

  /**
   * Hash a string with SHA-256 (for deduplication lookups without storing plaintext).
   */
  hash(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}
