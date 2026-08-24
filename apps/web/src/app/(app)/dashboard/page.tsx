'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Wrench, Package, CheckCircle2, RefreshCw, Building2, Utensils, ArrowRight, Sparkles, Zap, Cpu, Car } from 'lucide-react';
import { KpiCard } from '@/components/charts/kpi-card';
import { TradePieChart } from '@/components/charts/trade-pie-chart';
import { DailyBarChart } from '@/components/charts/daily-bar-chart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { dashboardApi, centerApi, kitchenApi, type DashboardStats, type Center, type KitchenSummary } from '@/lib/api';
import { formatDateTime, maskNationalId } from '@/lib/utils';
import { getSocket, joinRoom } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'รอดำเนินการ',
  DIAGNOSING: 'วินิจฉัย',
  WAITING_PARTS: 'รออะไหล่',
  REPAIRING: 'กำลังซ่อม',
  QC_PENDING: 'รอ QC',
  COMPLETED: 'เสร็จสิ้น',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'warning' | 'success' | 'info'> = {
  PENDING: 'secondary',
  DIAGNOSING: 'info',
  WAITING_PARTS: 'warning',
  REPAIRING: 'default',
  QC_PENDING: 'warning',
  COMPLETED: 'success',
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'ADMIN';
  const userCenterId = user?.centerId || '';

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [kitchenSummary, setKitchenSummary] = useState<KitchenSummary | null>(null);
  const [centers, setCenters] = useState<Center[]>([]);
  const [selectedCenter, setSelectedCenter] = useState<string>(isSuperAdmin ? 'all' : userCenterId);
  const [loading, setLoading] = useState(true);

  // Sync selectedCenter if user object loads later
  useEffect(() => {
    if (!isSuperAdmin && userCenterId) {
      setSelectedCenter(userCenterId);
    }
  }, [isSuperAdmin, userCenterId]);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const activeFilter = !isSuperAdmin && userCenterId ? userCenterId : (selectedCenter === 'all' ? undefined : selectedCenter);
      const [res, kRes] = await Promise.all([
        dashboardApi.getStats(activeFilter),
        kitchenApi.getSummary(activeFilter).catch(() => ({ data: { totalEntries: 0, totalQuantity: 0, totalBoxes: 0, totalWater: 0, totalRelief: 0 } })),
      ]);
      setStats(res.data);
      setKitchenSummary(kRes.data);
    } catch {
      // Mock fallback
      setStats({
        totalRepairs: 0,
        completed: 0,
        inProgress: 0,
        economicValueSaved: 0,
        tradeBreakdown: { ELECTRICAL: 0, ELECTRONICS: 0, AUTOMOTIVE: 0 },
        dailyRepairs: [],
        recentOrders: [],
      });
      setKitchenSummary({ totalEntries: 0, totalQuantity: 0, totalBoxes: 0, totalWater: 0, totalRelief: 0 });
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, userCenterId, selectedCenter]);

  useEffect(() => {
    centerApi.getAll().then((r) => setCenters(r.data)).catch(() => {});
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    const socket = getSocket();
    joinRoom('dashboard');
    socket.on('dashboard:update', () => { fetchStats(); });
    return () => { socket.off('dashboard:update'); };
  }, [fetchStats]);

  const userCenterName = centers.find((c) => c.id === userCenterId)?.name || user?.centerName || 'ศูนย์บริการประจำของคุณ';

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">แดชบอร์ด</h1>
          <p className="text-muted-foreground text-sm">
            {isSuperAdmin
              ? (selectedCenter === 'all' ? 'ภาพรวมการซ่อมทั้งหมด (ทุกศูนย์ในโครงการ)' : `ภาพรวมเฉพาะศูนย์: ${centers.find((c) => c.id === selectedCenter)?.name || selectedCenter}`)
              : `ภาพรวมงานซ่อมเฉพาะศูนย์: ${userCenterName}`}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* Center filter for Super Admin ONLY */}
          {isSuperAdmin ? (
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 border">
              <button
                onClick={() => setSelectedCenter('all')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  selectedCenter === 'all' ? 'bg-white shadow text-brand-orange' : 'text-muted-foreground hover:text-slate-900'
                }`}
              >
                ภาพรวมทุกศูนย์
              </button>
              {centers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCenter(c.id)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                    selectedCenter === c.id ? 'bg-white shadow text-brand-navy' : 'text-muted-foreground hover:text-slate-900'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          ) : (
            /* Badge for Center Admin and Staff */
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 text-brand-orange px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-sm">
              <Building2 className="h-4 w-4 text-brand-orange" />
              <span>{userCenterName}</span>
            </div>
          )}

          <Button variant="outline" size="sm" onClick={fetchStats} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))
        ) : (
          <>
            <KpiCard
              title="แผนกช่างไฟฟ้า"
              value={(stats?.tradeBreakdown?.ELECTRICAL ?? 0).toLocaleString()}
              icon={Zap}
              color="orange"
              subtitle={
                (stats?.tradeBreakdown?.ELECTRICAL ?? 0) === 0
                  ? 'พร้อมรับซ่อมอุปกรณ์'
                  : `เสร็จ ${(stats?.tradeStats?.ELECTRICAL?.completed ?? 0).toLocaleString()} • กำลังซ่อม ${(stats?.tradeStats?.ELECTRICAL?.inProgress ?? 0).toLocaleString()} รายการ`
              }
            />
            <KpiCard
              title="แผนกอิเล็กทรอนิกส์"
              value={(stats?.tradeBreakdown?.ELECTRONICS ?? 0).toLocaleString()}
              icon={Cpu}
              color="blue"
              subtitle={
                (stats?.tradeBreakdown?.ELECTRONICS ?? 0) === 0
                  ? 'พร้อมรับซ่อมอุปกรณ์'
                  : `เสร็จ ${(stats?.tradeStats?.ELECTRONICS?.completed ?? 0).toLocaleString()} • กำลังซ่อม ${(stats?.tradeStats?.ELECTRONICS?.inProgress ?? 0).toLocaleString()} รายการ`
              }
            />
            <KpiCard
              title="แผนกช่างยนต์"
              value={(stats?.tradeBreakdown?.AUTOMOTIVE ?? 0).toLocaleString()}
              icon={Car}
              color="green"
              subtitle={
                (stats?.tradeBreakdown?.AUTOMOTIVE ?? 0) === 0
                  ? 'พร้อมรับซ่อมอุปกรณ์'
                  : `เสร็จ ${(stats?.tradeStats?.AUTOMOTIVE?.completed ?? 0).toLocaleString()} • กำลังซ่อม ${(stats?.tradeStats?.AUTOMOTIVE?.inProgress ?? 0).toLocaleString()} รายการ`
              }
            />
            <KpiCard
              title="ครัวอาชีวะ (แจกจ่าย)"
              value={`${(kitchenSummary?.totalQuantity ?? 0).toLocaleString()} หน่วย`}
              icon={Utensils}
              color="rose"
              subtitle={
                (kitchenSummary?.totalQuantity ?? 0) === 0
                  ? 'พร้อมให้บริการแจกจ่าย'
                  : `🍱 ${(kitchenSummary?.totalBoxes ?? 0).toLocaleString()} กล่อง • 💧 ${(kitchenSummary?.totalWater ?? 0).toLocaleString()} ขวด • 📦 ${(kitchenSummary?.totalRelief ?? 0).toLocaleString()} ชุด`
              }
            />
          </>
        )}
      </div>


      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">สัดส่วนตามประเภทงาน</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : stats ? (
              <TradePieChart
                ELECTRICAL={stats.tradeBreakdown.ELECTRICAL}
                ELECTRONICS={stats.tradeBreakdown.ELECTRONICS}
                AUTOMOTIVE={stats.tradeBreakdown.AUTOMOTIVE}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">งานซ่อมรายวัน (14 วันล่าสุด)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-64 w-full" />
            ) : stats ? (
              <DailyBarChart data={stats.dailyRepairs} />
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Recent orders table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">รายการซ่อมล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>หมายเลขคิว</TableHead>
                  <TableHead>ลูกค้า</TableHead>
                  <TableHead>อุปกรณ์</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead>วันที่</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(stats?.recentOrders ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      ไม่มีข้อมูล
                    </TableCell>
                  </TableRow>
                ) : (
                  (stats?.recentOrders ?? []).map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-bold text-blue-700">{order.queueNumber}</TableCell>
                      <TableCell>
                        {order.customer?.firstName} {order.customer?.lastName ? `${order.customer.lastName[0]}.` : ''}
                        <span className="text-xs text-muted-foreground ml-1">
                          ({maskNationalId(order.customer?.nationalId || '')})
                        </span>
                      </TableCell>
                      <TableCell>{order.deviceBrand || order.device?.brand || '-'} {order.deviceModel || order.device?.model || ''}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{order.deviceCategory || order.tradeCode || order.trade || '-'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[order.status] ?? 'default'}>
                          {STATUS_LABELS[order.status] ?? order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
