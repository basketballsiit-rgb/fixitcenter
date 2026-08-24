'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Target, Building2, Plus, Edit2, Trash2, CheckCircle2,
  XCircle, Shield, Key, Search, RefreshCw, Phone, MapPin, Calendar,
  AlertCircle, Tag, Zap, Cpu, Car, Wrench
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import {
  userApi, missionApi, centerApi, categoryApi,
  type UserItem, type Role, type Mission, type Center, type RepairCategory
} from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';

export default function AdminConsolePage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('users');

  // ─── States: Users ───────────────────────────────────────────────────────────
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    roleId: '',
    centerId: '',
    isActive: true,
  });

  // ─── States: Missions ────────────────────────────────────────────────────────
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(false);
  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [missionForm, setMissionForm] = useState({
    name: '',
    fiscalYear: 2567,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    description: '',
    isActive: true,
  });

  // ─── States: Centers ─────────────────────────────────────────────────────────
  const [centers, setCenters] = useState<Center[]>([]);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [centerModalOpen, setCenterModalOpen] = useState(false);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [centerForm, setCenterForm] = useState({
    name: '',
    code: '',
    region: '',
    address: '',
    phone: '',
    missionId: '',
    lineGroupId: '',
    isActive: true,
  });

  // ─── States: Categories (Admin & Center Admin) ───────────────────────────────
  const [categories, setCategories] = useState<RepairCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [tradeFilter, setTradeFilter] = useState<'ALL' | 'ELECTRICAL' | 'ELECTRONICS' | 'AUTOMOTIVE' | 'KITCHEN'>('ALL');
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RepairCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    code: '',
    name: '',
    tradeCode: 'ELECTRICAL' as 'ELECTRICAL' | 'ELECTRONICS' | 'AUTOMOTIVE' | 'KITCHEN',
    description: '',
    isActive: true,
  });

  const isCenterAdmin = currentUser?.role === 'CENTER_ADMIN';

  // ─── Load Data ───────────────────────────────────────────────────────────────

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const centerFilter = isCenterAdmin ? currentUser?.centerId || undefined : undefined;
      const [uRes, rRes] = await Promise.all([userApi.getAll(centerFilter), userApi.getRoles()]);
      setUsers(uRes.data);
      setRoles(rRes.data);
    } catch {
      toast({ title: 'ไม่สามารถโหลดข้อมูลผู้ใช้ได้', variant: 'destructive' });
    } finally {
      setLoadingUsers(false);
    }
  }, [isCenterAdmin, currentUser?.centerId, toast]);

  const loadMissions = useCallback(async () => {
    if (isCenterAdmin) return;
    setLoadingMissions(true);
    try {
      const res = await missionApi.getAll();
      setMissions(res.data);
    } catch {
      toast({ title: 'ไม่สามารถโหลดข้อมูลภารกิจได้', variant: 'destructive' });
    } finally {
      setLoadingMissions(false);
    }
  }, [isCenterAdmin, toast]);

  const loadCenters = useCallback(async () => {
    setLoadingCenters(true);
    try {
      const res = await centerApi.getAll();
      setCenters(res.data);
    } catch {
      toast({ title: 'ไม่สามารถโหลดข้อมูลศูนย์บริการได้', variant: 'destructive' });
    } finally {
      setLoadingCenters(false);
    }
  }, [toast]);

  const loadCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const res = await categoryApi.getAll();
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast({ title: 'ไม่สามารถโหลดประเภทงานซ่อมได้', variant: 'destructive' });
    } finally {
      setLoadingCategories(false);
    }
  }, [toast]);

  useEffect(() => {
    loadUsers();
    loadMissions();
    loadCenters();
    loadCategories();
  }, [loadUsers, loadMissions, loadCenters, loadCategories]);

  // ─── User Actions ────────────────────────────────────────────────────────────

  const handleOpenCreateUser = () => {
    setEditingUser(null);
    const availableRoles = isCenterAdmin ? roles.filter((r) => r.name !== 'ADMIN') : roles;
    setUserForm({
      username: '',
      password: '',
      fullName: '',
      email: '',
      phone: '',
      roleId: availableRoles[0]?.id || '',
      centerId: isCenterAdmin ? currentUser?.centerId || '' : centers[0]?.id || '',
      isActive: true,
    });
    setUserModalOpen(true);
  };

  const handleOpenEditUser = (u: UserItem) => {
    setEditingUser(u);
    setUserForm({
      username: u.username,
      password: '',
      fullName: u.fullName,
      email: u.email || '',
      phone: u.phone || '',
      roleId: u.roleId || u.role?.id || '',
      centerId: u.centerId || '',
      isActive: u.isActive,
    });
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await userApi.update(editingUser.id, {
          fullName: userForm.fullName,
          email: userForm.email,
          phone: userForm.phone,
          roleId: userForm.roleId,
          centerId: userForm.centerId || null,
          isActive: userForm.isActive,
          ...(userForm.password ? { password: userForm.password } : {}),
        });
        toast({ title: '✓ แก้ไขข้อมูลผู้ใช้สำเร็จ' });
      } else {
        if (!userForm.username || !userForm.password || !userForm.fullName || !userForm.roleId) {
          toast({ title: 'กรุณากรอกข้อมูลสำคัญให้ครบถ้วน', variant: 'destructive' });
          return;
        }
        await userApi.create({
          username: userForm.username,
          password: userForm.password,
          fullName: userForm.fullName,
          email: userForm.email || undefined,
          phone: userForm.phone || undefined,
          roleId: userForm.roleId,
          centerId: userForm.centerId || undefined,
          isActive: userForm.isActive,
        });
        toast({ title: '✓ เพิ่มผู้ใช้ใหม่สำเร็จ' });
      }
      setUserModalOpen(false);
      loadUsers();
    } catch (err: any) {
      toast({ title: err?.response?.data?.message || 'เกิดข้อผิดพลาด', variant: 'destructive' });
    }
  };

  const handleDeleteUser = async (u: UserItem) => {
    if (!confirm(`คุณต้องการลบผู้ใช้ "${u.fullName} (${u.username})" หรือไม่?`)) return;
    try {
      await userApi.delete(u.id);
      toast({ title: '✓ ลบผู้ใช้งานสำเร็จ' });
      loadUsers();
    } catch (err: any) {
      toast({ title: err?.response?.data?.message || 'ไม่สามารถลบผู้ใช้นี้ได้', variant: 'destructive' });
    }
  };

  // ─── Mission Actions ─────────────────────────────────────────────────────────

  const handleOpenCreateMission = () => {
    setEditingMission(null);
    setMissionForm({
      name: '',
      fiscalYear: 2567,
      startDate: new Date().toISOString().slice(0, 10),
      endDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      description: '',
      isActive: true,
    });
    setMissionModalOpen(true);
  };

  const handleOpenEditMission = (m: Mission) => {
    setEditingMission(m);
    setMissionForm({
      name: m.name,
      fiscalYear: m.fiscalYear,
      startDate: m.startDate.slice(0, 10),
      endDate: m.endDate.slice(0, 10),
      description: m.description || '',
      isActive: m.isActive,
    });
    setMissionModalOpen(true);
  };

  const handleSaveMission = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMission) {
        await missionApi.update(editingMission.id, missionForm);
        toast({ title: '✓ แก้ไขภารกิจสำเร็จ' });
      } else {
        if (!missionForm.name) {
          toast({ title: 'กรุณากรอกชื่อภารกิจ', variant: 'destructive' });
          return;
        }
        await missionApi.create(missionForm);
        toast({ title: '✓ สร้างภารกิจใหม่สำเร็จ' });
      }
      setMissionModalOpen(false);
      loadMissions();
    } catch (err: any) {
      toast({ title: err?.response?.data?.message || 'เกิดข้อผิดพลาด', variant: 'destructive' });
    }
  };

  const handleSetActiveMission = async (m: Mission) => {
    try {
      await missionApi.update(m.id, { isActive: true });
      toast({ title: `✓ ตั้ง "${m.name}" เป็นภารกิจปัจจุบัน` });
      loadMissions();
    } catch {
      toast({ title: 'เกิดข้อผิดพลาด', variant: 'destructive' });
    }
  };

  const handleDeleteMission = async (m: Mission) => {
    if (!confirm(`คุณต้องการลบภารกิจ "${m.name}" หรือไม่?`)) return;
    try {
      await missionApi.delete(m.id);
      toast({ title: '✓ ลบภารกิจสำเร็จ' });
      loadMissions();
    } catch (err: any) {
      toast({ title: err?.response?.data?.message || 'ไม่สามารถลบภารกิจนี้ได้', variant: 'destructive' });
    }
  };

  // ─── Center Actions ──────────────────────────────────────────────────────────

  const handleOpenCreateCenter = () => {
    setEditingCenter(null);
    setCenterForm({
      name: '',
      code: '',
      region: '',
      address: '',
      phone: '',
      missionId: missions[0]?.id || '',
      lineGroupId: '',
      isActive: true,
    });
    setCenterModalOpen(true);
  };

  const handleOpenEditCenter = (c: Center) => {
    setEditingCenter(c);
    setCenterForm({
      name: c.name,
      code: c.code,
      region: c.region || '',
      address: c.address || '',
      phone: c.phone || '',
      missionId: c.missionId,
      lineGroupId: c.lineGroupId || '',
      isActive: c.isActive,
    });
    setCenterModalOpen(true);
  };

  const handleSaveCenter = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCenter) {
        await centerApi.update(editingCenter.id, centerForm);
        toast({ title: '✓ แก้ไขศูนย์บริการสำเร็จ' });
      } else {
        if (!centerForm.name || !centerForm.code || !centerForm.missionId) {
          toast({ title: 'กรุณากรอกชื่อ รหัสศูนย์ และเลือกภารกิจ', variant: 'destructive' });
          return;
        }
        await centerApi.create(centerForm);
        toast({ title: '✓ เพิ่มศูนย์บริการใหม่สำเร็จ' });
      }
      setCenterModalOpen(false);
      loadCenters();
    } catch (err: any) {
      toast({ title: err?.response?.data?.message || 'เกิดข้อผิดพลาด', variant: 'destructive' });
    }
  };

  const handleDeleteCenter = async (c: Center) => {
    if (!confirm(`คุณต้องการลบศูนย์บริการ "${c.name}" หรือไม่?`)) return;
    try {
      await centerApi.delete(c.id);
      toast({ title: '✓ ลบศูนย์บริการสำเร็จ' });
      loadCenters();
    } catch (err: any) {
      toast({ title: err?.response?.data?.message || 'ไม่สามารถลบศูนย์บริการนี้ได้', variant: 'destructive' });
    }
  };

  // ─── Category Actions (Super Admin only) ──────────────────────────────────

  const computeNextCategoryCode = useCallback((tradeCode: string, catList: RepairCategory[]): string => {
    const prefix =
      tradeCode === 'ELECTRICAL' ? 'E' :
      tradeCode === 'ELECTRONICS' ? 'X' :
      tradeCode === 'AUTOMOTIVE' ? 'A' : 'K';
    const numbers = catList
      .filter((c) => c.code.toUpperCase().startsWith(prefix))
      .map((c) => {
        const numPart = c.code.slice(1);
        const parsed = parseInt(numPart, 10);
        return isNaN(parsed) ? 0 : parsed;
      })
      .filter((n) => n > 0 && n < 90); // exclude 99 (general / other)

    const maxNum = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNum = maxNum + 1;
    return `${prefix}${String(nextNum).padStart(2, '0')}`;
  }, []);

  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    const initialTrade = 'ELECTRICAL';
    const nextCode = computeNextCategoryCode(initialTrade, categories);
    setCategoryForm({
      code: nextCode,
      name: '',
      tradeCode: initialTrade,
      description: '',
      isActive: true,
    });
    setCategoryModalOpen(true);
  };

  const handleTradeChangeInModal = (trade: 'ELECTRICAL' | 'ELECTRONICS' | 'AUTOMOTIVE' | 'KITCHEN') => {
    if (!editingCategory) {
      const nextCode = computeNextCategoryCode(trade, categories);
      setCategoryForm((prev) => ({ ...prev, tradeCode: trade, code: nextCode }));
    } else {
      setCategoryForm((prev) => ({ ...prev, tradeCode: trade }));
    }
  };

  const handleOpenEditCategory = (cat: RepairCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      code: cat.code,
      name: cat.name,
      tradeCode: cat.tradeCode,
      description: cat.description || '',
      isActive: cat.isActive,
    });
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await categoryApi.update(editingCategory.id, categoryForm);
        toast({ title: '✓ แก้ไขประเภทงานซ่อมสำเร็จ' });
      } else {
        if (!categoryForm.code || !categoryForm.name) {
          toast({ title: 'กรุณากรอกรหัสและชื่อประเภทงานซ่อม', variant: 'destructive' });
          return;
        }
        await categoryApi.create(categoryForm);
        toast({ title: '✓ เพิ่มประเภทงานซ่อมใหม่สำเร็จ' });
      }
      setCategoryModalOpen(false);
      loadCategories();
    } catch (err: any) {
      toast({ title: err?.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึก', variant: 'destructive' });
    }
  };

  const handleDeleteCategory = async (cat: RepairCategory) => {
    if (!confirm(`คุณต้องการลบประเภทงานซ่อม "${cat.name} (${cat.code})" หรือไม่?`)) return;
    try {
      await categoryApi.delete(cat.id);
      toast({ title: '✓ ลบประเภทงานซ่อมสำเร็จ' });
      loadCategories();
    } catch (err: any) {
      toast({ title: err?.response?.data?.message || 'ไม่สามารถลบประเภทงานนี้ได้', variant: 'destructive' });
    }
  };

  const filteredCategories = categories.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
      c.code.toLowerCase().includes(categorySearch.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(categorySearch.toLowerCase());
    const matchesTrade = tradeFilter === 'ALL' || c.tradeCode === tradeFilter;
    return matchesSearch && matchesTrade;
  });

  const filteredUsers = users.filter((u) =>
    u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.center?.name || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy flex items-center gap-2">
            <Shield className="h-7 w-7 text-brand-orange" />
            {isCenterAdmin ? 'ระบบจัดการประจำศูนย์ (Center Admin)' : 'ระบบจัดการผู้ดูแลระบบส่วนกลาง (Super Admin)'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isCenterAdmin
              ? 'จัดการรายชื่อบุคลากรช่าง เจ้าหน้าที่ และรายละเอียดเฉพาะศูนย์บริการของคุณ'
              : 'จัดการข้อมูลผู้ใช้งานทุกระดับ, กำหนดภารกิจงาน, ช่วงเวลาเปิด-ปิด, และข้อมูลทุกศูนย์บริการ'}
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className={`grid ${isCenterAdmin ? 'grid-cols-3 max-w-lg' : 'grid-cols-4 max-w-2xl'}`}>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            {isCenterAdmin ? 'บุคลากรในศูนย์' : 'ผู้ใช้งาน'} ({users.length})
          </TabsTrigger>
          {!isCenterAdmin && (
            <TabsTrigger value="missions" className="gap-2">
              <Target className="h-4 w-4" />
              ภารกิจ ({missions.length})
            </TabsTrigger>
          )}
          <TabsTrigger value="centers" className="gap-2">
            <Building2 className="h-4 w-4" />
            {isCenterAdmin ? 'ข้อมูลศูนย์ของฉัน' : 'ศูนย์บริการ'} ({centers.length})
          </TabsTrigger>
          <TabsTrigger value="categories" className="gap-2">
            <Tag className="h-4 w-4" />
            ประเภทงาน/บริการ ({categories.length})
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: ผู้ใช้งาน (USERS)
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg">รายชื่อผู้ใช้งานในระบบ</CardTitle>
                <CardDescription>ผู้ดูแลระบบ, หัวหน้าช่าง QC, ช่างซ่อม, และเจ้าหน้าที่ลงทะเบียน</CardDescription>
              </div>
              <Button onClick={handleOpenCreateUser} className="gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white shadow-sm">
                <Plus className="h-4 w-4" />
                เพิ่มผู้ใช้งานใหม่
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="flex items-center gap-2 max-w-sm">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาชื่อ, ชื่อผู้ใช้, หรือศูนย์..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="h-9"
                />
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>ชื่อ - นามสกุล</TableHead>
                      <TableHead>ชื่อผู้ใช้ (Username)</TableHead>
                      <TableHead>บทบาท (Role)</TableHead>
                      <TableHead>ศูนย์บริการประจำ</TableHead>
                      <TableHead>เบอร์โทรศัพท์</TableHead>
                      <TableHead className="text-center">สถานะ</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingUsers ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">กำลังโหลดข้อมูลผู้ใช้...</TableCell></TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">ไม่พบข้อมูลผู้ใช้งาน</TableCell></TableRow>
                    ) : (
                      filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium text-slate-900">{u.fullName}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-600">{u.username}</TableCell>
                          <TableCell>
                            <Badge variant={u.role?.name === 'ADMIN' ? 'default' : u.role?.name === 'SUPERVISOR' ? 'destructive' : 'secondary'}>
                              {u.role?.name || 'USER'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">{u.center?.name || <span className="text-muted-foreground italic">ทุกศูนย์ (ส่วนกลาง)</span>}</TableCell>
                          <TableCell className="text-xs text-slate-600">{u.phone || '-'}</TableCell>
                          <TableCell className="text-center">
                            {u.isActive ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">ใช้งานได้</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">ระงับ</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditUser(u)} className="h-8 w-8 p-0">
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </Button>
                            {u.username !== 'admin' && (
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteUser(u)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: ภารกิจงาน & ช่วงเวลา (MISSIONS & DATES)
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="missions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg">ภารกิจและช่วงเวลาปฏิบัติงาน</CardTitle>
                <CardDescription>กำหนดปีงบประมาณ, วันเริ่มต้น - สิ้นสุด, และเลือกภารกิจที่กำลังเปิดใช้งาน</CardDescription>
              </div>
              <Button onClick={handleOpenCreateMission} className="gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white">
                <Plus className="h-4 w-4" />
                เพิ่มภารกิจใหม่
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>ชื่อภารกิจ</TableHead>
                      <TableHead>ปีงบประมาณ</TableHead>
                      <TableHead>วันเริ่มต้น</TableHead>
                      <TableHead>วันสิ้นสุด</TableHead>
                      <TableHead className="text-center">จำนวนศูนย์</TableHead>
                      <TableHead className="text-center">สถานะภารกิจ</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingMissions ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">กำลังโหลดข้อมูลภารกิจ...</TableCell></TableRow>
                    ) : missions.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">ยังไม่มีภารกิจในระบบ กรุณากดเพิ่มภารกิจใหม่</TableCell></TableRow>
                    ) : (
                      missions.map((m) => (
                        <TableRow key={m.id} className={m.isActive ? 'bg-blue-50/40' : ''}>
                          <TableCell className="font-medium text-slate-900">
                            {m.name}
                            {m.description && <p className="text-xs text-muted-foreground mt-0.5">{m.description}</p>}
                          </TableCell>
                          <TableCell><Badge variant="outline" className="font-mono">{m.fiscalYear}</Badge></TableCell>
                          <TableCell className="text-xs text-slate-600">{new Date(m.startDate).toLocaleDateString('th-TH')}</TableCell>
                          <TableCell className="text-xs text-slate-600">{new Date(m.endDate).toLocaleDateString('th-TH')}</TableCell>
                          <TableCell className="text-center font-medium">{m._count?.centers ?? m.centers?.length ?? 0} ศูนย์</TableCell>
                          <TableCell className="text-center">
                            {m.isActive ? (
                              <Badge className="bg-emerald-600 hover:bg-emerald-700">กำลังใช้งาน (Active)</Badge>
                            ) : (
                              <Button variant="outline" size="sm" onClick={() => handleSetActiveMission(m)} className="text-xs h-7">
                                ตั้งเป็นปัจจุบัน
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditMission(m)} className="h-8 w-8 p-0">
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteMission(m)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 3: ศูนย์บริการ (CENTERS)
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="centers" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg">รายชื่อศูนย์บริการ (FixIt Centers)</CardTitle>
                <CardDescription>กำหนดรายละเอียดศูนย์, สถานที่ตั้ง, เบอร์โทร, และกลุ่มแจ้งเตือน LINE</CardDescription>
              </div>
              <Button onClick={handleOpenCreateCenter} className="gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white">
                <Plus className="h-4 w-4" />
                เพิ่มศูนย์บริการใหม่
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>รหัสศูนย์</TableHead>
                      <TableHead>ชื่อศูนย์บริการ</TableHead>
                      <TableHead>สังกัดภารกิจ</TableHead>
                      <TableHead>อำเภอ / ภูมิภาค</TableHead>
                      <TableHead>เบอร์โทรศัพท์</TableHead>
                      <TableHead className="text-center">สถานะศูนย์</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingCenters ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">กำลังโหลดข้อมูลศูนย์บริการ...</TableCell></TableRow>
                    ) : centers.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">ยังไม่มีศูนย์บริการในระบบ</TableCell></TableRow>
                    ) : (
                      centers.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs font-bold text-blue-700">{c.code}</TableCell>
                          <TableCell className="font-medium text-slate-900">
                            {c.name}
                            {c.address && <p className="text-xs text-muted-foreground mt-0.5">{c.address}</p>}
                          </TableCell>
                          <TableCell className="text-xs text-slate-600">{c.mission?.name || '-'}</TableCell>
                          <TableCell className="text-xs text-slate-600">{c.region || '-'}</TableCell>
                          <TableCell className="text-xs text-slate-600">{c.phone || '-'}</TableCell>
                          <TableCell className="text-center">
                            {c.isActive ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">เปิดบริการ</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-slate-100 text-slate-600">ปิดบริการ</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditCenter(c)} className="h-8 w-8 p-0">
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteCenter(c)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 4: ประเภทงานซ่อม (CATEGORIES - SUPER ADMIN ONLY)
        {/* ══════════════════════════════════════════════════════════════════════
            TAB 4: ประเภทงานซ่อมและบริการ (CATEGORIES & SERVICES)
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 space-y-0 pb-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-5 w-5 text-brand-orange" />
                  ประเภทงานซ่อมและบริการ (Categories & Services)
                </CardTitle>
                <CardDescription>
                  รายการประเภทงานซ่อมและบริการของศูนย์ FixIt Center ยึดรหัสส่วนกลาง 4 สาขาหลัก: ไฟฟ้า อิเล็กทรอนิกส์ ยานยนต์ และครัวอาชีวะ
                </CardDescription>
              </div>
              <Button onClick={handleOpenCreateCategory} className="gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white shadow-sm shrink-0">
                <Plus className="h-4 w-4" />
                เพิ่มประเภทงาน/บริการ
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Branch KPIs / Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-sm">
                      ⚡
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-amber-900">แผนกช่างไฟฟ้า</div>
                      <div className="text-xs text-amber-700">รหัสหมวด E (Electrical)</div>
                    </div>
                  </div>
                  <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100 border border-amber-300 font-bold">
                    {categories.filter((c) => c.tradeCode === 'ELECTRICAL').length} รายการ
                  </Badge>
                </div>

                <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      💻
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-blue-900">แผนกช่างอิเล็กทรอนิกส์</div>
                      <div className="text-xs text-blue-700">รหัสหมวด X (Electronics)</div>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-900 hover:bg-blue-100 border border-blue-300 font-bold">
                    {categories.filter((c) => c.tradeCode === 'ELECTRONICS').length} รายการ
                  </Badge>
                </div>

                <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                      🚗
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-emerald-900">แผนกช่างยนต์</div>
                      <div className="text-xs text-emerald-700">รหัสหมวด A (Automotive)</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100 border border-emerald-300 font-bold">
                    {categories.filter((c) => c.tradeCode === 'AUTOMOTIVE').length} รายการ
                  </Badge>
                </div>

                <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center font-bold text-sm">
                      🍱
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-rose-900">แผนกครัวอาชีวะ</div>
                      <div className="text-xs text-rose-700">รหัสหมวด K (Kitchen)</div>
                    </div>
                  </div>
                  <Badge className="bg-rose-100 text-rose-900 hover:bg-rose-100 border border-rose-300 font-bold">
                    {categories.filter((c) => c.tradeCode === 'KITCHEN').length} รายการ
                  </Badge>
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 max-w-sm w-full">
                  <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Input
                    placeholder="ค้นหารหัส, ชื่ออุปกรณ์, หรือคำอธิบาย..."
                    value={categorySearch}
                    onChange={(e) => setCategorySearch(e.target.value)}
                    className="h-9"
                  />
                </div>

                {/* Trade filter tabs */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg border text-xs font-medium">
                  <button
                    onClick={() => setTradeFilter('ALL')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      tradeFilter === 'ALL' ? 'bg-white shadow text-brand-navy font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ทั้งหมด ({categories.length})
                  </button>
                  <button
                    onClick={() => setTradeFilter('ELECTRICAL')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      tradeFilter === 'ELECTRICAL' ? 'bg-white shadow text-amber-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ⚡ ไฟฟ้า ({categories.filter((c) => c.tradeCode === 'ELECTRICAL').length})
                  </button>
                  <button
                    onClick={() => setTradeFilter('ELECTRONICS')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      tradeFilter === 'ELECTRONICS' ? 'bg-white shadow text-blue-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    💻 อิเล็กทรอนิกส์ ({categories.filter((c) => c.tradeCode === 'ELECTRONICS').length})
                  </button>
                  <button
                    onClick={() => setTradeFilter('AUTOMOTIVE')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      tradeFilter === 'AUTOMOTIVE' ? 'bg-white shadow text-emerald-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🚗 ยานยนต์ ({categories.filter((c) => c.tradeCode === 'AUTOMOTIVE').length})
                  </button>
                  <button
                    onClick={() => setTradeFilter('KITCHEN')}
                    className={`px-3 py-1 rounded-md transition-colors ${
                      tradeFilter === 'KITCHEN' ? 'bg-white shadow text-rose-700 font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🍱 ครัวอาชีวะ ({categories.filter((c) => c.tradeCode === 'KITCHEN').length})
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="w-24">รหัส</TableHead>
                      <TableHead>ชื่อประเภทงาน / ชนิดอุปกรณ์ / บริการ</TableHead>
                      <TableHead>สาขาวิชา / แผนก</TableHead>
                      <TableHead>คำอธิบาย / ตัวอย่างรายละเอียด</TableHead>
                      <TableHead className="text-center">สถานะ</TableHead>
                      <TableHead className="text-right">จัดการ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingCategories ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">กำลังโหลดรายการประเภทงานซ่อมและบริการ...</TableCell></TableRow>
                    ) : filteredCategories.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">ไม่พบรายการประเภทงานซ่อมและบริการ</TableCell></TableRow>
                    ) : (
                      filteredCategories.map((cat) => {
                        const tradeBadge =
                          cat.tradeCode === 'ELECTRICAL' ? (
                            <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 font-semibold gap-1">
                              ⚡ แผนกช่างไฟฟ้า
                            </Badge>
                          ) : cat.tradeCode === 'ELECTRONICS' ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-300 font-semibold gap-1">
                              💻 แผนกช่างอิเล็กทรอนิกส์
                            </Badge>
                          ) : cat.tradeCode === 'AUTOMOTIVE' ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold gap-1">
                              🚗 แผนกช่างยนต์
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-rose-50 text-rose-800 border-rose-300 font-semibold gap-1">
                              🍱 แผนกครัวอาชีวะ
                            </Badge>
                          );

                        return (
                          <TableRow key={cat.id} className="hover:bg-slate-50/80">
                            <TableCell className="font-mono font-bold text-xs text-brand-navy">
                              {cat.code}
                            </TableCell>
                            <TableCell className="font-medium text-slate-900">
                              {cat.name}
                            </TableCell>
                            <TableCell>{tradeBadge}</TableCell>
                            <TableCell className="text-xs text-slate-600 max-w-xs truncate">
                              {cat.description || '-'}
                            </TableCell>
                            <TableCell className="text-center">
                              {cat.isActive ? (
                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                  เปิดใช้งาน
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200">
                                  ปิดใช้งาน
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEditCategory(cat)} className="h-8 w-8 p-0">
                                <Edit2 className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(cat)} className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: USER (CREATE / EDIT)
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={userModalOpen} onOpenChange={setUserModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveUser}>
            <DialogHeader>
              <DialogTitle>{editingUser ? 'แก้ไขข้อมูลผู้ใช้งาน' : 'เพิ่มผู้ใช้งานใหม่'}</DialogTitle>
              <DialogDescription>กำหนดสิทธิ์และศูนย์บริการที่สังกัด</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ชื่อผู้ใช้ (Username) *</Label>
                  <Input
                    required
                    disabled={!!editingUser}
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    placeholder="เช่น tech_nan01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{editingUser ? 'รหัสผ่านใหม่ (เว้นว่างได้)' : 'รหัสผ่าน *'}</Label>
                  <Input
                    type="password"
                    required={!editingUser}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder={editingUser ? 'กรอกเมื่อต้องการเปลี่ยน' : 'รหัสผ่านอย่างน้อย 6 ตัว'}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>ชื่อ - นามสกุล *</Label>
                <Input
                  required
                  value={userForm.fullName}
                  onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })}
                  placeholder="เช่น นายสมชาย ใจดี"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>บทบาท (Role) *</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    value={userForm.roleId}
                    onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
                  >
                    {(isCenterAdmin ? roles.filter((r) => r.name !== 'ADMIN') : roles).map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name === 'CENTER_ADMIN' ? 'ผู้ดูแลประจำศูนย์ (Center Admin)' : r.name} {r.description ? `— ${r.description}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>ศูนย์บริการประจำ</Label>
                  <select
                    disabled={isCenterAdmin}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm disabled:bg-slate-100 disabled:text-slate-500"
                    value={userForm.centerId}
                    onChange={(e) => setUserForm({ ...userForm, centerId: e.target.value })}
                  >
                    {!isCenterAdmin && <option value="">ทุกศูนย์ (ส่วนกลาง)</option>}
                    {centers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>อีเมล</Label>
                  <Input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="user@nanpoly.ac.th"
                  />
                </div>
                <div className="space-y-2">
                  <Label>เบอร์โทรศัพท์</Label>
                  <Input
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    placeholder="081-234-5678"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="userActive"
                  checked={userForm.isActive}
                  onChange={(e) => setUserForm({ ...userForm, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="userActive" className="cursor-pointer font-normal text-sm">
                  เปิดให้บัญชีนี้สามารถเข้าใช้งานระบบได้ (Active)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUserModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" className="bg-brand-orange hover:bg-brand-orange-dark text-white">
                {editingUser ? 'บันทึกการแก้ไข' : 'สร้างผู้ใช้'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: MISSION (CREATE / EDIT)
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={missionModalOpen} onOpenChange={setMissionModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveMission}>
            <DialogHeader>
              <DialogTitle>{editingMission ? 'แก้ไขภารกิจ' : 'เพิ่มภารกิจใหม่'}</DialogTitle>
              <DialogDescription>ระบุปีงบประมาณและช่วงเวลาปฏิบัติงาน</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>ชื่อภารกิจ *</Label>
                <Input
                  required
                  value={missionForm.name}
                  onChange={(e) => setMissionForm({ ...missionForm, name: e.target.value })}
                  placeholder="เช่น ศูนย์ซ่อมสร้างเพื่อชุมชน ประจำปีงบประมาณ 2567"
                />
              </div>

              <div className="space-y-2">
                <Label>ปีงบประมาณ (พ.ศ.) *</Label>
                <Input
                  type="number"
                  required
                  value={missionForm.fiscalYear}
                  onChange={(e) => setMissionForm({ ...missionForm, fiscalYear: parseInt(e.target.value) || 2567 })}
                  placeholder="2567"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>วันเริ่มต้น *</Label>
                  <Input
                    type="date"
                    required
                    value={missionForm.startDate}
                    onChange={(e) => setMissionForm({ ...missionForm, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>วันสิ้นสุด *</Label>
                  <Input
                    type="date"
                    required
                    value={missionForm.endDate}
                    onChange={(e) => setMissionForm({ ...missionForm, endDate: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>คำอธิบายเพิ่มเติม</Label>
                <textarea
                  className="w-full min-h-[70px] p-3 text-sm rounded-md border border-input bg-background"
                  value={missionForm.description}
                  onChange={(e) => setMissionForm({ ...missionForm, description: e.target.value })}
                  placeholder="รายละเอียดโครงการ วัตถุประสงค์ หรือสถานที่จัดกิจกรรม"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="missionActive"
                  checked={missionForm.isActive}
                  onChange={(e) => setMissionForm({ ...missionForm, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="missionActive" className="cursor-pointer font-normal text-sm">
                  กำหนดให้เป็นภารกิจหลักที่เปิดใช้งานในปัจจุบัน (Active)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setMissionModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" className="bg-brand-orange hover:bg-brand-orange-dark text-white">
                {editingMission ? 'บันทึกการแก้ไข' : 'สร้างภารกิจ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: CENTER (CREATE / EDIT)
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={centerModalOpen} onOpenChange={setCenterModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveCenter}>
            <DialogHeader>
              <DialogTitle>{editingCenter ? 'แก้ไขข้อมูลศูนย์บริการ' : 'เพิ่มศูนย์บริการใหม่'}</DialogTitle>
              <DialogDescription>ลงรายละเอียดข้อมูลสาขาและช่องทางติดต่อ</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>สังกัดภารกิจ *</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={centerForm.missionId}
                  onChange={(e) => setCenterForm({ ...centerForm, missionId: e.target.value })}
                  required
                >
                  {missions.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.fiscalYear})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-2">
                  <Label>ชื่อศูนย์บริการ *</Label>
                  <Input
                    required
                    value={centerForm.name}
                    onChange={(e) => setCenterForm({ ...centerForm, name: e.target.value })}
                    placeholder="เช่น ศูนย์บริการ อบต.ผาสิงห์"
                  />
                </div>
                <div className="space-y-2">
                  <Label>รหัสศูนย์ *</Label>
                  <Input
                    required
                    value={centerForm.code}
                    onChange={(e) => setCenterForm({ ...centerForm, code: e.target.value.toUpperCase() })}
                    placeholder="NAN-02"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>อำเภอ / พื้นที่</Label>
                  <Input
                    value={centerForm.region}
                    onChange={(e) => setCenterForm({ ...centerForm, region: e.target.value })}
                    placeholder="เช่น อำเภอเมืองน่าน"
                  />
                </div>
                <div className="space-y-2">
                  <Label>เบอร์โทรศัพท์ติดต่อ</Label>
                  <Input
                    value={centerForm.phone}
                    onChange={(e) => setCenterForm({ ...centerForm, phone: e.target.value })}
                    placeholder="054-xxxxxx"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>ที่อยู่ / สถานที่ตั้ง</Label>
                <textarea
                  className="w-full min-h-[60px] p-3 text-sm rounded-md border border-input bg-background"
                  value={centerForm.address}
                  onChange={(e) => setCenterForm({ ...centerForm, address: e.target.value })}
                  placeholder="เช่น ณ ลานอเนกประสงค์ อบต.ผาสิงห์ อ.เมือง จ.น่าน"
                />
              </div>

              <div className="space-y-2">
                <Label>LINE Group ID (สำหรับแจ้งเตือนงานซ่อม)</Label>
                <Input
                  value={centerForm.lineGroupId}
                  onChange={(e) => setCenterForm({ ...centerForm, lineGroupId: e.target.value })}
                  placeholder="c9a1b2c3d4..."
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="centerActive"
                  checked={centerForm.isActive}
                  onChange={(e) => setCenterForm({ ...centerForm, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="centerActive" className="cursor-pointer font-normal text-sm">
                  เปิดให้บริการ (Active)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCenterModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" className="bg-brand-orange hover:bg-brand-orange-dark text-white">
                {editingCenter ? 'บันทึกการแก้ไข' : 'สร้างศูนย์บริการ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL: CATEGORY (CREATE / EDIT - SUPER ADMIN ONLY)
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={handleSaveCategory}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-brand-orange" />
                {editingCategory ? 'แก้ไขประเภทงานซ่อม' : 'เพิ่มประเภทงานซ่อมใหม่'}
              </DialogTitle>
              <DialogDescription>
                กำหนดข้อมูลประเภทงานซ่อมและสังกัดสาขาวิชาช่าง
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>สาขาวิชา / แผนกช่าง *</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-medium"
                  value={categoryForm.tradeCode}
                  onChange={(e) => handleTradeChangeInModal(e.target.value as any)}
                  required
                >
                  <option value="ELECTRICAL">⚡ แผนกช่างไฟฟ้า (Electrical - รหัส E)</option>
                  <option value="ELECTRONICS">💻 แผนกช่างอิเล็กทรอนิกส์ (Electronics - รหัส X)</option>
                  <option value="AUTOMOTIVE">🚗 แผนกช่างยนต์ (Automotive - รหัส A)</option>
                  <option value="KITCHEN">🍱 แผนกครัวอาชีวะ / โภชนาการแจกจ่าย (Kitchen - รหัส K)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>รหัสประเภท *</Label>
                    {!editingCategory && (
                      <span className="text-[10px] text-brand-orange font-bold flex items-center gap-0.5">
                        <Zap className="h-3 w-3" /> อัตโนมัติ
                      </span>
                    )}
                  </div>
                  <Input
                    required
                    readOnly={!editingCategory}
                    value={categoryForm.code}
                    onChange={(e) => setCategoryForm({ ...categoryForm, code: e.target.value.toUpperCase() })}
                    className={!editingCategory ? "font-mono font-bold text-sm bg-slate-100 text-brand-navy border-slate-300" : "font-mono font-bold"}
                    placeholder="เช่น E11, X07, A07"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {!editingCategory ? 'รันต่อจากหมวดหมู่อัตโนมัติ' : 'รหัสอ้างอิงของหมวดหมู่นี้'}
                  </p>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>ชื่อประเภทงาน / ชนิดอุปกรณ์ *</Label>
                  <Input
                    required
                    autoFocus
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    placeholder="เช่น เตาแม่เหล็กไฟฟ้า, โดรนการเกษตร"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>คำอธิบายเพิ่มเติม / ตัวอย่างอุปกรณ์</Label>
                <textarea
                  className="w-full min-h-[70px] p-3 text-sm rounded-md border border-input bg-background"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  placeholder="เช่น พัดลมตั้งโต๊ะ, พัดลมติดผนัง, หรือรายละเอียดอาการซ่อม"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="categoryActive"
                  checked={categoryForm.isActive}
                  onChange={(e) => setCategoryForm({ ...categoryForm, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="categoryActive" className="cursor-pointer font-normal text-sm">
                  เปิดให้เลือกใช้งานในหน้าลงทะเบียนรับงาน (Active)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCategoryModalOpen(false)}>
                ยกเลิก
              </Button>
              <Button type="submit" className="bg-brand-orange hover:bg-brand-orange-dark text-white">
                {editingCategory ? 'บันทึกการแก้ไข' : 'สร้างประเภทงานซ่อม'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
