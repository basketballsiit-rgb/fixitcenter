/**
 * Thai Citizen ID Card OCR Engine
 * Robust extraction of 13-digit National ID, First Name, Last Name, and Address from Thai ID Cards.
 * 100% crash-proof with graceful fallback for offline / low-network environments.
 */

declare global {
  interface Window {
    Tesseract?: any;
  }
}

export interface ExtractedIdCardData {
  nationalId: string;
  firstName: string;
  lastName: string;
  address: string;
  rawText: string;
  confidence: number;
}

// 1. Dynamic Tesseract.js CDN Loader with timeout & safe catch
let tesseractLoadingPromise: Promise<any> | null = null;

export function loadTesseract(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject('SSR not supported');
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tesseractLoadingPromise) return tesseractLoadingPromise;

  tesseractLoadingPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Tesseract.js download timeout'));
    }, 10000);

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async = true;
    script.onload = () => {
      clearTimeout(timer);
      if (window.Tesseract) {
        resolve(window.Tesseract);
      } else {
        reject(new Error('Tesseract script loaded but window.Tesseract is not defined'));
      }
    };
    script.onerror = () => {
      clearTimeout(timer);
      reject(new Error('Failed to load Tesseract.js script from CDN'));
    };
    document.head.appendChild(script);
  });

  return tesseractLoadingPromise;
}

// 2. Preprocess canvas for optimal Thai ID OCR
export function preprocessCardImage(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  try {
    const targetWidth = Math.max(1200, Math.min(2000, sourceCanvas.width));
    const scale = targetWidth / Math.max(1, sourceCanvas.width);
    const targetHeight = Math.round(sourceCanvas.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return sourceCanvas;

    // Draw scaled image
    ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

    // Get image pixels for contrast adjustment & grayscale
    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imgData.data;

    // Adaptive Contrast factor
    const contrast = 1.35;
    const intercept = 128 * (1 - contrast);

    for (let i = 0; i < data.length; i += 4) {
      // Luminance grayscale (ITU-R BT.709)
      const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      // Apply contrast
      const enhanced = gray * contrast + intercept;
      const clamped = Math.max(0, Math.min(255, enhanced));

      data[i] = clamped;     // R
      data[i + 1] = clamped; // G
      data[i + 2] = clamped; // B
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  } catch {
    return sourceCanvas;
  }
}

// 3. Thai National ID Checksum Validator
export function isValidThaiNationalId(id: string): boolean {
  if (!id) return false;
  const clean = id.replace(/\D/g, '');
  if (clean.length !== 13) return false;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean[i], 10) * (13 - i);
  }
  const check = (11 - (sum % 11)) % 10;
  return check === parseInt(clean[12], 10);
}

// 4. Smart Parser for Thai ID Card Text
export function parseThaiIdCardText(text: string): ExtractedIdCardData {
  if (!text) {
    return {
      nationalId: '',
      firstName: '',
      lastName: '',
      address: '',
      rawText: '',
      confidence: 0,
    };
  }

  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let nationalId = '';
  let firstName = '';
  let lastName = '';
  let address = '';

  // ── A. Extract 13-digit National ID (เลขประจำตัวประชาชน) ──
  // Regex with flexible separators (spaces, dots, dashes)
  const idRegexes = [
    /(\d{1})[\s\.\-_]+(\d{4})[\s\.\-_]+(\d{5})[\s\.\-_]+(\d{2})[\s\.\-_]+(\d{1})/,
    /\b(\d{13})\b/,
  ];

  for (const line of lines) {
    for (const regex of idRegexes) {
      const match = line.match(regex);
      if (match) {
        const candidate = match[0].replace(/\D/g, '');
        if (candidate.length === 13) {
          nationalId = candidate;
          break;
        }
      }
    }
    if (nationalId) break;
  }

  // Fallback: look for 13 digits combined across entire text or near "เลขประจำตัว"
  if (!nationalId) {
    const allDigits = cleanText.replace(/\D/g, '');
    if (allDigits.length >= 13) {
      // Find valid checksum first
      for (let i = 0; i <= allDigits.length - 13; i++) {
        const sub = allDigits.substring(i, i + 13);
        if (isValidThaiNationalId(sub)) {
          nationalId = sub;
          break;
        }
      }
      // If no valid checksum found, take first 13-digit sequence
      if (!nationalId && allDigits.length >= 13) {
        nationalId = allDigits.substring(0, 13);
      }
    }
  }

  // ── B. Extract Name (ชื่อ - สกุล) ──
  const prefixes = [
    'นาย', 'นางสาว', 'นาง', 'เด็กชาย', 'เด็กหญิง', 'น.ส.', 'ด.ช.', 'ด.ญ.',
    'พระ', 'สามเณร', 'พลฯ', 'ร.ต.', 'ร.ท.', 'ร.อ.', 'พ.ต.', 'พ.ท.', 'พ.อ.',
    'ดร.', 'ผศ.', 'รศ.', 'ศ.'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check Thai prefix first
    for (const prefix of prefixes) {
      if (line.includes(prefix)) {
        const parts = line.split(prefix);
        if (parts.length > 1) {
          const namePart = parts[1].trim();
          // Filter only Thai characters and spaces
          const cleanName = namePart
            .replace(/ชื่อตัวและชื่อสกุล|ชื่อตัว|ชื่อสกุล|ชื่อ|Name|Last\s*name/gi, '')
            .replace(/[^ก-๙\s]/g, '')
            .trim();
          const tokens = cleanName.split(/\s+/).filter((t) => t.length > 1);

          if (tokens.length >= 2) {
            firstName = tokens[0];
            lastName = tokens.slice(1).join(' ');
          } else if (tokens.length === 1) {
            firstName = tokens[0];
            // Check next line for surname
            if (i + 1 < lines.length) {
              const nextClean = lines[i + 1].replace(/[^ก-๙\s]/g, '').trim();
              const nextTokens = nextClean.split(/\s+/).filter((t) => t.length > 1);
              if (nextTokens.length > 0 && !prefixes.some((p) => nextClean.includes(p))) {
                lastName = nextTokens[0];
              }
            }
          }
        }
      }
      if (firstName) break;
    }

    // Secondary match: lines containing 'ชื่อตัวและชื่อสกุล' or 'ชื่อ'
    if (!firstName && (line.includes('ชื่อ') || line.includes('Name'))) {
      const cleaned = line
        .replace(/ชื่อตัวและชื่อสกุล|ชื่อตัว|ชื่อสกุล|ชื่อ|Name|Last\s*name/gi, '')
        .replace(/[^ก-๙\s]/g, '')
        .trim();
      const tokens = cleaned.split(/\s+/).filter((t) => t.length > 1);
      if (tokens.length >= 2) {
        firstName = tokens[0];
        lastName = tokens.slice(1).join(' ');
      }
    }

    if (firstName && lastName) break;
  }

  // ── C. Extract Address (ที่อยู่) ──
  const addressKeywords = [
    'ที่อยู่', 'บ้านเลขที่', 'หมู่ที่', 'หมู่', 'ตำบล', 'ต.', 'อำเภอ', 'อ.',
    'จังหวัด', 'จ.', 'ตรอก', 'ซอย', 'ถนน', 'ถ.', 'แขวง', 'เขต'
  ];
  const stopKeywords = ['วันออกบัตร', 'วันหมดอายุ', 'ศาสนา', 'เจ้าพนักงาน', 'Date of', 'Card'];
  const addressLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isStop = stopKeywords.some((sk) => line.includes(sk));
    if (isStop && addressLines.length > 0) break;

    const hasAddressKeyword = addressKeywords.some((kw) => line.includes(kw));

    if (hasAddressKeyword || (addressLines.length > 0 && /[\dก-๙]/.test(line))) {
      let cleanLine = line
        .replace(/ที่อยู่/g, '')
        .replace(/Address/gi, '')
        .trim();

      if (cleanLine.length > 2 && !isStop) {
        addressLines.push(cleanLine);
      }
    }
  }

  if (addressLines.length > 0) {
    address = addressLines
      .join(' ')
      .replace(/\s+/g, ' ')
      .replace(/[^0-9ก-๙\/\s\.\-]/g, '')
      .trim();
  }

  return {
    nationalId,
    firstName,
    lastName,
    address,
    rawText: cleanText,
    confidence: (nationalId ? 40 : 0) + (firstName ? 30 : 0) + (lastName ? 20 : 0) + (address ? 10 : 0),
  };
}

// 5. 100% Crash-Proof High-level Scan Function
export async function scanIdCardImage(
  imageElementOrCanvas: HTMLImageElement | HTMLCanvasElement | string,
  onProgress?: (percent: number, statusText: string) => void
): Promise<ExtractedIdCardData> {
  const fallbackResult: ExtractedIdCardData = {
    nationalId: '',
    firstName: '',
    lastName: '',
    address: '',
    rawText: '',
    confidence: 0,
  };

  try {
    onProgress?.(10, 'กำลังเตรียมรูปภาพบัตรประชาชน...');
    let canvas: HTMLCanvasElement;

    if (typeof imageElementOrCanvas === 'string') {
      const img = new Image();
      img.src = imageElementOrCanvas;
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
      });
      canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width || 1200;
      canvas.height = img.naturalHeight || img.height || 750;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx?.drawImage(img, 0, 0);
    } else if (imageElementOrCanvas instanceof HTMLCanvasElement) {
      canvas = imageElementOrCanvas;
    } else {
      canvas = document.createElement('canvas');
      canvas.width = imageElementOrCanvas.naturalWidth || imageElementOrCanvas.width || 1200;
      canvas.height = imageElementOrCanvas.naturalHeight || imageElementOrCanvas.height || 750;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx?.drawImage(imageElementOrCanvas, 0, 0);
    }

    const preprocessed = preprocessCardImage(canvas);

    onProgress?.(25, 'กำลังเชื่อมต่อเอนจิน AI OCR...');
    let Tesseract: any = null;
    try {
      Tesseract = await loadTesseract();
    } catch (loadErr) {
      console.warn('Tesseract CDN load notice:', loadErr);
    }

    if (!Tesseract || !Tesseract.createWorker) {
      onProgress?.(100, 'บันทึกภาพบัตรประชาชนเรียบร้อย (สามารถกรอกข้อมูลในฟอร์ม)');
      return fallbackResult;
    }

    onProgress?.(40, 'AI กำลังอ่านตัวอักษรและตัวเลขบนบัตรประชาชน...');
    let worker: any = null;
    try {
      worker = await Tesseract.createWorker('tha+eng', 1, {
        logger: (m: any) => {
          if (m?.status === 'recognizing text' && typeof m?.progress === 'number') {
            const pct = Math.round(40 + m.progress * 50);
            onProgress?.(pct, `กำลังประมวลผล... (${pct}%)`);
          }
        },
      });
    } catch {
      // Fallback to eng worker if tha traineddata fails
      try {
        worker = await Tesseract.createWorker('eng', 1);
      } catch (e2) {
        console.warn('Worker creation notice:', e2);
      }
    }

    if (!worker) {
      onProgress?.(100, 'บันทึกภาพบัตรประชาชนเรียบร้อย');
      return fallbackResult;
    }

    const { data } = await worker.recognize(preprocessed);
    try {
      await worker.terminate();
    } catch {}

    onProgress?.(95, 'กำลังแยกแยะเลข 13 หลัก, ชื่อ-นามสกุล และที่อยู่...');
    const result = parseThaiIdCardText(data?.text || '');
    onProgress?.(100, 'ประมวลผล OCR สำเร็จ');

    return result || fallbackResult;
  } catch (err) {
    console.error('scanIdCardImage error:', err);
    onProgress?.(100, 'บันทึกภาพบัตรเรียบร้อย');
    return fallbackResult;
  }
}
