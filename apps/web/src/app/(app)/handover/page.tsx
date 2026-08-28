'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  PackageCheck,
  CheckCircle2,
  User,
  Phone,
  Wrench,
  Sparkles,
  AlertCircle,
  Building2,
  Calendar,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SignaturePad } from '@/components/signature-pad/signature-pad';
import { repairOrderApi, type RepairOrder } from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { formatPhone } from '@/lib/utils';
import Link from 'next/link';

function HandoverPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuthStore();

  const id = searchParams.get('id') || '';
  const q = searchParams.get('q') || '';

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
    setHandoverBy(user?.fullName || user?.name || user?.username || 'เจ้าหน้าที่ผู้ส่งมอบ');

    if (!id && !q) return;

    const fetchDetails = async () => {
      setLoading(true);
      try {
        let res;
        if (id) {
          res = await repairOrderApi.getById(id);
        } else if (q) {
          res = await repairOrderApi.getByQueueNumber(q);
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
  }, [id, q, user, toast]);

  const handleSubmitHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = order?.id || id;
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
      await repairOrderApi.handover(targetId, {
        customerSignature,
        handoverSignature: handoverSignature || undefined,
        handoverBy: handoverBy.trim() || user?.fullName || 'เจ้าหน้าที่ผู้ส่งมอบ',
        handoverNotes: handoverNotes.trim() || undefined,
      });

      toast({
        title: `✓ ส่งมอบอุปกรณ์คิว ${order?.queueNumber || ''} สำเร็จ`,
        description: 'บันทึกลายเซ็นและปิดงานซ่อมเสร็จสมบูรณ์',
      });

      router.push('/dashboard');
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
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-slate-600">
            <ArrowLeft className="h-4 w-4" />
            <span>กลับ</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-emerald-600" />
            <span>เซ็นรับมอบและส่งงานซ่อม (Handover)</span>
          </h1>
          <p className="text-xs text-slate-500">บันทึกลายเซ็นผู้รับมอบอุปกรณ์และปิดงานซ่อมเสร็จสมบูรณ์</p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          กำลังโหลดข้อมูลงานซ่อม...
        </div>
      ) : !order ? (
        <Card className="p-8 text-center border-red-200 bg-red-50 text-red-700">
          <AlertCircle className="h-10 w-10 mx-auto mb-2 text-red-500" />
          <h3 className="font-bold text-base">ไม่พบข้อมูลงานซ่อมที่ต้องการส่งมอบ</h3>
          <p className="text-xs text-slate-600 mt-1">กรุณาตรวจสอบหมายเลขคิว หรือเปิดผ่านเมนูกระดิ่งแจ้งเตือน</p>
        </Card>
      ) : (
        <form onSubmit={handleSubmitHandover} className="space-y-5">
          {/* Order Info Card */}
          <Card className="border-2 border-emerald-200 bg-white shadow-sm overflow-hidden">
            <CardHeader className="bg-emerald-50/70 border-b py-3 px-4 flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">หมายเลขคิว:</span>
                <Badge className="text-sm font-black font-mono bg-emerald-600 text-white px-2.5 py-0.5 shadow-xs">
                  {order.queueNumber}
                </Badge>
              </div>
              <Badge variant="outline" className="bg-white text-emerald-800 border-emerald-300 text-xs font-bold">
                {order.status === 'COMPLETED' ? '✓ ซ่อมเสร็จสมบูรณ์' : order.status}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                  <div className="col-span-2 text-slate-700 font-mono">
                    📞 เบอร์โทรศัพท์: <strong>{formatPhone(order.customer.phone)}</strong>
                  </div>
                )}
                {order.problemDesc && (
                  <div className="col-span-2 text-slate-600">
                    <span className="text-slate-500">อาการ/งานที่ทำ:</span> {order.problemDesc}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Customer Signature Pad */}
          <Card className="border shadow-sm p-4 bg-white space-y-3">
            <Label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <User className="h-4 w-4 text-emerald-600" />
              <span>ลายมือชื่อผู้รับมอบอุปกรณ์ (ลูกค้า/ตัวแทน) *</span>
            </Label>

            <SignaturePad
              label="ลงลายมือชื่อบนหน้าจอ (ใช้นิ้วหรือปากกาสัมผัส)"
              height={170}
              onSave={(sig) => setCustomerSignature(sig)}
            />

            <div className="pt-2">
              <Label className="text-xs text-slate-600">ชื่อ-นามสกุล ผู้รับมอบ (พิมพ์ระบุ)</Label>
              <Input
                type="text"
                placeholder="ชื่อ-นามสกุล ผู้รับมอบ"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="h-10 text-sm mt-1"
              />
            </div>
          </Card>

          {/* Staff Info */}
          <Card className="border shadow-sm p-4 bg-white space-y-3">
            <Label className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Wrench className="h-4 w-4 text-blue-600" />
              <span>เจ้าหน้าที่ผู้ส่งมอบงาน</span>
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-600">ชื่อเจ้าหน้าที่ผู้ส่งมอบ</Label>
                <Input
                  type="text"
                  placeholder="ชื่อผู้ส่งมอบ"
                  value={handoverBy}
                  onChange={(e) => setHandoverBy(e.target.value)}
                  className="h-10 text-sm mt-1 font-medium"
                  required
                />
              </div>
              <div>
                <Label className="text-xs text-slate-600">หมายเหตุการส่งมอบ</Label>
                <Input
                  type="text"
                  placeholder="เช่น ทดสอบใช้งานได้ปกติ, อุปกรณ์ครบถ้วน"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  className="h-10 text-sm mt-1"
                />
              </div>
            </div>
          </Card>

          <Button
            type="submit"
            disabled={saving || !customerSignature}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 text-base gap-2 shadow-md"
          >
            <CheckCircle2 className="h-5 w-5" />
            {saving ? 'กำลังบันทึก...' : 'บันทึกและส่งมอบเครื่องเสร็จสมบูรณ์'}
          </Button>
        </form>
      )}
    </div>
  );
}

export default function HandoverPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">กำลังโหลด...</div>}>
      <HandoverPageContent />
    </Suspense>
  );
}
