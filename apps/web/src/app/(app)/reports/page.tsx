'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  VehicleLog,
  VehicleSummary,
  Center,
  Mission,
  centerApi,
  missionApi,
  vehicleApi,
  kitchenApi,
  KitchenLog,
  KitchenSummary,
  repairOrderApi,
} from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Car,
  Utensils,
  Zap,
  Printer,
  Plus,
  Edit2,
  Trash2,
  Building2,
  Calendar,
  Search,
  CheckCircle2,
  Sparkles,
  FileSpreadsheet,
  BarChart3,
  Wrench,
} from 'lucide-react';
import { VehiclePrintLayout } from './vehicle-print-layout';
import { KitchenPrintLayout } from '../kitchen/kitchen-print-layout';

const VEHICLE_TYPE_OPTIONS = [
  'รถจักรยานยนต์',
  'รถยนต์',
  'เครื่องยนต์การเกษตร / เครื่องตัดหญ้า',
  'เครื่องสูบน้ำ / เครื่องปั่นไฟ',
  'เรือหางยาว',
  'อื่นๆ',
];

export default function ReportsPage() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'ADMIN';
  const userCenterId = user?.centerId || '';

  const [activeReportTab, setActiveReportTab] = useState<'vehicles' | 'kitchen' | 'all'>('vehicles');
  const [centers, setCenters] = useState<Center[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);

  // ── Vehicle Logs State ──
  const [vehicleLogs, setVehicleLogs] = useState<VehicleLog[]>([]);
  const [vehicleSummary, setVehicleSummary] = useState<VehicleSummary>({
    totalEntries: 0,
    totalServices: 0,
    totalCompleted: 0,
    totalBudget: 0,
  });
  const [vehicleLoading, setVehicleLoading] = useState(true);
  const [selectedCenterId, setSelectedCenterId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Vehicle Modal State ──
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleFormData, setVehicleFormData] = useState({
    missionId: '',
    centerId: '',
    serviceDate: new Date().toISOString().split('T')[0],
    vehicleType: 'รถจักรยานยนต์',
    serviceDetails: '',
    serviceCount: 1,
    completedCount: 1,
    budgetPerUnit: 150,
    totalBudget: 150,
    targetLocation: '',
    recipientOrg: '',
    coordinatorName: '',
    notes: '',
  });

  // ── Kitchen Logs State for Tab ──
  const [kitchenLogs, setKitchenLogs] = useState<KitchenLog[]>([]);
  const [kitchenSummary, setKitchenSummary] = useState<KitchenSummary>({
    totalEntries: 0,
    totalQuantity: 0,
    totalBoxes: 0,
    totalWater: 0,
    totalRelief: 0,
  });

  // Fetch Centers & Missions
  useEffect(() => {
    Promise.all([centerApi.getAll(), missionApi.getAll()]).then(([cRes, mRes]) => {
      const cList = Array.isArray(cRes.data) ? cRes.data : [];
      const mList = Array.isArray(mRes.data) ? mRes.data : [];
      setCenters(cList);
      setMissions(mList);

      const defaultCenter = !isSuperAdmin && userCenterId ? userCenterId : (cList[0]?.id || '');
      const defaultMission = mList.find((m) => m.isActive)?.id || mList[0]?.id || '';

      setVehicleFormData((prev) => ({
        ...prev,
        centerId: defaultCenter,
        missionId: defaultMission,
      }));
    });
  }, [isSuperAdmin, userCenterId]);

  // Fetch Vehicle Data
  const fetchVehicleData = useCallback(async () => {
    setVehicleLoading(true);
    try {
      const activeCenterId =
        !isSuperAdmin && userCenterId
          ? userCenterId
          : selectedCenterId !== 'ALL'
          ? selectedCenterId
          : undefined;

      const [vRes, sRes, kRes, ksRes] = await Promise.allSettled([
        vehicleApi.getAll(activeCenterId),
        vehicleApi.getSummary(activeCenterId),
        kitchenApi.getAll(activeCenterId),
        kitchenApi.getSummary(activeCenterId),
      ]);

      if (vRes.status === 'fulfilled' && Array.isArray(vRes.value.data)) {
        setVehicleLogs(vRes.value.data);
      } else {
        setVehicleLogs([]);
      }

      if (sRes.status === 'fulfilled' && sRes.value.data) {
        setVehicleSummary(sRes.value.data);
      } else {
        setVehicleSummary({
          totalEntries: 0,
          totalServices: 0,
          totalCompleted: 0,
          totalBudget: 0,
        });
      }

      if (kRes.status === 'fulfilled' && Array.isArray(kRes.value.data)) {
        setKitchenLogs(kRes.value.data);
      } else {
        setKitchenLogs([]);
      }

      if (ksRes.status === 'fulfilled' && ksRes.value.data) {
        setKitchenSummary(ksRes.value.data);
      } else {
        setKitchenSummary({
          totalEntries: 0,
          totalQuantity: 0,
          totalBoxes: 0,
          totalWater: 0,
          totalRelief: 0,
        });
      }
    } catch {
      // Fallback cleanly
    } finally {
      setVehicleLoading(false);
    }
  }, [isSuperAdmin, userCenterId, selectedCenterId]);

  useEffect(() => {
    fetchVehicleData();
  }, [fetchVehicleData]);

  // Filtered Vehicle Logs
  const filteredVehicleLogs = useMemo(() => {
    return vehicleLogs.filter((log) => {
      if (selectedCenterId !== 'ALL' && log.centerId !== selectedCenterId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const detailsMatch = log.serviceDetails?.toLowerCase().includes(q);
        const typeMatch = log.vehicleType?.toLowerCase().includes(q);
        const locMatch = log.targetLocation?.toLowerCase().includes(q);
        const centerMatch = log.center?.name?.toLowerCase().includes(q);
        if (!detailsMatch && !typeMatch && !locMatch && !centerMatch) return false;
      }
      return true;
    });
  }, [vehicleLogs, selectedCenterId, searchQuery]);

  const handleOpenCreateVehicle = () => {
    setEditingVehicleId(null);
    const defaultCenter = !isSuperAdmin && userCenterId ? userCenterId : (centers[0]?.id || '');
    const defaultMission = missions.find((m) => m.isActive)?.id || missions[0]?.id || '';

    setVehicleFormData({
      missionId: defaultMission,
      centerId: defaultCenter,
      serviceDate: new Date().toISOString().split('T')[0],
      vehicleType: 'รถจักรยานยนต์',
      serviceDetails: 'ล้างทำความสะอาด, ตรวจเช็คสภาพ, เปลี่ยนถ่ายน้ำมันเครื่อง',
      serviceCount: 1,
      completedCount: 1,
      budgetPerUnit: 150,
      totalBudget: 150,
      targetLocation: '',
      recipientOrg: '',
      coordinatorName: '',
      notes: '',
    });
    setIsVehicleModalOpen(true);
  };

  const handleOpenEditVehicle = (item: VehicleLog) => {
    setEditingVehicleId(item.id);
    const sCount = Number(item.serviceCount) || 1;
    const cCount = Number(item.completedCount) || sCount;
    const bPerUnit = item.budgetPerUnit ? Number(item.budgetPerUnit) : 150;
    const bTotal = item.totalBudget ? Number(item.totalBudget) : bPerUnit * sCount;

    setVehicleFormData({
      missionId: item.missionId,
      centerId: item.centerId,
      serviceDate: new Date(item.serviceDate).toISOString().split('T')[0],
      vehicleType: item.vehicleType || 'รถจักรยานยนต์',
      serviceDetails: item.serviceDetails,
      serviceCount: sCount,
      completedCount: cCount,
      budgetPerUnit: bPerUnit,
      totalBudget: bTotal,
      targetLocation: item.targetLocation || '',
      recipientOrg: item.recipientOrg || '',
      coordinatorName: item.coordinatorName || '',
      notes: item.notes || '',
    });
    setIsVehicleModalOpen(true);
  };

  const handleQtyOrBudgetChange = (
    field: 'serviceCount' | 'completedCount' | 'budgetPerUnit' | 'totalBudget',
    val: number
  ) => {
    setVehicleFormData((prev) => {
      const next = { ...prev, [field]: val };
      if (field === 'serviceCount' && next.completedCount > val) {
        next.completedCount = val;
      }
      if (field !== 'totalBudget') {
        const sCount = Number(next.serviceCount || 0);
        next.totalBudget = Number((sCount * Number(next.budgetPerUnit || 0)).toFixed(2));
      }
      return next;
    });
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleFormData.serviceDetails.trim()) {
      toast({ title: 'กรุณาระบุรายละเอียดการดำเนินงาน', variant: 'destructive' });
      return;
    }

    setVehicleSaving(true);
    try {
      const payload = {
        ...vehicleFormData,
        serviceCount: Number(vehicleFormData.serviceCount || 1),
        completedCount: Number(vehicleFormData.completedCount || 1),
        budgetPerUnit: Number(vehicleFormData.budgetPerUnit || 0),
        totalBudget: Number(vehicleFormData.totalBudget || 0),
      };

      if (editingVehicleId) {
        await vehicleApi.update(editingVehicleId, payload);
        toast({ title: '✓ บันทึกการแก้ไขข้อมูลสำเร็จ' });
      } else {
        await vehicleApi.create(payload);
        toast({ title: '✓ บันทึกสถิติงานยานพาหนะสำเร็จ' });
      }
      setIsVehicleModalOpen(false);
      fetchVehicleData();
    } catch {
      toast({ title: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', variant: 'destructive' });
    } finally {
      setVehicleSaving(false);
    }
  };

  const handleDeleteVehicle = async (id: string, name: string) => {
    if (!confirm(`ยืนยันการลบรายการ: "${name}" ใช่หรือไม่?`)) return;
    try {
      await vehicleApi.delete(id);
      toast({ title: '✓ ลบรายการสำเร็จ' });
      fetchVehicleData();
    } catch {
      toast({ title: 'เกิดข้อผิดพลาดในการลบรายการ', variant: 'destructive' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-7 w-7 text-brand-orange" />
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              ระบบรายงานและสถิติ (Official Reports)
            </h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            พิมพ์แบบรายงานผลการดำเนินงานกิจกรรมอาชีวะอาสา ช่วยเหลือผู้ประสบอุทกภัย (A4 แนวนอน)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handlePrint}
            className="bg-brand-navy hover:bg-slate-800 text-white font-bold gap-2 shadow-sm"
          >
            <Printer className="h-4 w-4" />
            <span>🖨️ พิมพ์รายงาน A4 (แนวนอน)</span>
          </Button>
        </div>
      </div>

      {/* ── Report Type Tabs ── */}
      <Tabs
        value={activeReportTab}
        onValueChange={(v: any) => setActiveReportTab(v)}
        className="w-full space-y-6"
      >
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 max-w-2xl bg-slate-100 p-1">
          <TabsTrigger value="vehicles" className="gap-2 font-bold data-[state=active]:bg-white data-[state=active]:text-blue-700">
            <Car className="h-4 w-4 text-blue-600" />
            <span>ยานพาหนะ (พาหนะ)</span>
          </TabsTrigger>
          <TabsTrigger value="kitchen" className="gap-2 font-bold data-[state=active]:bg-white data-[state=active]:text-rose-700">
            <Utensils className="h-4 w-4 text-rose-600" />
            <span>โรงครัวอาชีวะ (สถิติ)</span>
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-2 font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            <span>ภาพรวมโครงการ</span>
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════
            TAB 1: ยานพาหนะ (Vehicle Report)
        ══════════════════════════════════════════════════════ */}
        <TabsContent value="vehicles" className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-white shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">จำนวนที่ให้บริการสะสม</p>
                  <h3 className="text-2xl font-black text-blue-700 mt-1 font-mono">
                    {vehicleSummary.totalServices.toLocaleString()}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">คัน / เครื่องยนต์</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Car className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">จำนวนที่ซ่อมสำเร็จ</p>
                  <h3 className="text-2xl font-black text-emerald-700 mt-1 font-mono">
                    {vehicleSummary.totalCompleted.toLocaleString()}
                  </h3>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                    {vehicleSummary.totalServices > 0
                      ? `คิดเป็น ${Math.round((vehicleSummary.totalCompleted / vehicleSummary.totalServices) * 100)}%`
                      : '100%'}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-white shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">งบประมาณรวมทั้งสิ้น</p>
                  <h3 className="text-2xl font-black text-amber-800 mt-1 font-mono">
                    ฿{vehicleSummary.totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">ค่าอะไหล่/วัสดุสิ้นเปลือง</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                  <Sparkles className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">จำนวนรายการบันทึก</p>
                  <h3 className="text-2xl font-black text-slate-800 mt-1 font-mono">
                    {vehicleLogs.length}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">ชุดสถิติการดำเนินงาน</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <Wrench className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar & Action Buttons */}
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {isSuperAdmin && (
                  <div className="w-[240px]">
                    <Select value={selectedCenterId} onValueChange={setSelectedCenterId}>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="เลือกศูนย์บริการ" />
                      </SelectTrigger>
                      <SelectContent className="bg-white">
                        <SelectItem value="ALL">🏢 รวมทุกศูนย์บริการ (น่าน)</SelectItem>
                        {centers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="relative flex-1 sm:w-[260px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="ค้นหาประเภท, รายละเอียดงาน..."
                    className="pl-9 bg-white"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  onClick={handleOpenCreateVehicle}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>บันทึกสถิติงานยานพาหนะ</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Main Table */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-base text-slate-800">
                  ตารางรายงานกิจกรรมยานพาหนะ (8 คอลัมน์ทางการ)
                </CardTitle>
                <CardDescription className="text-xs">
                  ล้างทำความสะอาด – ตรวจเช็ค – ซ่อม-เปลี่ยนอะไหล่ ยานพาหนะ
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {vehicleLoading ? (
                <div className="p-12 text-center text-slate-500">กำลังโหลดข้อมูลสถิติยานพาหนะ...</div>
              ) : filteredVehicleLogs.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Car className="h-12 w-12 text-slate-300 mx-auto" />
                  <p className="text-slate-600 font-medium">ยังไม่มีรายการบันทึกสถิติยานพาหนะ</p>
                  <Button onClick={handleOpenCreateVehicle} variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    เพิ่มรายการแรก
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#e2edd8] text-slate-900 font-bold border-b text-xs">
                      <tr>
                        <th className="py-3 px-2 text-center w-[50px]">ที่</th>
                        <th className="py-3 px-3">วัน/เดือน/ปี</th>
                        <th className="py-3 px-4">รายละเอียดการดำเนินงาน</th>
                        <th className="py-3 px-3">ประเภทยานพาหนะ</th>
                        <th className="py-3 px-3 text-right">จำนวนให้บริการ</th>
                        <th className="py-3 px-3 text-right">จำนวนซ่อมสำเร็จ</th>
                        <th className="py-3 px-3 text-right">งบประมาณ/ชิ้น</th>
                        <th className="py-3 px-3 text-right">งบประมาณทั้งสิ้น</th>
                        <th className="py-3 px-3 text-center no-print">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredVehicleLogs.map((log, index) => {
                        const dateFormatted = new Date(log.serviceDate).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
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
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-2 text-center font-mono text-slate-500">
                              {index + 1}
                            </td>
                            <td className="py-3 px-3 font-medium whitespace-nowrap text-slate-800">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                {dateFormatted}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-xs text-slate-600">
                                {log.center?.name ? `ศูนย์: ${log.center.name}` : ''}
                                {log.targetLocation ? ` | จุดบริการ: ${log.targetLocation}` : ''}
                              </div>
                              <p className="font-bold text-slate-900 mt-0.5">{log.serviceDetails}</p>
                              {log.notes && <p className="text-xs text-slate-500 mt-0.5">{log.notes}</p>}
                            </td>
                            <td className="py-3 px-3 whitespace-nowrap">
                              <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                                {log.vehicleType || 'รถจักรยานยนต์'}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-blue-700">
                              {sCount.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                              {cCount.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-slate-600">
                              {bPerUnit !== null ? bPerUnit.toFixed(2) : '-'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-black text-emerald-800">
                              {bTotal !== null
                                ? bTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : '-'}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap no-print">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  onClick={() => handleOpenEditVehicle(log)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600"
                                  title="แก้ไข"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteVehicle(log.id, log.serviceDetails)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-slate-600 hover:text-red-600"
                                  title="ลบ"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════
            TAB 2: โรงครัวอาชีวะ (Kitchen Report)
        ══════════════════════════════════════════════════════ */}
        <TabsContent value="kitchen" className="space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-base text-slate-800">
                  แบบรายงานสถิติโรงครัวอาชีวะ (A4 แนวนอน)
                </CardTitle>
                <CardDescription className="text-xs">
                  สถิติจำนวนข้าวกล่อง น้ำดื่ม และถุงยังชีพ
                </CardDescription>
              </div>
              <Button
                onClick={handlePrint}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2"
              >
                <Printer className="h-4 w-4" />
                พิมพ์รายงานครัวอาชีวะ A4
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-rose-50 rounded-lg border border-rose-200">
                  <p className="text-xs font-semibold text-rose-700">🍱 ข้าวกล่องสะสม</p>
                  <p className="text-2xl font-black text-rose-800 mt-1 font-mono">
                    {kitchenSummary.totalBoxes.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-700">💧 น้ำดื่มสะสม</p>
                  <p className="text-2xl font-black text-blue-800 mt-1 font-mono">
                    {kitchenSummary.totalWater.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs font-semibold text-amber-700">📦 ถุงยังชีพสะสม</p>
                  <p className="text-2xl font-black text-amber-800 mt-1 font-mono">
                    {kitchenSummary.totalRelief.toLocaleString()}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-4 text-center">
                สามารถจัดการบันทึกข้อมูลเพิ่มเติมได้ที่เมนู <strong>"ครัวอาชีวะ (สถิติ)"</strong>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════
            TAB 3: ภาพรวมโครงการ (Overall Summary)
        ══════════════════════════════════════════════════════ */}
        <TabsContent value="all" className="space-y-6">
          <Card className="shadow-sm border-slate-200">
            <CardHeader>
              <CardTitle className="text-base text-slate-800">
                สรุปสถิติผลการดำเนินงานรวมทุกกิจกรรม Fix it – จิตอาสา
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-200">
                  <h4 className="font-bold text-blue-900 flex items-center gap-2">
                    <Car className="h-4 w-4" /> กิจกรรมยานพาหนะ
                  </h4>
                  <p className="text-sm text-slate-600 mt-1">
                    ให้บริการซ่อมและตรวจเช็คทั้งสิ้น <strong>{vehicleSummary.totalServices.toLocaleString()}</strong> คัน/เครื่อง
                    (ซ่อมสำเร็จ <strong>{vehicleSummary.totalCompleted.toLocaleString()}</strong> คัน)
                  </p>
                </div>

                <div className="p-4 bg-rose-50/50 rounded-lg border border-rose-200">
                  <h4 className="font-bold text-rose-900 flex items-center gap-2">
                    <Utensils className="h-4 w-4" /> กิจกรรมโรงครัวอาชีวะ
                  </h4>
                  <p className="text-sm text-slate-600 mt-1">
                    แจกจ่ายข้าวกล่องและเสบียงรวม <strong>{kitchenSummary.totalQuantity.toLocaleString()}</strong> หน่วย
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Create / Edit Vehicle Modal Dialog ── */}
      <Dialog open={isVehicleModalOpen} onOpenChange={setIsVehicleModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <Car className="h-5 w-5" />
              <span>
                {editingVehicleId ? 'แก้ไขรายการสถิติยานพาหนะ' : 'บันทึกสถิติงานบริการยานพาหนะ (Fix it – จิตอาสา)'}
              </span>
            </DialogTitle>
            <DialogDescription>
              บันทึกข้อมูลสถิติการล้างทำความสะอาด ตรวจเช็ค และซ่อม-เปลี่ยนอะไหล่ ยานพาหนะ
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveVehicle} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>วันที่ปฏิบัติงาน *</Label>
                <Input
                  type="date"
                  value={vehicleFormData.serviceDate}
                  onChange={(e) =>
                    setVehicleFormData({ ...vehicleFormData, serviceDate: e.target.value })
                  }
                  required
                />
              </div>

              {isSuperAdmin ? (
                <div className="space-y-1.5">
                  <Label>ศูนย์บริการ *</Label>
                  <Select
                    value={vehicleFormData.centerId}
                    onValueChange={(v) => setVehicleFormData({ ...vehicleFormData, centerId: v })}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="เลือกศูนย์บริการ" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {centers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>ศูนย์บริการ</Label>
                  <Input
                    value={centers.find((c) => c.id === vehicleFormData.centerId)?.name || 'ศูนย์บริการของท่าน'}
                    disabled
                    className="bg-slate-100 text-slate-700"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>ประเภทยานพาหนะ *</Label>
              <Select
                value={vehicleFormData.vehicleType}
                onValueChange={(v) => setVehicleFormData({ ...vehicleFormData, vehicleType: v })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="เลือกประเภทยานพาหนะ" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  {VEHICLE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>รายละเอียดการดำเนินงาน / อาการเสียและงานซ่อม *</Label>
              <Input
                placeholder="เช่น ล้างทำความสะอาด, เปลี่ยนถ่ายน้ำมันเครื่อง, เปลี่ยนหัวเทียน, ซ่อมระบบเบรก ฯลฯ"
                value={vehicleFormData.serviceDetails}
                onChange={(e) =>
                  setVehicleFormData({ ...vehicleFormData, serviceDetails: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>จำนวนที่ให้บริการ (คัน/เครื่อง) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={vehicleFormData.serviceCount}
                  onChange={(e) => handleQtyOrBudgetChange('serviceCount', Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>จำนวนที่ซ่อมสำเร็จ (คัน/เครื่อง) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={vehicleFormData.completedCount}
                  onChange={(e) => handleQtyOrBudgetChange('completedCount', Number(e.target.value))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>งบประมาณในการดำเนินงาน/ชิ้น (บาท)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="เช่น 150.00"
                  value={vehicleFormData.budgetPerUnit}
                  onChange={(e) => handleQtyOrBudgetChange('budgetPerUnit', Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>งบประมาณทั้งสิ้น (บาท)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="คำนวณอัตโนมัติ"
                  value={vehicleFormData.totalBudget}
                  onChange={(e) => handleQtyOrBudgetChange('totalBudget', Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>พื้นที่ / จุดที่ให้บริการ</Label>
              <Input
                placeholder="เช่น วัดบ้านดอนพัฒนา, เต็นท์บริการ อบต., หมู่ 3 ต.กลางเวียง"
                value={vehicleFormData.targetLocation}
                onChange={(e) =>
                  setVehicleFormData({ ...vehicleFormData, targetLocation: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>หมายเหตุ</Label>
              <textarea
                className="flex min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="บันทึกรายละเอียดเพิ่มเติม"
                value={vehicleFormData.notes}
                onChange={(e) => setVehicleFormData({ ...vehicleFormData, notes: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsVehicleModalOpen(false)}
                disabled={vehicleSaving}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                disabled={vehicleSaving}
              >
                {vehicleSaving ? 'กำลังบันทึก...' : editingVehicleId ? 'บันทึกการแก้ไข' : 'บันทึกสถิติ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Official A4 Landscape Print Layouts (Visible only when printing) ── */}
      {activeReportTab === 'vehicles' && (
        <VehiclePrintLayout
          logs={filteredVehicleLogs}
          summary={vehicleSummary}
          selectedCenterId={selectedCenterId}
          centers={centers}
          missions={missions}
          collegeName="วิทยาลัยสารพัดช่างน่าน"
          provinceName="น่าน"
        />
      )}

      {activeReportTab === 'kitchen' && (
        <KitchenPrintLayout
          logs={kitchenLogs}
          summary={kitchenSummary}
          selectedCenterId={selectedCenterId}
          centers={centers}
          missions={missions}
          collegeName="วิทยาลัยสารพัดช่างน่าน"
          provinceName="น่าน"
        />
      )}
    </div>
  );
}
