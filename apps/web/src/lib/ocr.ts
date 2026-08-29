/**
 * Thai Citizen ID Card OCR Engine
 * Extracts 13-digit National ID, Name, Surname, and Address from ID card photos.
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

// 1. Dynamic Tesseract.js CDN Loader
let tesseractLoadingPromise: Promise<any> | null = null;

export function loadTesseract(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject('SSR not supported');
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tesseractLoadingPromise) return tesseractLoadingPromise;

  tesseractLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async = true;
    script.onload = () => {
      if (window.Tesseract) {
        resolve(window.Tesseract);
      } else {
        reject(new Error('Tesseract script loaded but window.Tesseract is not defined'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Tesseract.js script'));
    document.head.appendChild(script);
  });

  return tesseractLoadingPromise;
}

// 2. Preprocess canvas for optimal Thai ID OCR
export function preprocessCardImage(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
  const targetWidth = 1400;
  const scale = targetWidth / sourceCanvas.width;
  const targetHeight = Math.round(sourceCanvas.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  // Draw scaled image
  ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

  // Get image pixels for contrast adjustment & grayscale
  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imgData.data;

  // Contrast factor
  const contrast = 1.25;
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
}

// 3. Thai National ID Checksum Validator
export function isValidThaiNationalId(id: string): boolean {
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
  const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleanText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let nationalId = '';
  let firstName = '';
  let lastName = '';
  let address = '';

  // ── A. Extract 13-digit National ID ──
  // Matches: 1 5501 00123 99 9 or 1-5501-00123-99-9 or 1550100123999
  const idRegexes = [
    /\b(\d{1})[\s\-_]?(\d{4})[\s\-_]?(\d{5})[\s\-_]?(\d{2})[\s\-_]?(\d{1})\b/,
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

  // Fallback: look for 13 digits combined across entire text
  if (!nationalId) {
    const allDigits = cleanText.replace(/\D/g, '');
    if (allDigits.length >= 13) {
      // Find valid 13-digit candidate
      for (let i = 0; i <= allDigits.length - 13; i++) {
        const sub = allDigits.substring(i, i + 13);
        if (isValidThaiNationalId(sub)) {
          nationalId = sub;
          break;
        }
      }
      if (!nationalId && allDigits.length === 13) {
        nationalId = allDigits;
      }
    }
  }

  // ── B. Extract Name (ชื่อ - สกุล) ──
  const prefixes = [
    'นาย', 'นางสาว', 'นาง', 'เด็กชาย', 'เด็กหญิง', 'น.ส.', 'ด.ช.', 'ด.ญ.',
    'พระ', 'สามเณร', 'พลฯ', 'ร.ต.', 'ร.ท.', 'ร.อ.', 'พ.ต.', 'พ.ท.', 'พ.อ.'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for Thai prefixes
    for (const prefix of prefixes) {
      if (line.includes(prefix)) {
        const parts = line.split(prefix);
        if (parts.length > 1) {
          const namePart = parts[1].trim();
          const tokens = namePart.split(/\s+/).filter((t) => t.length > 0);
          if (tokens.length >= 2) {
            firstName = tokens[0].replace(/[^ก-๙]/g, '');
            lastName = tokens.slice(1).join(' ').replace(/[^ก-๙\s]/g, '').trim();
          } else if (tokens.length === 1) {
            firstName = tokens[0].replace(/[^ก-๙]/g, '');
            // Check next line for surname
            if (i + 1 < lines.length) {
              const nextTokens = lines[i + 1].split(/\s+/).filter((t) => t.length > 0);
              if (nextTokens.length > 0 && /^[ก-๙]+$/.test(nextTokens[0])) {
                lastName = nextTokens[0];
              }
            }
          }
        }
      }
      if (firstName) break;
    }

    // Check for keywords like "ชื่อตัวและชื่อสกุล" or "Name"
    if (!firstName && (line.includes('ชื่อ') || line.includes('Name'))) {
      const cleaned = line
        .replace(/ชื่อตัวและชื่อสกุล|ชื่อตัว|ชื่อสกุล|ชื่อ|Name/gi, '')
        .trim();
      const tokens = cleaned.split(/\s+/).filter((t) => t.length > 0 && /^[ก-๙]+$/.test(t));
      if (tokens.length >= 2) {
        firstName = tokens[0];
        lastName = tokens.slice(1).join(' ');
      }
    }

    if (firstName && lastName) break;
  }

  // ── C. Extract Address (ที่อยู่) ──
  const addressKeywords = ['ที่อยู่', 'บ้านเลขที่', 'หมู่ที่', 'หมู่', 'ตำบล', 'ต.', 'อำเภอ', 'อ.', 'จังหวัด', 'จ.', 'ตรอก', 'ซอย', 'ถนน'];
  const addressLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const hasAddressKeyword = addressKeywords.some((kw) => line.includes(kw));

    if (hasAddressKeyword || line.includes('น่าน') || line.includes('เมือง')) {
      // Remove label "ที่อยู่" if present
      const cleanLine = line.replace(/ที่อยู่/g, '').trim();
      if (cleanLine.length > 3 && !cleanLine.includes('ศาสนา') && !cleanLine.includes('วันออกบัตร')) {
        addressLines.push(cleanLine);
      }
    }
  }

  if (addressLines.length > 0) {
    address = addressLines.join(' ').replace(/\s+/g, ' ').trim();
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

// 5. High-level Scan Function
export async function scanIdCardImage(
  imageElementOrCanvas: HTMLImageElement | HTMLCanvasElement | string,
  onProgress?: (percent: number, statusText: string) => void
): Promise<ExtractedIdCardData> {
  onProgress?.(10, 'กำลังโหลดเอนจิน AI OCR...');
  const Tesseract = await loadTesseract();

  onProgress?.(30, 'กำลังปรับแต่งความคมชัดของภาพ...');
  let canvas: HTMLCanvasElement;

  if (typeof imageElementOrCanvas === 'string') {
    // Base64 string
    const img = new Image();
    img.src = imageElementOrCanvas;
    await new Promise((res) => {
      img.onload = res;
    });
    canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0);
  } else if (imageElementOrCanvas instanceof HTMLCanvasElement) {
    canvas = imageElementOrCanvas;
  } else {
    canvas = document.createElement('canvas');
    canvas.width = imageElementOrCanvas.naturalWidth || imageElementOrCanvas.width;
    canvas.height = imageElementOrCanvas.naturalHeight || imageElementOrCanvas.height;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(imageElementOrCanvas, 0, 0);
  }

  const preprocessed = preprocessCardImage(canvas);

  onProgress?.(50, 'AI กำลังวิเคราะห์และอ่านตัวอักษรบนบัตร...');

  const worker = await Tesseract.createWorker('tha+eng', 1, {
    logger: (m: any) => {
      if (m.status === 'recognizing text' && m.progress) {
        const pct = Math.round(50 + m.progress * 45);
        onProgress?.(pct, `กำลังประมวลผลข้อความ... (${pct}%)`);
      }
    },
  });

  const { data } = await worker.recognize(preprocessed);
  await worker.terminate();

  onProgress?.(95, 'กำลังประมวลผลโครงสร้างข้อมูล...');
  const result = parseThaiIdCardText(data.text);
  onProgress?.(100, 'ประมวลผลเสร็จสิ้น');

  return result;
}
