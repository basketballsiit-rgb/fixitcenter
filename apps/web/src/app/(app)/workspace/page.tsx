'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Wrench,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Search,
  Clock,
  User,
  Phone,
  Cpu,
  Save,
  RefreshCw,
  Package,
  BellRing,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Eye,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { QRScanner } from '@/components/qr-scanner/qr-scanner';
import { repairOrderApi } from '@/lib/api';
import { formatPhone } from '@/lib/utils';
import { getSocket } from '@/lib/socket';
import { useToast } from '@/components/ui/use-toast';

const STATUS_FLOW: Record<string, { next: string; label: string; color: string }> = {
  PENDING: { next: 'DIAGNOSING', label: '▶ เริ่มการวินิจฉัย / ตรวจเช็ค', color: 'bg-blue-600 hover:bg-blue-700' },
  DIAGNOSING: { next: 'REPAIRING', label: '🔧 เริ่มดำเนินการซ่อม', color: 'bg-amber-600 hover:bg-amber-700' },
  WAITING_PARTS: { next: 'REPAIRING', label: '📦 ได้รับอะไหล่แล้ว - เริ่มซ่อมต่อ', color: 'bg-emerald-600 hover:bg-emerald-700' },
  REPAIRING: { next: 'COMPLETED', label: '🎉 ซ่อมเสร็จสิ้น (แจ้งเตือนส่งมอบเครื่องคืนลูกค้า)', color: 'bg-emerald-600 hover:bg-emerald-700' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'รอดำเนินการ', color: 'bg-slate-100 text-slate-800 border-slate-300' },
  DIAGNOSING: { label: 'กำลังวินิจฉัย/ตรวจเช็ค', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  WAITING_PARTS: { label: 'รออะไหล่ (รอติดต่อลูกค้า)', color: 'bg-amber-100 text-amber-900 border-amber-400' },
  REPAIRING: { label: 'กำลังดำเนินการซ่อม', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  QC_PENDING: { label: 'รอตรวจคุณภาพ', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  COMPLETED: { label: 'ซ่อมเสร็จสิ้น (พร้อมส่งมอบเครื่อง)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  CLOSED: { label: 'ส่งมอบเครื่องคืนแล้ว (ปิดงาน)', color: 'bg-teal-100 text-teal-800 border-teal-300' },
};

interface PartItem {
  description: string;
  quantity: number;
  cost: number;
}

export default function WorkspacePage() {
  const { toast } = useToast();
  const [order, setOrder] = useState<any | null>(null);
  const [searchQueue, setSearchQueue] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [waitingPartsDialog, setWaitingPartsDialog] = useState(false);
  const [nextStatus, setNextStatus] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [parts, setParts] = useState<PartItem[]>([]);
  const [partsSaving, setPartsSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [rotation, setRotation] = useState(0);

  const openImageModal = (imgSrc: string) => {
    setPreviewImage(imgSrc);
    setZoomScale(1);
    setRotation(0);
  };

  const fetchOrder = useCallback(async (queryInput: string) => {
    if (!queryInput || !queryInput.trim()) return;
    setLoading(true);
    const cleanQuery = queryInput.trim();

    // 1. Try getByQrToken (for scanned UUID or token)
    try {
      const qrRes = await repairOrderApi.getByQrToken(cleanQuery);
      const data = qrRes.data;
      if (data && data.id) {
        setOrder(data);
        const initialParts = (data.items || data.parts || []).map((p: any) => ({
          description: p.description || p.name || '',
          quantity: Number(p.quantity) || 1,
          cost: Number(p.unitCost ?? p.cost ?? 0),
        }));
        setParts(initialParts.length > 0 ? initialParts : []);
        setNotes(data.additionalDetails || data.notes || '');
        toast({ title: `✓ พบข้อมูลคิว ${data.queueNumber}` });
        return;
      }
    } catch {
      // Continue to next lookup
    }

    try {
      // 2. Try getByQueueNumber
      const res = await repairOrderApi.getByQueueNumber(cleanQuery.toUpperCase());
      const data = res.data;
      if (data) {
        setOrder(data);
        const initialParts = (data.items || data.parts || []).map((p: any) => ({
          description: p.description || p.name || '',
          quantity: Number(p.quantity) || 1,
          cost: Number(p.unitCost ?? p.cost ?? 0),
        }));
        setParts(initialParts.length > 0 ? initialParts : []);
        setNotes(data.additionalDetails || data.notes || '');
        toast({ title: `✓ พบข้อมูลคิว ${data.queueNumber}` });
        return;
      }
    } catch {
      // 3. Fallback: search via track API
      try {
        const trackRes = await repairOrderApi.track(cleanQuery);
        const list = Array.isArray(trackRes.data) ? trackRes.data : [];
        if (list.length > 0) {
          const first = list[0];
          setOrder(first);
          const initialParts = (first.items || first.parts || []).map((p: any) => ({
            description: p.description || p.name || '',
            quantity: Number(p.quantity) || 1,
            cost: Number(p.unitCost ?? p.cost ?? 0),
          }));
          setParts(initialParts.length > 0 ? initialParts : []);
          setNotes(first.additionalDetails || first.notes || '');
          toast({ title: `✓ พบข้อมูลคิว ${first.queueNumber}` });
          return;
        }
      } catch (err2) {
        console.error('Track failed:', err2);
      }
      toast({ title: 'ไม่พบข้อมูลงานซ่อม', description: `รหัส: ${cleanQuery}`, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const handleQRScan = useCallback((token: string) => {
    if (!token) return;
    try {
      const parsed = JSON.parse(token);
      if (parsed.queueNumber) {
        setSearchQueue(parsed.queueNumber);
        fetchOrder(parsed.queueNumber);
        return;
      }
    } catch {
      // Raw string token or queue number
    }
    setSearchQueue(token);
    fetchOrder(token);
  }, [fetchOrder]);

  // Real-time socket sync
  useEffect(() => {
    if (!order?.id) return;
    const socket = getSocket();
    const eventName = `order:${order.id}:updated`;
    socket.on(eventName, (updated: any) => {
      if (updated) {
        setOrder((prev: any) => ({ ...prev, ...updated }));
      }
    });
    return () => {
      socket.off(eventName);
    };
  }, [order?.id]);

  const initiateStatusChange = (status: string) => {
    setNextStatus(status);
    setConfirmDialog(true);
  };

  const confirmStatusChange = async () => {
    if (!order?.id || !nextStatus) return;
    setStatusUpdating(true);
    try {
      const res = await repairOrderApi.updateStatus(order.id, nextStatus);
      const updated = res.data;
      setOrder(updated);
      setConfirmDialog(false);
      toast({
        title: `✓ ปรับสถานะสำเร็จ → ${STATUS_LABELS[nextStatus]?.label || nextStatus}`,
      });
    } catch (err: any) {
      toast({
        title: 'ไม่สามารถอัปเดตสถานะได้',
        description: err?.response?.data?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนสถานะ',
        variant: 'destructive',
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  const openWaitingPartsModal = () => {
    if (parts.length === 0) {
      setParts([{ description: '', quantity: 1, cost: 0 }]);
    }
    setWaitingPartsDialog(true);
  };

  const confirmWaitingParts = async () => {
    if (!order?.id) return;
    setStatusUpdating(true);
    try {
      // 1. Save parts first
      const validParts = parts.filter((p) => p.description.trim());
      if (validParts.length > 0) {
        await repairOrderApi.addParts(
          order.id,
          validParts.map((p) => ({
            description: p.description.trim(),
            quantity: Number(p.quantity) || 1,
            unitCost: Number(p.cost) || 0,
          }))
        );
      }

      // 2. Change status to WAITING_PARTS
      const res = await repairOrderApi.updateStatus(order.id, 'WAITING_PARTS');
      setOrder(res.data);
      setWaitingPartsDialog(false);

      toast({
        title: '🔔 บันทึกสถานะรออะไหล่เรียบร้อยแล้ว!',
        description: 'ระบบส่งสัญญาณแจ้งเตือนไปยังฝ่ายลงทะเบียนและแอดมิน เพื่อโทรสอบถามลูกค้ายืนยันแล้ว',
      });
    } catch (err: any) {
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: err?.response?.data?.message || 'ไม่สามารถบันทึกสถานะรออะไหล่ได้',
        variant: 'destructive',
      });
    } finally {
      setStatusUpdating(false);
    }
  };

  const addPart = () => setParts((p) => [...p, { description: '', quantity: 1, cost: 0 }]);
  const removePart = (i: number) => setParts((p) => p.filter((_, idx) => idx !== i));
  const updatePart = (i: number, field: keyof PartItem, value: string | number) => {
    setParts((p) => p.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  };

  const saveParts = async () => {
    if (!order?.id) return;
    setPartsSaving(true);
    try {
      const validParts = parts.filter((p) => p.description.trim());
      const res = await repairOrderApi.addParts(
        order.id,
        validParts.map((p) => ({
          description: p.description.trim(),
          quantity: Number(p.quantity) || 1,
          unitCost: Number(p.cost) || 0,
        }))
      );
      if (res.data) {
        setOrder(res.data);
      }
      toast({
        title: '✓ บันทึกรายการอะไหล่เรียบร้อยแล้ว',
        description: `บันทึกรายการอะไหล่ ${validParts.length} รายการ ยอดรวม ฿${validParts.reduce((s, p) => s + (p.quantity * p.cost), 0).toLocaleString()}`,
      });
    } catch (err: any) {
      toast({
        title: 'ไม่สามารถบันทึกรายการอะไหล่ได้',
        description: err?.response?.data?.message || 'เกิดข้อผิดพลาดในการบันทึก',
        variant: 'destructive',
      });
    } finally {
      setPartsSaving(false);
    }
  };

  const currentFlow = order?.status ? STATUS_FLOW[order.status] : null;
  const statusInfo = order?.status ? STATUS_LABELS[order.status] : null;
  const totalPartsAmount = parts.reduce((s, p) => s + (Number(p.quantity) || 1) * (Number(p.cost) || 0), 0);

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Wrench className="w-6 h-6 text-blue-600" />
          พื้นที่ทำงานช่าง (Technician Workspace)
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
          สแกน QR Code จากป้ายแท็กบนตัวเครื่อง หรือพิมพ์หมายเลขคิวเพื่อเริ่มเปิดงานและบันทึกการซ่อม
        </p>
      </div>

      {/* Search & QR Scanner Panel */}
      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-600" />
            ค้นหางานซ่อม / สแกนรับงาน
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="พิมพ์หมายเลขคิว เช่น E-001, A-001, X-001"
              value={searchQueue}
              onChange={(e) => setSearchQueue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchOrder(searchQueue);
              }}
              className="text-sm uppercase font-mono tracking-wider"
            />
            <Button
              onClick={() => fetchOrder(searchQueue)}
              disabled={loading || !searchQueue.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5 px-5 shrink-0"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  กำลังค้นหา...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  ค้นหา
                </>
              )}
            </Button>
          </div>

          <Separator />

          <div>
            <Label className="text-xs font-semibold text-slate-700 block mb-2">
              📷 สแกน QR Code จากป้ายแท็กบนตัวเครื่อง:
            </Label>
            <QRScanner onScan={handleQRScan} onError={(e) => toast({ title: e, variant: 'destructive' })} />
          </div>
        </CardContent>
      </Card>

      {/* Active Job Card */}
      {order && (
        <div className="space-y-4 animate-in fade-in-50 duration-300">
          
          {/* WAITING_PARTS Special Alert Banner if in Waiting state */}
          {order.status === 'WAITING_PARTS' && (
            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 rounded-2xl shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500 text-white rounded-xl shadow-xs animate-bounce">
                    <BellRing className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-amber-900 text-sm sm:text-base">
                      สถานะ: รออะไหล่ (ส่งแจ้งเตือนฝ่ายลงทะเบียนแล้ว)
                    </h3>
                    <p className="text-xs text-amber-800">
                      ระบบได้ส่งสัญญาณแจ้งเตือนกระดิ่ง 🔔 ไปยังเจ้าหน้าที่ลงทะเบียนและแอดมิน เพื่อโทรสอบถามลูกค้าเรื่องการเปลี่ยนอะไหล่
                    </p>
                  </div>
                </div>
                {order.partsCost > 0 && (
                  <Badge className="bg-red-600 text-white font-mono font-bold text-xs px-3 py-1">
                    ยอดค่าอะไหล่ ฿{Number(order.partsCost).toLocaleString()}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-amber-200 text-xs">
                <span className="text-slate-700 font-medium">
                  เบอร์โทรลูกค้า: <strong>{formatPhone(order.customer?.phone)}</strong> ({order.customer?.firstName} {order.customer?.lastName})
                </span>
                <Button
                  size="sm"
                  onClick={() => initiateStatusChange('REPAIRING')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-1.5 h-8"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  ได้รับอะไหล่แล้ว / เริ่มซ่อมต่อ
                </Button>
              </div>
            </div>
          )}

          {/* Main Info Card */}
          <Card className="border-2 border-blue-300 shadow-md bg-white">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border-b border-blue-100 pb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                    หมายเลขคิวงานซ่อม
                  </div>
                  <CardTitle className="text-4xl font-black text-blue-900 font-mono tracking-wider mt-0.5">
                    {order.queueNumber}
                  </CardTitle>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {order.registeredAt || order.createdAt ? new Date(order.registeredAt || order.createdAt).toLocaleString('th-TH') : '-'}
                  </span>
                  <Badge className={`text-xs px-3 py-1 font-bold border shadow-none ${statusInfo?.color || 'bg-slate-100 text-slate-800'}`}>
                    {statusInfo?.label || order.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs sm:text-sm">
              {/* Customer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 border rounded-xl p-3.5">
                <div className="space-y-1">
                  <div className="text-slate-500 text-xs font-medium flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" /> ผู้รับบริการ:
                  </div>
                  <div className="font-bold text-slate-900 text-sm">
                    {order.customer?.firstName || 'ผู้รับบริการ'} {order.customer?.lastName || ''}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-slate-500 text-xs font-medium flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> เบอร์โทรศัพท์:
                  </div>
                  <div className="font-semibold text-slate-800 flex items-center gap-2">
                    <span>{formatPhone(order.customer?.phone)}</span>
                    {order.customer?.phone && (
                      <a
                        href={`tel:${order.customer.phone.replace(/[^0-9]/g, '')}`}
                        className="text-[10px] bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold px-2 py-0.5 rounded"
                      >
                        โทร
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Device & Problem Details */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-b pb-3">
                <div>
                  <span className="text-slate-500 block">ประเภท:</span>
                  <span className="font-bold text-slate-800">{order.deviceCategory || order.tradeCode || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">ยี่ห้อ / แบรนด์:</span>
                  <span className="font-bold text-slate-800">{order.deviceBrand || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">รุ่น:</span>
                  <span className="font-bold text-slate-800">{order.deviceModel || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Serial Number:</span>
                  <span className="font-mono text-slate-700">{order.serialNumber || '-'}</span>
                </div>
              </div>

              {/* Problem Description */}
              <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 space-y-1">
                <div className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  อาการเสียที่ได้รับแจ้ง:
                </div>
                <p className="text-slate-900 font-medium pl-5">{order.problemDesc || 'ไม่ระบุอาการเสีย'}</p>
              </div>

              {/* Condition & Accessories */}
              {(order.deviceCondition || order.accessories || order.additionalDetails) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 rounded-xl p-3 border">
                  {order.deviceCondition && (
                    <div>
                      <span className="text-slate-500 font-semibold block">สภาพเครื่อง:</span>
                      <span className="text-slate-800">{order.deviceCondition}</span>
                    </div>
                  )}
                  {order.accessories && (
                    <div>
                      <span className="text-slate-500 font-semibold block">อุปกรณ์ที่ติดมาด้วย:</span>
                      <span className="text-slate-800">{order.accessories}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Problem Images with Click-to-Zoom */}
              {order.problemImages && order.problemImages.length > 0 && (
                <div className="space-y-2 bg-slate-50 border rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      รูปถ่ายสภาพเครื่องตอนลงทะเบียน ({order.problemImages.length} ภาพ):
                    </span>
                    <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                      <ZoomIn className="w-3 h-3" /> คลิกที่รูปเพื่อซูมขยายดูรายละเอียด
                    </span>
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-1 pt-1">
                    {order.problemImages.map((img: string, idx: number) => (
                      <div
                        key={idx}
                        onClick={() => openImageModal(img)}
                        className="group relative cursor-pointer rounded-xl border-2 border-slate-200 hover:border-blue-500 overflow-hidden bg-white shadow-xs hover:shadow-md transition-all shrink-0"
                      >
                        <img
                          src={img}
                          alt={`สภาพเครื่อง ภาพที่ ${idx + 1}`}
                          className="h-28 w-auto min-w-[110px] max-w-[200px] object-contain p-1 group-hover:scale-105 transition-transform duration-200"
                        />
                        {/* Overlay with zoom icon */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-150">
                          <ZoomIn className="w-6 h-6 mb-1 drop-shadow-md animate-pulse" />
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-black/60 rounded-full">
                            ขยายภาพ
                          </span>
                        </div>
                        <Badge className="absolute top-1 left-1 bg-slate-900/80 text-[10px] text-white px-1.5 py-0">
                          #{idx + 1}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lifecycle Actions */}
              <div className="pt-2 border-t space-y-3">
                <div className="text-xs font-bold text-slate-700">การดำเนินการของช่าง (Status Actions):</div>
                
                {currentFlow && (
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <Button
                      className={`flex-1 h-12 text-sm font-bold text-white shadow-md gap-2 ${currentFlow.color}`}
                      onClick={() => initiateStatusChange(currentFlow.next)}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {currentFlow.label}
                    </Button>
                    
                    {order.status === 'DIAGNOSING' && (
                      <Button
                        variant="outline"
                        className="h-12 text-xs sm:text-sm font-bold border-amber-400 text-amber-900 bg-amber-50 hover:bg-amber-100 gap-1.5 shadow-sm"
                        onClick={openWaitingPartsModal}
                      >
                        <Package className="w-4 h-4 text-amber-600" />
                        📦 บันทึกรออะไหล่ & แจ้งราคาลูกค้า
                      </Button>
                    )}
                  </div>
                )}

                {(order.status === 'COMPLETED' || order.status === 'CLOSED') && (
                  <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>งานซ่อมนี้เสร็จสิ้นเรียบร้อยแล้ว ({STATUS_LABELS[order.status]?.label})</span>
                  </div>
                )}

                {order.status === 'QC_PENDING' && (
                  <div className="flex items-center gap-2 p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-800 text-xs font-semibold">
                    <Clock className="w-5 h-5 text-purple-600 shrink-0" />
                    <span>ส่งตรวจคุณภาพแล้ว — กำลังรอครูผู้ควบคุม QC ตรวจรับรอง</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Spare Parts Form */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  รายการอะไหล่ที่ใช้ (Spare Parts)
                </CardTitle>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  ระบุรายการอะไหล่และราคา เพื่อเป็นข้อมูลแจ้งเจ้าของเครื่องและคำนวณต้นทุน
                </p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addPart} className="gap-1 text-xs h-8">
                <Plus className="w-3.5 h-3.5 text-blue-600" />
                เพิ่มรายการ
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {parts.length === 0 ? (
                <div className="text-center py-6 text-slate-400 border border-dashed rounded-xl text-xs space-y-1">
                  <p>ยังไม่มีรายการอะไหล่</p>
                  <Button variant="ghost" size="sm" onClick={addPart} className="text-blue-600 text-xs gap-1">
                    <Plus className="w-3 h-3" /> เพิ่มอะไหล่ชิ้นแรก
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {parts.map((part, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center bg-slate-50/70 p-2 rounded-lg border border-slate-200">
                      <div className="col-span-6 space-y-1">
                        {i === 0 && <Label className="text-[11px] font-semibold text-slate-600">ชื่ออะไหล่</Label>}
                        <Input
                          placeholder="เช่น คาปาซิเตอร์ 450V, สายพาน"
                          value={part.description}
                          onChange={(e) => updatePart(i, 'description', e.target.value)}
                          className="text-xs bg-white h-8"
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        {i === 0 && <Label className="text-[11px] font-semibold text-slate-600">จำนวน</Label>}
                        <Input
                          type="number"
                          min="1"
                          value={part.quantity}
                          onChange={(e) => updatePart(i, 'quantity', Number(e.target.value))}
                          className="text-xs bg-white h-8 text-center"
                        />
                      </div>
                      <div className="col-span-3 space-y-1">
                        {i === 0 && <Label className="text-[11px] font-semibold text-slate-600">ราคา/หน่วย (฿)</Label>}
                        <Input
                          type="number"
                          min="0"
                          value={part.cost}
                          onChange={(e) => updatePart(i, 'cost', Number(e.target.value))}
                          className="text-xs bg-white h-8 text-right"
                        />
                      </div>
                      <div className="col-span-1 flex justify-center pt-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePart(i)}
                          className="h-8 w-8 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between pt-2 px-1 border-t">
                    <span className="text-xs font-semibold text-slate-600">ยอดรวมค่าอะไหล่ทั้งสิ้น:</span>
                    <span className="text-lg font-black text-blue-700 font-mono">
                      ฿{totalPartsAmount.toLocaleString()}
                    </span>
                  </div>
                  <Button
                    onClick={saveParts}
                    disabled={partsSaving}
                    size="sm"
                    className="w-full bg-slate-900 hover:bg-black text-white font-semibold text-xs gap-1.5 h-10 shadow-md"
                  >
                    {partsSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    💾 บันทึกรายการอะไหล่
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirmation Dialog for standard status transitions */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent className="max-w-md w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              ยืนยันการเปลี่ยนสถานะงานซ่อม
            </DialogTitle>
            <DialogDescription className="text-xs pt-2">
              คุณต้องการเปลี่ยนสถานะของคิว <strong className="text-blue-700 font-mono text-sm">{order?.queueNumber}</strong> เป็น &ldquo;
              <strong className="text-slate-900">{STATUS_LABELS[nextStatus]?.label || nextStatus}</strong>&rdquo; ใช่หรือไม่?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmDialog(false)} disabled={statusUpdating} className="text-xs">
              ยกเลิก
            </Button>
            <Button
              onClick={confirmStatusChange}
              disabled={statusUpdating}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-1.5"
            >
              {statusUpdating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              ยืนยันเปลี่ยนสถานะ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waiting Parts Special Modal (Input Parts & Notify Registrar) */}
      <Dialog open={waitingPartsDialog} onOpenChange={setWaitingPartsDialog}>
        <DialogContent className="max-w-lg w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-amber-50 shrink-0">
            <DialogTitle className="text-base font-bold text-amber-950 flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-600" />
              เปลี่ยนสถานะเป็น &quot;รออะไหล่&quot; & บันทึกรายการอะไหล่
            </DialogTitle>
            <DialogDescription className="text-xs text-amber-800 pt-1">
              ระบุรายการอะไหล่ที่ต้องใช้และราคาประเมิน ระบบจะแจ้งเตือน 🔔 ไปยังฝ่ายลงทะเบียนให้โทรติดต่อลูกค้าเพื่อสอบถามความยินยอม
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {/* Customer Summary */}
            <div className="bg-slate-50 border rounded-xl p-3 text-xs space-y-1">
              <div className="font-semibold text-slate-800">
                คิว: <span className="font-mono text-blue-700 font-bold">{order?.queueNumber}</span> ({order?.deviceCategory} {order?.deviceBrand || ''})
              </div>
              <div className="text-slate-600">
                ลูกค้า: <strong>{order?.customer?.firstName} {order?.customer?.lastName}</strong> | 📞 <strong>{formatPhone(order?.customer?.phone)}</strong>
              </div>
            </div>

            {/* Spare parts input list */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-800">รายการอะไหล่ที่ต้องสั่งซื้อ/เปลี่ยน:</Label>
                <Button type="button" variant="outline" size="sm" onClick={addPart} className="text-xs h-7 gap-1">
                  <Plus className="w-3 h-3" /> เพิ่มชิ้น
                </Button>
              </div>

              {parts.map((part, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border">
                  <div className="col-span-6 space-y-0.5">
                    <Label className="text-[10px] text-slate-500">ชื่ออะไหล่</Label>
                    <Input
                      placeholder="เช่น คาปาซิเตอร์, ไดโอด"
                      value={part.description}
                      onChange={(e) => updatePart(i, 'description', e.target.value)}
                      className="text-xs h-8"
                    />
                  </div>
                  <div className="col-span-2 space-y-0.5">
                    <Label className="text-[10px] text-slate-500">จำนวน</Label>
                    <Input
                      type="number"
                      min="1"
                      value={part.quantity}
                      onChange={(e) => updatePart(i, 'quantity', Number(e.target.value))}
                      className="text-xs h-8 text-center"
                    />
                  </div>
                  <div className="col-span-3 space-y-0.5">
                    <Label className="text-[10px] text-slate-500">ราคา/หน่วย (฿)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={part.cost}
                      onChange={(e) => updatePart(i, 'cost', Number(e.target.value))}
                      className="text-xs h-8 text-right font-mono"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removePart(i)}
                      className="h-8 w-8 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
                <span className="text-xs font-bold text-amber-900">ยอดรวมค่าใช้จ่ายอะไหล่:</span>
                <span className="text-lg font-black text-amber-900 font-mono">
                  ฿{totalPartsAmount.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
              <BellRing className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                เมื่อกดยืนยัน ระบบจะปรับสถานะเป็น <strong>รออะไหล่</strong> และส่งกระดิ่งแจ้งเตือนไปยังหน้าจอเจ้าหน้าที่ลงทะเบียนและแอดมินทันที
              </span>
            </div>
          </div>

          <DialogFooter className="p-3 border-t bg-slate-50 shrink-0 flex flex-row justify-end gap-2">
            <Button variant="outline" onClick={() => setWaitingPartsDialog(false)} disabled={statusUpdating} className="text-xs">
              ยกเลิก
            </Button>
            <Button
              onClick={confirmWaitingParts}
              disabled={statusUpdating}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-md"
            >
              {statusUpdating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  กำลังส่งแจ้งเตือน...
                </>
              ) : (
                <>
                  <BellRing className="w-3.5 h-3.5" />
                  ยืนยันรออะไหล่ & ส่งแจ้งเตือน
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Zoom / Lightbox Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/60 border-b border-white/10 text-white shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Eye className="w-5 h-5 text-blue-400 shrink-0" />
              <div className="min-w-0">
                <h3 className="font-bold text-sm text-white truncate">
                  รูปถ่ายสภาพเครื่องตอนลงทะเบียน — คิว {order?.queueNumber || ''}
                </h3>
                <p className="text-[11px] text-slate-300 truncate">
                  {order?.deviceCategory || ''} {order?.deviceBrand || ''} {order?.deviceModel || ''}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomScale((s) => Math.max(0.5, s - 0.25))}
                className="text-white hover:bg-white/20 h-8 px-2 text-xs gap-1"
                title="ย่อภาพ (-)"
              >
                <ZoomOut className="w-4 h-4" />
                <span className="hidden sm:inline">ย่อ</span>
              </Button>

              <span className="text-xs font-mono font-bold text-blue-300 px-1 min-w-[45px] text-center">
                {Math.round(zoomScale * 100)}%
              </span>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomScale((s) => Math.min(4.0, s + 0.25))}
                className="text-white hover:bg-white/20 h-8 px-2 text-xs gap-1"
                title="ขยายภาพ (+)"
              >
                <ZoomIn className="w-4 h-4" />
                <span className="hidden sm:inline">ขยาย</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="text-white hover:bg-white/20 h-8 px-2 text-xs gap-1"
                title="หมุนภาพ 90°"
              >
                <RotateCw className="w-4 h-4" />
                <span className="hidden sm:inline">หมุน</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setZoomScale(1);
                  setRotation(0);
                }}
                className="text-white hover:bg-white/20 h-8 px-2 text-xs"
                title="ขนาดปกติ 100%"
              >
                รีเซ็ต
              </Button>

              <a
                href={previewImage}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center h-8 px-2 text-xs text-white hover:bg-white/20 rounded-md"
                title="เปิดภาพต้นฉบับในแท็บใหม่"
              >
                <Maximize2 className="w-4 h-4" />
              </a>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewImage(null)}
                className="h-8 w-8 text-white hover:bg-red-600 rounded-full ml-2"
                title="ปิดหน้าต่าง (Esc)"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Main Zoomable Image Canvas */}
          <div
            className="flex-1 overflow-auto flex items-center justify-center p-4 cursor-grab active:cursor-grabbing"
            onClick={(e) => {
              // Click outside image closes modal
              if (e.target === e.currentTarget) setPreviewImage(null);
            }}
          >
            <div
              className="transition-transform duration-150 ease-out inline-block max-w-full max-h-full"
              style={{
                transform: `scale(${zoomScale}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
            >
              <img
                src={previewImage}
                alt="รูปถ่ายสภาพเครื่องขยายใหญ่"
                className="max-h-[82vh] max-w-[90vw] object-contain rounded-lg shadow-2xl bg-black/40 border border-white/20"
                draggable={false}
              />
            </div>
          </div>

          {/* Bottom helper tip */}
          <div className="py-2 px-4 bg-black/70 text-center text-[11px] text-slate-400 border-t border-white/10 shrink-0">
            💡 คลิกที่ปุ่มด้านบนเพื่อ ซูมขยาย / หมุนภาพ หรือคลิกบริเวณพื้นหลังสีดำเพื่อปิดหน้าต่าง
          </div>
        </div>
      )}
    </div>
  );
}
