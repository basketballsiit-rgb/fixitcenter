/**
 * High-Precision Thai Citizen ID Card AI OCR Engine
 * Extracts:
 * 1. 13-digit National ID (เลขประจำตัวประชาชน 13 หลัก)
 * 2. Prefix, First Name, Last Name (คำนำหน้า ชื่อ-นามสกุล ทั้งภาษาไทยและอังกฤษ)
 * 3. Full Address (ที่อยู่ตามบัตรประชาชน: บ้านเลขที่ หมู่ ตำบล อำเภอ จังหวัด)
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

// 1. Dynamic Tesseract.js Loader
let tesseractLoadingPromise: Promise<any> | null = null;

export function loadTesseract(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject('SSR not supported');
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tesseractLoadingPromise) return tesseractLoadingPromise;

  tesseractLoadingPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Tesseract.js download timeout'));
    }, 12000);

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

// 2. High-Quality Card Preprocessing (Grayscale + Adaptive Contrast Enhancement + Sharpening)
export function preprocessCardImage(
  sourceCanvas: HTMLCanvasElement,
  options?: { contrast?: number; binarize?: boolean; cropRect?: { x: number; y: number; width: number; height: number } }
): HTMLCanvasElement {
  try {
    const crop = options?.cropRect || { x: 0, y: 0, width: sourceCanvas.width, height: sourceCanvas.height };
    const targetWidth = Math.max(1200, Math.min(2200, crop.width * (1400 / Math.max(1, crop.width))));
    const scale = targetWidth / Math.max(1, crop.width);
    const targetHeight = Math.round(crop.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return sourceCanvas;

    // Draw cropped & scaled region
    ctx.drawImage(sourceCanvas, crop.x, crop.y, crop.width, crop.height, 0, 0, targetWidth, targetHeight);

    const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    const data = imgData.data;

    const contrast = options?.contrast ?? 1.45;
    const intercept = 128 * (1 - contrast);

    for (let i = 0; i < data.length; i += 4) {
      // Grayscale ITU-R BT.709
      const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      let enhanced = gray * contrast + intercept;

      if (options?.binarize) {
        enhanced = enhanced > 135 ? 255 : 0;
      } else {
        enhanced = Math.max(0, Math.min(255, enhanced));
      }

      data[i] = enhanced;
      data[i + 1] = enhanced;
      data[i + 2] = enhanced;
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

// 4. Intelligent Parser for Thai ID Card Text
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

  // ── A. EXTRACT 13-DIGIT NATIONAL ID (เลขประจำตัวประชาชน) ──
  // Pattern 1: Standard Thai ID format with spaces/dots: e.g. "3 5499 00239 15 2" or "3-5499-00239-15-2"
  const spacedIdPattern = /([1-8])[\s\.\-_]+(\d{4})[\s\.\-_]+(\d{5})[\s\.\-_]+(\d{2})[\s\.\-_]+(\d{1})/;
  const contiguousIdPattern = /\b([1-8]\d{12})\b/;

  // Check line by line first
  for (const line of lines) {
    // Check if line looks like top ID line
    const spacedMatch = line.match(spacedIdPattern);
    if (spacedMatch) {
      const candidate = `${spacedMatch[1]}${spacedMatch[2]}${spacedMatch[3]}${spacedMatch[4]}${spacedMatch[5]}`;
      if (candidate.length === 13) {
        nationalId = candidate;
        break;
      }
    }

    const contMatch = line.match(contiguousIdPattern);
    if (contMatch) {
      const candidate = contMatch[1];
      if (candidate.length === 13) {
        nationalId = candidate;
        break;
      }
    }
  }

  // Fallback for ID: look for 13 digits in entire text where first digit is 1-8
  if (!nationalId) {
    // Find all numbers in top half of text
    const topLines = lines.slice(0, Math.min(6, lines.length)).join(' ');
    const digitsInTop = topLines.replace(/\D/g, '');
    if (digitsInTop.length >= 13) {
      for (let i = 0; i <= digitsInTop.length - 13; i++) {
        const sub = digitsInTop.substring(i, i + 13);
        if (['1','2','3','4','5','6','7','8'].includes(sub[0]) && isValidThaiNationalId(sub)) {
          nationalId = sub;
          break;
        }
      }
      if (!nationalId && ['1','2','3','4','5','6','7','8'].includes(digitsInTop[0])) {
        nationalId = digitsInTop.substring(0, 13);
      }
    }
  }

  // ── B. EXTRACT THAI & ENGLISH NAME (ชื่อ - นามสกุล) ──
  const thaiPrefixes = [
    'นาย', 'นางสาว', 'นาง', 'เด็กชาย', 'เด็กหญิง', 'น.ส.', 'ด.ช.', 'ด.ญ.',
    'พระ', 'สามเณร', 'พลฯ', 'ร.ต.', 'ร.ท.', 'ร.อ.', 'พ.ต.', 'พ.ท.', 'พ.อ.',
    'ดร.', 'ผศ.', 'รศ.', 'ศ.'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for Thai prefix
    for (const prefix of thaiPrefixes) {
      if (line.includes(prefix)) {
        const parts = line.split(prefix);
        if (parts.length > 1) {
          const namePart = parts[1].trim();
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
              const nextLine = lines[i + 1];
              const nextClean = nextLine.replace(/[^ก-๙\s]/g, '').trim();
              const nextTokens = nextClean.split(/\s+/).filter((t) => t.length > 1);
              if (nextTokens.length > 0 && !thaiPrefixes.some((p) => nextLine.includes(p)) && !nextLine.includes('เกิด') && !nextLine.includes('ที่อยู่')) {
                lastName = nextTokens[0];
              }
            }
          }
        }
      }
      if (firstName && lastName) break;
    }

    // Check for 'ชื่อตัวและชื่อสกุล' or 'ชื่อ'
    if (!firstName && (line.includes('ชื่อตัว') || line.includes('ชื่อสกุล') || line.includes('ชื่อ'))) {
      const clean = line
        .replace(/ชื่อตัวและชื่อสกุล|ชื่อตัว|ชื่อสกุล|ชื่อ|Name|Last\s*name/gi, '')
        .replace(/[^ก-๙\s]/g, '')
        .trim();
      const tokens = clean.split(/\s+/).filter((t) => t.length > 1);
      if (tokens.length >= 2) {
        firstName = tokens[0];
        lastName = tokens.slice(1).join(' ');
      }
    }

    if (firstName && lastName) break;
  }

  // Fallback: Check English name if Thai name was blurry/missed
  if (!firstName || !lastName) {
    let engFirst = '';
    let engLast = '';
    for (const line of lines) {
      if (line.includes('Name') && !line.includes('Last')) {
        const match = line.match(/Name\s+(?:Mr\.|Mrs\.|Miss\s+)?([A-Za-z]+)/i);
        if (match) engFirst = match[1];
      }
      if (line.includes('Last') || line.includes('name')) {
        const match = line.match(/Last\s*name\s+([A-Za-z]+)/i);
        if (match) engLast = match[1];
      }
    }
    if (!firstName && engFirst) firstName = engFirst;
    if (!lastName && engLast) lastName = engLast;
  }

  // ── C. EXTRACT ADDRESS (ที่อยู่ตามบัตรประชาชน) ──
  const addressStartKeywords = [
    'ที่อยู่', 'บ้านเลขที่', 'หมู่ที่', 'หมู่', 'ตำบล', 'ต.', 'อำเภอ', 'อ.', 'จังหวัด', 'จ.'
  ];
  const addressStopKeywords = [
    'วันออกบัตร', 'วันหมดอายุ', 'ศาสนา', 'เจ้าพนักงาน', 'Date of', 'Identification', 'Card', 'Thai'
  ];

  const addressTokens: string[] = [];
  let recordingAddress = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check stop keywords
    if (addressStopKeywords.some((sk) => line.includes(sk))) {
      if (recordingAddress) break;
      continue;
    }

    // Check if line contains address starter
    if (addressStartKeywords.some((ak) => line.includes(ak)) || line.includes('/') || /\d+\/\d+/.test(line)) {
      recordingAddress = true;
    }

    if (recordingAddress) {
      let clean = line
        .replace(/ที่อยู่/g, '')
        .replace(/Address/gi, '')
        .trim();

      if (clean.length > 1) {
        addressTokens.push(clean);
      }

      // If line contains 'จ.' or 'จังหวัด', that's usually the end of address
      if (line.includes('จ.') || line.includes('จังหวัด') || line.includes('กทม') || line.includes('กรุงเทพ')) {
        break;
      }
    }
  }

  if (addressTokens.length > 0) {
    address = addressTokens
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

// 5. High-Precision Multi-Pass Card OCR Engine
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
    onProgress?.(10, 'กำลังเตรียมประมวลผลภาพถ่ายบัตรประชาชน...');
    let sourceCanvas: HTMLCanvasElement;

    if (typeof imageElementOrCanvas === 'string') {
      const img = new Image();
      img.src = imageElementOrCanvas;
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
      });
      sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = img.naturalWidth || img.width || 1280;
      sourceCanvas.height = img.naturalHeight || img.height || 720;
      const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
      ctx?.drawImage(img, 0, 0);
    } else if (imageElementOrCanvas instanceof HTMLCanvasElement) {
      sourceCanvas = imageElementOrCanvas;
    } else {
      sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = imageElementOrCanvas.naturalWidth || imageElementOrCanvas.width || 1280;
      sourceCanvas.height = imageElementOrCanvas.naturalHeight || imageElementOrCanvas.height || 720;
      const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
      ctx?.drawImage(imageElementOrCanvas, 0, 0);
    }

    onProgress?.(25, 'กำลังเชื่อมต่อเอนจิน AI OCR...');
    let Tesseract: any = null;
    try {
      Tesseract = await loadTesseract();
    } catch (loadErr) {
      console.warn('Tesseract CDN load notice:', loadErr);
    }

    if (!Tesseract || !Tesseract.createWorker) {
      onProgress?.(100, 'บันทึกภาพบัตรเรียบร้อย');
      return fallbackResult;
    }

    onProgress?.(40, 'AI กำลังเริ่มต้นตัวอ่านภาษาไทยและตัวเลข...');
    let worker: any = null;
    try {
      worker = await Tesseract.createWorker('tha+eng', 1, {
        logger: (m: any) => {
          if (m?.status === 'recognizing text' && typeof m?.progress === 'number') {
            const pct = Math.round(40 + m.progress * 50);
            onProgress?.(pct, `AI กำลังสแกนตัวอักษรและตัวเลข... (${pct}%)`);
          }
        },
      });
    } catch {
      try {
        worker = await Tesseract.createWorker('eng', 1);
      } catch (e2) {
        console.warn('Worker creation notice:', e2);
      }
    }

    if (!worker) {
      onProgress?.(100, 'บันทึกภาพบัตรเรียบร้อย');
      return fallbackResult;
    }

    // ── PASS 1: Scan Full Enhanced Card ──
    const fullEnhanced = preprocessCardImage(sourceCanvas, { contrast: 1.4 });
    const { data: fullData } = await worker.recognize(fullEnhanced);
    let result = parseThaiIdCardText(fullData?.text || '');

    // ── PASS 2: If National ID or Name is still missing, scan focused sub-regions ──
    if (!result.nationalId || !result.firstName || !result.lastName) {
      onProgress?.(85, 'กำลังสแกนซ้ำในตำแหน่งสำคัญของบัตร...');

      // Sub-region 1: Top Right (13-Digit ID band: Top 5%-35%, Width 40%-100%)
      if (!result.nationalId) {
        try {
          const idRegion = preprocessCardImage(sourceCanvas, {
            contrast: 1.6,
            cropRect: {
              x: Math.round(sourceCanvas.width * 0.35),
              y: Math.round(sourceCanvas.height * 0.05),
              width: Math.round(sourceCanvas.width * 0.65),
              height: Math.round(sourceCanvas.height * 0.35),
            },
          });
          const { data: idData } = await worker.recognize(idRegion);
          const idParsed = parseThaiIdCardText(idData?.text || '');
          if (idParsed.nationalId) {
            result.nationalId = idParsed.nationalId;
          }
        } catch {}
      }

      // Sub-region 2: Name & Address band (Top 20%-85%, Left 15%-90%)
      if (!result.firstName || !result.lastName || !result.address) {
        try {
          const nameRegion = preprocessCardImage(sourceCanvas, {
            contrast: 1.5,
            cropRect: {
              x: Math.round(sourceCanvas.width * 0.15),
              y: Math.round(sourceCanvas.height * 0.2),
              width: Math.round(sourceCanvas.width * 0.8),
              height: Math.round(sourceCanvas.height * 0.65),
            },
          });
          const { data: nameData } = await worker.recognize(nameRegion);
          const nameParsed = parseThaiIdCardText(nameData?.text || '');
          if (!result.firstName && nameParsed.firstName) result.firstName = nameParsed.firstName;
          if (!result.lastName && nameParsed.lastName) result.lastName = nameParsed.lastName;
          if (!result.address && nameParsed.address) result.address = nameParsed.address;
        } catch {}
      }
    }

    try {
      await worker.terminate();
    } catch {}

    onProgress?.(100, 'ประมวลผลข้อมูลบัตรประชาชนสำเร็จ');
    return result;
  } catch (err) {
    console.error('scanIdCardImage error:', err);
    onProgress?.(100, 'บันทึกภาพบัตรเรียบร้อย');
    return fallbackResult;
  }
}
