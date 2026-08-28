'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Tv,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import {
  vehicleApi,
  kitchenApi,
  applianceApi,
  centerApi,
  missionApi,
  type VehicleLog,
  type VehicleSummary,
  type KitchenLog,
  type KitchenSummary,
  type ApplianceLog,
  type ApplianceSummary,
  type Center,
  type Mission,
} from '@/lib/api';
import { AppliancePrintLayout } from './appliance-print-layout';
import { VehiclePrintLayout } from './vehicle-print-layout';
import { KitchenPrintLayout } from '../kitchen/kitchen-print-layout';

const APPLIANCE_TYPE_OPTIONS = [
  'พัดลม',
  'หม้อหุงข้าว',
  'ตู้เย็น',
  'เครื่องซักผ้า',
  'เตารีด',
  'กระติกน้ำร้อน',
  'โทรทัศน์',
  'เครื่องเสียง / แอมป์',
  'คอมพิวเตอร์ / จอภาพ',
  'เครื่องมือช่าง / อุปกรณ์วิชาชีพ',
  'ปั๊มน้ำ / มอเตอร์ไฟฟ้า',
  'อุปกรณ์ไฟฟ้าทั่วไป',
  'อื่นๆ',
];

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

  const [activeReportTab, setActiveReportTab] = useState<'appliances' | 'vehicles' | 'kitchen' | 'all'>('appliances');
  const [centers, setCenters] = useState<Center[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);

  const [selectedCenterId, setSelectedCenterId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Appliance Logs State ──
  const [applianceLogs, setApplianceLogs] = useState<ApplianceLog[]>([]);
  const [applianceSummary, setApplianceSummary] = useState<ApplianceSummary>({
    totalEntries: 0,
    totalServices: 0,
    totalCompleted: 0,
    totalBudget: 0,
  });
  const [applianceLoading, setApplianceLoading] = useState(true);

  // ── Appliance Modal State ──
  const [isApplianceModalOpen, setIsApplianceModalOpen] = useState(false);
  const [editingApplianceId, setEditingApplianceId] = useState<string | null>(null);
  const [applianceSaving, setApplianceSaving] = useState(false);
  const [applianceFormData, setApplianceFormData] = useState({
    missionId: '',
    centerId: '',
    serviceDate: new Date().toISOString().split('T')[0],
    applianceType: 'พัดลม',
    serviceDetails: 'ล้างทำความสะอาด, ตรวจเช็คสภาพ, ซ่อม-เปลี่ยนอะไหล่',
    serviceCount: 1,
    completedCount: 1,
    budgetPerUnit: 100,
    totalBudget: 100,
    targetLocation: '',
    recipientOrg: '',
    coordinatorName: '',
    notes: '',
  });

  // ── Vehicle Logs State ──
  const [vehicleLogs, setVehicleLogs] = useState<VehicleLog[]>([]);
  const [vehicleSummary, setVehicleSummary] = useState<VehicleSummary>({
    totalEntries: 0,
    totalServices: 0,
    totalCompleted: 0,
    totalBudget: 0,
  });
  const [vehicleLoading, setVehicleLoading] = useState(true);

  // ── Vehicle Modal State ──
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleSaving, setVehicleSaving] = useState(false);
  const [vehicleFormData, setVehicleFormData] = useState({
    missionId: '',
    centerId: '',
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

      setApplianceFormData((prev) => ({
        ...prev,
        centerId: defaultCenter,
        missionId: defaultMission,
      }));

      setVehicleFormData((prev) => ({
        ...prev,
        centerId: defaultCenter,
        missionId: defaultMission,
      }));
    });
  }, [isSuperAdmin, userCenterId]);

  // Fetch All Report Data Safely
  const fetchAllReportData = useCallback(async () => {
    setApplianceLoading(true);
    setVehicleLoading(true);
    try {
      const activeCenterId =
        !isSuperAdmin && userCenterId
          ? userCenterId
          : selectedCenterId !== 'ALL'
          ? selectedCenterId
          : undefined;

      // 1. Auto-sync registered repair orders into daily summary logs
      await Promise.allSettled([
        applianceApi.syncFromOrders(activeCenterId),
        vehicleApi.syncFromOrders(activeCenterId),
      ]);

      const [aRes, asRes, vRes, vsRes, kRes, ksRes] = await Promise.allSettled([
        applianceApi.getAll(activeCenterId),
        applianceApi.getSummary(activeCenterId),
        vehicleApi.getAll(activeCenterId),
        vehicleApi.getSummary(activeCenterId),
        kitchenApi.getAll(activeCenterId),
        kitchenApi.getSummary(activeCenterId),
      ]);

      if (aRes.status === 'fulfilled' && Array.isArray(aRes.value.data)) {
        setApplianceLogs(aRes.value.data);
      } else {
        setApplianceLogs([]);
      }

      if (asRes.status === 'fulfilled' && asRes.value.data) {
        setApplianceSummary(asRes.value.data);
      } else {
        setApplianceSummary({
          totalEntries: 0,
          totalServices: 0,
          totalCompleted: 0,
          totalBudget: 0,
        });
      }

      if (vRes.status === 'fulfilled' && Array.isArray(vRes.value.data)) {
        setVehicleLogs(vRes.value.data);
      } else {
        setVehicleLogs([]);
      }

      if (vsRes.status === 'fulfilled' && vsRes.value.data) {
        setVehicleSummary(vsRes.value.data);
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
      // Graceful fallback
    } finally {
      setApplianceLoading(false);
      setVehicleLoading(false);
    }
  }, [isSuperAdmin, userCenterId, selectedCenterId]);

  useEffect(() => {
    fetchAllReportData();
  }, [fetchAllReportData]);

  // Filtered Appliance Logs
  const filteredApplianceLogs = useMemo(() => {
    return applianceLogs.filter((log) => {
      if (selectedCenterId !== 'ALL' && log.centerId !== selectedCenterId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const detailsMatch = log.serviceDetails?.toLowerCase().includes(q);
        const typeMatch = log.applianceType?.toLowerCase().includes(q);
        const locMatch = log.targetLocation?.toLowerCase().includes(q);
        const centerMatch = log.center?.name?.toLowerCase().includes(q);
        if (!detailsMatch && !typeMatch && !locMatch && !centerMatch) return false;
      }
      return true;
    });
  }, [applianceLogs, selectedCenterId, searchQuery]);

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

  // ── Appliance Handlers ──
  const handleOpenCreateAppliance = () => {
    setEditingApplianceId(null);
    const defaultCenter = !isSuperAdmin && userCenterId ? userCenterId : (centers[0]?.id || '');
    const defaultMission = missions.find((m) => m.isActive)?.id || missions[0]?.id || '';

    setApplianceFormData({
      missionId: defaultMission,
      centerId: defaultCenter,
      serviceDate: new Date().toISOString().split('T')[0],
      applianceType: 'พัดลม',
      serviceDetails: 'ล้างทำความสะอาด, ตรวจเช็คสภาพ, ซ่อม-เปลี่ยนอะไหล่',
      serviceCount: 1,
      completedCount: 1,
      budgetPerUnit: 100,
      totalBudget: 100,
      targetLocation: '',
      recipientOrg: '',
      coordinatorName: '',
      notes: '',
    });
    setIsApplianceModalOpen(true);
  };

  const handleOpenEditAppliance = (item: ApplianceLog) => {
    setEditingApplianceId(item.id);
    const sCount = Number(item.serviceCount) || 1;
    const cCount = Number(item.completedCount) || sCount;
    const bPerUnit = item.budgetPerUnit ? Number(item.budgetPerUnit) : 100;
    const bTotal = item.totalBudget ? Number(item.totalBudget) : bPerUnit * sCount;

    setApplianceFormData({
      missionId: item.missionId,
      centerId: item.centerId,
      serviceDate: new Date(item.serviceDate).toISOString().split('T')[0],
      applianceType: item.applianceType || 'พัดลม',
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
    setIsApplianceModalOpen(true);
  };

  const handleApplianceQtyOrBudgetChange = (
    field: 'serviceCount' | 'completedCount' | 'budgetPerUnit' | 'totalBudget',
    val: number
  ) => {
    setApplianceFormData((prev) => {
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

  const handleSaveAppliance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applianceFormData.serviceDetails.trim()) {
      toast({ title: 'กรุณาระบุรายละเอียดการดำเนินงาน', variant: 'destructive' });
      return;
    }

    setApplianceSaving(true);
    try {
      const payload = {
        ...applianceFormData,
        serviceCount: Number(applianceFormData.serviceCount || 1),
        completedCount: Number(applianceFormData.completedCount || 1),
        budgetPerUnit: Number(applianceFormData.budgetPerUnit || 0),
        totalBudget: Number(applianceFormData.totalBudget || 0),
      };

      if (editingApplianceId) {
        await applianceApi.update(editingApplianceId, payload);
        toast({ title: '✓ บันทึกการแก้ไขข้อมูลสำเร็จ' });
      } else {
        await applianceApi.create(payload);
        toast({ title: '✓ บันทึกสถิติงานเครื่องใช้ไฟฟ้าสำเร็จ' });
      }
      setIsApplianceModalOpen(false);
      fetchAllReportData();
    } catch {
      toast({ title: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', variant: 'destructive' });
    } finally {
      setApplianceSaving(false);
    }
  };

  const handleDeleteAppliance = async (id: string, name: string) => {
    if (!confirm(`ยืนยันการลบรายการ: "${name}" ใช่หรือไม่?`)) return;
    try {
      await applianceApi.delete(id);
      toast({ title: '✓ ลบรายการสำเร็จ' });
      fetchAllReportData();
    } catch {
      toast({ title: 'เกิดข้อผิดพลาดในการลบรายการ', variant: 'destructive' });
    }
  };

  // ── Vehicle Handlers ──
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

  const handleVehicleQtyOrBudgetChange = (
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
      fetchAllReportData();
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
      fetchAllReportData();
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
        <TabsList className="grid grid-cols-2 md:grid-cols-4 max-w-4xl bg-slate-100 p-1">
          <TabsTrigger value="appliances" className="gap-2 font-bold data-[state=active]:bg-white data-[state=active]:text-amber-700">
            <Zap className="h-4 w-4 text-amber-600" />
            <span>เครื่องใช้ไฟฟ้า/วิชาชีพ</span>
          </TabsTrigger>
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
            TAB 1: เครื่องใช้ไฟฟ้าและอุปกรณ์วิชาชีพ (Appliance Report)
        ══════════════════════════════════════════════════════ */}
        <TabsContent value="appliances" className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-white shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">จำนวนที่ให้บริการสะสม</p>
                  <h3 className="text-2xl font-black text-amber-800 mt-1 font-mono">
                    {applianceSummary.totalServices.toLocaleString()}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">เครื่อง / ชิ้น</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                  <Zap className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">จำนวนที่ซ่อมสำเร็จ</p>
                  <h3 className="text-2xl font-black text-emerald-700 mt-1 font-mono">
                    {applianceSummary.totalCompleted.toLocaleString()}
                  </h3>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                    {applianceSummary.totalServices > 0
                      ? `คิดเป็น ${Math.round((applianceSummary.totalCompleted / applianceSummary.totalServices) * 100)}%`
                      : '100%'}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-white shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">งบประมาณรวมทั้งสิ้น</p>
                  <h3 className="text-2xl font-black text-blue-800 mt-1 font-mono">
                    ฿{applianceSummary.totalBudget.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">ค่าอะไหล่/วัสดุสิ้นเปลือง</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                  <Sparkles className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">จำนวนรายการบันทึก</p>
                  <h3 className="text-2xl font-black text-slate-800 mt-1 font-mono">
                    {applianceLogs.length}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">ชุดสถิติการดำเนินงาน</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <Wrench className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filter & Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border shadow-sm">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Center Filter */}
              <div className="w-full sm:w-[240px]">
                <Select
                  value={selectedCenterId}
                  onValueChange={(val) => setSelectedCenterId(val)}
                  disabled={!isSuperAdmin && !!userCenterId}
                >
                  <SelectTrigger>
                    <Building2 className="h-4 w-4 text-slate-400 mr-2" />
                    <SelectValue placeholder="เลือกศูนย์บริการ" />
                  </SelectTrigger>
                  <SelectContent>
                    {isSuperAdmin && <SelectItem value="ALL">🏢 รวมทุกศูนย์บริการ (น่าน)</SelectItem>}
                    {centers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search input */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="ค้นหาประเภทเครื่องใช้ไฟฟ้า, อาการ, รายละเอียดงาน..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Button
              onClick={handleOpenCreateAppliance}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-2 shadow-sm shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>+ บันทึกสถิติเครื่องใช้ไฟฟ้า</span>
            </Button>
          </div>

          {/* Main Data Table */}
          <Card className="border shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b py-3.5 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    ตารางรายงานกิจกรรมเครื่องใช้ไฟฟ้าและอุปกรณ์วิชาชีพ (8 คอลัมน์ทางการ)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    ล้างทำความสะอาด – ตรวจเช็ค – ซ่อม-เปลี่ยนอะไหล่ เครื่องใช้ไฟฟ้า /อุปกรณ์วิชาชีพ
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono bg-amber-50 text-amber-800 border-amber-200">
                  {filteredApplianceLogs.length} รายการ
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#e2edd8] border-b text-slate-900 font-bold text-center">
                      <th className="py-3 px-2 border w-12">ที่</th>
                      <th className="py-3 px-3 border w-28">วัน/เดือน/ปี</th>
                      <th className="py-3 px-4 border text-left">รายละเอียดการดำเนินงาน</th>
                      <th className="py-3 px-3 border w-36">ประเภทเครื่องใช้ไฟฟ้า</th>
                      <th className="py-3 px-2 border w-24">จำนวนที่<br/>ให้บริการ</th>
                      <th className="py-3 px-2 border w-24">จำนวนที่ซ่อม<br/>สำเร็จ</th>
                      <th className="py-3 px-3 border w-28 text-right">งบประมาณ/<br/>ชิ้น (บาท)</th>
                      <th className="py-3 px-3 border w-28 text-right">งบประมาณ<br/>ทั้งสิ้น (บาท)</th>
                      <th className="py-3 px-2 border w-20 no-print">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {applianceLoading ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          กำลังโหลดข้อมูลสถิติเครื่องใช้ไฟฟ้า...
                        </td>
                      </tr>
                    ) : filteredApplianceLogs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center gap-2">
                            <Zap className="h-8 w-8 text-slate-300" />
                            <p className="font-semibold text-slate-600">ยังไม่มีข้อมูลรายการบริการเครื่องใช้ไฟฟ้า</p>
                            <p className="text-xs text-slate-400">
                              ข้อมูลจะถูกบันทึกอัตโนมัติเมื่อลงทะเบียนงานซ่อมหมวดไฟฟ้า/อิเล็กทรอนิกส์ หรือกดปุ่มบันทึกด้านบน
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredApplianceLogs.map((log, index) => {
                        const dateObj = new Date(log.serviceDate);
                        const thaiDate = dateObj.toLocaleDateString('th-TH', {
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
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors text-center">
                            <td className="py-2.5 px-2 border font-mono text-slate-600">{index + 1}</td>
                            <td className="py-2.5 px-3 border whitespace-nowrap font-medium text-slate-800">
                              {thaiDate}
                            </td>
                            <td className="py-2.5 px-4 border text-left">
                              <div className="font-semibold text-slate-900">
                                {log.center?.name ? `ศูนย์: ${log.center.name}` : ''}
                                {log.targetLocation ? ` | จุดบริการ: ${log.targetLocation}` : ''}
                              </div>
                              <div className="text-slate-700 mt-0.5">
                                <span className="font-bold text-slate-900">งานที่ทำ:</span> {log.serviceDetails}
                              </div>
                              {log.notes && (
                                <div className="text-[10px] text-slate-500 mt-0.5">หมายเหตุ: {log.notes}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 border font-medium text-slate-800">
                              <Badge variant="outline" className="bg-amber-50 text-amber-900 border-amber-200">
                                {log.applianceType || 'เครื่องใช้ไฟฟ้าทั่วไป'}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-2 border font-mono font-bold text-blue-700">
                              {sCount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 border font-mono font-bold text-emerald-700">
                              {cCount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 border font-mono text-right text-slate-700">
                              {bPerUnit !== null
                                ? bPerUnit.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : '-'}
                            </td>
                            <td className="py-2.5 px-3 border font-mono text-right font-bold text-emerald-800">
                              {bTotal !== null
                                ? bTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : '-'}
                            </td>
                            <td className="py-2.5 px-2 border no-print">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-blue-600"
                                  onClick={() => handleOpenEditAppliance(log)}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-red-600"
                                  onClick={() => handleDeleteAppliance(log.id, log.serviceDetails)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#dcecd0] border-t-2 border-slate-400 font-bold text-slate-900">
                      <td colSpan={4} className="py-3 px-4 border text-center font-black text-xs">
                        รวมทั้งสิ้น ({filteredApplianceLogs.length} รายการ):
                      </td>
                      <td className="py-3 px-2 border text-center font-mono font-black text-amber-800 text-sm">
                        {filteredApplianceLogs.reduce((acc, l) => acc + Number(l.serviceCount || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-2 border text-center font-mono font-black text-emerald-800 text-sm">
                        {filteredApplianceLogs.reduce((acc, l) => acc + Number(l.completedCount || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 border text-center font-mono text-slate-400">-</td>
                      <td className="py-3 px-3 border text-right font-mono font-black text-emerald-900 text-sm">
                        {filteredApplianceLogs.reduce((acc, l) => acc + Number(l.totalBudget || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-2 border no-print"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════
            TAB 2: ยานพาหนะ (Vehicle Report)
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

          {/* Filter & Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border shadow-sm">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="w-full sm:w-[240px]">
                <Select
                  value={selectedCenterId}
                  onValueChange={(val) => setSelectedCenterId(val)}
                  disabled={!isSuperAdmin && !!userCenterId}
                >
                  <SelectTrigger>
                    <Building2 className="h-4 w-4 text-slate-400 mr-2" />
                    <SelectValue placeholder="เลือกศูนย์บริการ" />
                  </SelectTrigger>
                  <SelectContent>
                    {isSuperAdmin && <SelectItem value="ALL">🏢 รวมทุกศูนย์บริการ (น่าน)</SelectItem>}
                    {centers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="ค้นหาประเภท, รายละเอียดงาน, จุดบริการ..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Button
              onClick={handleOpenCreateVehicle}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-sm shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>+ บันทึกสถิติงานยานพาหนะ</span>
            </Button>
          </div>

          {/* Main Data Table */}
          <Card className="border shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b py-3.5 px-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    ตารางรายงานกิจกรรมยานพาหนะ (8 คอลัมน์ทางการ)
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    ล้างทำความสะอาด – ตรวจเช็ค – ซ่อม-เปลี่ยนอะไหล่ ยานพาหนะ
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono bg-blue-50 text-blue-800 border-blue-200">
                  {filteredVehicleLogs.length} รายการ
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#e2edd8] border-b text-slate-900 font-bold text-center">
                      <th className="py-3 px-2 border w-12">ที่</th>
                      <th className="py-3 px-3 border w-28">วัน/เดือน/ปี</th>
                      <th className="py-3 px-4 border text-left">รายละเอียดการดำเนินงาน</th>
                      <th className="py-3 px-3 border w-36">ประเภทยานพาหนะ</th>
                      <th className="py-3 px-2 border w-24">จำนวนที่<br/>ให้บริการ</th>
                      <th className="py-3 px-2 border w-24">จำนวนที่ซ่อม<br/>สำเร็จ</th>
                      <th className="py-3 px-3 border w-28 text-right">งบประมาณ/<br/>ชิ้น (บาท)</th>
                      <th className="py-3 px-3 border w-28 text-right">งบประมาณ<br/>ทั้งสิ้น (บาท)</th>
                      <th className="py-3 px-2 border w-20 no-print">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vehicleLoading ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          กำลังโหลดข้อมูลสถิติยานพาหนะ...
                        </td>
                      </tr>
                    ) : filteredVehicleLogs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center gap-2">
                            <Car className="h-8 w-8 text-slate-300" />
                            <p className="font-semibold text-slate-600">ยังไม่มีข้อมูลรายการบริการยานพาหนะ</p>
                            <p className="text-xs text-slate-400">
                              ข้อมูลจะถูกบันทึกอัตโนมัติเมื่อลงทะเบียนงานซ่อมยานพาหนะ หรือกดปุ่มบันทึกด้านบน
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredVehicleLogs.map((log, index) => {
                        const dateObj = new Date(log.serviceDate);
                        const thaiDate = dateObj.toLocaleDateString('th-TH', {
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
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors text-center">
                            <td className="py-2.5 px-2 border font-mono text-slate-600">{index + 1}</td>
                            <td className="py-2.5 px-3 border whitespace-nowrap font-medium text-slate-800">
                              {thaiDate}
                            </td>
                            <td className="py-2.5 px-4 border text-left">
                              <div className="font-semibold text-slate-900">
                                {log.center?.name ? `ศูนย์: ${log.center.name}` : ''}
                                {log.targetLocation ? ` | จุดบริการ: ${log.targetLocation}` : ''}
                              </div>
                              <div className="text-slate-700 mt-0.5">
                                <span className="font-bold text-slate-900">งานที่ทำ:</span> {log.serviceDetails}
                              </div>
                              {log.notes && (
                                <div className="text-[10px] text-slate-500 mt-0.5">หมายเหตุ: {log.notes}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 border font-medium text-slate-800">
                              <Badge variant="outline" className="bg-blue-50 text-blue-900 border-blue-200">
                                {log.vehicleType || 'รถจักรยานยนต์'}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-2 border font-mono font-bold text-blue-700">
                              {sCount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-2 border font-mono font-bold text-emerald-700">
                              {cCount.toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3 border font-mono text-right text-slate-700">
                              {bPerUnit !== null
                                ? bPerUnit.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : '-'}
                            </td>
                            <td className="py-2.5 px-3 border font-mono text-right font-bold text-emerald-800">
                              {bTotal !== null
                                ? bTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                : '-'}
                            </td>
                            <td className="py-2.5 px-2 border no-print">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-blue-600"
                                  onClick={() => handleOpenEditVehicle(log)}
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-slate-600 hover:text-red-600"
                                  onClick={() => handleDeleteVehicle(log.id, log.serviceDetails)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="bg-[#dcecd0] border-t-2 border-slate-400 font-bold text-slate-900">
                      <td colSpan={4} className="py-3 px-4 border text-center font-black text-xs">
                        รวมทั้งสิ้น ({filteredVehicleLogs.length} รายการ):
                      </td>
                      <td className="py-3 px-2 border text-center font-mono font-black text-blue-800 text-sm">
                        {filteredVehicleLogs.reduce((acc, l) => acc + Number(l.serviceCount || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-2 border text-center font-mono font-black text-emerald-800 text-sm">
                        {filteredVehicleLogs.reduce((acc, l) => acc + Number(l.completedCount || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-3 border text-center font-mono text-slate-400">-</td>
                      <td className="py-3 px-3 border text-right font-mono font-black text-emerald-900 text-sm">
                        {filteredVehicleLogs.reduce((acc, l) => acc + Number(l.totalBudget || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-2 border no-print"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════
            TAB 3: โรงครัวอาชีวะ (Relief Kitchen)
        ══════════════════════════════════════════════════════ */}
        <TabsContent value="kitchen" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-rose-200 bg-gradient-to-br from-rose-50/50 to-white shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">ข้าวกล่องปรุงสุกสะสม</p>
                  <h3 className="text-2xl font-black text-rose-700 mt-1 font-mono">
                    {kitchenSummary.totalBoxes.toLocaleString()}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">กล่อง</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <Utensils className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-cyan-200 bg-gradient-to-br from-cyan-50/50 to-white shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">น้ำดื่มสะอาดแจกจ่าย</p>
                  <h3 className="text-2xl font-black text-cyan-700 mt-1 font-mono">
                    {kitchenSummary.totalWater.toLocaleString()}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">ขวด / แก้ว</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-cyan-100 flex items-center justify-center text-cyan-600">
                  <Sparkles className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-200 bg-gradient-to-br from-amber-50/50 to-white shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">ถุงยังชีพแจกจ่าย</p>
                  <h3 className="text-2xl font-black text-amber-700 mt-1 font-mono">
                    {kitchenSummary.totalRelief.toLocaleString()}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">ชุด</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <Building2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-500">ยอดรวมแจกจ่ายทั้งหมด</p>
                  <h3 className="text-2xl font-black text-slate-800 mt-1 font-mono">
                    {kitchenSummary.totalQuantity.toLocaleString()}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">รายการ</p>
                </div>
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="bg-white p-4 rounded-xl border text-center text-slate-500 text-xs">
            💡 สำหรับการลงบันทึกและจัดการข้อมูลโรงครัวอย่างละเอียด สามารถเข้าใช้งานผ่านเมนู <strong>"ครัวอาชีวะ (สถิติ)"</strong> ทางแถบเมนูด้านซ้าย
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════
            TAB 4: ภาพรวมโครงการ (Overall Summary)
        ══════════════════════════════════════════════════════ */}
        <TabsContent value="all" className="space-y-6">
          {/* Grand Highlight Budget & Service Card */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-slate-700">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <Badge className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-black text-xs px-2.5 py-0.5 mb-2">
                  สรุปประมวลผลรวมทุกกิจกรรมโครงการ
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  แบบสรุปผลการดำเนินงานและงบประมาณรวมทั้ง 3 กิจกรรม
                </h2>
                <p className="text-xs text-blue-200 mt-1">
                  วิทยาลัยสารพัดช่างน่าน (โครงการบูรณาการ Fix It Center จิตอาสา ช่วยเหลือผู้ประสบอุทกภัย)
                </p>
              </div>

              <Button
                onClick={() => fetchAllReportData()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-10 px-4 shadow-md shrink-0"
              >
                <RefreshCw className="h-4 w-4" />
                <span>🔄 ประมวลผลรวมยอดรายวันทุกกิจกรรม</span>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <span className="text-xs text-blue-200 font-medium">งบประมาณรวมทั้ง 3 กิจกรรม</span>
                <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono mt-1">
                  ฿{(
                    applianceSummary.totalBudget +
                    vehicleSummary.totalBudget +
                    (kitchenSummary.totalBoxes * 50 + kitchenSummary.totalWater * 7 + kitchenSummary.totalRelief * 500)
                  ).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] text-blue-300 mt-0.5 block">คำนวณจากยอดอะไหล่/วัตถุดิบทุกกิจกรรม</span>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <span className="text-xs text-blue-200 font-medium">ยอดรับบริการและแจกจ่ายรวม</span>
                <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-1">
                  {(
                    applianceSummary.totalServices +
                    vehicleSummary.totalServices +
                    kitchenSummary.totalQuantity
                  ).toLocaleString()}{' '}
                  <span className="text-sm font-normal text-white">รายการ</span>
                </div>
                <span className="text-[11px] text-blue-300 mt-0.5 block">รวมเครื่องใช้ไฟฟ้า + ยานพาหนะ + โรงครัว</span>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <span className="text-xs text-blue-200 font-medium">งานซ่อมสำเร็จรวม</span>
                <div className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono mt-1">
                  {(applianceSummary.totalCompleted + vehicleSummary.totalCompleted).toLocaleString()}{' '}
                  <span className="text-sm font-normal text-white">ชิ้น/คัน</span>
                </div>
                <span className="text-[11px] text-blue-300 mt-0.5 block">
                  คิดเป็นอัตราสำเร็จ{' '}
                  {applianceSummary.totalServices + vehicleSummary.totalServices > 0
                    ? Math.round(
                        ((applianceSummary.totalCompleted + vehicleSummary.totalCompleted) /
                          (applianceSummary.totalServices + vehicleSummary.totalServices)) *
                          100
                      )
                    : 0}
                  % ของงานซ่อมทั้งหมด
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-amber-900 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-600" />
                  <span>เครื่องใช้ไฟฟ้าและอุปกรณ์วิชาชีพ</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center text-sm border-b pb-1">
                  <span className="text-slate-600">ยอดรับบริการสะสม:</span>
                  <span className="font-bold text-amber-800 font-mono">{applianceSummary.totalServices} ชิ้น</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b pb-1">
                  <span className="text-slate-600">ซ่อมสำเร็จ:</span>
                  <span className="font-bold text-emerald-700 font-mono">{applianceSummary.totalCompleted} ชิ้น</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-slate-600">งบประมาณทั้งสิ้น:</span>
                  <span className="font-bold text-slate-900 font-mono">฿{applianceSummary.totalBudget.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-blue-900 flex items-center gap-2">
                  <Car className="h-5 w-5 text-blue-600" />
                  <span>งานซ่อมและบริการยานพาหนะ</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center text-sm border-b pb-1">
                  <span className="text-slate-600">ยอดรับบริการสะสม:</span>
                  <span className="font-bold text-blue-700 font-mono">{vehicleSummary.totalServices} คัน/เครื่อง</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b pb-1">
                  <span className="text-slate-600">ซ่อมสำเร็จ:</span>
                  <span className="font-bold text-emerald-700 font-mono">{vehicleSummary.totalCompleted} คัน/เครื่อง</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-slate-600">งบประมาณทั้งสิ้น:</span>
                  <span className="font-bold text-slate-900 font-mono">฿{vehicleSummary.totalBudget.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-white shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-rose-900 flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-rose-600" />
                  <span>กิจกรรมโรงครัวอาชีวะจิตอาสา</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center text-sm border-b pb-1">
                  <span className="text-slate-600">ข้าวกล่องปรุงสุก:</span>
                  <span className="font-bold text-rose-700 font-mono">{kitchenSummary.totalBoxes} กล่อง</span>
                </div>
                <div className="flex justify-between items-center text-sm border-b pb-1">
                  <span className="text-slate-600">น้ำดื่มสะอาด:</span>
                  <span className="font-bold text-cyan-700 font-mono">{kitchenSummary.totalWater} ขวด</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-slate-600">ถุงยังชีพ:</span>
                  <span className="font-bold text-amber-700 font-mono">{kitchenSummary.totalRelief} ชุด</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Appliance Modal (Add / Edit) ── */}
      <Dialog open={isApplianceModalOpen} onOpenChange={setIsApplianceModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700">
              <Zap className="h-5 w-5" />
              <span>{editingApplianceId ? 'แก้ไขข้อมูลสถิติเครื่องใช้ไฟฟ้า' : 'บันทึกสถิติงานเครื่องใช้ไฟฟ้า / อุปกรณ์วิชาชีพ'}</span>
            </DialogTitle>
            <DialogDescription>
              บันทึกข้อมูลสำหรับแสดงผลในแบบรายงานทางการ 8 คอลัมน์ (A4 แนวนอน)
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAppliance} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ศูนย์บริการ *</Label>
                <Select
                  value={applianceFormData.centerId}
                  onValueChange={(val) => setApplianceFormData({ ...applianceFormData, centerId: val })}
                  disabled={!isSuperAdmin && !!userCenterId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกศูนย์" />
                  </SelectTrigger>
                  <SelectContent>
                    {centers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>วันที่ให้บริการ *</Label>
                <Input
                  type="date"
                  value={applianceFormData.serviceDate}
                  onChange={(e) =>
                    setApplianceFormData({ ...applianceFormData, serviceDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>ประเภทเครื่องใช้ไฟฟ้า / อุปกรณ์วิชาชีพ *</Label>
              <div className="flex gap-2">
                <Select
                  value={applianceFormData.applianceType}
                  onValueChange={(val) =>
                    setApplianceFormData({ ...applianceFormData, applianceType: val })
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="เลือกประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    {APPLIANCE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="หรือพิมพ์ระบุเอง"
                  value={applianceFormData.applianceType}
                  onChange={(e) =>
                    setApplianceFormData({ ...applianceFormData, applianceType: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>รายละเอียดการดำเนินงาน (งานที่ทำ / อาการซ่อม) *</Label>
              <Input
                placeholder="เช่น ล้างทำความสะอาด, ตรวจเช็คสภาพ, ซ่อม-เปลี่ยนอะไหล่, เปลี่ยนซีล, ซ่อมมอเตอร์"
                value={applianceFormData.serviceDetails}
                onChange={(e) =>
                  setApplianceFormData({ ...applianceFormData, serviceDetails: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>จำนวนที่ให้บริการ (เครื่อง/ชิ้น) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={applianceFormData.serviceCount}
                  onChange={(e) => handleApplianceQtyOrBudgetChange('serviceCount', Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>จำนวนที่ซ่อมสำเร็จ (เครื่อง/ชิ้น) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={applianceFormData.completedCount}
                  onChange={(e) => handleApplianceQtyOrBudgetChange('completedCount', Number(e.target.value))}
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
                  placeholder="เช่น 100.00"
                  value={applianceFormData.budgetPerUnit}
                  onChange={(e) => handleApplianceQtyOrBudgetChange('budgetPerUnit', Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label>งบประมาณทั้งสิ้น (บาท)</Label>
                <Input
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="คำนวณอัตโนมัติ"
                  value={applianceFormData.totalBudget}
                  onChange={(e) => handleApplianceQtyOrBudgetChange('totalBudget', Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>พื้นที่ / จุดที่ให้บริการ</Label>
              <Input
                placeholder="เช่น วัดบ้านดอนพัฒนา, เต็นท์บริการ อบต., หมู่ 3 ต.กลางเวียง"
                value={applianceFormData.targetLocation}
                onChange={(e) =>
                  setApplianceFormData({ ...applianceFormData, targetLocation: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>หมายเหตุ</Label>
              <textarea
                className="flex min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="บันทึกรายละเอียดเพิ่มเติม"
                value={applianceFormData.notes}
                onChange={(e) => setApplianceFormData({ ...applianceFormData, notes: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsApplianceModalOpen(false)}
                disabled={applianceSaving}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                disabled={applianceSaving}
              >
                {applianceSaving ? 'กำลังบันทึก...' : editingApplianceId ? 'บันทึกการแก้ไข' : 'บันทึกสถิติ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Vehicle Modal (Add / Edit) ── */}
      <Dialog open={isVehicleModalOpen} onOpenChange={setIsVehicleModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <Car className="h-5 w-5" />
              <span>{editingVehicleId ? 'แก้ไขข้อมูลสถิติยานพาหนะ' : 'บันทึกสถิติงานบริการยานพาหนะ'}</span>
            </DialogTitle>
            <DialogDescription>
              บันทึกข้อมูลสำหรับแสดงผลในแบบรายงานทางการ 8 คอลัมน์ (A4 แนวนอน)
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveVehicle} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>ศูนย์บริการ *</Label>
                <Select
                  value={vehicleFormData.centerId}
                  onValueChange={(val) => setVehicleFormData({ ...vehicleFormData, centerId: val })}
                  disabled={!isSuperAdmin && !!userCenterId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกศูนย์" />
                  </SelectTrigger>
                  <SelectContent>
                    {centers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>วันที่ให้บริการ *</Label>
                <Input
                  type="date"
                  value={vehicleFormData.serviceDate}
                  onChange={(e) =>
                    setVehicleFormData({ ...vehicleFormData, serviceDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>ประเภทยานพาหนะ *</Label>
              <div className="flex gap-2">
                <Select
                  value={vehicleFormData.vehicleType}
                  onValueChange={(val) =>
                    setVehicleFormData({ ...vehicleFormData, vehicleType: val })
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="เลือกประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="หรือพิมพ์ระบุเอง"
                  value={vehicleFormData.vehicleType}
                  onChange={(e) =>
                    setVehicleFormData({ ...vehicleFormData, vehicleType: e.target.value })
                  }
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>รายละเอียดการดำเนินงาน (งานที่ทำ / อาการซ่อม) *</Label>
              <Input
                placeholder="เช่น ล้างทำความสะอาด, ตรวจเช็คสภาพ, เปลี่ยนถ่ายน้ำมันเครื่อง, ซ่อมระบบเบรก"
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
                  onChange={(e) => handleVehicleQtyOrBudgetChange('serviceCount', Number(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>จำนวนที่ซ่อมสำเร็จ (คัน/เครื่อง) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={vehicleFormData.completedCount}
                  onChange={(e) => handleVehicleQtyOrBudgetChange('completedCount', Number(e.target.value))}
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
                  onChange={(e) => handleVehicleQtyOrBudgetChange('budgetPerUnit', Number(e.target.value))}
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
                  onChange={(e) => handleVehicleQtyOrBudgetChange('totalBudget', Number(e.target.value))}
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
      {activeReportTab === 'appliances' && (
        <AppliancePrintLayout
          logs={filteredApplianceLogs}
          summary={applianceSummary}
          selectedCenterId={selectedCenterId}
          centers={centers}
          missions={missions}
          collegeName="วิทยาลัยสารพัดช่างน่าน"
          provinceName="น่าน"
        />
      )}

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
