'use client';

import React from 'react';
import { KitchenLog, KitchenSummary, Center, Mission } from '@/lib/api';
import { assetUrl } from '@/lib/utils';

export interface KitchenPrintLayoutProps {
  logs: KitchenLog[];
  summary: KitchenSummary;
  selectedCenterId: string;
  centers: Center[];
  missions: Mission[];
  collegeName?: string;
}

export const KitchenPrintLayout: React.FC<KitchenPrintLayoutProps> = ({
  logs,
  summary,
  selectedCenterId,
  centers,
  missions,
  collegeName = 'วิทยาลัยสารพัดช่างน่าน',
}) => {
  const currentCenter = centers.find((c) => c.id === selectedCenterId);
  const isAllCenters = selectedCenterId === 'ALL' || !selectedCenterId;
  const activeMission = missions.find((m) => m.isActive) || missions[0];

  const now = new Date();
  const printedDate = now.toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const printedTime = now.toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Calculate totals
  const totalBoxes = logs
    .filter((l) => l.categoryCode === 'K01')
    .reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
  const totalWater = logs
    .filter((l) => l.categoryCode === 'K02')
    .reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
  const totalRelief = logs
    .filter((l) => l.categoryCode === 'K03')
    .reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
  const totalOther = logs
    .filter((l) => l.categoryCode === 'K99' || !['K01', 'K02', 'K03'].includes(l.categoryCode))
    .reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
  const grandTotal = logs.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);

  return (
    <div
      id="kitchen-print-a4"
      className="print-only hidden print:block text-black bg-white"
      style={{ fontFamily: 'Sarabun, sans-serif' }}
    >
      <div className="w-[210mm] max-w-[210mm] mx-auto p-4 text-[12px] leading-relaxed">
        
        {/* ── Top Centered Logo ── */}
        <div className="text-center mb-3">
          <div className="flex justify-center mb-1">
            <img
              src={assetUrl('/logo.png')}
              alt="FixIt Center Logo"
              className="h-16 w-auto object-contain mx-auto"
            />
          </div>
          <h1 className="text-base font-bold tracking-tight text-slate-900">
            ศูนย์ซ่อมสร้างเพื่อชุมชน (Fix it Center)
          </h1>
          <h2 className="text-sm font-bold text-slate-800 mt-0.5">
            แบบรายงานสรุปสถิติข้อมูลครัวอาชีวะ (Vocational Kitchen & Relief Report)
          </h2>
          
          {/* Organization / Center Name Header */}
          <div className="mt-1 text-[13px] font-semibold">
            {isAllCenters ? (
              <p className="text-slate-900">
                หน่วยงาน: <span className="font-bold text-blue-900">{collegeName}</span>{' '}
                <span className="font-normal text-slate-600">(รายงานข้อมูลสรุปรวมทุกศูนย์บริการ)</span>
              </p>
            ) : (
              <p className="text-slate-900">
                ศูนย์บริการ: <span className="font-bold text-blue-900">{currentCenter?.name || '-'}</span>{' '}
                <span className="font-normal text-slate-600">(สังกัด {collegeName})</span>
              </p>
            )}
          </div>

          <div className="flex justify-between items-center text-[11px] text-slate-600 mt-2 border-b pb-1.5 px-1">
            <span>
              <strong>ภารกิจ:</strong> {activeMission?.name || 'ภารกิจศูนย์ซ่อมสร้างเพื่อชุมชน'} (ปีงบประมาณ {activeMission?.fiscalYear || '2567'})
            </span>
            <span>
              <strong>พิมพ์รายงานเมื่อ:</strong> {printedDate} เวลา {printedTime} น.
            </span>
          </div>
        </div>

        {/* ── Summary Statistics Cards ── */}
        <div className="grid grid-cols-4 gap-2 mb-3 text-center">
          <div className="border border-slate-300 rounded p-1.5 bg-slate-50">
            <p className="text-[10px] text-slate-600 font-semibold">🍱 ข้าวกล่องปรุงสุก</p>
            <p className="text-sm font-black text-rose-700">{totalBoxes.toLocaleString()} <span className="text-[10px] font-normal text-slate-600">กล่อง</span></p>
          </div>
          <div className="border border-slate-300 rounded p-1.5 bg-slate-50">
            <p className="text-[10px] text-slate-600 font-semibold">💧 น้ำดื่ม/เครื่องดื่ม</p>
            <p className="text-sm font-black text-blue-700">{totalWater.toLocaleString()} <span className="text-[10px] font-normal text-slate-600">ขวด/แก้ว</span></p>
          </div>
          <div className="border border-slate-300 rounded p-1.5 bg-slate-50">
            <p className="text-[10px] text-slate-600 font-semibold">📦 ถุงยังชีพ/เสบียงแห้ง</p>
            <p className="text-sm font-black text-amber-700">{totalRelief.toLocaleString()} <span className="text-[10px] font-normal text-slate-600">ชุด</span></p>
          </div>
          <div className="border-2 border-emerald-600 rounded p-1.5 bg-emerald-50/50">
            <p className="text-[10px] text-emerald-800 font-bold">📋 ยอดรวมแจกจ่ายทั้งสิ้น</p>
            <p className="text-sm font-black text-emerald-800">{grandTotal.toLocaleString()} <span className="text-[10px] font-normal text-slate-700">หน่วย ({logs.length} รายการ)</span></p>
          </div>
        </div>

        {/* ── Main Data Table ── */}
        <table className="w-full border-collapse border border-black text-[11px] mb-4">
          <thead>
            <tr className="bg-slate-100 border-b border-black text-slate-900 font-bold">
              <th className="border border-black py-1.5 px-2 text-center w-[6%]">ลำดับ</th>
              <th className="border border-black py-1.5 px-2 text-center w-[14%]">วัน เดือน ปี</th>
              <th className="border border-black py-1.5 px-2 text-left w-[28%]">เมนูอาหาร / รายการแจกจ่าย</th>
              <th className="border border-black py-1.5 px-2 text-right w-[12%]">จำนวน</th>
              <th className="border border-black py-1.5 px-2 text-left w-[20%]">ศูนย์บริการ</th>
              <th className="border border-black py-1.5 px-2 text-left w-[20%]">พื้นที่เป้าหมาย / ผู้ประสานงาน</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="border border-black py-6 text-center text-slate-500">
                  - ไม่พบข้อมูลรายการสถิติครัวอาชีวะในช่วงเวลานี้ -
                </td>
              </tr>
            ) : (
              logs.map((log, index) => {
                const dateObj = new Date(log.serviceDate);
                const thaiDateStr = dateObj.toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <tr key={log.id || index} className="border-b border-slate-300">
                    <td className="border border-black py-1 px-1.5 text-center font-mono">
                      {index + 1}
                    </td>
                    <td className="border border-black py-1 px-2 text-center whitespace-nowrap">
                      {thaiDateStr}
                    </td>
                    <td className="border border-black py-1 px-2">
                      <div className="font-semibold text-slate-900">{log.menuName}</div>
                      {log.notes && <div className="text-[10px] text-slate-500">{log.notes}</div>}
                    </td>
                    <td className="border border-black py-1 px-2 text-right whitespace-nowrap">
                      <span className="font-bold">{Number(log.quantity).toLocaleString()}</span>{' '}
                      <span className="text-[10px] text-slate-600">{log.unit || 'กล่อง'}</span>
                    </td>
                    <td className="border border-black py-1 px-2 text-slate-800">
                      {log.center?.name || currentCenter?.name || '-'}
                    </td>
                    <td className="border border-black py-1 px-2">
                      <div>{log.targetLocation || '-'}</div>
                      {log.coordinatorName && (
                        <div className="text-[10px] text-slate-500">ผู้ประสาน: {log.coordinatorName}</div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-black font-bold text-slate-900">
              <td colSpan={3} className="border border-black py-2 px-3 text-right">
                ยอดรวมทั้งหมด ({logs.length} รายการ):
              </td>
              <td className="border border-black py-2 px-2 text-right text-rose-800 font-black text-[12px]">
                {grandTotal.toLocaleString()}
              </td>
              <td colSpan={2} className="border border-black py-2 px-2 text-left text-[10px] text-slate-600">
                (ข้าวกล่อง {totalBoxes.toLocaleString()} / น้ำดื่ม {totalWater.toLocaleString()} / ถุงยังชีพ {totalRelief.toLocaleString()}
                {totalOther > 0 ? ` / อื่นๆ ${totalOther.toLocaleString()}` : ''})
              </td>
            </tr>
          </tfoot>
        </table>

        {/* ── Signatures & Authorization ── */}
        <div className="mt-6 grid grid-cols-2 gap-8 text-[11px]">
          <div className="text-center space-y-1">
            <p>ลงชื่อ ............................................................................ ผู้จัดทำ / รายงาน</p>
            <p>(...........................................................................)</p>
            <p>ตำแหน่ง ............................................................................</p>
            <p>วันที่ ........... เดือน ............................. พ.ศ. ...............</p>
          </div>
          <div className="text-center space-y-1">
            <p>ลงชื่อ ............................................................................ ผู้ตรวจรับรอง</p>
            <p>(...........................................................................)</p>
            <p>ตำแหน่ง ผู้อำนวยการ / หัวหน้าศูนย์ Fix it Center</p>
            <p>วันที่ ........... เดือน ............................. พ.ศ. ...............</p>
          </div>
        </div>

      </div>
    </div>
  );
};
