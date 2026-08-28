'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  Clock,
  Wrench,
  ShieldCheck,
  PackageCheck,
  Building2,
  Phone,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  QrCode,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { repairOrderApi, type RepairOrder } from '@/lib/api';
import { assetUrl, maskNationalId } from '@/lib/utils';

const STATUS_STEPS = [
  { key: 'PENDING', label: 'รับแจ้งซ่อม', desc: 'ลงทะเบียนเข้าสู่ระบบ', icon: Clock },
  { key: 'DIAGNOSING', label: 'กำลังตรวจเช็ค', desc: 'ช่างกำลังตรวจสอบหาสาเหตุ', icon: Search },
  { key: 'REPAIRING', label: 'กำลังดำเนินการซ่อม', desc: 'กำลังดำเนินการซ่อมแซม/เปลี่ยนอะไหล่', icon: Wrench },
  { key: 'COMPLETED', label: 'ซ่อมเสร็จเรียบร้อย', desc: 'ผ่านการทดสอบ พร้อมส่งมอบ', icon: CheckCircle2 },
  { key: 'CLOSED', label: 'ส่งมอบเครื่องแล้ว', desc: 'เจ้าของรับอุปกรณ์เรียบร้อย', icon: PackageCheck },
];

function getStatusIndex(status: string): number {
  switch (status) {
    case 'PENDING':
      return 0;
    case 'DIAGNOSING':
      return 1;
    case 'WAITING_PARTS':
    case 'REPAIRING':
    case 'QC_PENDING':
      return 2;
    case 'COMPLETED':
      return 3;
    case 'CLOSED':
      return 4;
    default:
      return 0;
  }
}

function TrackingContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || searchParams.get('token') || '';

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<RepairOrder | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOrder = useCallback(async (searchKey: string) => {
    if (!searchKey || !searchKey.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    const clean = searchKey.trim();

    try {
      // 1. Try getByQrToken
      try {
        const qrRes = await repairOrderApi.getByQrToken(clean);
        if (qrRes.data && qrRes.data.id) {
          setOrder(qrRes.data);
          return;
        }
      } catch {}

      // 2. Try getByQueueNumber
      try {
        const queueRes = await repairOrderApi.getByQueueNumber(clean.toUpperCase());
        if (queueRes.data && queueRes.data.id) {
          setOrder(queueRes.data);
          return;
        }
      } catch {}

      // 3. Try track query (phone, queue, name)
      const trackRes = await repairOrderApi.track(clean);
      const list = Array.isArray(trackRes.data) ? trackRes.data : [];
      if (list.length > 0) {
        setOrder(list[0]);
        return;
      }

      setErrorMsg(`ไม่พบข้อมูลงานซ่อมสำหรับคำค้นหา "${clean}" กรุณาตรวจสอบหมายเลขคิวอีกครั้ง`);
      setOrder(null);
    } catch (err: any) {
      setErrorMsg('เกิดข้อผิดพลาดในการค้นหาข้อมูล กรุณาลองใหม่อีกครั้ง');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      fetchOrder(initialQuery);
    }
  }, [initialQuery, fetchOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrder(query);
  };

  const currentIndex = order ? getStatusIndex(order.status) : -1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-orange-50/30 font-sans pb-16">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img
              src={assetUrl('/logo.png')}
              alt="FixIt Center Logo"
              className="h-10 w-auto object-contain"
            />
            <div>
              <span className="font-extrabold text-brand-navy text-base block leading-tight">
                ศูนย์ FixIt Center
              </span>
              <span className="text-[11px] text-brand-orange font-bold">
                วิทยาลัยสารพัดช่างน่าน
              </span>
            </div>
          </Link>

          <Link href="/login">
            <Button variant="outline" size="sm" className="text-xs">
              สำหรับเจ้าหน้าที่
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero / Search Section */}
      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        <div className="text-center space-y-2">
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 px-3 py-1 text-xs">
            🔍 ติดตามสถานะงานซ่อมแบบเรียลไทม์
          </Badge>
          <h1 className="text-2xl font-black text-slate-900">
            ตรวจสอบสถานะงานซ่อมอุปกรณ์
          </h1>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            กรอกหมายเลขคิว (เช่น A-001, E-001, X-001) หรือเบอร์โทรศัพท์ที่ลงทะเบียนไว้
          </p>
        </div>

        {/* Search Input Box */}
        <Card className="border shadow-md bg-white">
          <CardContent className="p-4">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="พิมพ์หมายเลขคิว หรือเบอร์โทรศัพท์..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-11 h-12 text-base font-medium rounded-xl border-slate-300 focus:border-brand-orange"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="h-12 px-6 bg-brand-orange hover:bg-orange-600 text-white font-bold rounded-xl shadow-sm"
              >
                {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Error message */}
        {errorMsg && (
          <Card className="border-red-200 bg-red-50 text-red-800 p-4 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <p>{errorMsg}</p>
          </Card>
        )}

        {/* Result Order Details */}
        {order && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Top Order Card */}
            <Card className="border-2 border-orange-200 bg-white shadow-lg rounded-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-brand-navy p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-orange-300 font-semibold">หมายเลขคิวงานซ่อม</span>
                  <h2 className="text-3xl sm:text-4xl font-black tracking-tight font-mono text-white mt-0.5">
                    {order.queueNumber}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-orange-400" />
                    <span>{order.center?.name || 'ศูนย์บริการ Fix It Center น่าน'}</span>
                  </p>
                </div>

                <div className="sm:text-right">
                  <span className="text-xs text-slate-300 block">สถานะปัจจุบัน</span>
                  <Badge className="mt-1 px-3 py-1 text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-500 shadow">
                    {order.status === 'PENDING' && '⏳ รอรับคิวซ่อม'}
                    {order.status === 'DIAGNOSING' && '🔍 กำลังตรวจเช็คหาสาเหตุ'}
                    {order.status === 'WAITING_PARTS' && '📦 รออะไหล่'}
                    {order.status === 'REPAIRING' && '🔧 กำลังดำเนินการซ่อม'}
                    {order.status === 'QC_PENDING' && '🛡️ รอตรวจสอบคุณภาพ (QC)'}
                    {order.status === 'COMPLETED' && '✓ ซ่อมเสร็จแล้ว พร้อมส่งมอบ'}
                    {order.status === 'CLOSED' && '🎉 ส่งมอบเครื่องเรียบร้อยแล้ว'}
                  </Badge>
                </div>
              </div>

              {/* Progress Timeline */}
              <CardContent className="p-5 sm:p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-orange" />
                    <span>ขั้นตอนการดำเนินงาน (Service Timeline)</span>
                  </h3>

                  <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200 space-y-6 my-2">
                    {STATUS_STEPS.map((step, idx) => {
                      const isCompleted = currentIndex > idx;
                      const isCurrent = currentIndex === idx;
                      const StepIcon = step.icon;

                      return (
                        <div key={step.key} className="relative group">
                          {/* Dot / Icon */}
                          <div
                            className={`absolute -left-[31px] sm:-left-[39px] top-0 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center border-2 transition-all ${
                              isCompleted
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : isCurrent
                                ? 'bg-brand-orange border-brand-orange text-white ring-4 ring-orange-100 animate-bounce-short'
                                : 'bg-white border-slate-300 text-slate-400'
                            }`}
                          >
                            {isCompleted ? (
                              <Check className="h-4 w-4 stroke-[3]" />
                            ) : (
                              <StepIcon className="h-3.5 w-3.5" />
                            )}
                          </div>

                          {/* Content */}
                          <div>
                            <div className="flex items-center gap-2">
                              <h4
                                className={`text-sm font-bold ${
                                  isCurrent
                                    ? 'text-brand-orange'
                                    : isCompleted
                                    ? 'text-slate-900'
                                    : 'text-slate-400'
                                }`}
                              >
                                {step.label}
                              </h4>
                              {isCurrent && (
                                <Badge className="bg-orange-100 text-orange-800 text-[10px] px-2 py-0.5">
                                  ขั้นตอนปัจจุบัน
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Device & Problem Details */}
                <div className="border-t pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 p-3.5 rounded-xl space-y-1.5 border">
                    <p className="text-slate-500 font-semibold">ข้อมูลอุปกรณ์ / ยานพาหนะ:</p>
                    <p className="text-slate-900 font-bold text-sm">
                      {order.deviceCategory || 'อุปกรณ์'} {order.deviceBrand ? `(${order.deviceBrand})` : ''}
                    </p>
                    {order.deviceModel && (
                      <p className="text-slate-600">รุ่น: <span className="font-mono">{order.deviceModel}</span></p>
                    )}
                    <p className="text-slate-600 mt-1">
                      <span className="font-semibold text-slate-700">อาการเสีย/งานที่แจ้ง:</span>{' '}
                      {order.problemDesc || '-'}
                    </p>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl space-y-1.5 border">
                    <p className="text-slate-500 font-semibold">ข้อมูลการรับบริการ:</p>
                    <p className="text-slate-700">
                      ผู้แจ้ง: <span className="font-bold text-slate-900">{order.customer?.firstName} {order.customer?.lastName}</span>
                    </p>
                    <p className="text-slate-600">
                      วันที่ลงทะเบียน:{' '}
                      <span className="font-medium">
                        {new Date(order.registeredAt || order.createdAt).toLocaleDateString('th-TH', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </p>
                    {order.center?.phone && (
                      <p className="text-slate-600 flex items-center gap-1 mt-1">
                        <Phone className="h-3.5 w-3.5 text-slate-500" />
                        <span>ติดต่อศูนย์: {order.center.phone}</span>
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">กำลังโหลด...</div>}>
      <TrackingContent />
    </Suspense>
  );
}
