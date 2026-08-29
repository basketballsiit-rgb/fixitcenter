'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Printer, Save, Camera, CameraOff, AlertCircle, Zap, Laptop, Car,
  Search, RefreshCw, Eye, CheckCircle2, Clock, Wrench, ShieldCheck,
  PackageCheck, User, Phone, MapPin, Upload, Image as ImageIcon, X,
  Edit, Trash2, PlusCircle, Tag, Check, PenTool
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { SmartCardReader } from '@/components/smart-card-reader/smart-card-reader';
import { SignaturePad } from '@/components/signature-pad/signature-pad';
import {
  repairOrderApi, centerApi, missionApi, categoryApi, vehicleApi, applianceApi,
  type Center, type Mission, type RepairCategory
} from '@/lib/api';
import { useToast } from '@/components/ui/use-toast';
import { useAuthStore } from '@/store/auth.store';
import { cn, formatNationalId, formatPhone } from '@/lib/utils';
import { PrintLayout } from './print-layout';
import { PrintTagLayout } from './print-tag-layout';
import { scanIdCardImage, isValidThaiNationalId } from '@/lib/ocr';

const formSchema = z.object({
  missionId: z.string().min(1, 'เลือกภารกิจ'),
  centerId: z.string().min(1, 'เลือกศูนย์'),
  firstName: z.string().min(1, 'กรอกชื่อ'),
  lastName: z.string().min(1, 'กรอกนามสกุล'),
  nationalId: z.string().min(13, 'เลขบัตรประชาชน 13 หลัก').max(13),
  phone: z.string().min(10, 'เบอร์โทรศัพท์ไม่ถูกต้อง'),
  address: z.string().min(1, 'กรอกที่อยู่'),
  tradeCode: z.string().min(1, 'เลือกประเภทงาน/บริการ'),
  customDeviceDetails: z.string().optional(),
  brand: z.string().optional(),
  model: z.string().optional(),
  serial: z.string().optional(),
  problemDesc: z.string().min(1, 'กรอกอาการเสีย'),
  deviceCondition: z.string().optional(),
  accessories: z.string().optional(),
  additionalDetails: z.string().optional(),
}).refine((data) => {
  const isOther = data.tradeCode.endsWith('99') || data.tradeCode === 'OTHER';
  if (isOther && (!data.customDeviceDetails || data.customDeviceDetails.trim().length === 0)) {
    return false;
  }
  return true;
}, {
  message: '⚠️ จำเป็นต้องระบุรายละเอียดอุปกรณ์หรือบริการเพิ่มเติม เมื่อเลือกหมวดอื่น ๆ',
  path: ['customDeviceDetails'],
});
type FormData = z.infer<typeof formSchema>;

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<any> }> = {
  PENDING: { label: 'รอดำเนินการ', color: 'bg-amber-100 text-amber-800 border-amber-300', icon: Clock },
  DIAGNOSING: { label: 'กำลังตรวจเช็ค', color: 'bg-blue-100 text-blue-800 border-blue-300', icon: Search },
  WAITING_PARTS: { label: 'รออะไหล่', color: 'bg-orange-100 text-orange-800 border-orange-300', icon: Clock },
  REPAIRING: { label: 'กำลังซ่อม', color: 'bg-indigo-100 text-indigo-800 border-indigo-300', icon: Wrench },
  QC_PENDING: { label: 'รอตรวจ QC', color: 'bg-purple-100 text-purple-800 border-purple-300', icon: ShieldCheck },
  COMPLETED: { label: 'ซ่อมเสร็จสิ้น', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', icon: CheckCircle2 },
  CLOSED: { label: 'ส่งมอบแล้ว', color: 'bg-slate-100 text-slate-800 border-slate-300', icon: PackageCheck },
  CANCELLED: { label: 'ยกเลิก', color: 'bg-rose-100 text-rose-800 border-rose-300', icon: AlertCircle },
};

const TRADE_ICONS: Record<string, React.ComponentType<any>> = {
  ELECTRICAL: Zap,
  ELECTRONICS: Laptop,
  AUTOMOTIVE: Car,
};

function RegistrationPageContent() {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'ADMIN';
  const userCenterId = user?.centerId || '';

  const [queryCenterId, setQueryCenterId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const cId = params.get('centerId');
      if (cId) setQueryCenterId(cId);
    }
  }, []);

  const [activeTab, setActiveTab] = useState<'register' | 'list'>('register');
  const [centers, setCenters] = useState<Center[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [categories, setCategories] = useState<RepairCategory[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [queueNumber, setQueueNumber] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<FormData | null>(null);

  // OCR Camera State
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Citizen ID Card Photo State
  const [idCardImage, setIdCardImage] = useState<string | null>(null);
  const [showIdCardCamera, setShowIdCardCamera] = useState(false);
  const idCardVideoRef = useRef<HTMLVideoElement>(null);
  const idCardStreamRef = useRef<MediaStream | null>(null);
  const idCardFileInputRef = useRef<HTMLInputElement>(null);

  // AI OCR Processing & Verification States
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgressText, setOcrProgressText] = useState('');
  const [ocrProgressPercent, setOcrProgressPercent] = useState(0);
  const [ocrReviewData, setOcrReviewData] = useState<{
    nationalId: string;
    firstName: string;
    lastName: string;
    address: string;
    rawText: string;
    cardImage?: string;
  } | null>(null);
  const [showOcrReviewModal, setShowOcrReviewModal] = useState(false);

  // Device Condition Photo State
  const [deviceImage, setDeviceImage] = useState<string | null>(null);
  const [showDeviceCamera, setShowDeviceCamera] = useState(false);
  const deviceVideoRef = useRef<HTMLVideoElement>(null);
  const deviceStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Orders List & Tracking State
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTrade, setFilterTrade] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedCenterFilter, setSelectedCenterFilter] = useState<string>('ALL');
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);

  // Tracking / Details Dialog State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // CRUD Edit Dialog State
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
    deviceCategory: '',
    deviceBrand: '',
    problemDesc: '',
    deviceCondition: '',
    accessories: '',
    additionalDetails: '',
    status: 'PENDING',
    image: '',
    idCardImage: '',
  });

  // CRUD Delete Dialog State
  const [deletingOrder, setDeletingOrder] = useState<any | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // Handover / Return Dialog State
  const [handoverOrder, setHandoverOrder] = useState<any | null>(null);
  const [handoverDialogOpen, setHandoverDialogOpen] = useState(false);
  const [customerSignature, setCustomerSignature] = useState<string>('');
  const [handoverNotes, setHandoverNotes] = useState<string>('');
  const [handoverSubmitting, setHandoverSubmitting] = useState(false);
  const [handoverSuccessOrder, setHandoverSuccessOrder] = useState<any | null>(null);
  const [handoverSuccessDialogOpen, setHandoverSuccessDialogOpen] = useState(false);

  // Print Target States
  const [printOrder, setPrintOrder] = useState<{
    queueNumber: string;
    centerName?: string;
    registeredAt?: string | Date;
    idCardImage?: string | null;
    customerSignature?: string | null;
    handoverSignature?: string | null;
    handoverBy?: string | null;
    closedAt?: string | Date | null;
    customer: { firstName: string; lastName: string; nationalId: string; phone: string; address: string };
    device: {
      tradeCode: string;
      brand?: string;
      problemDesc: string;
      deviceCondition?: string;
      accessories?: string;
      additionalDetails?: string;
      image?: string;
    };
  } | null>(null);

  const [printTagOrder, setPrintTagOrder] = useState<{
    queueNumber: string;
    qrToken?: string;
    centerName?: string;
    registeredAt?: string | Date;
    customer: { firstName: string; lastName: string; phone?: string };
    device: { tradeCode: string; brand?: string; problemDesc: string; accessories?: string };
  } | null>(null);

  const { register, handleSubmit, setValue, watch, getValues, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      missionId: '',
      centerId: !isSuperAdmin && userCenterId ? userCenterId : (queryCenterId || ''),
      firstName: '',
      lastName: '',
      nationalId: '',
      phone: '',
      address: '',
      tradeCode: '',
      customDeviceDetails: '',
      brand: '',
      model: '',
      serial: '',
      problemDesc: '',
      deviceCondition: '',
      accessories: '',
      additionalDetails: '',
    },
  });

  // Load Base Options
  useEffect(() => {
    centerApi.getAll().then((r) => {
      const list = Array.isArray(r.data) ? r.data : (r.data ? [r.data] : []);
      setCenters(list);
      const initialCenter = !isSuperAdmin && userCenterId ? userCenterId : (queryCenterId || list[0]?.id || '');
      setValue('centerId', initialCenter);
      setSelectedCenterFilter('ALL');
    }).catch(() => {
      setCenters([{ id: 'c1', name: 'ศูนย์บริการ วิทยาลัยสารพัดช่างน่าน', code: 'NAN-01', missionId: 'm1', isActive: true }]);
      setSelectedCenterFilter('ALL');
    });

    missionApi.getActive().then((r) => {
      if (r.data?.id) {
        setValue('missionId', r.data.id);
        setMissions([r.data]);
      } else {
        missionApi.getAll().then((res) => {
          const list = res.data || [];
          setMissions(list);
          if (list.length > 0) {
            setValue('missionId', list[0].id);
          }
        });
      }
    }).catch(() => {});

    categoryApi.getAll().then((res) => {
      setCategories(res.data || []);
    }).catch(() => {});
  }, [userCenterId, queryCenterId, isSuperAdmin, setValue]);

  // Fetch Orders for Tab 2
  const fetchOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const params: any = { limit: 100 };
      if (selectedCenterFilter !== 'ALL') params.centerId = selectedCenterFilter;
      if (filterStatus !== 'ALL') params.status = filterStatus;
      if (filterTrade !== 'ALL') params.tradeCode = filterTrade;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await repairOrderApi.getAll(params);
      const list = (res.data as any)?.data || (Array.isArray(res.data) ? res.data : []);
      setOrders(list);
      setTotalOrdersCount((res.data as any)?.total ?? list.length);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, [selectedCenterFilter, filterStatus, filterTrade, searchQuery]);

  useEffect(() => {
    if (activeTab === 'list') {
      fetchOrders();
    }
  }, [activeTab, fetchOrders]);

  // Smart Card Reader Auto-fill
  const handleSmartCardData = (data: { nationalId: string; firstName: string; lastName: string; phone?: string; address?: string }) => {
    setValue('nationalId', data.nationalId.replace(/-/g, ''));
    setValue('firstName', data.firstName);
    setValue('lastName', data.lastName);
    if (data.phone) setValue('phone', data.phone);
    if (data.address) setValue('address', data.address);
    toast({
      title: '✓ ดึงข้อมูลบัตรประชาชนสำเร็จ',
      description: `${data.firstName} ${data.lastName} (${data.nationalId})`,
    });
  };

  // OCR Camera Handlers
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast({ title: 'ไม่สามารถเปิดกล้องได้', description: 'กรุณาอนุญาตการเข้าถึงกล้อง', variant: 'destructive' });
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  // ── AI OCR Processing Core ──
  const processOcrOnImage = async (canvasOrBase64: HTMLCanvasElement | string, cardImageBase64?: string) => {
    setOcrLoading(true);
    setOcrProgressPercent(10);
    setOcrProgressText('กำลังเตรียมประมวลผล OCR...');
    try {
      const extracted = await scanIdCardImage(canvasOrBase64, (pct, status) => {
        setOcrProgressPercent(pct);
        setOcrProgressText(status);
      });

      if (cardImageBase64) {
        setIdCardImage(cardImageBase64);
      }

      setOcrReviewData({
        nationalId: extracted.nationalId,
        firstName: extracted.firstName,
        lastName: extracted.lastName,
        address: extracted.address,
        rawText: extracted.rawText,
        cardImage: cardImageBase64,
      });

      // Auto-fill fields if extracted
      if (extracted.nationalId || extracted.firstName) {
        if (extracted.nationalId) setValue('nationalId', extracted.nationalId);
        if (extracted.firstName) setValue('firstName', extracted.firstName);
        if (extracted.lastName) setValue('lastName', extracted.lastName);
        if (extracted.address) setValue('address', extracted.address);

        toast({
          title: '✓ ดึงข้อมูลบัตรประชาชนด้วย AI OCR สำเร็จ',
          description: `${extracted.firstName || ''} ${extracted.lastName || ''} (${extracted.nationalId || 'อ่านข้อความแล้ว'})`,
        });
      } else {
        toast({
          title: '⚠️ ไม่พบข้อมูลที่ชัดเจนจากภาพถ่าย',
          description: 'สามารถตรวจสอบข้อความที่อ่านได้ และกรอกข้อมูลเพิ่มเติมได้ในหน้าต่างสรุปผล',
          variant: 'destructive',
        });
      }

      setShowOcrReviewModal(true);
    } catch (err: any) {
      console.error('OCR Error:', err);
      toast({
        title: 'เกิดข้อผิดพลาดในการประมวลผล OCR',
        description: 'กรุณากรอกข้อมูลด้วยตนเอง หรือลองถ่ายภาพที่มีแสงสว่างชัดเจนอีกครั้ง',
        variant: 'destructive',
      });
    } finally {
      setOcrLoading(false);
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.9);
      stopCamera();
      await processOcrOnImage(canvas, base64);
    } else {
      stopCamera();
    }
  };

  // Citizen ID Card Camera & File Upload
  const startIdCardCamera = async () => {
    setShowIdCardCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      idCardStreamRef.current = stream;
      if (idCardVideoRef.current) {
        idCardVideoRef.current.srcObject = stream;
      }
    } catch {
      toast({ title: 'ไม่สามารถเปิดกล้องได้', description: 'กรุณาอนุญาตการเข้าถึงกล้อง', variant: 'destructive' });
      setShowIdCardCamera(false);
    }
  };

  const stopIdCardCamera = () => {
    if (idCardStreamRef.current) {
      idCardStreamRef.current.getTracks().forEach((t) => t.stop());
      idCardStreamRef.current = null;
    }
    setShowIdCardCamera(false);
  };

  const captureIdCardPhoto = async () => {
    if (!idCardVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = idCardVideoRef.current.videoWidth;
    canvas.height = idCardVideoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(idCardVideoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.9);
      setIdCardImage(base64);
      stopIdCardCamera();
      toast({ title: '✓ ถ่ายภาพบัตรประชาชนเรียบร้อยแล้ว กำลังเริ่มอ่านข้อมูล OCR...' });
      await processOcrOnImage(canvas, base64);
    } else {
      stopIdCardCamera();
    }
  };

  const handleIdCardFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1400;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.9);
        setIdCardImage(compressedBase64);
        toast({ title: '✓ อัปโหลดภาพบัตรประชาชนสำเร็จ กำลังอ่านข้อมูล OCR...' });
        await processOcrOnImage(canvas, compressedBase64);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // Device Condition Camera & File Upload
  const startDeviceCamera = async () => {
    setShowDeviceCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      deviceStreamRef.current = stream;
      if (deviceVideoRef.current) {
        deviceVideoRef.current.srcObject = stream;
      }
    } catch {
      toast({ title: 'ไม่สามารถเปิดกล้องได้', description: 'กรุณาอนุญาตการเข้าถึงกล้อง', variant: 'destructive' });
      setShowDeviceCamera(false);
    }
  };

  const stopDeviceCamera = () => {
    if (deviceStreamRef.current) {
      deviceStreamRef.current.getTracks().forEach((t) => t.stop());
      deviceStreamRef.current = null;
    }
    setShowDeviceCamera(false);
  };

  const captureDevicePhoto = () => {
    if (!deviceVideoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = deviceVideoRef.current.videoWidth;
    canvas.height = deviceVideoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(deviceVideoRef.current, 0, 0);
      const base64 = canvas.toDataURL('image/jpeg', 0.8);
      setDeviceImage(base64);
      toast({ title: '✓ บันทึกภาพสภาพเครื่องเรียบร้อยแล้ว' });
    }
    stopDeviceCamera();
  };

  const handleDeviceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
        setDeviceImage(compressedBase64);
        toast({ title: '✓ แนบภาพสภาพเครื่องเรียบร้อยแล้ว' });
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // Start New Registration (Reset)
  const handleStartNewRegistration = () => {
    const currentMissionId = getValues('missionId') || missions[0]?.id || '';
    const currentCenterId = !isSuperAdmin && userCenterId ? userCenterId : (getValues('centerId') || queryCenterId || centers[0]?.id || '');
    reset({
      missionId: currentMissionId,
      centerId: currentCenterId,
      tradeCode: '',
      firstName: '',
      lastName: '',
      nationalId: '',
      phone: '',
      address: '',
      brand: '',
      model: '',
      serial: '',
      problemDesc: '',
      customDeviceDetails: '',
      deviceCondition: '',
      accessories: '',
      additionalDetails: '',
    });
    setDeviceImage(null);
    setIdCardImage(null);
    setQueueNumber(null);
    setSubmittedData(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast({ title: '✓ ล้างข้อมูลพร้อมลงทะเบียนงานใหม่เรียบร้อย' });
  };

  // Submit Handler (C)
  const onSubmit = async (data: FormData) => {
    if (queueNumber) {
      toast({
        title: `คิว ${queueNumber} ได้รับการออกเรียบร้อยแล้ว`,
        description: 'หากต้องการลงทะเบียนงานใหม่ กรุณากดปุ่ม "ลงทะเบียนงานใหม่" หรือ "ล้างข้อมูล"',
        variant: 'destructive',
      });
      return;
    }
    setSubmitting(true);
    try {
      let finalMissionId = data.missionId;
      if (!finalMissionId) {
        const activeRes = await missionApi.getActive();
        if (activeRes.data?.id) finalMissionId = activeRes.data.id;
      }
      if (!finalMissionId && missions.length > 0) {
        finalMissionId = missions[0].id;
      }
      if (!finalMissionId) {
        toast({
          title: 'ไม่พบภารกิจที่กำลังดำเนินงาน',
          description: 'กรุณาติดต่อผู้ดูแลระบบเพื่อเปิดใช้งานภารกิจ',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }
      data.missionId = finalMissionId;

      const deviceBrand = data.brand || '-';
      const deviceModel = data.model || '-';
      let fullProblemDesc = data.problemDesc;
      if (data.customDeviceDetails && data.customDeviceDetails.trim()) {
        fullProblemDesc = `[${data.customDeviceDetails.trim()}] ${fullProblemDesc}`;
      }

      const trade = (selectedCategory?.tradeCode || (data.tradeCode.startsWith('E') ? 'ELECTRICAL' : data.tradeCode.startsWith('X') ? 'ELECTRONICS' : 'AUTOMOTIVE')) as 'ELECTRICAL' | 'ELECTRONICS' | 'AUTOMOTIVE';

      const res = await repairOrderApi.create({
        missionId: data.missionId,
        centerId: data.centerId,
        customer: {
          firstName: data.firstName,
          lastName: data.lastName,
          nationalId: data.nationalId,
          phone: data.phone,
          address: data.address,
        },
        device: {
          tradeCode: data.tradeCode,
          brand: deviceBrand,
          model: deviceModel,
          serial: data.serial || '',
          problemDesc: fullProblemDesc,
          deviceCondition: data.deviceCondition || '',
          accessories: data.accessories || '',
          additionalDetails: data.additionalDetails || '',
          problemImages: deviceImage ? [deviceImage] : [],
        },
        idCardImage: idCardImage || undefined,
        trade,
      });

      const newQueue = res.data.queueNumber;
      const recDate = (res.data as any).registeredAt || new Date();
      setQueueNumber(newQueue);
      setSubmittedData(data);

      const centerObj = centers.find((c) => c.id === data.centerId);

      // Auto-sync into Vehicle Report Logs if trade is AUTOMOTIVE
      if (trade === 'AUTOMOTIVE') {
        try {
          const vehicleCatName = selectedCategory?.name || data.customDeviceDetails || 'รถจักรยานยนต์';
          await vehicleApi.create({
            missionId: data.missionId,
            centerId: data.centerId,
            serviceDate: new Date().toISOString().split('T')[0],
            vehicleType: vehicleCatName,
            serviceDetails: fullProblemDesc || 'ล้างทำความสะอาด ตรวจเช็ค และซ่อมยานพาหนะ',
            serviceCount: 1,
            completedCount: 1,
            budgetPerUnit: 150,
            totalBudget: 150,
            targetLocation: centerObj?.address || data.address || '',
            notes: `คิว: ${newQueue} | ${deviceBrand} ${deviceModel}`,
          });
        } catch (vErr) {
          console.warn('Vehicle log sync:', vErr);
        }
      }

      // Auto-sync into Appliance Report Logs if trade is ELECTRICAL or ELECTRONICS
      if (trade === 'ELECTRICAL' || trade === 'ELECTRONICS') {
        try {
          const applianceCatName = selectedCategory?.name || data.customDeviceDetails || (trade === 'ELECTRICAL' ? 'เครื่องใช้ไฟฟ้าทั่วไป' : 'อุปกรณ์อิเล็กทรอนิกส์');
          await applianceApi.create({
            missionId: data.missionId,
            centerId: data.centerId,
            serviceDate: new Date().toISOString().split('T')[0],
            applianceType: applianceCatName,
            serviceDetails: fullProblemDesc || 'ล้างทำความสะอาด ตรวจเช็ค ซ่อม-เปลี่ยนอะไหล่ เครื่องใช้ไฟฟ้า /อุปกรณ์วิชาชีพ',
            serviceCount: 1,
            completedCount: 1,
            budgetPerUnit: 100,
            totalBudget: 100,
            targetLocation: centerObj?.address || data.address || '',
            notes: `คิว: ${newQueue} | ${deviceBrand} ${deviceModel}`,
          });
        } catch (aErr) {
          console.warn('Appliance log sync:', aErr);
        }
      }
      
      // Setup A4 Print State
      setPrintOrder({
        queueNumber: newQueue,
        centerName: centerObj?.name || 'ศูนย์บริการ วิทยาลัยสารพัดช่างน่าน',
        registeredAt: recDate,
        idCardImage: idCardImage || null,
        customer: {
          firstName: data.firstName,
          lastName: data.lastName,
          nationalId: data.nationalId,
          phone: data.phone,
          address: data.address,
        },
        device: {
          tradeCode: data.tradeCode,
          brand: deviceBrand,
          problemDesc: fullProblemDesc,
          deviceCondition: data.deviceCondition,
          accessories: data.accessories,
          additionalDetails: data.additionalDetails,
          image: deviceImage || undefined,
        },
      });

      // Setup Tag Print State
      setPrintTagOrder({
        queueNumber: newQueue,
        qrToken: (res.data as any).qrToken,
        centerName: centerObj?.name || 'ศูนย์บริการ วิทยาลัยสารพัดช่างน่าน',
        registeredAt: recDate,
        customer: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        },
        device: {
          tradeCode: data.tradeCode,
          brand: deviceBrand,
          problemDesc: fullProblemDesc,
          accessories: data.accessories,
        },
      });

      toast({
        title: `✓ ออกหมายเลขคิวสำเร็จ: ${newQueue}`,
        description: `ลงทะเบียนเรียบร้อยสำหรับคุณ ${data.firstName} ${data.lastName}`,
      });
    } catch (err: any) {
      console.error('Registration failed:', err);
      toast({
        title: 'เกิดข้อผิดพลาดในการลงทะเบียน',
        description: err?.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่อีกครั้ง',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Dialog (U)
  const handleOpenEdit = (order: any) => {
    setEditingOrder(order);
    const img = (order.problemImages && order.problemImages.length > 0) ? order.problemImages[0] : '';
    setEditFormData({
      firstName: order.customer?.firstName || '',
      lastName: order.customer?.lastName || '',
      phone: order.customer?.phone || '',
      address: order.customer?.address || '',
      deviceCategory: order.deviceCategory || order.tradeCode || '',
      deviceBrand: order.deviceBrand || '',
      problemDesc: order.problemDesc || '',
      deviceCondition: order.deviceCondition || '',
      accessories: order.accessories || '',
      additionalDetails: order.additionalDetails || '',
      status: order.status || 'PENDING',
      image: img,
      idCardImage: order.idCardImage || '',
    });
    setEditDialogOpen(true);
  };

  // Save Edit (U)
  const handleSaveEdit = async () => {
    if (!editingOrder) return;
    setEditSaving(true);
    try {
      await repairOrderApi.update(editingOrder.id, {
        customer: {
          firstName: editFormData.firstName,
          lastName: editFormData.lastName,
          phone: editFormData.phone,
          address: editFormData.address,
        },
        deviceCategory: editFormData.deviceCategory,
        deviceBrand: editFormData.deviceBrand,
        problemDesc: editFormData.problemDesc,
        deviceCondition: editFormData.deviceCondition,
        accessories: editFormData.accessories,
        additionalDetails: editFormData.additionalDetails,
        problemImages: editFormData.image ? [editFormData.image] : [],
        idCardImage: editFormData.idCardImage || undefined,
        status: editFormData.status,
      });

      toast({ title: `✓ บันทึกการแก้ไขคิว ${editingOrder.queueNumber} เรียบร้อยแล้ว` });
      setEditDialogOpen(false);
      setEditingOrder(null);
      if (detailsDialogOpen && selectedOrder?.id === editingOrder.id) {
        handleViewOrderDetails({ id: editingOrder.id });
      }
      fetchOrders();
    } catch (err: any) {
      console.error('Failed to update repair order:', err);
      toast({
        title: 'แก้ไขข้อมูลไม่สำเร็จ',
        description: err?.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
        variant: 'destructive',
      });
    } finally {
      setEditSaving(false);
    }
  };

  // Open Delete Confirmation (D)
  const handleOpenDelete = (order: any) => {
    setDeletingOrder(order);
    setDeleteDialogOpen(true);
  };

  // Confirm Delete (D)
  const handleConfirmDelete = async () => {
    if (!deletingOrder) return;
    setDeleteSubmitting(true);
    try {
      await repairOrderApi.delete(deletingOrder.id);
      toast({ title: `✓ ลบรายการคิว ${deletingOrder.queueNumber} เรียบร้อยแล้ว` });
      setDeleteDialogOpen(false);
      setDeletingOrder(null);
      if (detailsDialogOpen && selectedOrder?.id === deletingOrder.id) {
        setDetailsDialogOpen(false);
      }
      fetchOrders();
    } catch (err: any) {
      console.error('Failed to delete repair order:', err);
      toast({
        title: 'ลบรายการไม่สำเร็จ',
        description: err?.response?.data?.message || 'เกิดข้อผิดพลาดในการลบรายการ',
        variant: 'destructive',
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Helper to trigger print with dynamic document.title (QueueNumber_Date as default save name)
  const triggerPrintA4 = (queueNum: string, dateSource?: string | Date) => {
    const originalTitle = document.title;
    const recDate = dateSource ? new Date(dateSource) : new Date();
    const yyyy = recDate.getFullYear();
    const mm = String(recDate.getMonth() + 1).padStart(2, '0');
    const dd = String(recDate.getDate()).padStart(2, '0');
    const fileName = `${queueNum}_${yyyy}-${mm}-${dd}`;
    document.title = fileName;

    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);

    setTimeout(() => {
      window.print();
      setTimeout(restoreTitle, 3000);
    }, 400);
  };

  const triggerPrintTag = (queueNum: string, dateSource?: string | Date) => {
    const originalTitle = document.title;
    const recDate = dateSource ? new Date(dateSource) : new Date();
    const yyyy = recDate.getFullYear();
    const mm = String(recDate.getMonth() + 1).padStart(2, '0');
    const dd = String(recDate.getDate()).padStart(2, '0');
    const fileName = `TAG_${queueNum}_${yyyy}-${mm}-${dd}`;
    document.title = fileName;

    const restoreTitle = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };
    window.addEventListener('afterprint', restoreTitle);

    setTimeout(() => {
      window.print();
      setTimeout(restoreTitle, 3000);
    }, 400);
  };

  // Print Currently Registered Order (Tab 1 Success)
  const handlePrintCurrentTag = () => {
    if (!queueNumber || !submittedData) return;
    const centerObj = centers.find((c) => c.id === submittedData.centerId);
    const recDate = new Date();
    setPrintOrder(null);
    setPrintTagOrder({
      queueNumber,
      centerName: centerObj?.name || 'ศูนย์บริการ วิทยาลัยสารพัดช่างน่าน',
      registeredAt: recDate,
      customer: {
        firstName: submittedData.firstName,
        lastName: submittedData.lastName,
        phone: submittedData.phone,
      },
      device: {
        tradeCode: submittedData.tradeCode,
        brand: submittedData.brand || '-',
        problemDesc: submittedData.problemDesc,
        accessories: submittedData.accessories,
      },
    });
    triggerPrintTag(queueNumber, recDate);
  };

  const handlePrintCurrentA4 = () => {
    if (!queueNumber || !submittedData) return;
    const centerObj = centers.find((c) => c.id === submittedData.centerId);
    const recDate = new Date();
    setPrintTagOrder(null);
    setPrintOrder({
      queueNumber,
      centerName: centerObj?.name || 'ศูนย์บริการ วิทยาลัยสารพัดช่างน่าน',
      registeredAt: recDate,
      idCardImage: idCardImage || null,
      customer: {
        firstName: submittedData.firstName,
        lastName: submittedData.lastName,
        nationalId: submittedData.nationalId,
        phone: submittedData.phone,
        address: submittedData.address,
      },
      device: {
        tradeCode: submittedData.tradeCode,
        brand: submittedData.brand || '-',
        problemDesc: submittedData.problemDesc,
        deviceCondition: submittedData.deviceCondition,
        accessories: submittedData.accessories,
        additionalDetails: submittedData.additionalDetails,
        image: deviceImage || undefined,
      },
    });
    triggerPrintA4(queueNumber, recDate);
  };

  // Print Specific Order A4 (Tab 2 List)
  const handlePrintSpecificOrder = (order: any) => {
    const img = (order.problemImages && order.problemImages.length > 0) ? order.problemImages[0] : undefined;
    const recDate = order.registeredAt || order.createdAt || new Date();
    setPrintTagOrder(null);
    setPrintOrder({
      queueNumber: order.queueNumber,
      centerName: order.center?.name || centers.find((c) => c.id === order.centerId)?.name || 'ศูนย์บริการ วิทยาลัยสารพัดช่างน่าน',
      registeredAt: recDate,
      idCardImage: order.idCardImage || null,
      customerSignature: order.customerSignature || null,
      handoverSignature: order.handoverSignature || null,
      handoverBy: order.handoverBy || null,
      closedAt: order.closedAt || null,
      customer: {
        firstName: order.customer?.firstName || 'ผู้รับบริการ',
        lastName: order.customer?.lastName || '',
        nationalId: order.customer?.nationalId || '',
        phone: order.customer?.phone || '-',
        address: order.customer?.address || '-',
      },
      device: {
        tradeCode: order.deviceCategory || order.tradeCode || 'E01',
        brand: order.deviceBrand || '-',
        problemDesc: order.problemDesc || '-',
        deviceCondition: order.deviceCondition,
        accessories: order.accessories,
        additionalDetails: order.additionalDetails,
        image: img,
      },
    });
    triggerPrintA4(order.queueNumber, recDate);
  };

  // Print Specific Order Tag Strip (Tab 2 List)
  const handlePrintSpecificTag = (order: any) => {
    const recDate = order.registeredAt || order.createdAt || new Date();
    setPrintOrder(null);
    setPrintTagOrder({
      queueNumber: order.queueNumber,
      qrToken: order.qrToken,
      centerName: order.center?.name || centers.find((c) => c.id === order.centerId)?.name || 'ศูนย์บริการ วิทยาลัยสารพัดช่างน่าน',
      registeredAt: recDate,
      customer: {
        firstName: order.customer?.firstName || 'ผู้รับบริการ',
        lastName: order.customer?.lastName || '',
        phone: order.customer?.phone || '-',
      },
      device: {
        tradeCode: order.deviceCategory || order.tradeCode || 'E01',
        brand: order.deviceBrand || '-',
        problemDesc: order.problemDesc || '-',
        accessories: order.accessories,
      },
    });
    triggerPrintTag(order.queueNumber, recDate);
  };

  // Open Handover Modal
  const handleOpenHandover = (order: any) => {
    setHandoverOrder(order);
    setCustomerSignature(order.customerSignature || '');
    setHandoverNotes(order.handoverNotes || '');
    setHandoverDialogOpen(true);
  };

  // Submit Handover
  const handleSubmitHandover = async () => {
    if (!handoverOrder) return;
    if (!customerSignature) {
      toast({
        title: 'กรุณาลงลายมือชื่อ',
        description: 'ให้ผู้รับบริการ/เจ้าของอุปกรณ์เซ็นชื่อรับเครื่องคืนบนหน้าจอก่อนยืนยัน',
        variant: 'destructive',
      });
      return;
    }
    setHandoverSubmitting(true);
    try {
      const currentUserName = user?.fullName || user?.username || 'เจ้าหน้าที่ผู้ส่งมอบ';
      const res = await repairOrderApi.handover(handoverOrder.id, {
        customerSignature,
        handoverBy: currentUserName,
        handoverNotes,
      });

      const updatedOrder = res.data;
      setHandoverDialogOpen(false);
      setHandoverSuccessOrder(updatedOrder);
      setHandoverSuccessDialogOpen(true);

      toast({
        title: `✓ บันทึกการส่งมอบคิว ${handoverOrder.queueNumber} เรียบร้อยแล้ว`,
        description: `สถานะเปลี่ยนเป็น 'ส่งมอบแล้ว' โดย ${currentUserName}`,
      });
      if (detailsDialogOpen && selectedOrder?.id === handoverOrder.id) {
        setSelectedOrder(updatedOrder);
      }
      fetchOrders();
    } catch (err: any) {
      console.error('Failed to handover order:', err);
      toast({
        title: 'บันทึกการส่งมอบไม่สำเร็จ',
        description: err?.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
        variant: 'destructive',
      });
    } finally {
      setHandoverSubmitting(false);
    }
  };

  // View / Track Order Details (R)
  const handleViewOrderDetails = async (order: any) => {
    setSelectedOrder(order);
    setDetailsDialogOpen(true);
    try {
      const res = await repairOrderApi.getById(order.id);
      if (res.data) {
        setSelectedOrder(res.data);
      }
    } catch (e) {
      console.warn('Could not fetch full order details:', e);
    }
  };

  const watchedTradeCode = watch('tradeCode') || '';
  const selectedCategory = categories.find((c) => c.code === watchedTradeCode);
  const isOtherCategory = watchedTradeCode.endsWith('99') || watchedTradeCode === 'OTHER' || (selectedCategory?.name ? selectedCategory.name.includes('อื่น') : false);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
              <Printer className="w-5 h-5" />
            </span>
            ระบบลงทะเบียนรับงานซ่อม & บริหารจัดการคิว
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ศูนย์ซ่อมสร้างเพื่อชุมชน (FixIt Center) — บริหารจัดการ ออกคิว พิมพ์ป้ายแท็ก และส่งมอบเครื่อง
          </p>
        </div>

        {/* Global Mission / Center Indicator */}
        <div className="flex flex-wrap items-center gap-2">
          {missions[0] && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 text-xs">
              ภารกิจ: {missions[0]?.name || ''} (ปี {missions[0]?.fiscalYear || ''})
            </Badge>
          )}
          {centers[0] && (
            <Badge variant="secondary" className="bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1 text-xs">
              📍 {centers.find((c) => c.id === watch('centerId'))?.name || centers[0]?.name || ''}
            </Badge>
          )}
        </div>
      </div>

      {/* ── Main Tab Navigation ── */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md h-11 p-1 bg-slate-200/80 rounded-xl shadow-inner">
          <TabsTrigger value="register" className="font-semibold text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <PlusCircle className="w-4 h-4 mr-2 text-blue-600" />
            ลงทะเบียนรับงานใหม่
          </TabsTrigger>
          <TabsTrigger value="list" className="font-semibold text-sm rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
            <Search className="w-4 h-4 mr-2 text-indigo-600" />
            รายการทั้งหมด / ค้นหา & จัดการ
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 1: REGISTRATION FORM (CREATE - C)
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="register" className="mt-4 space-y-6">
          {/* Card Reader Simulator & Camera OCR Component */}
          <SmartCardReader onDataReceived={handleSmartCardData} onScanPhoto={startCamera} />

          {/* OCR Camera Stream Modal (Quick Scan & Extract) */}
          {showCamera && (
            <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-5 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 leading-tight">
                        สแกนบัตรประชาชนด้วย AI OCR
                      </h3>
                      <p className="text-xs text-slate-500">
                        วางบัตรประชาชนให้อยู่ในกรอบภาพ และมีแสงสว่างชัดเจน
                      </p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={stopCamera} className="rounded-full hover:bg-slate-100">
                    <CameraOff className="w-5 h-5 text-slate-500" />
                  </Button>
                </div>

                {/* Camera Viewport with Thai ID Card Framing Overlay */}
                <div className="relative aspect-[16/10] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  
                  {/* Guided ID Card Outline (8.5:5.4 ratio) */}
                  <div className="absolute inset-x-8 inset-y-6 border-2 border-dashed border-amber-400/90 rounded-lg pointer-events-none flex flex-col justify-between p-2.5 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] bg-amber-500/90 text-slate-950 font-bold px-1.5 py-0.5 rounded shadow-xs">
                        กรอบบัตรประชาชน
                      </span>
                      <span className="text-[10px] text-amber-200 font-mono">
                        13 หลัก
                      </span>
                    </div>
                    <div className="text-center">
                      <p className="text-[11px] text-amber-200 font-medium bg-black/50 px-2 py-0.5 rounded-full inline-block backdrop-blur-xs">
                        ✨ ถือกล้องให้นิ่งและวางบัตรให้อยู่ในกรอบ
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-500">
                    💡 ระบบจะอ่านเลข 13 หลัก, ชื่อ-นามสกุล และที่อยู่โดยอัตโนมัติ
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={stopCamera}>
                      ยกเลิก
                    </Button>
                    <Button
                      onClick={capturePhoto}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold shadow-md"
                    >
                      <Camera className="w-4 h-4" />
                      <span>ถ่ายและสแกน OCR</span>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Citizen ID Card Photo Stream Modal (Attach Copy) */}
          {showIdCardCamera && (
            <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-5 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-slate-900 leading-tight">
                        ถ่ายภาพสำเนาบัตรประชาชน + สแกน OCR
                      </h3>
                      <p className="text-xs text-slate-500">
                        บันทึกภาพหลักฐานผู้รับบริการ และอ่านข้อมูลอัตโนมัติ
                      </p>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={stopIdCardCamera} className="rounded-full hover:bg-slate-100">
                    <CameraOff className="w-5 h-5 text-slate-500" />
                  </Button>
                </div>

                <div className="relative aspect-[16/10] bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center shadow-inner">
                  <video ref={idCardVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute inset-x-8 inset-y-6 border-2 border-dashed border-emerald-400/90 rounded-lg pointer-events-none flex flex-col justify-between p-2.5 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                    <span className="text-[10px] bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded self-start">
                      วางบัตรให้พอดีกรอบ
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={stopIdCardCamera}>
                    ยกเลิก
                  </Button>
                  <Button
                    onClick={captureIdCardPhoto}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold shadow-md"
                  >
                    <Camera className="w-4 h-4" />
                    <span>บันทึกภาพบัตร & อ่าน OCR</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── AI OCR Loading Progress Modal ── */}
          {ocrLoading && (
            <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
              <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center mx-auto text-blue-600 animate-pulse">
                  <Sparkles className="w-8 h-8 animate-spin" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-extrabold text-base text-slate-900">
                    กำลังอ่านข้อมูลบัตรประชาชนด้วย AI OCR
                  </h4>
                  <p className="text-xs text-slate-500">
                    {ocrProgressText || 'กำลังประมวลผล...'}
                  </p>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${ocrProgressPercent}%` }}
                  />
                </div>
                <span className="text-[11px] font-mono text-slate-400 block">
                  {ocrProgressPercent}%
                </span>
              </div>
            </div>
          )}

          {/* ── AI OCR Result Review / Verification Modal ── */}
          <Dialog open={showOcrReviewModal} onOpenChange={setShowOcrReviewModal}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-blue-700">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span>ผลการอ่านข้อมูลบัตรประชาชน (OCR)</span>
                </DialogTitle>
                <DialogDescription>
                  ตรวจสอบความถูกต้องของข้อมูลที่ดึงได้จากภาพถ่าย สามารถแก้ไขก่อนยืนยันได้
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3.5 py-2">
                {/* Captured Card Thumbnail */}
                {ocrReviewData?.cardImage && (
                  <div className="rounded-lg overflow-hidden border border-slate-200 max-h-36 bg-slate-100 flex items-center justify-center">
                    <img
                      src={ocrReviewData.cardImage}
                      alt="Captured ID Card"
                      className="max-h-36 w-full object-contain"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">
                    เลขประจำตัวประชาชน (13 หลัก) *
                  </Label>
                  <Input
                    value={ocrReviewData?.nationalId || ''}
                    maxLength={13}
                    placeholder="x-xxxx-xxxxx-xx-x"
                    onChange={(e) =>
                      setOcrReviewData((prev: any) => ({
                        ...prev,
                        nationalId: e.target.value.replace(/\D/g, ''),
                      }))
                    }
                    className="font-mono text-sm tracking-wider font-bold text-blue-900 bg-blue-50/50"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">ชื่อจริง *</Label>
                    <Input
                      value={ocrReviewData?.firstName || ''}
                      placeholder="ชื่อ"
                      onChange={(e) =>
                        setOcrReviewData((prev: any) => ({
                          ...prev,
                          firstName: e.target.value,
                        }))
                      }
                      className="text-sm font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-slate-700">นามสกุล *</Label>
                    <Input
                      value={ocrReviewData?.lastName || ''}
                      placeholder="นามสกุล"
                      onChange={(e) =>
                        setOcrReviewData((prev: any) => ({
                          ...prev,
                          lastName: e.target.value,
                        }))
                      }
                      className="text-sm font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-700">ที่อยู่ตามบัตรประชาชน</Label>
                  <textarea
                    value={ocrReviewData?.address || ''}
                    rows={2}
                    placeholder="บ้านเลขที่ หมู่ ตำบล อำเภอ จังหวัด"
                    onChange={(e) =>
                      setOcrReviewData((prev: any) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    className="flex min-h-[50px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  />
                </div>

                {/* Raw OCR Text toggle if needed */}
                {ocrReviewData?.rawText && (
                  <details className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <summary className="cursor-pointer font-semibold text-slate-600">
                      📄 ดูข้อความดิบทั้งหมดที่ AI อ่านได้จากภาพ (Raw Text)
                    </summary>
                    <pre className="mt-1.5 whitespace-pre-wrap font-mono text-[10px] text-slate-700 bg-white p-2 rounded border max-h-24 overflow-y-auto">
                      {ocrReviewData.rawText}
                    </pre>
                  </details>
                )}
              </div>

              <DialogFooter className="gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowOcrReviewModal(false)}
                >
                  ปิด
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (ocrReviewData) {
                      if (ocrReviewData.nationalId) setValue('nationalId', ocrReviewData.nationalId);
                      if (ocrReviewData.firstName) setValue('firstName', ocrReviewData.firstName);
                      if (ocrReviewData.lastName) setValue('lastName', ocrReviewData.lastName);
                      if (ocrReviewData.address) setValue('address', ocrReviewData.address);
                      toast({ title: '✓ นำข้อมูลที่ตรวจสอบแล้วไปใส่ในแบบฟอร์มเรียบร้อย' });
                    }
                    setShowOcrReviewModal(false);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>✓ ใช้งานข้อมูลนี้ในแบบฟอร์ม</span>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Device Photo Stream Modal */}
          {showDeviceCamera && (
            <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl p-4 max-w-md w-full space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Camera className="w-5 h-5 text-blue-600" />
                    ถ่ายภาพสภาพเครื่องใช้ที่นำมาซ่อม
                  </h3>
                  <Button size="icon" variant="ghost" onClick={stopDeviceCamera}>
                    <CameraOff className="w-4 h-4" />
                  </Button>
                </div>
                <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                  <video ref={deviceVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={stopDeviceCamera}>ยกเลิก</Button>
                  <Button onClick={captureDevicePhoto} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 font-semibold">
                    <Camera className="w-4 h-4" /> บันทึกภาพ
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Customer Info Card */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3 bg-slate-50/50 rounded-t-lg border-b">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  1. ข้อมูลผู้รับบริการ (ลูกค้า / เจ้าของอุปกรณ์)
                </CardTitle>
                <CardDescription>ข้อมูลส่วนบุคคลจะถูกเข้ารหัสระดับสูงและนำมาแสดงผลในใบรับซ่อมอย่างถูกต้อง</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName" className="text-xs font-semibold">ชื่อจริง *</Label>
                    <Input id="firstName" placeholder="ชื่อ" {...register('firstName')} />
                    {errors.firstName && <p className="text-xs text-rose-500">{errors.firstName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName" className="text-xs font-semibold">นามสกุล *</Label>
                    <Input id="lastName" placeholder="นามสกุล" {...register('lastName')} />
                    {errors.lastName && <p className="text-xs text-rose-500">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="nationalId" className="text-xs font-semibold">เลขประจำตัวประชาชน (13 หลัก) *</Label>
                    <Input
                      id="nationalId"
                      placeholder="1-5501-00123-45-6"
                      maxLength={13}
                      {...register('nationalId')}
                    />
                    {errors.nationalId && <p className="text-xs text-rose-500">{errors.nationalId.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold">เบอร์โทรศัพท์ติดต่อ *</Label>
                    <Input id="phone" placeholder="081-234-5678" {...register('phone')} />
                    {errors.phone && <p className="text-xs text-rose-500">{errors.phone.message}</p>}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="address" className="text-xs font-semibold">ที่อยู่ / ตำบล / อำเภอ / จังหวัด *</Label>
                  <Input id="address" placeholder="เช่น 123 หมู่ 4 ต.ในเวียง อ.เมือง จ.น่าน" {...register('address')} />
                  {errors.address && <p className="text-xs text-rose-500">{errors.address.message}</p>}
                </div>

                {/* Citizen ID Card Photo Attachment */}
                <div className="border border-dashed border-emerald-300 rounded-lg p-3 bg-emerald-50/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <Label className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-emerald-600" />
                        ภาพถ่ายสำเนาบัตรประชาชนผู้รับบริการ (แสดงในใบรับซ่อม A4)
                      </Label>
                      <p className="text-[11px] text-emerald-700">สามารถใช้กล้องถ่ายบัตร หรือเลือกไฟล์รูปภาพเพื่อแทรกลงในช่องสำเนาบัตรประชาชน</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={startIdCardCamera}
                        className="bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100 gap-1.5 text-xs h-8"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        เปิดกล้องถ่ายบัตร
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => idCardFileInputRef.current?.click()}
                        className="bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-100 gap-1.5 text-xs h-8"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        เลือกไฟล์ภาพ
                      </Button>
                      <input
                        ref={idCardFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleIdCardFileUpload}
                      />
                    </div>
                  </div>

                  {idCardImage && (
                    <div className="mt-3 relative inline-block border-2 border-emerald-500 rounded-lg overflow-hidden bg-white shadow-sm">
                      <img src={idCardImage} alt="ID Card Preview" className="h-28 w-auto object-contain" />
                      <button
                        type="button"
                        onClick={() => setIdCardImage(null)}
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 shadow hover:bg-rose-700"
                        title="ลบภาพบัตร"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Device & Problem Card */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-3 bg-slate-50/50 rounded-t-lg border-b">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-blue-600" />
                  2. ข้อมูลอุปกรณ์ อาการชำรุด และสภาพเครื่องใช้
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">ประเภทงาน / อุปกรณ์ที่นำมาซ่อม *</Label>
                  <Select value={watch('tradeCode')} onValueChange={(v) => setValue('tradeCode', v)}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="-- เลือกประเภทอุปกรณ์ที่ต้องการซ่อม --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="E01">⚡ ไฟฟ้า – พัดลม</SelectItem>
                      <SelectItem value="E02">⚡ ไฟฟ้า – หม้อหุงข้าว</SelectItem>
                      <SelectItem value="E03">⚡ ไฟฟ้า – เตารีด</SelectItem>
                      <SelectItem value="E04">⚡ ไฟฟ้า – กระติกน้ำร้อน</SelectItem>
                      <SelectItem value="E05">⚡ ไฟฟ้า – เครื่องซักผ้า</SelectItem>
                      <SelectItem value="E99">⚡ ไฟฟ้า – เครื่องใช้ไฟฟ้าอื่น ๆ</SelectItem>
                      <SelectItem value="X01">💻 อิเล็กทรอนิกส์ – โทรทัศน์ (TV)</SelectItem>
                      <SelectItem value="X02">💻 อิเล็กทรอนิกส์ – เครื่องเสียง / วิทยุ</SelectItem>
                      <SelectItem value="X03">💻 อิเล็กทรอนิกส์ – คอมพิวเตอร์ / โน้ตบุ๊ก</SelectItem>
                      <SelectItem value="X04">💻 อิเล็กทรอนิกส์ – โทรศัพท์มือถือ / แท็บเล็ต</SelectItem>
                      <SelectItem value="X99">💻 อิเล็กทรอนิกส์ – อุปกรณ์อิเล็กทรอนิกส์อื่น ๆ</SelectItem>
                      <SelectItem value="A01">🚗 ยานยนต์ – รถจักรยานยนต์</SelectItem>
                      <SelectItem value="A02">🚗 ยานยนต์ – รถยนต์</SelectItem>
                      <SelectItem value="A03">🚗 ยานยนต์ – เครื่องยนต์การเกษตร / เครื่องตัดหญ้า</SelectItem>
                      <SelectItem value="A99">🚗 ยานยนต์ – ยานพาหนะและเครื่องยนต์อื่น ๆ</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.tradeCode && <p className="text-xs text-rose-500">{errors.tradeCode.message}</p>}
                </div>

                {/* Custom Device Details when Other selected */}
                {isOtherCategory && (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg space-y-1.5">
                    <Label htmlFor="customDeviceDetails" className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      ระบุประเภทอุปกรณ์ / บริการอื่น ๆ *
                    </Label>
                    <Input
                      id="customDeviceDetails"
                      placeholder="เช่น ปั๊มน้ำ, เครื่องฟอกอากาศ, ไมโครเวฟ, โดรนการเกษตร ฯลฯ"
                      className="bg-white border-amber-300"
                      {...register('customDeviceDetails')}
                    />
                    {errors.customDeviceDetails && (
                      <p className="text-xs text-rose-600 font-semibold">{errors.customDeviceDetails.message}</p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="brand" className="text-xs font-semibold">ยี่ห้อ / แบรนด์</Label>
                    <Input id="brand" placeholder="เช่น Hatari, Sharp, Honda" {...register('brand')} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="model" className="text-xs font-semibold">รุ่น / Model (ถ้ามี)</Label>
                    <Input id="model" placeholder="เช่น HT-T16M4" {...register('model')} />
                  </div>
                </div>

                {/* Problem Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="problemDesc" className="text-xs font-semibold text-slate-800">
                    อาการเสีย / ปัญหาที่ต้องการให้ซ่อม *
                  </Label>
                  <textarea
                    id="problemDesc"
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="ระบุอาการเสีย เช่น เปิดไม่ติด, มอเตอร์ไม่หมุน, ควันขึ้น, สตาร์ทไม่ติด ฯลฯ"
                    {...register('problemDesc')}
                  />
                  {errors.problemDesc && <p className="text-xs text-rose-500">{errors.problemDesc.message}</p>}
                </div>

                {/* Device Condition & Camera Capture */}
                <div className="space-y-2 border-t pt-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <Label htmlFor="deviceCondition" className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-blue-600" />
                      สภาพเครื่องใช้ที่นำมาซ่อม (บันทึกข้อความและภาพถ่าย)
                    </Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={startDeviceCamera}
                        className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5 text-xs h-8"
                      >
                        <Camera className="w-3.5 h-3.5 text-blue-600" />
                        เปิดกล้องถ่ายภาพ
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50 gap-1.5 text-xs h-8"
                      >
                        <Upload className="w-3.5 h-3.5 text-slate-600" />
                        เลือกไฟล์รูปภาพ
                      </Button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleDeviceFileUpload}
                      />
                    </div>
                  </div>

                  <Input
                    id="deviceCondition"
                    placeholder="เช่น มีรอยถลอกรอบตัวเครื่อง, ฝาครอบแตกหัก, สภาพเปียกน้ำ ฯลฯ"
                    {...register('deviceCondition')}
                  />

                  {deviceImage && (
                    <div className="mt-2 relative inline-block border-2 border-blue-500 rounded-lg overflow-hidden bg-white shadow-sm">
                      <img src={deviceImage} alt="Device Condition" className="h-32 w-auto object-contain" />
                      <button
                        type="button"
                        onClick={() => setDeviceImage(null)}
                        className="absolute top-1 right-1 bg-rose-600 text-white rounded-full p-1 shadow hover:bg-rose-700"
                        title="ลบภาพ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Accessories */}
                <div className="space-y-1.5">
                  <Label htmlFor="accessories" className="text-xs font-semibold text-slate-800">
                    อุปกรณ์ที่ติดมาด้วย
                  </Label>
                  <Input
                    id="accessories"
                    placeholder="เช่น ปลั๊กไฟ, รีโมท, สายชาร์จ, แบตเตอรี่, ตะแกรงหน้า ฯลฯ"
                    {...register('accessories')}
                  />
                </div>

                {/* Additional Details */}
                <div className="space-y-1.5">
                  <Label htmlFor="additionalDetails" className="text-xs font-semibold text-slate-800">
                    รายละเอียดเพิ่มเติม
                  </Label>
                  <textarea
                    id="additionalDetails"
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="ระบุรายละเอียดเพิ่มเติม เช่น ข้อตกลงพิเศษ, กำหนดวันนัดรับเครื่อง ฯลฯ"
                    {...register('additionalDetails')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Button & Prevention Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-sm">
                {queueNumber ? (
                  <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                    <span>ออกหมายเลขคิวสำเร็จแล้ว:</span>
                    <span className="font-mono text-base px-2.5 py-0.5 bg-emerald-100 rounded-md text-emerald-900 border border-emerald-300 font-bold">{queueNumber}</span>
                  </div>
                ) : (
                  <span className="text-slate-500 text-xs sm:text-sm">⚠️ กรุณาตรวจสอบความถูกต้องของข้อมูลก่อนกดยืนยันการออกคิว</span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleStartNewRegistration}
                  disabled={submitting}
                  className="gap-1.5 font-medium"
                >
                  <RefreshCw className="h-4 w-4" />
                  {queueNumber ? '✨ ลงทะเบียนงานถัดไป' : 'ล้างข้อมูล'}
                </Button>
                <Button
                  type="submit"
                  className={cn(
                    "min-w-[220px] gap-2 text-base font-semibold shadow-md transition-all",
                    queueNumber
                      ? "bg-slate-300 hover:bg-slate-300 text-slate-600 cursor-not-allowed border border-slate-300"
                      : "bg-blue-600 hover:bg-blue-700 text-white"
                  )}
                  disabled={submitting || !!queueNumber}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      กำลังบันทึกและออกคิว...
                    </>
                  ) : queueNumber ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ออกคิวเรียบร้อยแล้ว ({queueNumber})
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      บันทึกและออกหมายเลขคิว
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          {/* Success Queue Ticket Card */}
          {queueNumber && submittedData && (
            <Card className="border-2 border-emerald-500 bg-emerald-50/40 mt-6 shadow-md animate-in fade-in zoom-in-95 duration-200">
              <CardContent className="p-6 text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  ออกหมายเลขคิวสำเร็จเรียบร้อย
                </div>
                <div className="border-4 border-blue-600 rounded-2xl p-6 bg-white max-w-sm mx-auto shadow-inner">
                  <p className="text-xs text-muted-foreground font-semibold">หมายเลขคิวรับงาน</p>
                  <p className="text-5xl font-black text-blue-600 my-2 tracking-widest font-mono">{queueNumber}</p>
                  <p className="text-xs text-slate-600 font-medium border-t pt-2 mt-2">
                    {submittedData.firstName} {submittedData.lastName} | {submittedData.brand || '-'} ({submittedData.tradeCode})
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 pt-2">
                  <Button
                    variant="default"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-sm"
                    onClick={handleStartNewRegistration}
                  >
                    <PlusCircle className="h-4 w-4" />
                    ✨ + ลงทะเบียนเครื่องใหม่ / ลูกค้าใหม่
                  </Button>
                  <Button
                    variant="default"
                    className="bg-amber-600 hover:bg-amber-700 text-white gap-2 font-semibold shadow-sm"
                    onClick={handlePrintCurrentTag}
                  >
                    <Tag className="h-4 w-4" />
                    🏷️ พิมพ์ป้ายติดเครื่อง (แนวยาว)
                  </Button>
                  <Button
                    variant="default"
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-semibold shadow-sm"
                    onClick={handlePrintCurrentA4}
                  >
                    <Printer className="h-4 w-4" />
                    🖨️ พิมพ์ใบรับงานซ่อม (Official A4)
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2 font-semibold"
                    onClick={() => setActiveTab('list')}
                  >
                    <Search className="h-4 w-4" />
                    ดูรายการทั้งหมด / จัดการข้อมูล (CRUD)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════
            TAB 2: ORDERS MANAGEMENT & FULL CRUD TABLE (READ, UPDATE, DELETE)
        ══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="list" className="mt-4 space-y-4">
          {/* Filter & Search Bar */}
          <Card className="shadow-sm border-slate-200">
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="🔍 ค้นหาจาก หมายเลขคิว (E-001), ชื่อลูกค้า, นามสกุล, เลขบัตรปชช., เบอร์โทร, หรืออาการเสีย..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-white"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchOrders}
                  className="gap-1.5 font-medium shrink-0"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
                  รีเฟรชข้อมูล
                </Button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 font-medium">กรองตามศูนย์บริการ:</Label>
                  <Select value={selectedCenterFilter} onValueChange={setSelectedCenterFilter}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="ทุกศูนย์บริการ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">🏢 ทุกศูนย์บริการ</SelectItem>
                      {centers.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 font-medium">กรองตามประเภทงาน:</Label>
                  <Select value={filterTrade} onValueChange={setFilterTrade}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="ทุกประเภทงาน" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">🔧 ทุกประเภทงาน</SelectItem>
                      <SelectItem value="ELECTRICAL">⚡ ช่างไฟฟ้า (E)</SelectItem>
                      <SelectItem value="ELECTRONICS">💻 ช่างอิเล็กทรอนิกส์ (X)</SelectItem>
                      <SelectItem value="AUTOMOTIVE">🚗 ช่างยนต์ (A)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-slate-500 font-medium">กรองตามสถานะงาน:</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="h-8 text-xs bg-white">
                      <SelectValue placeholder="ทุกสถานะ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">📋 ทุกสถานะ</SelectItem>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100/80 text-slate-700 font-bold border-b text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3 text-center w-24">หมายเลขคิว</th>
                    <th className="p-3">ผู้รับบริการ / ลูกค้า</th>
                    <th className="p-3">เบอร์โทรศัพท์</th>
                    <th className="p-3">ประเภท & อาการเสีย</th>
                    <th className="p-3">ศูนย์บริการ</th>
                    <th className="p-3 text-center">สถานะ</th>
                    <th className="p-3 text-center">วันเวลาที่ลงทะเบียน</th>
                    <th className="p-3 text-center w-52">จัดการ (CRUD / พิมพ์ / ส่งมอบ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ordersLoading ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                        กำลังโหลดข้อมูลงานซ่อม...
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        ไม่พบรายการงานซ่อมตามเงื่อนไขที่เลือก
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => {
                      const statusInfo = STATUS_CONFIG[order.status] || STATUS_CONFIG.PENDING;
                      const StatusIcon = statusInfo.icon;
                      const TradeIcon = TRADE_ICONS[order.tradeCode] || Wrench;
                      const recDate = order.registeredAt ? new Date(order.registeredAt) : new Date(order.createdAt);
                      const timeStr = recDate.toLocaleDateString('th-TH', {
                        day: 'numeric',
                        month: 'short',
                        year: '2-digit',
                      }) + ' ' + recDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

                      return (
                        <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-center font-mono font-black text-sm text-blue-600">
                            {order.queueNumber}
                          </td>
                          <td className="p-3 font-semibold text-slate-900">
                            {order.customer ? (
                              <div>
                                <span>{order.customer.firstName} {order.customer.lastName}</span>
                                {order.customer.nationalId && (
                                  <div className="text-[10px] text-slate-400 font-mono font-normal">
                                    {formatNationalId(order.customer.nationalId)}
                                  </div>
                                )}
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                          <td className="p-3 text-slate-600 font-mono">
                            {order.customer?.phone ? formatPhone(order.customer.phone) : '-'}
                          </td>
                          <td className="p-3 space-y-0.5">
                            <div className="font-semibold text-slate-800 flex items-center gap-1">
                              <TradeIcon className="w-3.5 h-3.5 text-slate-500" />
                              <span>{order.deviceCategory}</span>
                              {order.deviceBrand && order.deviceBrand !== '-' && (
                                <span className="text-slate-500 font-normal">({order.deviceBrand})</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-600 truncate max-w-xs" title={order.problemDesc}>
                              {order.problemDesc}
                            </div>
                          </td>
                          <td className="p-3 text-slate-600">
                            {order.center?.name || 'ศูนย์บริการ'}
                          </td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusInfo.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusInfo.label}
                            </span>
                          </td>
                          <td className="p-3 text-center text-slate-500 text-[11px]">
                            {timeStr}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* View Details */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                title="ดูรายละเอียด / ติดตามสถานะ"
                                onClick={() => handleViewOrderDetails(order)}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>

                              {/* Print Tag Strip */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-amber-600 hover:bg-amber-50"
                                title="พิมพ์ป้ายติดเครื่อง (แนวยาว)"
                                onClick={() => handlePrintSpecificTag(order)}
                              >
                                <Tag className="h-3.5 w-3.5" />
                              </Button>

                              {/* Print A4 */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-slate-700 hover:bg-slate-100"
                                title="พิมพ์ใบรับงานซ่อม (Official A4)"
                                onClick={() => handlePrintSpecificOrder(order)}
                              >
                                <Printer className="h-3.5 w-3.5" />
                              </Button>

                              {/* Handover & Delivery */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className={`h-7 w-7 ${order.status === 'COMPLETED' ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 animate-pulse' : 'text-emerald-700 hover:bg-emerald-50'}`}
                                title="ส่งมอบเครื่องและเซ็นรับคืน"
                                onClick={() => handleOpenHandover(order)}
                              >
                                <PackageCheck className="h-3.5 w-3.5" />
                              </Button>

                              {/* Edit (U) */}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-amber-600 hover:bg-amber-50"
                                title="แก้ไขข้อมูลงานซ่อม (Edit)"
                                onClick={() => handleOpenEdit(order)}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>

                              {/* Delete (D) - Only for Super Admin */}
                              {isSuperAdmin && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                                  title="ลบรายการ (เฉพาะ Admin ระบบใหญ่)"
                                  onClick={() => handleOpenDelete(order)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-slate-50 border-t text-xs text-slate-500 flex justify-between items-center">
              <span>แสดงทั้งหมด {orders.length} รายการ (จากทั้งหมด {totalOrdersCount} รายการ)</span>
              <span className="text-[11px] text-slate-400">ระบบอัปเดตข้อมูลอัตโนมัติ</span>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 1: ORDER DETAILS & LIFECYCLE TIMELINE (READ)
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="font-mono text-blue-600 text-xl font-black">{selectedOrder?.queueNumber}</span>
                  รายละเอียดงานซ่อม & สถานะ
                </DialogTitle>
                <DialogDescription>
                  ลงทะเบียนเมื่อ {selectedOrder?.registeredAt ? new Date(selectedOrder.registeredAt).toLocaleString('th-TH') : '-'}
                </DialogDescription>
              </div>
              {selectedOrder?.status && (
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${STATUS_CONFIG[selectedOrder.status]?.color || 'bg-slate-100'}`}>
                  {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                </span>
              )}
            </div>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 py-2 text-xs">
              {/* Customer & Center Info */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border">
                <div>
                  <span className="font-bold text-slate-800">ผู้รับบริการ:</span>
                  <p className="text-slate-700 font-semibold">{selectedOrder.customer?.firstName} {selectedOrder.customer?.lastName}</p>
                  <p className="text-slate-500 font-mono">{formatNationalId(selectedOrder.customer?.nationalId)}</p>
                  <p className="text-slate-600">📞 {formatPhone(selectedOrder.customer?.phone)}</p>
                  <p className="text-slate-500 text-[11px] mt-0.5">{selectedOrder.customer?.address || '-'}</p>
                </div>
                <div>
                  <span className="font-bold text-slate-800">ข้อมูลศูนย์บริการ:</span>
                  <p className="text-slate-700">{selectedOrder.center?.name || 'ศูนย์บริการ'}</p>
                  <span className="font-bold text-slate-800 block mt-2">แผนกช่าง:</span>
                  <Badge variant="outline">{selectedOrder.tradeCode}</Badge>
                </div>
              </div>

              {/* ID Card Photo if attached */}
              {selectedOrder.idCardImage && (
                <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200">
                  <span className="font-bold text-emerald-900 block mb-1.5 flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                    ภาพถ่ายสำเนาบัตรประชาชนผู้รับบริการ:
                  </span>
                  <img src={selectedOrder.idCardImage} alt="ID Card" className="max-h-36 object-contain rounded border border-emerald-300 bg-white p-1" />
                </div>
              )}

              {/* Device Details & Problem */}
              <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-blue-900 text-sm">{selectedOrder.deviceCategory}</span>
                  <span className="text-slate-600">ยี่ห้อ: {selectedOrder.deviceBrand || '-'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-800">อาการเสีย:</span>
                  <p className="text-slate-700 bg-white p-2 rounded border mt-1">{selectedOrder.problemDesc}</p>
                </div>
                {selectedOrder.deviceCondition && (
                  <div>
                    <span className="font-semibold text-slate-800">สภาพเครื่องใช้:</span>
                    <p className="text-slate-600">{selectedOrder.deviceCondition}</p>
                  </div>
                )}
                {selectedOrder.problemImages && selectedOrder.problemImages.length > 0 && (
                  <div className="mt-2">
                    <span className="font-semibold text-slate-800 block mb-1">ภาพถ่ายสภาพเครื่อง:</span>
                    <img src={selectedOrder.problemImages[0]} alt="Device" className="max-h-40 object-contain rounded border bg-white p-1" />
                  </div>
                )}
              </div>

              {/* Handover & Delivery Details if closed */}
              {selectedOrder.customerSignature && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-2">
                  <span className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ข้อมูลการส่งมอบเครื่องคืนเรียบร้อยแล้ว (CLOSED)
                  </span>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="font-semibold text-slate-700">ลายเซ็นผู้รับเครื่องคืน:</span>
                      <img src={selectedOrder.customerSignature} alt="ลายเซ็นผู้รับเครื่อง" className="max-h-16 border rounded bg-white p-1 mt-1" />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-700">ผู้ส่งมอบเครื่อง:</span>
                      <p className="font-bold text-slate-900 mt-1">{selectedOrder.handoverBy || '-'}</p>
                      <span className="font-semibold text-slate-700 block mt-2">เวลาที่ส่งมอบ:</span>
                      <p className="text-slate-600">{selectedOrder.closedAt ? new Date(selectedOrder.closedAt).toLocaleString('th-TH') : '-'}</p>
                    </div>
                  </div>
                  {selectedOrder.handoverNotes && (
                    <div className="text-[11px] text-slate-600 border-t pt-1 mt-1">
                      <span className="font-semibold">หมายเหตุการส่งมอบ: </span>{selectedOrder.handoverNotes}
                    </div>
                  )}
                </div>
              )}

              {/* 6-Step Lifecycle Status Timeline */}
              <div>
                <span className="font-bold text-slate-800 text-sm block mb-2">เส้นทางสถานะงานซ่อม (Lifecycle Timeline):</span>
                <div className="space-y-2 border-l-2 border-slate-200 pl-4 ml-2">
                  {['PENDING', 'DIAGNOSING', 'WAITING_PARTS', 'REPAIRING', 'QC_PENDING', 'COMPLETED', 'CLOSED'].map((st) => {
                    const isCurrent = selectedOrder.status === st;
                    const cfg = STATUS_CONFIG[st];
                    return (
                      <div key={st} className="relative flex items-center gap-2">
                        <div className={`absolute -left-[21px] w-3 h-3 rounded-full border-2 bg-white ${isCurrent ? 'border-blue-600 bg-blue-600 ring-4 ring-blue-100' : 'border-slate-300'}`} />
                        <span className={`text-xs font-semibold ${isCurrent ? 'text-blue-600 font-bold' : 'text-slate-500'}`}>
                          {cfg?.label}
                        </span>
                        {isCurrent && <Badge className="bg-blue-600 text-white text-[10px] py-0 px-1.5">สถานะปัจจุบัน</Badge>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="bg-amber-50 text-amber-900 border-amber-300 text-xs gap-1.5 shadow-sm"
                onClick={() => handlePrintSpecificTag(selectedOrder)}
              >
                <Tag className="w-3.5 h-3.5 text-amber-600" />
                พิมพ์ป้ายติดเครื่อง (แนวยาว)
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-white text-slate-800 text-xs gap-1.5 shadow-sm"
                onClick={() => handlePrintSpecificOrder(selectedOrder)}
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                พิมพ์ใบรับซ่อม (A4)
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 font-semibold"
                onClick={() => {
                  setDetailsDialogOpen(false);
                  handleOpenHandover(selectedOrder);
                }}
              >
                <PackageCheck className="w-3.5 h-3.5" />
                ส่งมอบเครื่องคืน
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDetailsDialogOpen(false)}>
                ปิดหน้าต่าง
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2: HANDOVER & DIGITAL RETURN SIGNATURE (DELIVERY)
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={handoverDialogOpen} onOpenChange={setHandoverDialogOpen}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl">
          <DialogHeader className="p-4 sm:p-5 border-b shrink-0 bg-white">
            <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-emerald-800">
              <PackageCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>ส่งมอบอุปกรณ์คืน & เซ็นรับเครื่อง (คิว {handoverOrder?.queueNumber})</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              เซ็นชื่อรับเครื่องบนหน้าจอมือถือ / iPad / คอม เพื่อบันทึกลงในเอกสารใบรับซ่อมฉบับสมบูรณ์
            </DialogDescription>
          </DialogHeader>

          {handoverOrder && (
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* Summary Box */}
              <div className="p-3 bg-slate-50 border rounded-xl space-y-1.5 shadow-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">ผู้รับบริการ:</span>
                  <span className="font-bold text-slate-900 text-sm">{handoverOrder.customer?.firstName} {handoverOrder.customer?.lastName}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">อุปกรณ์:</span>
                  <span className="font-semibold text-slate-800">{handoverOrder.deviceCategory} ({handoverOrder.deviceBrand || '-'})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">เจ้าหน้าที่ผู้ส่งมอบ:</span>
                  <span className="font-bold text-blue-700">{user?.fullName || user?.username || 'เจ้าหน้าที่ผู้ส่งมอบ'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">วันเวลาส่งมอบ:</span>
                  <span className="font-semibold text-slate-700">{new Date().toLocaleString('th-TH')}</span>
                </div>
              </div>

              {/* Digital Signature Pad */}
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <PenTool className="w-4 h-4 text-emerald-600" />
                  ลายมือชื่อผู้รับเครื่อง / เจ้าของอุปกรณ์ (เซ็นบนหน้าจอ Touchscreen / iPad / เมาส์) *
                </Label>
                <div className="border-2 border-emerald-400 rounded-xl overflow-hidden bg-white shadow-inner p-2">
                  <SignaturePad
                    label="เซ็นชื่อรับเครื่องในกรอบนี้"
                    height={160}
                    initialValue={customerSignature}
                    onSave={(dataUrl) => setCustomerSignature(dataUrl)}
                  />
                </div>
              </div>

              {/* Handover Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="handoverNotes" className="text-xs font-semibold text-slate-800">
                  หมายเหตุการส่งมอบ (ถ้ามี)
                </Label>
                <Input
                  id="handoverNotes"
                  placeholder="เช่น ทดสอบเครื่องต่อหน้าลูกค้าเรียบร้อยดี, มอบอุปกรณ์เสริมครบถ้วน"
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="p-3 sm:p-4 border-t bg-slate-50 shrink-0 flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setHandoverDialogOpen(false)}
              disabled={handoverSubmitting}
              className="text-xs font-semibold w-full sm:w-auto"
            >
              ยกเลิก
            </Button>
            <Button
              type="button"
              onClick={handleSubmitHandover}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-1.5 text-xs w-full sm:w-auto shadow-sm"
              disabled={handoverSubmitting}
            >
              {handoverSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  กำลังบันทึกส่งมอบ...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  ยืนยันส่งมอบและบันทึกลงใบรับซ่อม (CLOSED)
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2.1: HANDOVER SUCCESS CONFIRMATION MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={handoverSuccessDialogOpen} onOpenChange={setHandoverSuccessDialogOpen}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full p-0 overflow-hidden shadow-2xl rounded-2xl">
          <div className="bg-gradient-to-b from-emerald-500 to-emerald-600 p-6 text-white text-center">
            <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-3 border border-white/40">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-black tracking-tight">ส่งมอบเครื่องเรียบร้อยแล้ว!</h3>
            <p className="text-xs text-emerald-100 mt-1">
              ระบบบันทึกลายเซ็นและอัปเดตเอกสารใบรับซ่อม (A4) ฉบับสมบูรณ์เรียบร้อยแล้ว
            </p>
          </div>

          {handoverSuccessOrder && (
            <div className="p-5 space-y-4 text-xs">
              <div className="border-2 border-emerald-500/30 rounded-xl p-4 bg-emerald-50/50 space-y-2 text-center">
                <p className="text-xs text-slate-500 font-semibold">หมายเลขคิว</p>
                <p className="text-4xl font-black text-emerald-700 font-mono tracking-wider">{handoverSuccessOrder.queueNumber}</p>
                <div className="border-t border-emerald-200/80 pt-2 text-slate-700 space-y-1">
                  <p><span className="font-semibold">ผู้รับเครื่อง:</span> {handoverSuccessOrder.customer?.firstName} {handoverSuccessOrder.customer?.lastName}</p>
                  <p><span className="font-semibold">เจ้าหน้าที่ผู้ส่งมอบ:</span> {handoverSuccessOrder.handoverBy || user?.fullName || '-'}</p>
                  {handoverSuccessOrder.customerSignature && (
                    <div className="pt-2 flex flex-col items-center justify-center">
                      <span className="text-[10px] text-slate-500 font-medium mb-1">ภาพลายมือชื่อที่บันทึกลงในเอกสาร:</span>
                      <img
                        src={handoverSuccessOrder.customerSignature}
                        alt="ลายเซ็นผู้รับเครื่อง"
                        className="h-12 max-w-[160px] object-contain border border-emerald-300 rounded bg-white p-1 shadow-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 py-5 shadow-sm text-sm"
                  onClick={() => {
                    setHandoverSuccessDialogOpen(false);
                    handlePrintSpecificOrder(handoverSuccessOrder);
                  }}
                >
                  <Printer className="w-4 h-4" />
                  🖨️ พิมพ์ใบรับซ่อมฉบับสมบูรณ์ (พร้อมลายเซ็น)
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 text-xs gap-1.5"
                    onClick={() => {
                      setHandoverSuccessDialogOpen(false);
                      handlePrintSpecificTag(handoverSuccessOrder);
                    }}
                  >
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    พิมพ์ป้ายแท็ก
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1 text-xs"
                    onClick={() => setHandoverSuccessDialogOpen(false)}
                  >
                    ปิดหน้าต่าง
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 3: EDIT REPAIR ORDER (UPDATE - U)
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Edit className="w-5 h-5 text-amber-600" />
              แก้ไขข้อมูลงานซ่อม (คิว {editingOrder?.queueNumber})
            </DialogTitle>
            <DialogDescription>
              ปรับปรุงข้อมูลผู้รับบริการ รายละเอียดอุปกรณ์ อาการเสีย หรือสถานะงานซ่อม
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">ชื่อ</Label>
                <Input
                  value={editFormData.firstName}
                  onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">นามสกุล</Label>
                <Input
                  value={editFormData.lastName}
                  onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">เบอร์โทรศัพท์</Label>
                <Input
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">สถานะงานซ่อม</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(v) => setEditFormData({ ...editFormData, status: v })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">ที่อยู่</Label>
              <Input
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">ประเภทอุปกรณ์</Label>
                <Input
                  value={editFormData.deviceCategory}
                  onChange={(e) => setEditFormData({ ...editFormData, deviceCategory: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">ยี่ห้อ / แบรนด์</Label>
                <Input
                  value={editFormData.deviceBrand}
                  onChange={(e) => setEditFormData({ ...editFormData, deviceBrand: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">อาการเสีย</Label>
              <textarea
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                value={editFormData.problemDesc}
                onChange={(e) => setEditFormData({ ...editFormData, problemDesc: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">สภาพเครื่องใช้ที่นำมาซ่อม</Label>
              <Input
                value={editFormData.deviceCondition}
                onChange={(e) => setEditFormData({ ...editFormData, deviceCondition: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">อุปกรณ์ที่ติดมาด้วย</Label>
              <Input
                value={editFormData.accessories}
                onChange={(e) => setEditFormData({ ...editFormData, accessories: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">รายละเอียดเพิ่มเติม</Label>
              <textarea
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                value={editFormData.additionalDetails}
                onChange={(e) => setEditFormData({ ...editFormData, additionalDetails: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={editSaving}>
              ยกเลิก
            </Button>
            <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold" disabled={editSaving}>
              {editSaving ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
              บันทึกการแก้ไข
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 4: DELETE CONFIRMATION (DELETE - D)
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              ยืนยันการลบรายการงานซ่อม
            </DialogTitle>
            <DialogDescription className="pt-2">
              คุณแน่ใจหรือไม่ว่าต้องการลบรายการคิว <strong className="text-slate-900 font-mono text-sm">{deletingOrder?.queueNumber}</strong> ({deletingOrder?.deviceCategory} ของคุณ {deletingOrder?.customer?.firstName} {deletingOrder?.customer?.lastName})?
              <br />
              <span className="text-rose-500 font-semibold text-xs mt-1 block">⚠️ การลบนี้จะลบข้อมูลประวัติสถานะและรายการอะไหล่ทั้งหมดอย่างถาวร</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleteSubmitting}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
            >
              {deleteSubmitting ? <RefreshCw className="w-4 h-4 animate-spin mr-1.5" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
              ยืนยันการลบรายการ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          PRINT OUTPUTS: OFFICIAL A4 FORM & DEVICE STRIP TAG
      ══════════════════════════════════════════════════════════════════════ */}
      {printOrder && <PrintLayout {...printOrder} />}
      {printTagOrder && <PrintTagLayout {...printTagOrder} />}
    </div>
  );
}

export default function RegistrationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">กำลังโหลดระบบลงทะเบียน...</div>}>
      <RegistrationPageContent />
    </Suspense>
  );
}
