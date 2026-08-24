'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, MapPin, Phone, ArrowLeft, ClipboardList, Wrench,
  ShieldCheck, Monitor, CheckCircle2, Activity, TrendingUp,
  Clock, ArrowRight, RefreshCw, Users, MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { centerApi, dashboardApi, repairOrderApi, type Center, type DashboardStats, type RepairOrder } from '@/lib/api';
import { formatCurrency, formatDateTime, assetUrl } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'รอดำเนินการ',
  DIAGNOSING: 'กำลังวินิจฉัย',
  WAITING_PARTS: 'รออะไหล่',
  REPAIRING: 'กำลังซ่อม',
  QC_PENDING: 'รอตรวจ QC',
  COMPLETED: 'ซ่อมเสร็จสิ้น',
  CLOSED: 'ส่งมอบแล้ว',
  CANCELLED: 'ยกเลิก',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
  DIAGNOSING: 'bg-blue-100 text-blue-800 border-blue-200',
  WAITING_PARTS: 'bg-purple-100 text-purple-800 border-purple-200',
  REPAIRING: 'bg-orange-100 text-brand-orange border-orange-200',
  QC_PENDING: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  COMPLETED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-700 border-slate-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
};

export default function CenterDedicatedPage({ params }: { params: { id: string } }) {
  const centerId = params?.id;
  const { user } = useAuthStore();

  const [center, setCenter] = useState<Center | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<RepairOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCenterData = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes, oRes] = await Promise.all([
        centerApi.getById(centerId),
        dashboardApi.getStats(centerId),
        repairOrderApi.getAll({ centerId, limit: '10' } as any),
      ]);
      setCenter(cRes.data);
      setStats(sRes.data);
      setRecentOrders(Array.isArray(oRes.data) ? oRes.data : []);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [centerId]);

  useEffect(() => {
    if (centerId) {
      loadCenterData();
    }
  }, [centerId, loadCenterData]);

  const total = stats?.totalRepairs ?? 0;
  const completed = stats?.completedRepairs ?? stats?.completed ?? 0;
  const inProgress = stats?.inProgressRepairs ?? stats?.inProgress ?? 0;
  const savedValue = stats?.economicValueSaved ?? 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-brand-orange bg-slate-100 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition-colors border">
              <ArrowLeft className="h-4 w-4" />
              <span>ภาพรวมทุกศูนย์</span>
            </Link>
            <div className="h-6 w-px bg-slate-200" />
            <img
              src={assetUrl('/logo.png')}
              alt="Logo"
              width={40}
              height={40}
              style={{ maxHeight: '40px', width: 'auto' }}
              className="h-10 w-auto object-contain"
            />
            <div>
              <p className="font-extrabold text-sm text-brand-navy leading-tight">{center?.name || 'ศูนย์บริการ'}</p>
              <p className="text-[11px] text-brand-orange font-bold">ศูนย์ซ่อมสร้างเพื่อชุมชน (FixIt Center)</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadCenterData} className="text-xs gap-1">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              รีเฟรช
            </Button>
            <Link href={`/queue-board?centerId=${centerId}`}>
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-xs gap-1.5">
                <Monitor className="h-3.5 w-3.5 text-brand-orange" />
                เปิดกระดานคิว TV
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Center Hero Banner */}
      <section className="bg-gradient-to-br from-brand-navy-dark via-brand-navy to-[#123e70] text-white py-8 px-4 sm:px-6 lg:px-8 shadow-inner">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-brand-orange text-white font-mono text-sm px-3 py-0.5">
                  รหัสศูนย์: {center?.code || '...'}
                </Badge>
                {center?.isActive ? (
                  <Badge variant="outline" className="bg-emerald-500/20 text-emerald-200 border-emerald-400/40 text-xs">
                    เปิดให้บริการ
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-500/20 text-red-200 border-red-400/40 text-xs">
                    ปิดให้บริการ
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {center?.name || 'กำลังโหลด...'}
              </h1>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-200 pt-1">
                {center?.region && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-brand-orange" />
                    <span>{center.region}</span>
                  </div>
                )}
                {center?.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4 text-brand-orange" />
                    <span>โทรศัพท์: {center.phone}</span>
                  </div>
                )}
                {center?.mission?.name && (
                  <div className="text-slate-300">
                    ภารกิจ: {center.mission.name}
                  </div>
                )}
              </div>

              {center?.address && (
                <p className="text-xs text-slate-300/90 max-w-2xl pt-1">
                  สถานที่ตั้ง: {center.address}
                </p>
              )}
            </div>

            {/* Quick Register CTA */}
            <div className="shrink-0 flex flex-col sm:flex-row gap-3">
              <Link href={`/registration?centerId=${centerId}`}>
                <Button size="lg" className="bg-brand-orange hover:bg-brand-orange-dark text-white font-bold gap-2 shadow-lg w-full sm:w-auto">
                  <ClipboardList className="h-5 w-5" />
                  ลงทะเบียนรับซ่อมที่ศูนย์นี้
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-8">
        {/* Scoped KPI Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>งานซ่อมของศูนย์นี้</span>
                <Wrench className="h-4 w-4 text-brand-orange" />
              </div>
              <div className="text-2xl font-extrabold text-brand-navy">{loading ? '...' : total}</div>
              <span className="text-[11px] text-slate-500">รายการสะสม</span>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>ซ่อมสำเร็จแล้ว</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-extrabold text-emerald-600">{loading ? '...' : completed}</div>
              <span className="text-[11px] text-emerald-700">
                {total > 0 ? `${Math.round((completed / total) * 100)}% สำเร็จ` : 'พร้อมให้บริการ'}
              </span>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>กำลังดำเนินการ</span>
                <Activity className="h-4 w-4 text-brand-orange" />
              </div>
              <div className="text-2xl font-extrabold text-brand-orange">{loading ? '...' : inProgress}</div>
              <span className="text-[11px] text-orange-700">รายการในศูนย์นี้</span>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>มูลค่าประหยัดได้</span>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </div>
              <div className="text-2xl font-extrabold text-blue-700 truncate">
                {loading ? '...' : formatCurrency(savedValue)}
              </div>
              <span className="text-[11px] text-blue-700">ประหยัดให้ชุมชนในพื้นที่</span>
            </CardContent>
          </Card>
        </div>

        {/* 4 Center Action Modules */}
        <div className="space-y-3">
          <h2 className="text-xl font-bold text-brand-navy">จุดปฏิบัติงานประจำศูนย์ {center?.code}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href={`/registration?centerId=${centerId}`} className="block">
              <Card className="hover:border-brand-orange hover:shadow-md transition-all p-4 bg-white h-full flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-brand-orange flex items-center justify-center font-bold">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-sm text-brand-navy">จุดที่ 1: ลงทะเบียนรับงาน</h3>
                  <p className="text-xs text-slate-500">บันทึกข้อมูลลูกค้า เสียบบัตร ปชช. และออกคิวประจำศูนย์ {center?.code}</p>
                </div>
                <div className="pt-3 text-xs font-semibold text-brand-orange flex items-center gap-1">
                  <span>เข้าสู่จุดลงทะเบียน</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Card>
            </Link>

            <Link href={`/workspace?centerId=${centerId}`} className="block">
              <Card className="hover:border-blue-500 hover:shadow-md transition-all p-4 bg-white h-full flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Wrench className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-sm text-brand-navy">จุดที่ 2: พื้นที่ช่างซ่อม</h3>
                  <p className="text-xs text-slate-500">ช่างสแกน QR Code รับงาน วินิจฉัย และบันทึกอะไหล่</p>
                </div>
                <div className="pt-3 text-xs font-semibold text-blue-600 flex items-center gap-1">
                  <span>เข้าสู่พื้นที่ช่าง</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Card>
            </Link>

            <Link href={`/supervisor?centerId=${centerId}`} className="block">
              <Card className="hover:border-emerald-500 hover:shadow-md transition-all p-4 bg-white h-full flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-sm text-brand-navy">จุดที่ 3: ตรวจรับรอง QC</h3>
                  <p className="text-xs text-slate-500">หัวหน้าช่างตรวจความปลอดภัย 8 ข้อ และลงลายเซ็นดิจิทัล</p>
                </div>
                <div className="pt-3 text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <span>เข้าสู่ระบบ QC</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Card>
            </Link>

            <Link href={`/queue-board?centerId=${centerId}`} className="block">
              <Card className="hover:border-slate-800 hover:shadow-md transition-all p-4 bg-white h-full flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-sm text-brand-navy">Smart TV: กระดานคิว</h3>
                  <p className="text-xs text-slate-500">เปิดหน้าจอกระดานคิวแบบเต็มจอ สำหรับตั้งแสดงผลหน้าร้าน</p>
                </div>
                <div className="pt-3 text-xs font-semibold text-slate-800 flex items-center gap-1">
                  <span>เปิดกระดานคิว TV</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Card>
            </Link>
          </div>
        </div>

        {/* Recent Orders in this Center */}
        <Card className="bg-white">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold text-brand-navy">
              รายการงานซ่อมล่าสุดประจำศูนย์ ({recentOrders.length} รายการ)
            </CardTitle>
            <CardDescription className="text-xs">
              ติดตามสถานะความคืบหน้าของงานซ่อมที่รับเข้า ณ ศูนย์ {center?.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>หมายเลขคิว</TableHead>
                    <TableHead>ประเภทช่าง</TableHead>
                    <TableHead>อุปกรณ์ / ปัญหา</TableHead>
                    <TableHead className="text-center">สถานะ</TableHead>
                    <TableHead>เวลาที่ลงทะเบียน</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">กำลังโหลดข้อมูลงานซ่อม...</TableCell></TableRow>
                  ) : recentOrders.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">ยังไม่มีรายการงานซ่อมในศูนย์นี้</TableCell></TableRow>
                  ) : (
                    recentOrders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-bold font-mono text-brand-orange">{o.queueNumber}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{o.trade || (o as any).tradeCode}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          <p className="font-medium text-slate-900">{o.device?.brand} {o.device?.model}</p>
                          <p className="text-muted-foreground truncate max-w-xs">{o.device?.problemDesc}</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={`text-xs ${STATUS_COLORS[o.status] || ''}`}>
                            {STATUS_LABELS[o.status] || o.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDateTime(o.createdAt || (o as any).registeredAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-4 text-center text-xs text-muted-foreground">
        <p>ศูนย์ซ่อมสร้างเพื่อชุมชน (FixIt Center) — {center?.name || 'วิทยาลัยสารพัดช่างน่าน'}</p>
      </footer>
    </div>
  );
}
