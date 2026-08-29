'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Settings,
  Car,
  Zap,
  Utensils,
  CheckCircle2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  getStandardRates,
  saveStandardRates,
  DEFAULT_STANDARD_RATES,
  type StandardRatesConfig,
} from '@/lib/settings';
import { useToast } from '@/components/ui/use-toast';

interface StandardRatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (rates: StandardRatesConfig) => void;
}

export function StandardRatesModal({
  isOpen,
  onClose,
  onSaved,
}: StandardRatesModalProps) {
  const { toast } = useToast();
  const [rates, setRates] = useState<StandardRatesConfig>(DEFAULT_STANDARD_RATES);

  useEffect(() => {
    if (isOpen) {
      setRates(getStandardRates());
    }
  }, [isOpen]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = saveStandardRates(rates);
    toast({
      title: '✓ บันทึกการตั้งค่าอัตรามาตรฐานสำเร็จ',
      description: 'ระบบจะนำอัตราใหม่ไปใช้ในการคำนวณงบประมาณและรายงานทันที',
    });
    onSaved?.(updated);
    onClose();
  };

  const handleReset = () => {
    setRates(DEFAULT_STANDARD_RATES);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2 text-slate-900">
            <Settings className="h-5 w-5 text-brand-orange" />
            <DialogTitle className="text-lg font-bold">
              ตั้งค่าอัตราค่าใช้จ่ายมาตรฐาน (Standard Budget Rates)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            กำหนดอัตราประมาณการค่าใช้จ่ายเฉลี่ยต่อชิ้น/คัน เพื่อนำไปคำนวณในรายงานอัตโนมัติ
          </DialogDescription>
          <div className="bg-amber-50/90 border border-amber-200 rounded-lg p-2.5 mt-2 flex items-center justify-between text-xs text-amber-900">
            <span>💡 สามารถกำหนดงบประมาณมาตรฐานแยกตามประเภทงาน/บริการได้ที่ระบบจัดการ</span>
            <a
              href="/fixitcenter/admin"
              className="bg-brand-orange text-white px-2.5 py-1 rounded text-[11px] font-bold hover:bg-brand-orange-dark whitespace-nowrap ml-2 shrink-0"
            >
              ไปที่ระบบจัดการ Admin →
            </a>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-1">
          {/* Section 1: ยานพาหนะ */}
          <Card className="p-3.5 border-blue-200 bg-blue-50/30 space-y-3">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs border-b border-blue-100 pb-1.5">
              <Car className="h-4 w-4 text-blue-600" />
              <span>อัตรามาตรฐาน: งานซ่อมและบริการยานพาหนะ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <Label className="text-[11px] text-slate-600">รถจักรยานยนต์ (บาท/คัน)</Label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={rates.motorcycleRate}
                  onChange={(e) => setRates({ ...rates, motorcycleRate: Number(e.target.value) })}
                  className="h-8 text-xs font-mono font-bold mt-1 bg-white"
                  required
                />
              </div>

              <div>
                <Label className="text-[11px] text-slate-600">รถยนต์ / กระบะ (บาท/คัน)</Label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={rates.carRate}
                  onChange={(e) => setRates({ ...rates, carRate: Number(e.target.value) })}
                  className="h-8 text-xs font-mono font-bold mt-1 bg-white"
                  required
                />
              </div>

              <div>
                <Label className="text-[11px] text-slate-600">เครื่องยนต์การเกษตร (บาท/เครื่อง)</Label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={rates.agriEngineRate}
                  onChange={(e) => setRates({ ...rates, agriEngineRate: Number(e.target.value) })}
                  className="h-8 text-xs font-mono font-bold mt-1 bg-white"
                  required
                />
              </div>

              <div>
                <Label className="text-[11px] text-slate-600">ยานพาหนะทั่วไป (บาท/คัน)</Label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={rates.vehicleDefaultRate}
                  onChange={(e) => setRates({ ...rates, vehicleDefaultRate: Number(e.target.value) })}
                  className="h-8 text-xs font-mono font-bold mt-1 bg-white"
                  required
                />
              </div>
            </div>
          </Card>

          {/* Section 2: เครื่องใช้ไฟฟ้าและอุปกรณ์วิชาชีพ */}
          <Card className="p-3.5 border-amber-200 bg-amber-50/30 space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-xs border-b border-amber-100 pb-1.5">
              <Zap className="h-4 w-4 text-amber-600" />
              <span>อัตรามาตรฐาน: เครื่องใช้ไฟฟ้าและอุปกรณ์วิชาชีพ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <Label className="text-[11px] text-slate-600">พัดลม / หม้อหุงข้าว / เตารีด (บาท/เครื่อง)</Label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={rates.fanCookerRate}
                  onChange={(e) => setRates({ ...rates, fanCookerRate: Number(e.target.value) })}
                  className="h-8 text-xs font-mono font-bold mt-1 bg-white"
                  required
                />
              </div>

              <div>
                <Label className="text-[11px] text-slate-600">เครื่องมือช่าง / ตู้เย็น / เครื่องซักผ้า (บาท/ชิ้น)</Label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={rates.vocationalToolRate}
                  onChange={(e) => setRates({ ...rates, vocationalToolRate: Number(e.target.value) })}
                  className="h-8 text-xs font-mono font-bold mt-1 bg-white"
                  required
                />
              </div>

              <div>
                <Label className="text-[11px] text-slate-600">เครื่องใช้ไฟฟ้าทั่วไป (บาท/เครื่อง)</Label>
                <Input
                  type="number"
                  min="0"
                  step="10"
                  value={rates.applianceDefaultRate}
                  onChange={(e) => setRates({ ...rates, applianceDefaultRate: Number(e.target.value) })}
                  className="h-8 text-xs font-mono font-bold mt-1 bg-white"
                  required
                />
              </div>
            </div>
          </Card>

          {/* Section 3: โรงครัวอาชีวะจิตอาสา */}
          <Card className="p-3.5 border-rose-200 bg-rose-50/30 space-y-3">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-xs border-b border-rose-100 pb-1.5">
              <Utensils className="h-4 w-4 text-rose-600" />
              <span>อัตรามาตรฐาน: กิจกรรมโรงครัวอาชีวะจิตอาสา</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <Label className="text-[11px] text-slate-600">ข้าวกล่อง (บาท/กล่อง)</Label>
                <Input
                  type="number"
                  min="0"
                  step="5"
                  value={rates.mealBoxRate}
                  onChange={(e) => setRates({ ...rates, mealBoxRate: Number(e.target.value) })}
                  className="h-8 text-xs font-mono font-bold mt-1 bg-white"
                  required
                />
              </div>

              <div>
                <Label className="text-[11px] text-slate-600">น้ำดื่ม (บาท/ขวด)</Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={rates.waterBottleRate}
                  onChange={(e) => setRates({ ...rates, waterBottleRate: Number(e.target.value) })}
                  className="h-8 text-xs font-mono font-bold mt-1 bg-white"
                  required
                />
              </div>

              <div>
                <Label className="text-[11px] text-slate-600">ถุงยังชีพ (บาท/ชุด)</Label>
                <Input
                  type="number"
                  min="0"
                  step="50"
                  value={rates.reliefKitRate}
                  onChange={(e) => setRates({ ...rates, reliefKitRate: Number(e.target.value) })}
                  className="h-8 text-xs font-mono font-bold mt-1 bg-white"
                  required
                />
              </div>
            </div>
          </Card>

          <DialogFooter className="pt-3 border-t flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="text-xs text-slate-600 hover:text-red-600 gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              คืนค่าเริ่มต้น
            </Button>

            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                ยกเลิก
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                บันทึกการตั้งค่า
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
