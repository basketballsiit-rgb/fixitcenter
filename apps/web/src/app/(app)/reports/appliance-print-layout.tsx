'use client';

import React from 'react';
import { ApplianceLog, ApplianceSummary, Center, Mission } from '@/lib/api';
import { assetUrl } from '@/lib/utils';

export interface AppliancePrintLayoutProps {
  logs: ApplianceLog[];
  summary: ApplianceSummary;
  selectedCenterId: string;
  centers: Center[];
  missions: Mission[];
  collegeName?: string;
  provinceName?: string;
}

export const AppliancePrintLayout: React.FC<AppliancePrintLayoutProps> = ({
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

  const safeLogs = Array.isArray(logs) ? logs : [];

  // Calculate totals
  let totalServiceCount = 0;
  let totalCompletedCount = 0;
  let totalBudgetSum = 0;

  // Find date range
  let earliestDate: Date | null = null;
  let latestDate: Date | null = null;

  safeLogs.forEach((log) => {
    const d = new Date(log.serviceDate);
    if (!earliestDate || d < earliestDate) earliestDate = d;
    if (!latestDate || d > latestDate) latestDate = d;

    const sCount = Number(log.serviceCount) || 1;
    const cCount = Number(log.completedCount) || sCount;

    totalServiceCount += sCount;
    totalCompletedCount += cCount;

    const bTotal = log.totalBudget
      ? Number(log.totalBudget)
      : log.budgetPerUnit
      ? Number(log.budgetPerUnit) * sCount
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
      id="appliance-print-a4"
      className="print-landscape-only hidden print:block text-black bg-white"
      style={{ fontFamily: 'Sarabun, sans-serif' }}
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @page {
              size: A4 landscape !important;
              margin: 6mm 10mm !important;
            }
          `,
        }}
      />
      <div className="w-[280mm] max-w-[280mm] mx-auto p-4 text-[12px] leading-relaxed">
        
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
              <span className="font-bold text-red-600 ml-6">
                ล้างทำความสะอาด – ตรวจเช็ค – ซ่อม-เปลี่ยนอะไหล่ เครื่องใช้ไฟฟ้า /อุปกรณ์วิชาชีพ
              </span>
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
              <th className="border border-black py-2 px-2 w-[31%] text-center">รายละเอียดการดำเนินงาน</th>
              <th className="border border-black py-2 px-1 w-[14%]">ประเภทเครื่องใช้ไฟฟ้า</th>
              <th className="border border-black py-2 px-1 w-[10%]">จำนวนที่<br/>ให้บริการ</th>
              <th className="border border-black py-2 px-1 w-[10%]">จำนวนที่ซ่อม<br/>สำเร็จ</th>
              <th className="border border-black py-2 px-1 w-[9%]">งบประมาณในการ<br/>ดำเนินงาน/ชิ้น</th>
              <th className="border border-black py-2 px-1 w-[9%]">งบประมาณทั้งสิ้น<br/>(บาท)</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="border border-black py-8 text-center text-slate-500">
                  - ไม่พบข้อมูลรายการสถิติการซ่อมและบริการเครื่องใช้ไฟฟ้า / อุปกรณ์วิชาชีพ -
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

                const sCount = Number(log.serviceCount) || 1;
                const cCount = Number(log.completedCount) || sCount;
                const bPerUnit = log.budgetPerUnit ? Number(log.budgetPerUnit) : null;
                const bTotal = log.totalBudget
                  ? Number(log.totalBudget)
                  : bPerUnit
                  ? bPerUnit * sCount
                  : null;

                return (
                  <tr key={log.id || index} className="border-b border-black text-center align-middle">
                    <td className="border border-black py-1.5 px-1 font-mono">
                      {index + 1}
                    </td>
                    <td className="border border-black py-1.5 px-1 whitespace-nowrap">
                      {thaiDateShort}
                    </td>
                    <td className="border border-black py-1.5 px-2 text-left leading-snug">
                      <div className="font-semibold text-slate-900">
                        {log.center?.name ? `ศูนย์: ${log.center.name}` : ''}
                        {log.targetLocation ? ` | จุดบริการ: ${log.targetLocation}` : ''}
                      </div>
                      <div className="text-[11px] text-slate-800 mt-0.5">
                        <span className="font-bold text-slate-900">งานที่ทำ:</span> {log.serviceDetails}
                      </div>
                      {log.notes && <div className="text-[9px] text-slate-500 mt-0.5">หมายเหตุ: {log.notes}</div>}
                    </td>
                    <td className="border border-black py-1.5 px-1 font-medium text-slate-800">
                      {log.applianceType || 'เครื่องใช้ไฟฟ้าทั่วไป'}
                    </td>
                    <td className="border border-black py-1.5 px-1 font-mono font-semibold text-blue-800">
                      {sCount.toLocaleString()}
                    </td>
                    <td className="border border-black py-1.5 px-1 font-mono font-semibold text-emerald-800">
                      {cCount.toLocaleString()}
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
              <td colSpan={4} className="border border-black py-2 px-2 text-right">
                รวมทั้งสิ้น ({logs.length} รายการ):
              </td>
              <td className="border border-black py-2 px-1 font-mono text-blue-800 font-bold">
                {totalServiceCount.toLocaleString()}
              </td>
              <td className="border border-black py-2 px-1 font-mono text-emerald-800 font-bold">
                {totalCompletedCount.toLocaleString()}
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
