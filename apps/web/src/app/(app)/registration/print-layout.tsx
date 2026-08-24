'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { formatNationalId, formatPhone } from '@/lib/utils';

export interface PrintLayoutProps {
  queueNumber: string;
  centerName?: string;
  registeredAt?: string | Date;
  idCardImage?: string | null;
  customerSignature?: string | null;
  handoverSignature?: string | null;
  handoverBy?: string | null;
  closedAt?: string | Date | null;
  customer: {
    firstName: string;
    lastName: string;
    nationalId: string;
    phone: string;
    address: string;
  };
  device: {
    tradeCode: string;
    brand?: string;
    problemDesc: string;
    deviceCondition?: string;
    accessories?: string;
    additionalDetails?: string;
    problemImages?: string[];
    image?: string;
  };
}

const TRADE_LABELS: Record<string, string> = {
  E01: 'พัดลม', E02: 'หม้อหุงข้าว', E03: 'เตารีด', E04: 'กระติกน้ำร้อน', E05: 'เครื่องซักผ้า', E99: 'เครื่องใช้ไฟฟ้าอื่น ๆ',
  X01: 'โทรทัศน์ (TV)', X02: 'เครื่องเสียง/วิทยุ', X03: 'คอมพิวเตอร์/โน้ตบุ๊ก', X04: 'โทรศัพท์มือถือ/แท็บเล็ต', X99: 'อุปกรณ์อิเล็กทรอนิกส์อื่น ๆ',
  A01: 'รถจักรยานยนต์', A02: 'รถยนต์', A03: 'เครื่องยนต์การเกษตร/ตัดหญ้า', A99: 'ยานยนต์และเครื่องยนต์อื่น ๆ',
};

export function PrintLayout({
  queueNumber,
  centerName,
  registeredAt,
  idCardImage,
  customerSignature,
  handoverSignature,
  handoverBy,
  closedAt,
  customer,
  device,
}: PrintLayoutProps) {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    QRCode.toDataURL(
      JSON.stringify({ queueNumber, nationalId: customer.nationalId }),
      { width: 90, margin: 1, errorCorrectionLevel: 'M' }
    ).then(setQrDataUrl).catch(() => {});
  }, [queueNumber, customer.nationalId]);

  // Use the actual registration date/time from record
  const recordDate = registeredAt ? new Date(registeredAt) : new Date();
  const thaiDate = recordDate.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const thaiTime = recordDate.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Handover date if available
  const handoverDateObj = closedAt ? new Date(closedAt) : null;
  const thaiHandoverDate = handoverDateObj
    ? handoverDateObj.toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  const isAgri = device.tradeCode === 'A03';
  const isAuto = device.tradeCode.startsWith('A') && !isAgri;
  const isElec = device.tradeCode.startsWith('E') || device.tradeCode.startsWith('X');
  const isOther = device.tradeCode.endsWith('99') || device.tradeCode === 'OTHER';

  const tradeBranch = 
    device.tradeCode.startsWith('E') ? 'ช่างไฟฟ้ากำลัง' :
    device.tradeCode.startsWith('X') ? 'ช่างอิเล็กทรอนิกส์' : 'ช่างยนต์';

  const deviceName = TRADE_LABELS[device.tradeCode] || device.tradeCode;
  const deviceImage = device.image || (device.problemImages && device.problemImages[0]) || null;

  return (
    <div id="print-a4-section" className="print-only hidden print:block text-black bg-white" style={{ fontFamily: 'Sarabun, sans-serif' }}>
      <div className="w-[210mm] max-w-[210mm] mx-auto p-4 text-[13px] leading-snug">
        
        {/* ── Top Logo & Header ── */}
        <div className="text-center mb-2">
          <div className="flex justify-center mb-1">
            <img
              src="/logo.png"
              alt="FixIt Logo"
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="text-base font-bold tracking-tight">ศูนย์ซ่อมสร้างเพื่อชุมชน (Fix it Center)</h1>
          <h2 className="text-base font-bold">ใบรับงานซ่อม (Repair Form)</h2>
          <p className="text-sm font-semibold mt-1">
            ชื่อศูนย์ <span className="font-normal border-b border-dotted border-black px-4 min-w-[320px] inline-block">{centerName || 'วิทยาลัยสารพัดช่างน่าน'}</span>
          </p>
        </div>

        {/* ── Main Form Table ── */}
        <table className="w-full border-collapse border-2 border-black mb-3">
          <tbody>
            {/* Row 1: Registration Date/Time & Tracking QR + Queue Number */}
            <tr className="border-b border-black">
              <td className="w-[55%] border-r border-black p-2 align-middle">
                <span>วัน / เดือน / ปี </span>
                <span className="font-bold border-b border-dotted border-black px-2">{thaiDate}</span>
                <span className="ml-3">เวลา </span>
                <span className="font-bold border-b border-dotted border-black px-2">{thaiTime} น.</span>
              </td>
              <td className="w-[45%] p-1.5 align-middle bg-slate-50/50">
                <div className="flex items-center justify-between gap-2">
                  {/* QR Code tracking placed before Queue Number */}
                  {qrDataUrl && (
                    <div className="flex items-center gap-1.5">
                      <img
                        src={qrDataUrl}
                        alt="QR Code Track"
                        className="w-10 h-10 border border-slate-400 rounded p-0.5 bg-white shrink-0"
                      />
                      <div className="text-[9px] text-slate-700 font-mono leading-tight text-left">
                        <span className="font-bold">สแกนติดตาม</span><br />สถานะงานซ่อม
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="font-semibold text-xs">เลขที่ </span>
                    <span className="text-2xl font-black tracking-widest text-slate-900 border-2 border-black rounded px-3 py-0.5 bg-white font-mono">
                      {queueNumber}
                    </span>
                  </div>
                </div>
              </td>
            </tr>

            {/* Row 2: Customer Info (Unmasked Full Real Info) & Citizen ID Card Photo ONLY */}
            <tr>
              {/* Left Column: Customer Details */}
              <td className="w-[55%] border-r border-black p-2.5 align-top space-y-1.5">
                <div className="font-bold underline text-sm mb-1">ส่วนของผู้รับบริการ</div>
                
                <div>
                  <span>ชื่อ – สกุล นาย/นาง/นางสาว </span>
                  <span className="font-bold border-b border-dotted border-black px-2 inline-block min-w-[180px]">
                    {customer.firstName} {customer.lastName}
                  </span>
                </div>

                <div>
                  <span>บัตรประจำตัวประชาชน </span>
                  <span className="font-mono font-bold text-sm tracking-wide border-b border-dotted border-black px-2 inline-block min-w-[200px]">
                    {formatNationalId(customer.nationalId)}
                  </span>
                </div>

                <div>
                  <span>ที่อยู่ </span>
                  <span className="border-b border-dotted border-black px-2 inline-block min-w-[270px]">
                    {customer.address || '-'}
                  </span>
                </div>

                <div>
                  <span>โทรศัพท์ </span>
                  <span className="font-bold border-b border-dotted border-black px-2 inline-block min-w-[250px]">
                    {formatPhone(customer.phone)}
                  </span>
                </div>

                <div className="pt-1">
                  <span>สิ่งของที่นำมาซ่อม </span>
                  <span className="font-bold border-b border-dotted border-black px-2 inline-block min-w-[200px]">
                    {deviceName} {device.brand ? `(ยี่ห้อ: ${device.brand})` : ''}
                  </span>
                </div>

                {/* Checkboxes for Appliance Category */}
                <div className="pt-1 text-[12px] space-y-1">
                  <span className="font-semibold block">ประเภทเครื่องใช้ที่ซ่อม:</span>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3.5 h-3.5 border border-black text-center text-[10px] leading-3 font-bold">
                      {isAgri ? '✓' : ''}
                    </span>
                    <span>เครื่องมือ/เครื่องจักรกลการเกษตร</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="inline-block w-3.5 h-3.5 border border-black text-center text-[10px] leading-3 font-bold">
                      {isElec ? '✓' : ''}
                    </span>
                    <span>เครื่องใช้ไฟฟ้า/เครื่องใช้ในครัวเรือน</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-3.5 h-3.5 border border-black text-center text-[10px] leading-3 font-bold">
                        {isAuto ? '✓' : ''}
                      </span>
                      <span>ยานพาหนะ</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="inline-block w-3.5 h-3.5 border border-black text-center text-[10px] leading-3 font-bold">
                        {isOther ? '✓' : ''}
                      </span>
                      <span>อื่น ๆ (โปรดระบุ)...</span>
                    </div>
                  </div>
                </div>
              </td>

              {/* Right Column: Citizen ID Card Photo ONLY */}
              <td className="w-[45%] p-2 align-middle text-center relative bg-slate-50/20">
                {idCardImage ? (
                  <div className="h-44 flex flex-col items-center justify-center p-1 border border-slate-300 rounded bg-white shadow-sm">
                    <div className="text-[11px] font-bold text-slate-700 mb-1">ภาพสำเนาบัตรประชาชนผู้รับบริการ</div>
                    <img
                      src={idCardImage}
                      alt="สำเนาบัตรประชาชน"
                      className="max-h-36 max-w-full object-contain rounded border border-black p-0.5 bg-white"
                    />
                  </div>
                ) : (
                  <div className="h-44 border border-dashed border-slate-400 rounded flex flex-col items-center justify-center p-2">
                    <p className="text-xs text-slate-500 font-bold mb-1">( สำเนาบัตรประชาชน ผู้ใช้บริการ )</p>
                    <p className="text-[11px] text-slate-400">ติดรูปถ่าย หรือ แนบภาพบัตรประชาชน</p>
                  </div>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── 3-Column Inspection Table ── */}
        <table className="w-full border-collapse border-2 border-black mb-3 text-[12px]">
          <thead>
            <tr className="border-b border-black bg-slate-100/80 font-bold text-center">
              <th className="w-1/3 border-r border-black p-1.5">อาการเสีย</th>
              <th className="w-1/3 border-r border-black p-1.5">สภาพเครื่องใช้ที่นำมาซ่อม</th>
              <th className="w-1/3 p-1.5">อุปกรณ์ที่ติดมาด้วย</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-black">
              {/* อาการเสีย */}
              <td className="border-r border-black p-2 align-top h-28 space-y-1">
                <div>1. <span className="font-semibold">{device.problemDesc || '...................................................'}</span></div>
                <div>2. <span className="text-slate-400">...........................................................</span></div>
              </td>

              {/* สภาพเครื่องใช้ที่นำมาซ่อม (แทรกภาพถ่ายสภาพเครื่องและข้อความ) */}
              <td className="border-r border-black p-1.5 align-top h-28 text-center relative">
                {deviceImage ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <img
                      src={deviceImage}
                      alt="สภาพเครื่องใช้"
                      className="max-h-20 max-w-full object-contain rounded border border-black p-0.5 bg-white"
                    />
                    {device.deviceCondition && (
                      <span className="text-[11px] font-semibold text-slate-900 line-clamp-1 mt-1">
                        {device.deviceCondition}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="text-left space-y-1 p-0.5">
                    <div>1. <span className="font-semibold">{device.deviceCondition || '...................................................'}</span></div>
                    <div>2. <span className="text-slate-400">...........................................................</span></div>
                  </div>
                )}
              </td>

              {/* อุปกรณ์ที่ติดมาด้วย */}
              <td className="p-2 align-top h-28 space-y-1">
                <div>1. <span className="font-semibold">{device.accessories || '...................................................'}</span></div>
                <div>2. <span className="text-slate-400">...........................................................</span></div>
              </td>
            </tr>

            {/* รายละเอียด */}
            <tr>
              <td colSpan={3} className="p-2 align-top min-h-12">
                <span className="font-semibold block mb-0.5">รายละเอียด:</span>
                {device.additionalDetails ? (
                  <p className="font-semibold text-slate-900">{device.additionalDetails}</p>
                ) : (
                  <>
                    <p className="text-slate-400">........................................................................................................................................................................................</p>
                    <p className="text-slate-400">........................................................................................................................................................................................</p>
                  </>
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Bottom Technician / Supervisor Table ── */}
        <table className="w-full border-collapse border-2 border-black mb-4 text-[12px]">
          <tbody>
            <tr>
              {/* Left: Repair Details & Dates */}
              <td className="w-[55%] border-r border-black p-2.5 align-top space-y-2">
                <div>
                  <span className="font-semibold block">รายละเอียดการซ่อม:</span>
                  <p className="text-slate-400 mt-1">...................................................................................................................</p>
                  <p className="text-slate-400">...................................................................................................................</p>
                </div>
                <div className="pt-2 space-y-1.5">
                  <div>
                    <span>วันที่เริ่มซ่อม </span>
                    <span className="border-b border-dotted border-black px-2 inline-block min-w-[100px] text-center">......../......../........</span>
                    <span className="ml-2">เวลา </span>
                    <span className="border-b border-dotted border-black px-2 inline-block min-w-[60px] text-center">........:........ น.</span>
                  </div>
                  <div>
                    <span>วันที่ซ่อมเสร็จ </span>
                    <span className="border-b border-dotted border-black px-2 inline-block min-w-[100px] text-center">......../......../........</span>
                    <span className="ml-2">เวลา </span>
                    <span className="border-b border-dotted border-black px-2 inline-block min-w-[60px] text-center">........:........ น.</span>
                  </div>
                </div>
              </td>

              {/* Right: Technician / Inspector Info */}
              <td className="w-[45%] p-2.5 align-top space-y-1.5">
                <div className="font-bold text-center mb-1 underline">ผู้ดำเนินการซ่อม / ตรวจเช็ค</div>
                <div>
                  <span>ชื่อ-สกุล </span>
                  <span className="border-b border-dotted border-black px-2 inline-block min-w-[180px]">......................................................</span>
                </div>
                <div>
                  <span>บัตรประจำตัวประชาชนเลขที่ </span>
                  <span className="border-b border-dotted border-black px-2 inline-block min-w-[130px]">.....................................</span>
                </div>
                <div>
                  <span>สาขาวิชา </span>
                  <span className="font-semibold border-b border-dotted border-black px-2 inline-block min-w-[170px]">{tradeBranch}</span>
                </div>
                <div>
                  <span>ครูสาขาวิชา </span>
                  <span className="border-b border-dotted border-black px-2 inline-block min-w-[160px]">................................................</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── Bottom Signatures (Handover & Return) ── */}
        <div className="flex justify-between items-end px-4 pt-1 text-[13px]">
          <div className="flex flex-col items-center">
            {customerSignature ? (
              <div className="flex flex-col items-center">
                <img
                  src={customerSignature}
                  alt="ลายเซ็นผู้รับเครื่อง"
                  className="max-h-12 max-w-[140px] object-contain border-b border-black mb-1"
                />
                <span className="text-xs font-bold">({customer.firstName} {customer.lastName})</span>
              </div>
            ) : (
              <div className="h-10 border-b border-dotted border-black w-40 mb-1" />
            )}
            <div className="text-center mt-1">
              <span className="font-bold">ผู้รับเครื่อง / เจ้าของอุปกรณ์</span>
            </div>
            <div className="text-xs text-slate-700 mt-0.5">
              วันที่ {thaiHandoverDate || '......../......../........'}
            </div>
          </div>

          <div className="flex flex-col items-center">
            {handoverSignature ? (
              <div className="flex flex-col items-center">
                <img
                  src={handoverSignature}
                  alt="ลายเซ็นผู้ส่งมอบ"
                  className="max-h-12 max-w-[140px] object-contain border-b border-black mb-1"
                />
                <span className="text-xs font-bold">({handoverBy || 'เจ้าหน้าที่ผู้ส่งมอบ'})</span>
              </div>
            ) : (
              <div className="h-10 border-b border-dotted border-black w-40 mb-1 flex items-center justify-center text-xs font-semibold">
                {handoverBy ? `(${handoverBy})` : ''}
              </div>
            )}
            <div className="text-center mt-1">
              <span className="font-bold">ผู้ส่งมอบเครื่อง</span>
            </div>
            <div className="text-xs text-slate-700 mt-0.5">
              วันที่ {thaiHandoverDate || '......../......../........'}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
