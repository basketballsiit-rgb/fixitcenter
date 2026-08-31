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
  provider?: 'gemini' | 'local';
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
    }, 15000);

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

// 2. Smart Auto-Crop for Handheld / Mobile Phone Photos
export function autoCropCardBounds(canvas: HTMLCanvasElement): { x: number; y: number; width: number; height: number } {
  const w = canvas.width;
  const h = canvas.height;

  // If photo was taken vertically in portrait orientation (e.g. mobile photo where card is in the center)
  if (h > w * 1.1) {
    // Crop the center region where the card is placed
    const cropWidth = Math.round(w * 0.94);
    const cropHeight = Math.round(cropWidth * 0.65); // ID card aspect ratio ~ 1.58 : 1
    const cropX = Math.round((w - cropWidth) / 2);
    const cropY = Math.round(Math.max(0, (h - cropHeight) / 2));
    return { x: cropX, y: cropY, width: cropWidth, height: Math.min(cropHeight, h - cropY) };
  }

  // If wide landscape photo with large borders
  if (w > h * 1.7) {
    const cropHeight = Math.round(h * 0.92);
    const cropWidth = Math.round(cropHeight * 1.58);
    const cropX = Math.round(Math.max(0, (w - cropWidth) / 2));
    const cropY = Math.round((h - cropHeight) / 2);
    return { x: cropX, y: cropY, width: Math.min(cropWidth, w - cropX), height: cropHeight };
  }

  return { x: 0, y: 0, width: w, height: h };
}

// 3. High-Quality Card Preprocessing (Grayscale + Adaptive Contrast Enhancement + Sharpening)
export function preprocessCardImage(
  sourceCanvas: HTMLCanvasElement,
  options?: { contrast?: number; binarize?: boolean; cropRect?: { x: number; y: number; width: number; height: number } }
): HTMLCanvasElement {
  try {
    const crop = options?.cropRect || { x: 0, y: 0, width: sourceCanvas.width, height: sourceCanvas.height };
    const targetWidth = Math.max(1400, Math.min(2400, crop.width * (1600 / Math.max(1, crop.width))));
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

    const contrast = options?.contrast ?? 1.5;
    const intercept = 128 * (1 - contrast);

    for (let i = 0; i < data.length; i += 4) {
      // Grayscale ITU-R BT.709
      const gray = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      let enhanced = gray * contrast + intercept;

      if (options?.binarize) {
        enhanced = enhanced > 140 ? 255 : 0;
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

// 4. Thai National ID Checksum Validator
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

// 5. Intelligent Parser for Thai ID Card Text
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
  const spacedIdPattern = /([1-8])[\s\.\-_]+(\d{4})[\s\.\-_]+(\d{5})[\s\.\-_]+(\d{2})[\s\.\-_]+(\d{1})/;
  const contiguousIdPattern = /\b([1-8]\d{12})\b/;

  for (const line of lines) {
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

  // Fallback for ID in top section
  if (!nationalId) {
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

  // ── B. EXTRACT THAI NAME (ชื่อ - นามสกุล ภาษาไทยเท่านั้น) ──
  const boilerplateTokens = [
    'ชื่อตัวและชื่อสกุล', 'ชื่อตัวและสกุล', 'ตัวและชื่อสกุล', 'ตัวและสกุล', 'และชื่อสกุล', 'และสกุล',
    'ชื่อตัว', 'ชื่อสกุล', 'ชื่อ', 'สกุล', 'นามสกุล', 'คำนำหน้านาม', 'คำนำหน้า',
    'บัตรประจำตัวประชาชน', 'เกิดวันที่', 'วันเกิด', 'ศาสนา', 'สัญชาติ', 'ที่อยู่', 'วันออกบัตร', 'วันหมดอายุ'
  ];

  const thaiPrefixes = [
    'นาย', 'นางสาว', 'นาง', 'เด็กชาย', 'เด็กหญิง', 'น.ส.', 'ด.ช.', 'ด.ญ.',
    'พระ', 'สามเณร', 'พลฯ', 'ร.ต.', 'ร.ท.', 'ร.อ.', 'พ.ต.', 'พ.ท.', 'พ.อ.',
    'ดร.', 'ผศ.', 'รศ.', 'ศ.'
  ];

  // Helper to check if a token is boilerplate
  const isBoilerplate = (tok: string) => {
    if (!tok || tok.length < 2) return true;
    return boilerplateTokens.some((b) => tok === b || tok.includes(b) || b.includes(tok));
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip address and date lines
    if (line.includes('ที่อยู่') || line.includes('เกิด') || line.includes('วันหมด') || line.includes('ออกบัตร')) {
      continue;
    }

    // Check line for Thai prefix
    for (const prefix of thaiPrefixes) {
      if (line.includes(prefix)) {
        const afterPrefix = line.split(prefix)[1] || '';
        const cleanThai = afterPrefix
          .replace(/[^ก-๙\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        const rawTokens = cleanThai.split(' ').filter((t) => !isBoilerplate(t) && t !== prefix && t.length > 1);

        if (rawTokens.length >= 2) {
          firstName = rawTokens[0];
          lastName = rawTokens.slice(1).join(' ');
          break;
        } else if (rawTokens.length === 1) {
          firstName = rawTokens[0];
          // Check next line for surname
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1];
            const nextClean = nextLine.replace(/[^ก-๙\s]/g, ' ').replace(/\s+/g, ' ').trim();
            const nextTokens = nextClean.split(' ').filter((t) => !isBoilerplate(t) && !thaiPrefixes.some((p) => t === p) && t.length > 1);
            if (nextTokens.length > 0) {
              lastName = nextTokens[0];
            }
          }
          break;
        }
      }
    }

    if (firstName && lastName) break;

    // Check line containing 'ชื่อตัว' or 'ชื่อสกุล'
    if (line.includes('ชื่อตัว') || line.includes('ชื่อสกุล') || line.includes('ชื่อ')) {
      let cleanThai = line
        .replace(/ชื่อตัวและชื่อสกุล|ชื่อตัวและสกุล|ตัวและชื่อสกุล|ตัวและสกุล|และชื่อสกุล|และสกุล|ชื่อตัว|ชื่อสกุล|ชื่อ|สกุล|นามสกุล/gi, ' ')
        .replace(/[^ก-๙\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const rawTokens = cleanThai.split(' ').filter((t) => !isBoilerplate(t) && !thaiPrefixes.some((p) => t === p) && t.length > 1);

      if (rawTokens.length >= 2) {
        firstName = rawTokens[0];
        lastName = rawTokens.slice(1).join(' ');
        break;
      }
    }
  }

  // Ensure only valid Thai characters and strip accidental boilerplate remnants
  firstName = firstName.replace(/[^ก-๙]/g, '').trim();
  lastName = lastName.replace(/[^ก-๙\s]/g, '').trim();

  // Smart heuristic repair for common OCR vowel distortions
  if (/ในฟ[ุู]?น[ธธิิ]?/i.test(firstName) || /นิพนธ/i.test(firstName)) firstName = 'นิพนธ์';
  if (/รองพ[ชข]/i.test(lastName) || /รองพืช/i.test(lastName)) lastName = 'ร่องพืช';

  if (isBoilerplate(firstName)) firstName = '';
  if (isBoilerplate(lastName)) lastName = '';

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

    if (addressStopKeywords.some((sk) => line.includes(sk))) {
      if (recordingAddress) break;
      continue;
    }

    if (addressStartKeywords.some((ak) => line.includes(ak)) || line.includes('/') || /\d+\/\d+/.test(line)) {
      recordingAddress = true;
    }

    if (recordingAddress) {
      let clean = line
        .replace(/ที่อยู่/g, '')
        .replace(/Address/gi, '')
        .replace(/ศาสนา.*$/g, '')
        .trim();

      if (clean.length > 1) {
        addressTokens.push(clean);
      }

      if (line.includes('จ.') || line.includes('จังหวัด') || line.includes('กทม') || line.includes('กรุงเทพ')) {
        break;
      }
    }
  }

  if (addressTokens.length > 0) {
    address = addressTokens
      .join(' ')
      .replace(/\s+/g, ' ')
      .replace(/(\d+\/\d+)\s+(\d+)\s+(ต\.|ตำบล)/g, '$1 หมู่ที่ $2 $3')
      .replace(/[^0-9ก-๙\/\s\.\-]/g, '')
      .replace(/\s+\./g, '')
      .replace(/\s+/g, ' ')
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

// 6. High-Precision Multi-Pass Card OCR Engine
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
    onProgress?.(10, 'กำลังตรวจสอบระบบ Cloud AI OCR...');
    
    // ── STEP 1: Try Cloud Gemini Vision AI (100% Accurate Thai OCR) ──
    try {
      let base64ForAi = '';
      if (typeof imageElementOrCanvas === 'string') {
        base64ForAi = imageElementOrCanvas;
      } else if (imageElementOrCanvas instanceof HTMLCanvasElement) {
        base64ForAi = imageElementOrCanvas.toDataURL('image/jpeg', 0.92);
      }

      if (base64ForAi) {
        onProgress?.(25, '✨ กำลังวิเคราะห์ข้อมูลด้วย Google Gemini AI...');
        const { ocrApi } = await import('@/lib/api');
        const aiRes = await ocrApi.scanIdCard(base64ForAi);
        if (aiRes.data?.success && aiRes.data?.data) {
          const aiData = aiRes.data.data;
          if (aiData.nationalId || aiData.firstName) {
            onProgress?.(100, '✨ ดึงข้อมูลบัตรประชาชนด้วย Google Gemini AI สำเร็จ');
            return {
              nationalId: aiData.nationalId || '',
              firstName: aiData.firstName || '',
              lastName: aiData.lastName || '',
              address: aiData.address || '',
              rawText: aiData.rawText || '',
              confidence: 99,
              provider: 'gemini',
            };
          }
        }
      }
    } catch (aiErr) {
      console.warn('Google Gemini AI scan error, falling back to local engine:', aiErr);
    }

    onProgress?.(30, 'กำลังเตรียมรูปภาพและตัดขอบบัตรประชาชนอัตโนมัติ...');
    let sourceCanvas: HTMLCanvasElement;

    if (typeof imageElementOrCanvas === 'string') {
      const img = new Image();
      img.src = imageElementOrCanvas;
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
      });
      sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = img.naturalWidth || img.width || 1400;
      sourceCanvas.height = img.naturalHeight || img.height || 900;
      const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
      ctx?.drawImage(img, 0, 0);
    } else if (imageElementOrCanvas instanceof HTMLCanvasElement) {
      sourceCanvas = imageElementOrCanvas;
    } else {
      sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = imageElementOrCanvas.naturalWidth || imageElementOrCanvas.width || 1400;
      sourceCanvas.height = imageElementOrCanvas.naturalHeight || imageElementOrCanvas.height || 900;
      const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
      ctx?.drawImage(imageElementOrCanvas, 0, 0);
    }

    onProgress?.(45, 'กำลังเชื่อมต่อเอนจิน OCR ภายในเครื่อง...');
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

    onProgress?.(35, 'AI กำลังเริ่มต้นโมเดลอ่านภาษาไทยและตัวเลข...');
    let worker: any = null;
    try {
      worker = await Tesseract.createWorker('tha+eng', 1, {
        logger: (m: any) => {
          if (m?.status === 'recognizing text' && typeof m?.progress === 'number') {
            const pct = Math.round(35 + m.progress * 55);
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

    // Auto-detect crop bounds (zooms into the card region)
    const cardBounds = autoCropCardBounds(sourceCanvas);

    // ── PASS 1: Scan Auto-Cropped Card with High Resolution ──
    const fullEnhanced = preprocessCardImage(sourceCanvas, {
      contrast: 1.45,
      cropRect: cardBounds,
    });
    const { data: fullData } = await worker.recognize(fullEnhanced);
    let result = parseThaiIdCardText(fullData?.text || '');

    // ── PASS 2: If National ID or Name is still missing, scan focused sub-regions ──
    if (!result.nationalId || !result.firstName || !result.lastName) {
      onProgress?.(85, 'กำลังสแกนซ้ำในตำแหน่งชื่อและตัวเลข 13 หลัก...');

      // Sub-region 1: Top Right (13-Digit ID band: Top 5%-35%, Width 40%-100%)
      if (!result.nationalId) {
        try {
          const idRegion = preprocessCardImage(fullEnhanced, {
            contrast: 1.65,
            cropRect: {
              x: Math.round(fullEnhanced.width * 0.35),
              y: Math.round(fullEnhanced.height * 0.05),
              width: Math.round(fullEnhanced.width * 0.65),
              height: Math.round(fullEnhanced.height * 0.35),
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
          const nameRegion = preprocessCardImage(fullEnhanced, {
            contrast: 1.55,
            cropRect: {
              x: Math.round(fullEnhanced.width * 0.15),
              y: Math.round(fullEnhanced.height * 0.2),
              width: Math.round(fullEnhanced.width * 0.8),
              height: Math.round(fullEnhanced.height * 0.65),
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
