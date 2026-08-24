'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth.store';
import {
  kitchenApi,
  kitchenApi as kApi,
  KitchenLog,
  KitchenSummary,
  missionApi,
  centerApi,
  Mission,
  Center,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Utensils,
  Plus,
  Package,
  Droplets,
  HeartHandshake,
  Calendar,
  MapPin,
  UserCheck,
  Search,
  Printer,
  Trash2,
  Edit2,
  Building2,
  FileSpreadsheet,
  Layers,
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  { code: 'K01', label: '🍱 ข้าวกล่องปรุงสุกพร้อมรับประทาน', defaultUnit: 'กล่อง' },
  { code: 'K02', label: '💧 น้ำดื่มและเครื่องดื่มบริการประชาชน', defaultUnit: 'ขวด' },
  { code: 'K03', label: '📦 ถุงยังชีพและอาหารแห้ง', defaultUnit: 'ชุด' },
  { code: 'K99', label: '✨ บริการครัวอาชีวะอื่นๆ (ระบุรายละเอียด)', defaultUnit: 'รายการ' },
];

export default function KitchenPage() {
  const { user } = useAuthStore();
  const { toast } = useToast();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const userCenterId = user?.centerId;

  const [logs, setLogs] = useState<KitchenLog[]>([]);
  const [summary, setSummary] = useState<KitchenSummary>({
    totalEntries: 0,
    totalQuantity: 0,
    totalBoxes: 0,
    totalWater: 0,
    totalRelief: 0,
  });
  const [loading, setLoading] = useState(true);
  const [centers, setCenters] = useState<Center[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);

  // Filter state
  const [selectedCenterId, setSelectedCenterId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    missionId: '',
    centerId: '',
    serviceDate: new Date().toISOString().split('T')[0],
    categoryCode: 'K01',
    menuName: '',
    quantity: 100,
    unit: 'กล่อง',
    targetLocation: '',
    recipientOrg: '',
    coordinatorName: '',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const activeCenterId = !isSuperAdmin && userCenterId ? userCenterId : (selectedCenterId !== 'ALL' ? selectedCenterId : undefined);
      
      const [logsRes, summaryRes] = await Promise.all([
        kitchenApi.getAll(activeCenterId),
        kitchenApi.getSummary(activeCenterId),
      ]);
      setLogs(Array.isArray(logsRes.data) ? logsRes.data : []);
      setSummary(summaryRes.data || {
        totalEntries: 0,
        totalQuantity: 0,
        totalBoxes: 0,
        totalWater: 0,
        totalRelief: 0,
      });
    } catch (err: any) {
      if (err?.response?.status !== 401) {
        toast({ title: 'เกิดข้อผิดพลาดในการโหลดข้อมูลครัวอาชีวะ', variant: 'destructive' });
      }
    } finally {
      setLoading(false);
    }
  }, [isSuperAdmin, userCenterId, selectedCenterId, toast]);

  useEffect(() => {
    Promise.all([centerApi.getAll(), missionApi.getAll()]).then(([cRes, mRes]) => {
      const cList = Array.isArray(cRes.data) ? cRes.data : [];
      const mList = Array.isArray(mRes.data) ? mRes.data : [];
      setCenters(cList);
      setMissions(mList);

      const defaultCenter = !isSuperAdmin && userCenterId ? userCenterId : (cList[0]?.id || '');
      const defaultMission = mList.find((m) => m.isActive)?.id || mList[0]?.id || '';

      setFormData((prev) => ({
        ...prev,
        centerId: defaultCenter,
        missionId: defaultMission,
      }));
    });
  }, [isSuperAdmin, userCenterId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreate = () => {
    setEditingId(null);
    const defaultCenter = !isSuperAdmin && userCenterId ? userCenterId : (centers[0]?.id || '');
    const defaultMission = missions.find((m) => m.isActive)?.id || missions[0]?.id || '';

    setFormData({
      missionId: defaultMission,
      centerId: defaultCenter,
      serviceDate: new Date().toISOString().split('T')[0],
      categoryCode: 'K01',
      menuName: '',
      quantity: 100,
      unit: 'กล่อง',
      targetLocation: '',
      recipientOrg: '',
      coordinatorName: user?.fullName || '',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: KitchenLog) => {
    setEditingId(item.id);
    setFormData({
      missionId: item.missionId,
      centerId: item.centerId,
      serviceDate: new Date(item.serviceDate).toISOString().split('T')[0],
      categoryCode: item.categoryCode,
      menuName: item.menuName,
      quantity: item.quantity,
      unit: item.unit || 'กล่อง',
      targetLocation: item.targetLocation,
      recipientOrg: item.recipientOrg || '',
      coordinatorName: item.coordinatorName || '',
      notes: item.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleCategoryChange = (catCode: string) => {
    const opt = CATEGORY_OPTIONS.find((c) => c.code === catCode);
    setFormData((prev) => ({
      ...prev,
      categoryCode: catCode,
      unit: opt ? opt.defaultUnit : prev.unit,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.menuName.trim()) {
      toast({ title: 'กรุณาระบุรายละเอียดเมนู / รายการแจกจ่าย', variant: 'destructive' });
      return;
    }
    if (!formData.targetLocation.trim()) {
      toast({ title: 'กรุณาระบุพื้นที่หรือชุมชนเป้าหมาย', variant: 'destructive' });
      return;
    }
    if (formData.quantity <= 0) {
      toast({ title: 'จำนวนต้องมากกว่า 0', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await kitchenApi.update(editingId, {
          ...formData,
          quantity: Number(formData.quantity),
        });
        toast({ title: '✓ บันทึกการแก้ไขข้อมูลสำเร็จ' });
      } else {
        await kitchenApi.create({
          ...formData,
          quantity: Number(formData.quantity),
        });
        toast({ title: '✓ บันทึกสถิติครัวอาชีวะสำเร็จ' });
      }
      setIsModalOpen(false);
      fetchData();
    } catch {
      toast({ title: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ยืนยันการลบรายการ: "${name}" ใช่หรือไม่?`)) return;
    try {
      await kitchenApi.delete(id);
      toast({ title: '✓ ลบรายการสำเร็จ' });
      fetchData();
    } catch {
      toast({ title: 'เกิดข้อผิดพลาดในการลบรายการ', variant: 'destructive' });
    }
  };

  const filteredLogs = logs.filter((item) => {
    if (selectedCategoryFilter !== 'ALL' && item.categoryCode !== selectedCategoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMenu = item.menuName?.toLowerCase().includes(q);
      const matchLoc = item.targetLocation?.toLowerCase().includes(q);
      const matchCenter = item.center?.name?.toLowerCase().includes(q);
      const matchCoord = item.coordinatorName?.toLowerCase().includes(q);
      if (!matchMenu && !matchLoc && !matchCenter && !matchCoord) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500 text-white shadow-md shadow-rose-200">
              <Utensils className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">ครัวอาชีวะ (Vocational Kitchen & Relief)</h1>
              <p className="text-sm text-slate-500">
                บันทึกข้อมูลสถิติการจัดทำและแจกจ่ายข้าวกล่อง น้ำดื่ม และเสบียงยังชีพบริการประชาชนและผู้ประสบภัย
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => window.print()}
            variant="outline"
            className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 no-print"
          >
            <Printer className="h-4 w-4" />
            พิมพ์รายงานสรุป
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="gap-2 bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200"
          >
            <Plus className="h-4 w-4" />
            บันทึกรายการแจกจ่ายใหม่
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-rose-500 shadow-sm bg-gradient-to-br from-rose-50/40 to-white">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold text-rose-700">
              <span>ข้าวกล่องปรุงสุกทั้งหมด</span>
              <Utensils className="h-4 w-4 text-rose-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-slate-900">
              {summary.totalBoxes.toLocaleString()} <span className="text-sm font-normal text-slate-500">กล่อง</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-rose-600 font-medium">🍱 ปรุงสุกพร้อมรับประทาน</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm bg-gradient-to-br from-blue-50/40 to-white">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold text-blue-700">
              <span>น้ำดื่มและเครื่องดื่ม</span>
              <Droplets className="h-4 w-4 text-blue-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-slate-900">
              {summary.totalWater.toLocaleString()} <span className="text-sm font-normal text-slate-500">ขวด/แก้ว</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-blue-600 font-medium">💧 บริการดับกระหายประชาชน</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm bg-gradient-to-br from-amber-50/40 to-white">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold text-amber-700">
              <span>ถุงยังชีพ / เสบียงแห้ง</span>
              <Package className="h-4 w-4 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-slate-900">
              {summary.totalRelief.toLocaleString()} <span className="text-sm font-normal text-slate-500">ชุด</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-amber-600 font-medium">📦 เสบียงบรรเทาทุกข์</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm bg-gradient-to-br from-emerald-50/40 to-white">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs font-semibold text-emerald-700">
              <span>ยอดรวมทุกรายการ</span>
              <HeartHandshake className="h-4 w-4 text-emerald-500" />
            </CardDescription>
            <CardTitle className="text-3xl font-extrabold text-slate-900">
              {summary.totalQuantity.toLocaleString()} <span className="text-sm font-normal text-slate-500">หน่วย</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-emerald-600 font-medium">📋 บันทึกแล้ว {summary.totalEntries} ครั้ง</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4 flex flex-col md:flex-row items-center gap-3">
          {isSuperAdmin && (
            <div className="w-full md:w-64">
              <Select value={selectedCenterId} onValueChange={setSelectedCenterId}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="เลือกศูนย์บริการ" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="ALL">ทุกศูนย์บริการทั่วประเทศ</SelectItem>
                  {centers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="w-full md:w-56">
            <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="หมวดรายการ" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="ALL">ทุกหมวดรายการ</SelectItem>
                {CATEGORY_OPTIONS.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="ค้นหาเมนู, ชุมชนเป้าหมาย, ผู้รับผิดชอบ..."
              className="pl-9 bg-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <CardTitle className="text-base text-slate-800">
              ประวัติการจัดทำและแจกจ่าย ({filteredLogs.length} รายการ)
            </CardTitle>
            <CardDescription className="text-xs">
              ข้อมูลสถิติของศูนย์ซ่อมสร้างเพื่อชุมชน (FixIt Center)
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-slate-500">กำลังโหลดข้อมูลสถิติครัวอาชีวะ...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <Utensils className="h-12 w-12 text-slate-300 mx-auto" />
              <p className="text-slate-600 font-medium">ยังไม่มีรายการบันทึกสถิติครัวอาชีวะ</p>
              <Button onClick={handleOpenCreate} variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                เพิ่มรายการแรก
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-medium border-b text-xs">
                  <tr>
                    <th className="py-3 px-4">วันที่</th>
                    <th className="py-3 px-4">ศูนย์บริการ</th>
                    <th className="py-3 px-4">หมวด</th>
                    <th className="py-3 px-4">รายการ / เมนูอาหาร</th>
                    <th className="py-3 px-4 text-right">จำนวน</th>
                    <th className="py-3 px-4">พื้นที่ / ชุมชนเป้าหมาย</th>
                    <th className="py-3 px-4">ผู้รับผิดชอบ / ประสานงาน</th>
                    <th className="py-3 px-4 text-center no-print">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map((log) => {
                    const badgeColor =
                      log.categoryCode === 'K01' ? 'bg-rose-100 text-rose-800 border-rose-200' :
                      log.categoryCode === 'K02' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                      log.categoryCode === 'K03' ? 'bg-amber-100 text-amber-800 border-amber-200' :
                      'bg-purple-100 text-purple-800 border-purple-200';

                    const categoryLabel =
                      log.categoryCode === 'K01' ? 'ข้าวกล่อง' :
                      log.categoryCode === 'K02' ? 'น้ำดื่ม' :
                      log.categoryCode === 'K03' ? 'ถุงยังชีพ' : 'อื่นๆ';

                    const dateFormatted = new Date(log.serviceDate).toLocaleDateString('th-TH', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-medium whitespace-nowrap text-slate-800">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {dateFormatted}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-slate-400" />
                            <span>{log.center?.name || '-'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge variant="outline" className={`${badgeColor} font-semibold text-xs`}>
                            {categoryLabel}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{log.menuName}</p>
                          {log.notes && <p className="text-xs text-slate-500 mt-0.5">{log.notes}</p>}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className="font-black text-rose-700 text-base">
                            {log.quantity.toLocaleString()}
                          </span>{' '}
                          <span className="text-xs text-slate-500 font-medium">{log.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                            <span>{log.targetLocation}</span>
                          </div>
                          {log.recipientOrg && (
                            <p className="text-[11px] text-slate-500 mt-0.5 pl-5">
                              ผู้รับ: {log.recipientOrg}
                            </p>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <UserCheck className="h-3.5 w-3.5 text-slate-400" />
                            <span>{log.coordinatorName || '-'}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center whitespace-nowrap no-print">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              onClick={() => handleOpenEdit(log)}
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-600 hover:text-blue-600"
                              title="แก้ไข"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleDelete(log.id, log.menuName)}
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

      {/* Create / Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <Utensils className="h-5 w-5" />
              <span>{editingId ? 'แก้ไขรายการสถิติครัวอาชีวะ' : 'บันทึกสถิติครัวอาชีวะ / แจกจ่ายเสบียง'}</span>
            </DialogTitle>
            <DialogDescription>
              บันทึกข้อมูลสถิติการจัดทำอาหาร น้ำดื่ม หรือเสบียงแจกจ่ายในภารกิจ FixIt Center
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>วันที่ปฏิบัติงาน *</Label>
                <Input
                  type="date"
                  value={formData.serviceDate}
                  onChange={(e) => setFormData({ ...formData, serviceDate: e.target.value })}
                  required
                />
              </div>

              {isSuperAdmin ? (
                <div className="space-y-1.5">
                  <Label>ศูนย์บริการ *</Label>
                  <Select
                    value={formData.centerId}
                    onValueChange={(v) => setFormData({ ...formData, centerId: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="เลือกศูนย์บริการ" /></SelectTrigger>
                    <SelectContent className="bg-white">
                      {centers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>ศูนย์บริการ</Label>
                  <Input
                    value={centers.find((c) => c.id === formData.centerId)?.name || 'ศูนย์บริการของท่าน'}
                    disabled
                    className="bg-slate-100 text-slate-700"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>หมวดประเภทรายการ *</Label>
              <Select value={formData.categoryCode} onValueChange={handleCategoryChange}>
                <SelectTrigger><SelectValue placeholder="เลือกหมวดประเภท" /></SelectTrigger>
                <SelectContent className="bg-white">
                  {CATEGORY_OPTIONS.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>รายการอาหาร / เสบียงแจกจ่าย *</Label>
              <Input
                placeholder="เช่น ข้าวกะเพราหมูสับไข่ดาว, ข้าวไข่เจียวทรงเครื่อง, น้ำดื่มสิงห์ 600ml ฯลฯ"
                value={formData.menuName}
                onChange={(e) => setFormData({ ...formData, menuName: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>จำนวนที่จัดทำ / แจกจ่าย *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>หน่วยนับ</Label>
                <Input
                  placeholder="เช่น กล่อง, ชุด, ขวด, แพ็ค"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>พื้นที่ / ชุมชน / ศูนย์พักพิงเป้าหมายที่แจกจ่าย *</Label>
              <Input
                placeholder="เช่น ชุมชนบ้านดอนพัฒนา, ศูนย์พักพิงชั่วคราว อบต., หมู่ 4 ต.ในเมือง"
                value={formData.targetLocation}
                onChange={(e) => setFormData({ ...formData, targetLocation: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>หน่วยงาน / ผู้แทนที่รับมอบ (ถ้ามี)</Label>
                <Input
                  placeholder="เช่น ผู้ใหญ่บ้านหมู่ 3, หน่วยกู้ภัย, อสม."
                  value={formData.recipientOrg}
                  onChange={(e) => setFormData({ ...formData, recipientOrg: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label>ผู้รับผิดชอบ / ครูผู้ควบคุมชุดครัว</Label>
                <Input
                  placeholder="ชื่อ-สกุล ครูหรือหัวหน้าชุดปฏิบัติการ"
                  value={formData.coordinatorName}
                  onChange={(e) => setFormData({ ...formData, coordinatorName: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>หมายเหตุ / ข้อมูลเพิ่มเติม</Label>
              <textarea
                className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="บันทึกรายละเอียดเพิ่มเติม เช่น ใช้วัตถุดิบสนับสนุนจาก..., ประชาชนมารับมอบ ณ จุดบริการ"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={saving}
              >
                ยกเลิก
              </Button>
              <Button
                type="submit"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                disabled={saving}
              >
                {saving ? 'กำลังบันทึก...' : (editingId ? 'บันทึกการแก้ไข' : 'บันทึกสถิติ')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
