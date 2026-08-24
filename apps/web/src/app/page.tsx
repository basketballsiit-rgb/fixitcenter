'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Wrench, ClipboardList, ShieldCheck, Monitor, Settings,
  ArrowRight, CheckCircle2, TrendingUp, Users, MapPin,
  Clock, LogIn, ExternalLink, Activity, Building2, Phone,
  ChevronRight, Filter, Utensils, Zap, Cpu, Car
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { dashboardApi, kitchenApi, type DashboardStats, type CenterWithStats, type KitchenSummary } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

export default function LandingPortalPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [kitchenSummary, setKitchenSummary] = useState<KitchenSummary | null>(null);
  const [selectedCenterId, setSelectedCenterId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchStats = (centerId?: string) => {
    setLoading(true);
    const targetCenter = centerId || undefined;
    Promise.all([
      dashboardApi.getStats(targetCenter),
      kitchenApi.getSummary(targetCenter).catch(() => ({ data: { totalEntries: 0, totalQuantity: 0, totalBoxes: 0, totalWater: 0, totalRelief: 0 } })),
    ])
      .then(([dashRes, kitchenRes]) => {
        setStats(dashRes.data);
        setKitchenSummary(kitchenRes.data);
      })
      .catch(() => {
        setStats({
          totalRepairs: 0,
          completedRepairs: 0,
          inProgressRepairs: 0,
          economicValueSaved: 0,
          tradeBreakdown: { ELECTRICAL: 0, ELECTRONICS: 0, AUTOMOTIVE: 0 },
          dailyRepairs: [],
          centers: [],
        });
        setKitchenSummary({ totalEntries: 0, totalQuantity: 0, totalBoxes: 0, totalWater: 0, totalRelief: 0 });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats(selectedCenterId);
  }, [selectedCenterId]);

  const total = stats?.totalRepairs ?? 0;
  const completed = stats?.completedRepairs ?? stats?.completed ?? 0;
  const inProgress = stats?.inProgressRepairs ?? stats?.inProgress ?? 0;
  const centers = stats?.centers ?? [];

  const modules = [
    {
      title: 'ระบบลงทะเบียนงานซ่อม',
      desc: 'บันทึกข้อมูลผู้ขอรับบริการ เสียบบัตร ปชช. / สแกน OCR และออกหมายเลขคิวพร้อมพิมพ์ใบงาน A4',
      icon: ClipboardList,
      href: selectedCenterId ? `/registration?centerId=${selectedCenterId}` : '/registration',
      color: 'from-orange-500 to-amber-600',
      badge: 'จุดบริการที่ 1',
      actionText: 'เข้าสู่จุดลงทะเบียน',
    },
    {
      title: 'พื้นที่ปฏิบัติงานช่าง',
      desc: 'ช่างสแกน QR Code เพื่อรับใบงาน วินิจฉัยอาการ บันทึกรายการอะไหล่ และอัปเดตสถานะงานซ่อม',
      icon: Wrench,
      href: '/workspace',
      color: 'from-blue-600 to-indigo-800',
      badge: 'จุดบริการที่ 2',
      actionText: 'เข้าสู่พื้นที่งานช่าง',
    },
    {
      title: 'ระบบครัวอาชีวะ ช่วยเหลือชุมชน',
      desc: 'บันทึกสถิติการจัดทำอาหารกล่อง น้ำดื่ม และเสบียงยังชีพแจกจ่ายแก่ผู้ประสบภัยและชุมชน',
      icon: Utensils,
      href: selectedCenterId ? `/kitchen?centerId=${selectedCenterId}` : '/kitchen',
      color: 'from-emerald-600 to-teal-800',
      badge: 'บริการชุมชน',
      actionText: 'เข้าสู่ระบบครัวอาชีวะ',
    },
    {
      title: 'กระดานคิวอัจฉริยะ (TV Board)',
      desc: 'หน้าจอกระดานคิวขนาดใหญ่สำหรับ Smart TV แสดงลำดับคิวและสถานะงานซ่อม Real-time',
      icon: Monitor,
      href: selectedCenterId ? `/queue-board?centerId=${selectedCenterId}` : '/queue-board',
      color: 'from-slate-800 to-brand-navy-dark',
      badge: 'Smart TV Display',
      actionText: 'เปิดหน้าจอกระดานคิว',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-2 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="FixIt Center Logo"
              width={50}
              height={50}
              style={{ maxHeight: '48px', width: 'auto' }}
              className="h-12 w-auto object-contain"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-brand-navy tracking-tight">FixIt Center</span>
                <Badge variant="outline" className="text-[10px] bg-orange-50 text-brand-orange border-orange-200 font-semibold">
                  THAILAND 4.0
                </Badge>
              </div>
              <p className="text-xs font-medium text-brand-orange leading-tight">ศูนย์ซ่อมสร้างเพื่อชุมชน</p>
              <p className="text-[11px] text-muted-foreground">วิทยาลัยสารพัดช่างน่าน</p>
            </div>
          </div>

          {/* Center Selector & Auth Actions */}
          <div className="flex items-center gap-3">
            {centers.length > 0 && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-100 rounded-lg p-1 border">
                <Building2 className="h-4 w-4 text-brand-orange ml-2" />
                <select
                  value={selectedCenterId}
                  onChange={(e) => setSelectedCenterId(e.target.value)}
                  className="bg-transparent text-xs font-medium text-slate-700 outline-none pr-2 py-1 cursor-pointer"
                >
                  <option value="">ภาพรวมทุกศูนย์ (รวมทั้งจังหวัด)</option>
                  {centers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <Link href="/dashboard">
                  <Button variant="outline" size="sm" className="gap-2 border-brand-navy text-brand-navy hover:bg-slate-50">
                    <Activity className="h-4 w-4 text-brand-orange" />
                    แดชบอร์ดงาน
                  </Button>
                </Link>
                {(user?.role === 'ADMIN' || user?.role === 'CENTER_ADMIN') && (
                  <Link href="/admin">
                    <Button size="sm" className="gap-2 bg-brand-navy hover:bg-brand-navy-light text-white shadow-sm">
                      <Settings className="h-4 w-4 text-brand-orange" />
                      {user?.role === 'CENTER_ADMIN' ? 'จัดการศูนย์' : 'จัดการระบบ (Admin)'}
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <Link href="/login">
                <Button size="sm" className="gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white font-medium shadow-sm">
                  <LogIn className="h-4 w-4" />
                  เข้าสู่ระบบ
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Header: Provincial Consolidated Summary */}
      <section className="bg-gradient-to-br from-brand-navy-dark via-brand-navy to-[#103763] text-white py-12 px-4 sm:px-6 lg:px-8 shadow-inner relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 bg-brand-orange/20 border border-brand-orange/40 text-orange-200 px-3.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse" />
                {selectedCenterId ? 'ข้อมูลเฉพาะศูนย์ที่เลือก' : 'ภาพรวมผลการดำเนินงานทุกศูนย์บริการ จ.น่าน'}
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
                ศูนย์ซ่อมสร้างเพื่อชุมชน <span className="text-brand-orange">(FixIt Center)</span>
              </h1>
              <p className="text-xl text-orange-100 font-semibold">
                วิทยาลัยสารพัดช่างน่าน — บริการด้วยใจ พัฒนาทักษะช่าง สร้างประโยชน์สู่สังคม
              </p>
              <p className="text-sm text-slate-200 leading-relaxed max-w-2xl">
                ระบบบริหารจัดการแบบ Multi-Center กระจายอำนาจการจัดการในแต่ละศูนย์บริการ พร้อมศูนย์รวมข้อมูลสถิติ
                ติดตามความคืบหน้างานซ่อมบำรุง และสถิติบริการครัวอาชีวะจัดทำอาหารและเสบียงแจกจ่ายเพื่อบรรเทาทุกข์ชุมชน
              </p>

              <div className="pt-2 flex flex-wrap gap-3">
                <Link href={selectedCenterId ? `/registration?centerId=${selectedCenterId}` : '/registration'}>
                  <Button size="lg" className="bg-brand-orange hover:bg-brand-orange-dark text-white font-bold shadow-lg gap-2 border-0">
                    <ClipboardList className="h-5 w-5" />
                    ลงทะเบียนงานซ่อมใหม่
                  </Button>
                </Link>
                <Link href={selectedCenterId ? `/queue-board?centerId=${selectedCenterId}` : '/queue-board'}>
                  <Button size="lg" variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm gap-2">
                    <Monitor className="h-5 w-5 text-orange-300" />
                    ดูกระดานคิว (Smart TV)
                  </Button>
                </Link>
              </div>
            </div>

            {/* Live KPI Counters */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/15 flex items-center gap-4">
                <img
                  src="/logo.png"
                  alt="FixIt Center"
                  width={80}
                  height={80}
                  style={{ maxHeight: '80px', width: 'auto' }}
                  className="h-20 w-auto object-contain drop-shadow-md shrink-0 bg-white/95 rounded-xl p-2"
                />
                <div>
                  <h3 className="font-bold text-base text-white">
                    {selectedCenterId
                      ? (centers.find((c) => c.id === selectedCenterId)?.name || 'ศูนย์บริการที่เลือก')
                      : 'ศูนย์ซ่อมสร้างเพื่อชุมชน (ภาพรวม)'}
                  </h3>
                  <p className="text-xs text-orange-200 font-medium">FIXIT CENTER THAILAND 4.0</p>
                  <p className="text-[11px] text-slate-300 mt-1">
                    {centers.length} ศูนย์บริการที่เปิดดำเนินการในโครงการ
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* 1. แผนกไฟฟ้า */}
                <div className="bg-amber-500/20 backdrop-blur-md rounded-2xl p-4 border border-amber-400/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-amber-200 text-xs mb-1">
                      <span>แผนกช่างไฟฟ้า</span>
                      <Zap className="h-4 w-4 text-amber-300" />
                    </div>
                    <div className="text-3xl font-extrabold text-white truncate flex items-baseline gap-1.5">
                      {loading ? '...' : (stats?.tradeBreakdown?.ELECTRICAL ?? 0).toLocaleString()}
                      <span className="text-xs font-normal text-amber-200/80">รายการ</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-amber-400/20 text-[11px] text-amber-100 flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-tight">
                    {(stats?.tradeBreakdown?.ELECTRICAL ?? 0) === 0 ? (
                      <span className="text-amber-200/80">พร้อมรับซ่อมอุปกรณ์</span>
                    ) : (
                      <>
                        <span className="font-medium">เสร็จ {(stats?.tradeStats?.ELECTRICAL?.completed ?? 0).toLocaleString()}</span>
                        <span className="text-amber-400/60">•</span>
                        <span className="font-medium">กำลังซ่อม {(stats?.tradeStats?.ELECTRICAL?.inProgress ?? 0).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 2. แผนกอิเล็กทรอนิกส์ */}
                <div className="bg-cyan-500/20 backdrop-blur-md rounded-2xl p-4 border border-cyan-400/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-cyan-200 text-xs mb-1">
                      <span>แผนกอิเล็กทรอนิกส์</span>
                      <Cpu className="h-4 w-4 text-cyan-300" />
                    </div>
                    <div className="text-3xl font-extrabold text-white truncate flex items-baseline gap-1.5">
                      {loading ? '...' : (stats?.tradeBreakdown?.ELECTRONICS ?? 0).toLocaleString()}
                      <span className="text-xs font-normal text-cyan-200/80">รายการ</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-cyan-400/20 text-[11px] text-cyan-100 flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-tight">
                    {(stats?.tradeBreakdown?.ELECTRONICS ?? 0) === 0 ? (
                      <span className="text-cyan-200/80">พร้อมรับซ่อมอุปกรณ์</span>
                    ) : (
                      <>
                        <span className="font-medium">เสร็จ {(stats?.tradeStats?.ELECTRONICS?.completed ?? 0).toLocaleString()}</span>
                        <span className="text-cyan-400/60">•</span>
                        <span className="font-medium">กำลังซ่อม {(stats?.tradeStats?.ELECTRONICS?.inProgress ?? 0).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 3. แผนกช่างยนต์ */}
                <div className="bg-emerald-500/20 backdrop-blur-md rounded-2xl p-4 border border-emerald-400/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-emerald-200 text-xs mb-1">
                      <span>แผนกช่างยนต์</span>
                      <Car className="h-4 w-4 text-emerald-300" />
                    </div>
                    <div className="text-3xl font-extrabold text-white truncate flex items-baseline gap-1.5">
                      {loading ? '...' : (stats?.tradeBreakdown?.AUTOMOTIVE ?? 0).toLocaleString()}
                      <span className="text-xs font-normal text-emerald-200/80">รายการ</span>
                    </div>
                  </div>
                  <div className="mt-2 pt-1.5 border-t border-emerald-400/20 text-[11px] text-emerald-100 flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-tight">
                    {(stats?.tradeBreakdown?.AUTOMOTIVE ?? 0) === 0 ? (
                      <span className="text-emerald-200/80">พร้อมรับซ่อมอุปกรณ์</span>
                    ) : (
                      <>
                        <span className="font-medium">เสร็จ {(stats?.tradeStats?.AUTOMOTIVE?.completed ?? 0).toLocaleString()}</span>
                        <span className="text-emerald-400/60">•</span>
                        <span className="font-medium">กำลังซ่อม {(stats?.tradeStats?.AUTOMOTIVE?.inProgress ?? 0).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* 4. ครัวอาชีวะ */}
                <div className="bg-rose-500/25 backdrop-blur-md rounded-2xl p-4 border border-rose-400/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-rose-200 text-xs mb-1">
                      <span>ครัวอาชีวะ (แจกจ่าย)</span>
                      <Utensils className="h-4 w-4 text-rose-300" />
                    </div>
                    <div className="text-3xl font-extrabold text-white truncate flex items-baseline gap-1.5">
                      {loading ? '...' : (kitchenSummary?.totalQuantity ?? 0).toLocaleString()}
                      <span className="text-xs font-normal text-rose-200/80">หน่วยรวม</span>
                    </div>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-rose-400/20 text-[11px] text-rose-100 flex flex-wrap items-center gap-x-2 gap-y-0.5 leading-tight">
                    {(kitchenSummary?.totalQuantity ?? 0) === 0 ? (
                      <span className="text-rose-200/80">พร้อมให้บริการแจกจ่าย</span>
                    ) : (
                      <>
                        <span className="font-medium">🍱 {(kitchenSummary?.totalBoxes ?? 0).toLocaleString()} กล่อง</span>
                        <span className="text-rose-400/60">•</span>
                        <span className="font-medium">💧 {(kitchenSummary?.totalWater ?? 0).toLocaleString()} ขวด</span>
                        <span className="text-rose-400/60">•</span>
                        <span className="font-medium">📦 {(kitchenSummary?.totalRelief ?? 0).toLocaleString()} ชุด</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-10">

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION: ศูนย์บริการทั้งหมดที่เปิดทำการ (ACTIVE SERVICE CENTERS)
        ══════════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
            <div>
              <h2 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
                <Building2 className="h-6 w-6 text-brand-orange" />
                ศูนย์บริการที่เปิดให้บริการ (FixIt Service Centers)
              </h2>
              <p className="text-muted-foreground text-sm">
                เลือกศูนย์บริการเพื่อดูข้อมูลเฉพาะศูนย์ เข้าจุดลงทะเบียน หรือเปิดหน้าจอกระดานคิว
              </p>
            </div>
            {selectedCenterId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedCenterId('')}
                className="text-xs gap-1 border-orange-300 text-brand-orange hover:bg-orange-50 self-start"
              >
                <Filter className="h-3.5 w-3.5" />
                แสดงภาพรวมทุกศูนย์
              </Button>
            )}
          </div>

          {centers.length === 0 ? (
            <Card className="p-8 text-center bg-white border-dashed">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-600 font-medium">ยังไม่มีศูนย์บริการในระบบ</p>
              <p className="text-xs text-muted-foreground mt-1">ผู้ดูแลระบบสามารถเพิ่มศูนย์บริการได้ที่เมนู จัดการระบบ (Admin)</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {centers.map((c) => {
                const isSelected = selectedCenterId === c.id;
                return (
                  <Card
                    key={c.id}
                    className={`hover:shadow-xl transition-all duration-200 flex flex-col justify-between bg-white border ${
                      isSelected ? 'border-brand-orange ring-2 ring-brand-orange/30 shadow-lg' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Badge className="bg-brand-navy text-white font-mono text-xs px-2.5 py-0.5">
                            {c.code}
                          </Badge>
                          {c.isActive ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                              เปิดให้บริการ
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-slate-100 text-slate-500 text-xs">
                              ปิดชั่วคราว
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg font-bold text-brand-navy hover:text-brand-orange transition-colors">
                          <Link href={`/centers/${c.id}`}>{c.name}</Link>
                        </CardTitle>
                        {c.region && (
                          <CardDescription className="text-xs flex items-center gap-1.5 text-slate-600 pt-1">
                            <MapPin className="h-3.5 w-3.5 text-brand-orange shrink-0" />
                            <span>{c.region}</span>
                          </CardDescription>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-3 pt-0 text-xs">
                        {c.address && (
                          <p className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed bg-slate-50 p-2 rounded-md border border-slate-100">
                            {c.address}
                          </p>
                        )}

                        {/* Center mini-stats */}
                        <div className="grid grid-cols-3 gap-2 bg-orange-50/60 p-2.5 rounded-xl border border-orange-100/80 text-center">
                          <div>
                            <span className="text-[10px] text-slate-500 block">งานทั้งหมด</span>
                            <span className="font-extrabold text-sm text-brand-navy">{c.totalRepairs}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">เสร็จแล้ว</span>
                            <span className="font-extrabold text-sm text-emerald-600">{c.completedRepairs}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-500 block">กำลังซ่อม</span>
                            <span className="font-extrabold text-sm text-brand-orange">{c.inProgressRepairs}</span>
                          </div>
                        </div>

                        {c.phone && (
                          <div className="flex items-center gap-1.5 text-slate-600 text-xs">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>โทร: {c.phone}</span>
                          </div>
                        )}
                      </CardContent>
                    </div>

                    <CardFooter className="pt-2 border-t bg-slate-50/50 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2 w-full">
                        <Link href={`/registration?centerId=${c.id}`} className="w-full">
                          <Button size="sm" variant="outline" className="w-full text-xs gap-1 hover:bg-orange-50 hover:text-brand-orange hover:border-brand-orange">
                            <ClipboardList className="h-3.5 w-3.5 text-brand-orange" />
                            ลงทะเบียน
                          </Button>
                        </Link>
                        <Link href={`/queue-board?centerId=${c.id}`} className="w-full">
                          <Button size="sm" variant="outline" className="w-full text-xs gap-1 hover:bg-blue-50 hover:text-brand-navy hover:border-brand-navy">
                            <Monitor className="h-3.5 w-3.5 text-blue-600" />
                            กระดานคิว
                          </Button>
                        </Link>
                      </div>

                      <Link href={`/centers/${c.id}`} className="w-full">
                        <Button size="sm" className="w-full text-xs bg-brand-navy hover:bg-brand-navy-light text-white gap-1.5 shadow-sm">
                          <Building2 className="h-3.5 w-3.5 text-brand-orange" />
                          <span>เข้าสู่หน้าระบบศูนย์นี้</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION: เมนูตามจุดบริการ (SERVICE MODULES)
        ══════════════════════════════════════════════════════════════════════ */}
        <section className="space-y-4 pt-4 border-t">
          <div>
            <h2 className="text-2xl font-bold text-brand-navy">เมนูเข้าใช้งานระบบตามจุดบริการ</h2>
            <p className="text-muted-foreground text-sm">เลือกระบบงานที่ต้องการปฏิบัติหน้าที่</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {modules.map((m, idx) => (
              <Card key={idx} className="hover:shadow-xl transition-all duration-200 flex flex-col justify-between border-slate-200 group hover:-translate-y-1 bg-white">
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center text-white shadow-md`}>
                        <m.icon className="h-6 w-6" />
                      </div>
                      <Badge variant="secondary" className="text-xs font-normal bg-orange-50 text-brand-orange border border-orange-200">
                        {m.badge}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-brand-orange transition-colors">
                      {m.title}
                    </CardTitle>
                    <CardDescription className="text-xs leading-relaxed text-slate-500 pt-1">
                      {m.desc}
                    </CardDescription>
                  </CardHeader>
                </div>

                <CardContent className="pt-0">
                  <Link href={m.href} className="block w-full">
                    <Button className="w-full gap-2 group-hover:bg-brand-orange group-hover:text-white group-hover:border-brand-orange transition-colors" variant="outline">
                      <span>{m.actionText}</span>
                      <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Admin Quick Entry Banner */}
        <div className="bg-gradient-to-r from-brand-navy-dark via-brand-navy to-brand-navy-light rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg border border-brand-navy/30">
          <div className="space-y-1 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <Settings className="h-5 w-5 text-brand-orange" />
              <h3 className="font-bold text-lg text-white">ศูนย์ควบคุมผู้ดูแลระบบ (Admin Console)</h3>
            </div>
            <p className="text-xs text-slate-300">
              จัดการข้อมูลผู้ใช้งานทุกระดับ, ผู้ดูแลประจำศูนย์, กำหนดภารกิจงาน, และข้อมูลศูนย์บริการ
            </p>
          </div>
          <Link href="/admin">
            <Button className="bg-brand-orange hover:bg-brand-orange-dark text-white font-semibold shrink-0 gap-2 shadow-md">
              <Settings className="h-4 w-4" />
              เข้าสู่ระบบจัดการข้อมูล
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img
              src="/logo.png"
              alt="Logo"
              width={32}
              height={32}
              style={{ maxHeight: '32px', width: 'auto' }}
              className="h-8 w-auto object-contain"
            />
            <span className="font-bold text-brand-navy">ศูนย์ซ่อมสร้างเพื่อชุมชน (FixIt Center)</span>
          </div>
          <p className="font-medium text-slate-700">
            วิทยาลัยสารพัดช่างน่าน — สังกัดสำนักงานคณะกรรมการการอาชีวศึกษา (สอศ.) กระทรวงศึกษาธิการ
          </p>
          <p className="text-[11px] text-slate-400 pt-2">
            NPC FixIt Center FSM System &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}
