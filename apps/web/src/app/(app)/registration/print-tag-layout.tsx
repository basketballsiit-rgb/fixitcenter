'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export interface PrintTagLayoutProps {
  queueNumber: string;
  qrToken?: string;
  centerName?: string;
  registeredAt?: string | Date;
  customer?: {
    firstName: string;
    lastName: string;
    phone?: string;
  };
  device?: {
    tradeCode: string;
    brand?: string;
    problemDesc?: string;
    accessories?: string;
  };
}

export const PrintTagLayout: React.FC<PrintTagLayoutProps> = ({
  queueNumber,
  qrToken,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    const payload = qrToken || queueNumber;
    QRCode.toDataURL(payload, {
      width: 140,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR code generation failed:', err));
  }, [queueNumber, qrToken]);

  return (
    <div id="print-tag-section" className="print-tag-only hidden print:block text-black bg-white" style={{ fontFamily: 'Sarabun, sans-serif' }}>
      
      {/* Cut Instructions */}
      <div className="text-[10px] text-slate-500 mb-1.5 flex items-center gap-1 font-mono">
        <span>✂ ตัดตามรอยประเพื่อนำป้ายไปติดที่ตัวเครื่อง/อุปกรณ์</span>
      </div>

      {/* Compact Tag - auto width with border hugging content */}
      <div className="inline-block border-2 border-dashed border-black rounded-lg p-1.5 bg-white">
        <div className="border-2 border-black rounded-md px-2.5 py-1.5 inline-flex items-center gap-2.5 bg-white h-[34mm] box-border">
          
          {/* QR Code */}
          <div className="shrink-0 flex flex-col items-center">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="QR Code"
                className="w-[25mm] h-[25mm] object-contain border border-slate-300 rounded p-0.5 bg-white"
              />
            ) : (
              <div className="w-[25mm] h-[25mm] border border-dashed border-slate-400 rounded flex items-center justify-center text-[9px] text-slate-400">
                QR Code
              </div>
            )}
          </div>

          {/* Queue Number & Info with tight right padding */}
          <div className="flex flex-col justify-center text-left pr-1">
            <div className="text-[10px] font-bold text-slate-600 leading-tight whitespace-nowrap">
              ศูนย์ FixIt Center
            </div>
            <div className="text-3xl font-black text-black font-mono tracking-tight leading-none my-1 whitespace-nowrap">
              {queueNumber}
            </div>
            <div className="text-[9px] font-semibold text-slate-700 leading-tight whitespace-nowrap">
              📷 สแกนเปิดงานซ่อม
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
