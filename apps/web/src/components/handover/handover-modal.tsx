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
import { Badge } from '@/components/ui/badge';
import { SignaturePad } from '@/components/signature-pad/signature-pad';
import {
  CheckCircle2,
  PackageCheck,
  User,
  Phone,
  Wrench,
  Sparkles,
  AlertCircle,
  Building2,
  Calendar,
} from 'lucide-react';
import { repairOrderApi, type RepairOrder } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { formatPhone } from '@/lib/utils';

export interface HandoverModalProps {
  orderId?: string;
  queueNumber?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedOrder: RepairOrder) => void;
}

export function HandoverModal({
  orderId,
  queueNumber,
  isOpen,
  onClose,
  onSuccess,
}: HandoverModalProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [order, setOrder] = useState<RepairOrder | null>(null);

  // Form states
  const [customerSignature, setCustomerSignature] = useState('');
  const [handoverSignature, setHandoverSignature] = useState('');
  const [handoverBy, setHandoverBy] = useState('');
  const [signerName, setSignerName] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('ทดสอบเครื่องและตรวจสอบความเรียบร้อยแล้ว');

  useEffect(() => {
    if (!isOpen) return;

    // Set default staff name
    setHandoverBy(user?.fullName || user?.name || user?.username || 'เจ้าหน้าที่ผู้ส่งมอบ');

    const fetchDetails = async () => {
      setLoading(true);
      try {
        let res;
        if (orderId) {
          res = await repairOrderApi.getById(orderId);
        } else if (queueNumber) {
          res = await repairOrderApi.getByQueueNumber(queueNumber);
        }
        if (res?.data) {
          setOrder(res.data);
          const cust = res.data.customer;
          const defaultName = cust ? `${cust.firstName || ''} ${cust.lastName || ''}`.trim() : '';
          setSignerName(defaultName);
        }
      } catch (err) {
        console.error('Failed to load order details for handover:', err);
        toast({ title: 'ไม่สามารถโหลดข้อมูลงานซ่อมได้', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [isOpen, orderId, queueNumber, user, toast]);

  const handleSubmitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = order?.id || orderId;
    if (!targetId) return;

    if (!customerSignature) {
      toast({
        title: 'กรุณาให้ผู้รับมอบลงลายมือชื่อ',
        description: 'แตะที่ช่องลายเซ็นเพื่อเซ็นชื่อรับมอบอุปกรณ์',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await repairOrderApi.handover(targetId, {
        customerSignature,
        handoverSignature: handoverSignature || undefined,
        handoverBy: handoverBy.trim() || user?.fullName || 'เจ้าหน้าที่ผู้ส่งมอบ',
        handoverNotes: handoverNotes.trim() || undefined,
      });

      toast({
        title: `✓ ส่งมอบอุปกรณ์คิว ${order?.queueNumber || ''} สำเร็จ`,
        description: 'บันทึกลายเซ็นและปิดงานซ่อมเสร็จสมบูรณ์',
      });

      onSuccess?.(res.data);
      onClose();
    } catch (err: any) {
      toast({
        title: 'เกิดข้อผิดพลาดในการบันทึกการส่งมอบ',
        description: err?.response?.data?.message || 'กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !saving && !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
        <DialogHeader className="border-b pb-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <PackageCheck className="h-6 w-6 text-emerald-600" />
            <DialogTitle className="text-lg font-bold text-slate-900">
              บันทึกและเซ็นรับมอบเครื่อง (Handover)
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            บันทึกลายเซ็นผู้รับมอบอุปกรณ์และปิดงานซ่อมเสร็จสมบูรณ์
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            กำลังโหลดข้อมูลงานซ่อม...
          </div>
        ) : !order ? (
          <div className="py-8 text-center text-red-500 text-sm">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-400" />
            ไม่พบข้อมูลงานซ่อม
          </div>
        ) : (
          <form onSubmit={handleSubmitHandover} className="space-y-4 pt-1">
            {/* Order Brief Summary Card */}
            <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 border border-emerald-200 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-semibold">หมายเลขคิว:</span>
                  <Badge className="text-sm font-black font-mono bg-emerald-600 text-white px-2 py-0.5 shadow-xs">
                    {order.queueNumber}
                  </Badge>
                </div>
                <Badge variant="outline" className="bg-white text-emerald-800 border-emerald-300 text-[11px] font-bold">
                  {order.status === 'COMPLETED' ? '✓ ซ่อมเสร็จสมบูรณ์' : order.status}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-emerald-100">
                <div>
                  <span className="text-slate-500 font-medium">อุปกรณ์:</span>{' '}
                  <strong className="text-slate-900">{order.deviceCategory} {order.deviceBrand || ''}</strong>
                  {order.deviceModel && <span className="text-slate-600 font-mono"> ({order.deviceModel})</span>}
                </div>
                <div>
                  <span className="text-slate-500 font-medium">ผู้รับบริการ:</span>{' '}
                  <strong className="text-slate-900">{order.customer?.firstName} {order.customer?.lastName}</strong>
                </div>
                {order.customer?.phone && (
                  <div className="col-span-2 text-slate-600 font-mono">
                    📞 เบอร์โทร: <strong>{formatPhone(order.customer.phone)}</strong>
                  </div>
                )}
                {order.problemDesc && (
                  <div className="col-span-2 text-slate-600">
                    <span className="text-slate-500">อาการ/งานที่ทำ:</span> {order.problemDesc}
                  </div>
                )}
              </div>
            </div>

            {/* Customer / Receiver Signature Pad */}
            <div className="space-y-2 bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <User className="h-4 w-4 text-emerald-600" />
                  <span>ลายมือชื่อผู้รับมอบอุปกรณ์ (ลูกค้า/ตัวแทน) *</span>
                </Label>
              </div>

              <SignaturePad
                label="ลงลายมือชื่อบนหน้าจอ (ใช้นิ้วหรือปากกาสัมผัส)"
                height={150}
                onSave={(sig) => setCustomerSignature(sig)}
              />

              <div className="pt-2">
                <Label className="text-[11px] text-slate-600">ชื่อ-นามสกุล ผู้รับมอบ (พิมพ์ระบุ)</Label>
                <Input
                  type="text"
                  placeholder="ชื่อ-นามสกุล ผู้รับมอบ"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>

            {/* Staff / Handover Person Information */}
            <div className="space-y-2 bg-white border border-slate-200 p-3 rounded-xl shadow-xs">
              <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-blue-600" />
                <span>เจ้าหน้าที่ผู้ส่งมอบงาน</span>
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] text-slate-600">ชื่อเจ้าหน้าที่ผู้ส่งมอบ</Label>
                  <Input
                    type="text"
                    placeholder="ชื่อผู้ส่งมอบ"
                    value={handoverBy}
                    onChange={(e) => setHandoverBy(e.target.value)}
                    className="h-9 text-xs mt-1 font-medium"
                    required
                  />
                </div>
                <div>
                  <Label className="text-[11px] text-slate-600">หมายเหตุการส่งมอบ</Label>
                  <Input
                    type="text"
                    placeholder="เช่น ทดสอบใช้งานได้ปกติ, อุปกรณ์ครบถ้วน"
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    className="h-9 text-xs mt-1"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-3 border-t flex gap-2 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={saving}
                className="w-full sm:w-auto text-xs"
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                disabled={saving || !customerSignature}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" />
                {saving ? 'กำลังบันทึก...' : 'บันทึกและส่งมอบเครื่องเสร็จสมบูรณ์'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
