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
  provinceName?: string;
}

export const KitchenPrintLayout: React.FC<KitchenPrintLayoutProps> = ({
  logs,
  summary,
  selectedCenterId,
  centers,
  missions,
  collegeName = 'วิทยาลัยสารพัดช่างน่าน',
  provinceName = 'น่าน',
}) => {
  const currentCenter = centers.find((c) => c.id === selectedCenterId);
  const isAllCenters = selectedCenterId === 'ALL' || !selectedCenterId;
  const activeMission = missions.find((m) => m.isActive) || missions[0];

  // Calculate totals
  let totalBoxes = 0;
  let totalWater = 0;
  let totalRelief = 0;
  let totalBudgetSum = 0;

  // Find date range
  let earliestDate: Date | null = null;
  let latestDate: Date | null = null;

  logs.forEach((log) => {
    const d = new Date(log.serviceDate);
    if (!earliestDate || d < earliestDate) earliestDate = d;
    if (!latestDate || d > latestDate) latestDate = d;

    const bQty = log.boxQty ?? (log.categoryCode === 'K01' ? log.quantity || 0 : 0);
    const wQty = log.waterQty ?? (log.categoryCode === 'K02' ? log.quantity || 0 : 0);
    const rQty = log.reliefQty ?? (log.categoryCode === 'K03' ? log.quantity || 0 : 0);

    totalBoxes += bQty;
    totalWater += wQty;
    totalRelief += rQty;

    const bTotal = log.totalBudget
      ? Number(log.totalBudget)
      : log.budgetPerUnit
      ? Number(log.budgetPerUnit) * (Number(log.quantity) || (bQty + wQty + rQty))
      : 0;

    totalBudgetSum += bTotal;
  });

  const formatDateThai = (d: Date | null) => {
    if (!d) return '........';
    return d.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const calculateDays = () => {
    if (!earliestDate || !latestDate) return '........';
    const diffTime = Math.abs(latestDate.getTime() - earliestDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <div
      id="kitchen-print-a4"
      className="print-only hidden print:block text-black bg-white"
      style={{ fontFamily: 'Sarabun, sans-serif' }}
    >
      <div className="w-[210mm] max-w-[210mm] mx-auto p-4 text-[12px] leading-relaxed">
        
        {/* ── Top Official Header (Exact Format from Image) ── */}
        <div className="text-center mb-4 space-y-1">
          {/* Logo centered */}
          <div className="flex justify-center mb-1">
            <img
              src={assetUrl('/logo.png')}
              alt="Logo"
              className="h-16 w-auto object-contain mx-auto"
            />
          </div>

          <h1 className="text-[14px] font-bold text-slate-950">
            แบบรายงานการดำเนินงานกิจกรรมอาชีวะอาสา ช่วยเหลือผู้ประสบอุทกภัยในพื้นที่จังหวัด{provinceName}
          </h1>
          <h2 className="text-[13px] font-bold text-slate-900">
            ภายใต้โครงการบูรณาการการพัฒนาทักษะทางวิชาชีพกับการเสริมสร้างคุณลักษณะอันพึงประสงค์
          </h2>
          <h3 className="text-[13px] font-bold text-slate-900">
            ของผู้เรียนอาชีวศึกษา (Fix it – จิตอาสา)
          </h3>
        </div>

        {/* ── Organization & Mission Info Lines (Exact Format) ── */}
        <div className="space-y-1.5 text-[12px] mb-4">
          <div className="flex justify-between">
            <div className="flex-1">
              <span>ชื่อสถานศึกษาที่ดำเนินการ </span>
              <span className="font-semibold border-b border-dotted border-black px-2 min-w-[260px] inline-block">
                {collegeName}
              </span>
            </div>
            <div className="w-[180px] text-right">
              <span>จังหวัด </span>
              <span className="font-semibold border-b border-dotted border-black px-2 min-w-[120px] inline-block text-center">
                {provinceName}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <span className="font-bold text-red-600">กิจกรรม</span>
              <span className="font-bold text-red-600 ml-6">โรงครัวอาชีวะ</span>
            </div>
          </div>

          <div className="flex justify-between">
            <div className="flex-1">
              <span>พื้นที่/จุดที่ให้บริการ </span>
              <span className="font-semibold border-b border-dotted border-black px-2 min-w-[280px] inline-block">
                {isAllCenters
                  ? `ทุกศูนย์บริการในสังกัด ${collegeName}`
                  : `${currentCenter?.name || '-'} ${currentCenter?.address ? `(${currentCenter.address})` : ''}`}
              </span>
            </div>
            <div className="w-[180px] text-right">
              <span>จังหวัด </span>
              <span className="font-semibold border-b border-dotted border-black px-2 min-w-[120px] inline-block text-center">
                {provinceName}
              </span>
            </div>
          </div>

          <div>
            <span>ระยะเวลาที่ร่วมกิจกรรม ระหว่างวันที่ </span>
            <span className="font-semibold border-b border-dotted border-black px-2 inline-block">
              {formatDateThai(earliestDate)}
            </span>
            <span> ถึงวันที่ </span>
            <span className="font-semibold border-b border-dotted border-black px-2 inline-block">
              {formatDateThai(latestDate)}
            </span>
            <span> รวม </span>
            <span className="font-bold border-b border-dotted border-black px-3 inline-block text-center font-mono">
              {calculateDays()}
            </span>
            <span> วัน</span>
          </div>
        </div>

        {/* ── Main Data Table (Exact 8 Columns matching Image) ── */}
        <table className="w-full border-collapse border border-black text-[11px] mb-6">
          <thead>
            <tr className="bg-[#e2edd8] border-b border-black text-slate-900 font-bold text-center">
              <th className="border border-black py-2 px-1 w-[5%]">ที่</th>
              <th className="border border-black py-2 px-1 w-[12%]">วัน/เดือน/ปี</th>
              <th className="border border-black py-2 px-2 w-[27%] text-center">รายละเอียดการดำเนินงาน/รายการ</th>
              <th className="border border-black py-2 px-1 w-[11%]">จำนวนอาหารกล่อง<br/>(กล่อง)</th>
              <th className="border border-black py-2 px-1 w-[11%]">จำนวนน้ำดื่ม<br/>(ขวด/แก้ว)</th>
              <th className="border border-black py-2 px-1 w-[11%]">จำนวนถุงยังชีพ<br/>(ชุด)</th>
              <th className="border border-black py-2 px-1 w-[11%]">งบประมาณในการ<br/>ดำเนินงาน/ชิ้น</th>
              <th className="border border-black py-2 px-1 w-[12%]">งบประมาณทั้งสิ้น<br/>(บาท)</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="border border-black py-8 text-center text-slate-500">
                  - ไม่พบข้อมูลรายการสถิติครัวอาชีวะ -
                </td>
              </tr>
            ) : (
              logs.map((log, index) => {
                const dateObj = new Date(log.serviceDate);
                const thaiDateShort = dateObj.toLocaleDateString('th-TH', {
                  day: 'numeric',
                  month: 'short',
                  year: '2-digit',
                });

                const bQty = log.boxQty ?? (log.categoryCode === 'K01' ? log.quantity || 0 : 0);
                const wQty = log.waterQty ?? (log.categoryCode === 'K02' ? log.quantity || 0 : 0);
                const rQty = log.reliefQty ?? (log.categoryCode === 'K03' ? log.quantity || 0 : 0);

                const bPerUnit = log.budgetPerUnit ? Number(log.budgetPerUnit) : null;
                const bTotal = log.totalBudget
                  ? Number(log.totalBudget)
                  : bPerUnit
                  ? bPerUnit * (Number(log.quantity) || (bQty + wQty + rQty))
                  : null;

                return (
                  <tr key={log.id || index} className="border-b border-black text-center align-middle">
                    <td className="border border-black py-1.5 px-1 font-mono">
                      {index + 1}
                    </td>
                    <td className="border border-black py-1.5 px-1 whitespace-nowrap">
                      {thaiDateShort}
                    </td>
                    <td className="border border-black py-1.5 px-2 text-left">
                      <div className="font-semibold text-slate-900">{log.menuName}</div>
                      <div className="text-[10px] text-slate-600">
                        {isAllCenters && log.center?.name ? `ศูนย์: ${log.center.name} | ` : ''}
                        {log.targetLocation ? `จุดบริการ: ${log.targetLocation}` : ''}
                      </div>
                      {log.notes && <div className="text-[9px] text-slate-500">หมายเหตุ: {log.notes}</div>}
                    </td>
                    <td className="border border-black py-1.5 px-1 font-mono font-semibold">
                      {bQty > 0 ? bQty.toLocaleString() : '-'}
                    </td>
                    <td className="border border-black py-1.5 px-1 font-mono font-semibold">
                      {wQty > 0 ? wQty.toLocaleString() : '-'}
                    </td>
                    <td className="border border-black py-1.5 px-1 font-mono font-semibold">
                      {rQty > 0 ? rQty.toLocaleString() : '-'}
                    </td>
                    <td className="border border-black py-1.5 px-1 font-mono text-right pr-2">
                      {bPerUnit !== null ? bPerUnit.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className="border border-black py-1.5 px-1 font-mono text-right pr-2 font-semibold">
                      {bTotal !== null ? bTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 border-t-2 border-black font-bold text-center">
              <td colSpan={3} className="border border-black py-2 px-2 text-right">
                รวมทั้งสิ้น ({logs.length} รายการ):
              </td>
              <td className="border border-black py-2 px-1 font-mono text-rose-800 font-bold">
                {totalBoxes.toLocaleString()}
              </td>
              <td className="border border-black py-2 px-1 font-mono text-blue-800 font-bold">
                {totalWater.toLocaleString()}
              </td>
              <td className="border border-black py-2 px-1 font-mono text-amber-800 font-bold">
                {totalRelief.toLocaleString()}
              </td>
              <td className="border border-black py-2 px-1 text-center text-slate-400">
                -
              </td>
              <td className="border border-black py-2 px-1 font-mono text-right pr-2 text-emerald-800 font-bold">
                {totalBudgetSum > 0 ? totalBudgetSum.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* ── Official Signature Section (Matching Image - Left blank for sign) ── */}
        <div className="mt-8 flex justify-end text-[12px]">
          <div className="w-[320px] text-center space-y-3">
            <p className="font-semibold text-slate-900">รับรองข้อมูลการดำเนินงานถูกต้อง</p>
            <div className="pt-2">
              <p>ลงชื่อ ............................................................................</p>
              <p className="mt-1">(...........................................................................)</p>
            </div>
            <p>ตำแหน่ง ............................................................................</p>
          </div>
        </div>

      </div>
    </div>
  );
};

