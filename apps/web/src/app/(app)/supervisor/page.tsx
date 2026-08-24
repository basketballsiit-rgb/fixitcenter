'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, DollarSign, CheckCircle2, AlertCircle, ShieldCheck, RefreshCw, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { QRScanner } from '@/components/qr-scanner/qr-scanner';
import { SignaturePad } from '@/components/signature-pad/signature-pad';
import { repairOrderApi } from '@/lib/api';
import { formatPhone, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui/use-toast';

const QC_CHECKLIST = [
  'ตรวจสอบความปลอดภัยของสายไฟและปลั๊กไฟ',
  'ตรวจสอบการต่อสายดินและความต่อเนื่องของกราวด์',
  'ตรวจสอบฉนวนกันไฟฟ้าและป้องกันไฟฟ้ารั่ว',
  'ทดสอบการทำงานของวงจรและระบบควบคุม',
  'ตรวจสอบชิ้นส่วนและอะไหล่ที่เปลี่ยนใหม่',
  'ทดสอบการทำงานในสภาวะโหลดปกติ',
  'ตรวจสอบความสะอาดและความเรียบร้อยของตัวเครื่อง',
  'ตรวจสอบเอกสารและบันทึกประวัติการซ่อมครบถ้วน',
];

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'รอดำเนินการ', color: 'bg-slate-100 text-slate-800' },
  DIAGNOSING: { label: 'กำลังวินิจฉัย', color: 'bg-blue-100 text-blue-800' },
  WAITING_PARTS: { label: 'รออะไหล่', color: 'bg-amber-100 text-amber-800' },
  REPAIRING: { label: 'กำลังซ่อม', color: 'bg-orange-100 text-orange-800' },
  QC_PENDING: { label: 'รอตรวจคุณภาพ (QC)', color: 'bg-purple-100 text-purple-800' },
  COMPLETED: { label: 'ซ่อมเสร็จสิ้น (ผ่าน QC)', color: 'bg-emerald-100 text-emerald-800' },
  CLOSED: { label: 'ส่งมอบเครื่องคืนแล้ว (ปิดงาน)', color: 'bg-teal-100 text-teal-800' },
};

export default function SupervisorPage() {
  const router = useRouter();
  React.useEffect(() => {
    router.replace('/workspace');
  }, [router]);
  const { toast } = useToast();
  const [order, setOrder] = useState<any | null>(null);
  const [searchQueue, setSearchQueue] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [checklist, setChecklist] = useState<Record<string, boolean>>(
    Object.fromEntries(QC_CHECKLIST.map((item) => [item, false]))
  );
  const [partsCost, setPartsCost] = useState<number>(0);
  const [marketRepairCost, setMarketRepairCost] = useState<number>(0);
  const [supervisorSignature, setSupervisorSignature] = useState('');

  const economicValueSaved = Math.max(0, marketRepairCost - partsCost);

  const fetchOrder = useCallback(async (queryInput: string) => {
    if (!queryInput || !queryInput.trim()) return;
    setLoading(true);
    const clean = queryInput.trim().toUpperCase();
    try {
      const res = await repairOrderApi.getByQueueNumber(clean);
      const data = res.data;
      if (data) {
        setOrder(data);
        const totalP = (data.items || data.parts || []).reduce(
          (s: number, p: any) => s + (Number(p.quantity) || 1) * (Number(p.unitCost || p.cost) || 0),
          0
        );
        setPartsCost(totalP || Number(data.partsCost) || 0);
        setMarketRepairCost(Number(data.marketRepairCost) || 0);
        toast({ title: `✓ พบข้อมูลคิว ${data.queueNumber}` });
        return;
      }
    } catch {
      try {
        const trackRes = await repairOrderApi.track(clean);
        const list = Array.isArray(trackRes.data) ? trackRes.data : [];
        if (list.length > 0) {
          const first = list[0];
          setOrder(first);
          const totalP = (first.items || first.parts || []).reduce(
            (s: number, p: any) => s + (Number(p.quantity) || 1) * (Number(p.unitCost || p.cost) || 0),
            0
          );
          setPartsCost(totalP || Number(first.partsCost) || 0);
          setMarketRepairCost(Number(first.marketRepairCost) || 0);
          toast({ title: `✓ พบข้อมูลคิว ${first.queueNumber}` });
          return;
        }
      } catch (err2) {
        console.error('Track error:', err2);
      }
      toast({ title: 'ไม่พบหมายเลขคิว', description: clean, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleQRScan = (token: string) => {
    if (!token) return;
    try {
      const parsed = JSON.parse(token);
      if (parsed.queueNumber) {
        setSearchQueue(parsed.queueNumber);
        fetchOrder(parsed.queueNumber);
        return;
      }
    } catch {}
    setSearchQueue(token);
    fetchOrder(token);
  };

  const toggleCheck = (item: string) => {
    setChecklist((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const allChecked = Object.values(checklist).every(Boolean);
  const checkedCount = Object.values(checklist).filter(Boolean).length;

  const handleApprove = async () => {
    if (!order?.id) return;
    if (!allChecked) {
      toast({ title: 'กรุณาตรวจสอบรายการ QC ให้ครบทุกข้อก่อนอนุมัติ', variant: 'destructive' });
      return;
    }
    if (!supervisorSignature) {
      toast({ title: 'กรุณาลงลายมือชื่อครูผู้ควบคุม QC', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      await repairOrderApi.saveChecklist(order.id, {
        criteria: QC_CHECKLIST.map((item, idx) => ({
          id: `qc-${idx + 1}`,
          label: item,
          passed: !!checklist[item],
        })),
        overallPassed: true,
        notes: 'ผ่านการตรวจสอบความปลอดภัยและมาตรฐานงานซ่อม',
      });

      await repairOrderApi.saveSignature(order.id, {
        type: 'SUPERVISOR',
        dataBase64: supervisorSignature,
        signerName: 'ครูผู้ควบคุม QC',
      });

      if (partsCost > 0 || marketRepairCost > 0) {
        await repairOrderApi.updateEconomicValue(order.id, {
          partsCost,
          marketRepairCost,
        });
      }

      const res = await repairOrderApi.updateStatus(order.id, 'COMPLETED');
      toast({ title: '✓ อนุมัติ QC สำเร็จ', description: `คิว ${order.queueNumber} สถานะเปลี่ยนเป็น เสร็จสิ้น (COMPLETED)` });
      setOrder(res.data);
    } catch (err: any) {
      console.error('QC Approval failed:', err);
      toast({ title: 'ไม่สามารถอนุมัติได้', description: err?.response?.data?.message || 'เกิดข้อผิดพลาด', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const statusInfo = order?.status ? STATUS_LABELS[order.status] : null;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-purple-600" />
          หัวหน้าช่าง / ครูผู้ควบคุม QC (Supervisor Inspection)
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          ตรวจสอบความปลอดภัยและมาตรฐานงานซ่อม คำนวณมูลค่าทางเศรษฐกิจ และอนุมัติรับรองงาน
        </p>
      </div>

      {/* Search */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Search className="w-4 h-4 text-purple-600" />
            ค้นหาคิวงานซ่อมเพื่อตรวจ QC
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="หมายเลขคิว เช่น E-001, A-001, X-001"
              value={searchQueue}
              onChange={(e) => setSearchQueue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchOrder(searchQueue);
              }}
              className="text-sm uppercase font-mono tracking-wider"
            />
            <Button onClick={() => fetchOrder(searchQueue)} disabled={loading} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold">
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              ค้นหา
            </Button>
          </div>
          <Separator />
          <div>
            <Label className="text-xs font-semibold text-slate-700 block mb-2">
              📷 สแกน QR Code จากป้ายแท็กเพื่อตรวจ QC:
            </Label>
            <QRScanner onScan={handleQRScan} />
          </div>
        </CardContent>
      </Card>

      {/* Order Details */}
      {order && (
        <div className="space-y-4 animate-in fade-in-50 duration-300">
          <Card className="border-2 border-purple-300 shadow-md bg-white">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50/50 border-b border-purple-100 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-3xl font-black text-purple-900 font-mono tracking-wider">{order.queueNumber}</CardTitle>
                  <p className="text-xs text-slate-600 mt-1">
                    ผู้รับบริการ: <strong className="text-slate-900">{order.customer?.firstName} {order.customer?.lastName}</strong> | 📞 {formatPhone(order.customer?.phone)}
                  </p>
                </div>
                <Badge className={`text-xs px-3 py-1 font-bold ${statusInfo?.color || 'bg-slate-100'}`}>
                  {statusInfo?.label || order.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-4 text-xs sm:text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-lg border">
                <div><span className="text-slate-500 block">อุปกรณ์:</span> <strong className="text-slate-800">{order.deviceCategory || order.tradeCode}</strong></div>
                <div><span className="text-slate-500 block">ยี่ห้อ:</span> <strong className="text-slate-800">{order.deviceBrand || '-'}</strong></div>
                <div><span className="text-slate-500 block">รุ่น:</span> <strong className="text-slate-800">{order.deviceModel || '-'}</strong></div>
                <div><span className="text-slate-500 block">Serial:</span> <span className="font-mono text-slate-700">{order.serialNumber || '-'}</span></div>
              </div>
              <div className="bg-red-50/60 border border-red-200 rounded-lg p-3">
                <span className="text-xs font-bold text-red-900 block mb-0.5">อาการเสียที่ได้รับแจ้ง:</span>
                <p className="text-slate-800">{order.problemDesc || 'ไม่ระบุ'}</p>
              </div>
            </CardContent>
          </Card>

          {/* QC Checklist */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900">เกณฑ์ตรวจสอบมาตรฐานคุณภาพและความปลอดภัย (8 ข้อ)</CardTitle>
              <Badge className={`text-xs ${allChecked ? 'bg-emerald-600 text-white' : 'bg-amber-100 text-amber-900'}`}>
                {checkedCount}/{QC_CHECKLIST.length} รายการ
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {QC_CHECKLIST.map((item, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleCheck(item)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl border-2 text-left transition-all ${
                      checklist[item]
                        ? 'border-emerald-400 bg-emerald-50/70 text-emerald-900'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 ${
                        checklist[item] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-400'
                      }`}
                    >
                      {checklist[item] && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <span className="text-xs sm:text-sm font-medium">
                      {i + 1}. {item}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Economic Value Calculator */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-600" />
                คำนวณมูลค่าทางเศรษฐกิจที่ประหยัดได้ (Economic Value Saved)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">ต้นทุนค่าอะไหล่จริง (บาท)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={partsCost}
                    onChange={(e) => setPartsCost(Number(e.target.value))}
                    className="text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">ราคาค่าซ่อมตามท้องตลาด (บาท)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="เช่น 500"
                    value={marketRepairCost}
                    onChange={(e) => setMarketRepairCost(Number(e.target.value))}
                    className="text-sm font-mono"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="h-5 w-5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-800">มูลค่าที่ประหยัดได้ให้ประชาชน:</span>
                </div>
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {formatCurrency(economicValueSaved)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Signatures */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">ลายมือชื่อครูผู้ควบคุม QC</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-purple-300 rounded-xl p-2 bg-white">
                <SignaturePad
                  label="เซ็นชื่อครูผู้ควบคุม QC ในกรอบนี้"
                  onSave={(dataUrl) => setSupervisorSignature(dataUrl)}
                  height={150}
                />
              </div>
            </CardContent>
          </Card>

          {/* Approve Button */}
          {order.status !== 'COMPLETED' && order.status !== 'CLOSED' && (
            <Button
              onClick={handleApprove}
              disabled={submitting || !allChecked || !supervisorSignature}
              className="w-full h-14 text-base font-bold gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg rounded-xl"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  กำลังบันทึกอนุมัติ QC...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5" />
                  อนุมัติผ่าน QC และปรับเป็นเสร็จสิ้น (COMPLETED)
                </>
              )}
            </Button>
          )}

          {(order.status === 'COMPLETED' || order.status === 'CLOSED') && (
            <div className="flex items-center gap-3 p-4 bg-emerald-50 border-2 border-emerald-400 rounded-xl">
              <CheckCircle2 className="h-7 w-7 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-emerald-800 text-sm">งานซ่อมผ่านการอนุมัติ QC เรียบร้อยแล้ว</p>
                <p className="text-xs text-emerald-600">สถานะปัจจุบัน: {statusInfo?.label || order.status}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
