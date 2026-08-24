'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  Phone,
  Package,
  CheckCircle2,
  ExternalLink,
  Trash2,
  Clock,
  User,
  AlertTriangle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSocket } from '@/lib/socket';
import { formatPhone, formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import { repairOrderApi } from '@/lib/api';
import Link from 'next/link';

export interface AppNotification {
  id: string;
  orderId?: string;
  queueNumber?: string;
  deviceCategory?: string;
  deviceBrand?: string;
  customerName?: string;
  customerPhone?: string;
  partsCost?: number;
  type: 'WAITING_PARTS' | 'COMPLETED' | 'QC_PENDING' | 'GENERAL';
  message: string;
  createdAt: string;
  isRead: boolean;
}

export function NotificationBell() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const fetchActiveAlerts = useCallback(async () => {
    try {
      const res = await repairOrderApi.getActiveAlerts();
      const list = Array.isArray(res.data) ? res.data : [];
      if (list.length > 0) {
        setNotifications((prev) => {
          const readIds = new Set(prev.filter((p) => p.isRead).map((p) => p.id));
          return list.map((item: any) => ({
            ...item,
            isRead: readIds.has(item.id),
          }));
        });
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to fetch active alerts:', err);
    }
  }, []);

  // Initial fetch and 10s auto-sync
  useEffect(() => {
    fetchActiveAlerts();
    const timer = setInterval(fetchActiveAlerts, 10000);
    return () => clearInterval(timer);
  }, [fetchActiveAlerts]);

  // Real-time WebSocket sync
  useEffect(() => {
    const socket = getSocket();

    const handleNewNotif = (data: any) => {
      if (data) {
        setNotifications((prev) => {
          const newNotif: AppNotification = {
            id: data.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            orderId: data.orderId,
            queueNumber: data.queueNumber,
            deviceCategory: data.deviceCategory,
            deviceBrand: data.deviceBrand,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            partsCost: data.partsCost ? Number(data.partsCost) : undefined,
            type: data.type || 'COMPLETED',
            message: data.message || 'มีการแจ้งเตือนใหม่',
            createdAt: data.createdAt || new Date().toISOString(),
            isRead: false,
          };
          const filtered = prev.filter((p) => p.orderId !== newNotif.orderId || p.type !== newNotif.type);
          return [newNotif, ...filtered];
        });
      }
    };

    const handleStatus = (data: any) => {
      if (data?.status === 'WAITING_PARTS' || data?.status === 'COMPLETED') {
        fetchActiveAlerts();
      } else if (data?.orderId && data?.status === 'CLOSED') {
        // If order handed over and closed, remove from active alerts
        setNotifications((prev) => prev.filter((p) => p.orderId !== data.orderId));
      }
    };

    socket.on('notification:new', handleNewNotif);
    socket.on('notification:global', handleNewNotif);
    socket.on('order:status', handleStatus);

    return () => {
      socket.off('notification:new', handleNewNotif);
      socket.off('notification:global', handleNewNotif);
      socket.off('order:status', handleStatus);
    };
  }, [fetchActiveAlerts]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchActiveAlerts();
        }}
        className={`relative p-2 rounded-full transition-colors focus:outline-none ${
          unreadCount > 0 ? 'bg-amber-100/90 text-amber-950 hover:bg-amber-200' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
        }`}
        title="การแจ้งเตือนงานซ่อม"
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-amber-800 animate-bounce' : ''}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-[20px] px-1 text-[11px] font-black text-white bg-red-600 rounded-full animate-pulse shadow-md border-2 border-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown / Popover */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Panel */}
          <div className="absolute right-0 mt-2 w-[92vw] max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-bold">ศูนย์การแจ้งเตือนงานซ่อม</span>
                {unreadCount > 0 && (
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px] font-black text-slate-900 px-1.5 py-0">
                    {unreadCount} รายการใหม่
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchActiveAlerts()}
                  className="text-[11px] text-blue-200 hover:text-white flex items-center gap-1"
                  title="รีเฟรช"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-[11px] text-blue-200 hover:text-white underline"
                  >
                    อ่านทั้งหมด
                  </button>
                )}
              </div>
            </div>

            {/* List */}
            <div className="max-h-[440px] overflow-y-auto divide-y divide-slate-100">
              {notifications.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-9 h-9 mx-auto mb-2 text-emerald-400 stroke-1" />
                  <p className="font-semibold text-slate-700">ไม่มีงานที่ต้องดำเนินการติดต่อในขณะนี้</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">เมื่อช่างระบุรออะไหล่ หรือซ่อมเสร็จพร้อมส่งมอบ การแจ้งเตือนจะปรากฏที่นี่ทันที</p>
                </div>
              ) : (
                notifications.map((notif) => {
                  const isCompleted = notif.type === 'COMPLETED';

                  return (
                    <div
                      key={notif.id}
                      className={`p-3.5 transition-colors ${
                        isCompleted
                          ? notif.isRead
                            ? 'bg-white hover:bg-emerald-50/50'
                            : 'bg-emerald-50/80 hover:bg-emerald-100/60 border-l-4 border-emerald-500'
                          : notif.isRead
                          ? 'bg-white hover:bg-amber-50/50'
                          : 'bg-amber-50/80 hover:bg-amber-100/60 border-l-4 border-amber-500'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`p-2 rounded-xl shrink-0 mt-0.5 shadow-xs ${
                            isCompleted ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          ) : (
                            <Package className="w-4 h-4 text-amber-700" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5 font-mono">
                              คิว {notif.queueNumber || '-'}
                              {isCompleted ? (
                                <Badge className="bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0 shadow-xs">
                                  🎉 ซ่อมเสร็จพร้อมส่งมอบ
                                </Badge>
                              ) : (
                                notif.partsCost !== undefined && notif.partsCost > 0 && (
                                  <Badge className="bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0 shadow-xs font-mono">
                                    รออะไหล่ ฿{notif.partsCost.toLocaleString()}
                                  </Badge>
                                )
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {new Date(notif.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <p className="text-xs text-slate-800 font-medium leading-relaxed">
                            {notif.message}
                          </p>

                          {/* Customer details & Call button */}
                          <div
                            className={`border rounded-xl p-2.5 space-y-1 text-xs shadow-xs ${
                              isCompleted ? 'bg-white border-emerald-200' : 'bg-white border-amber-200'
                            }`}
                          >
                            {notif.customerName && (
                              <div className="flex items-center gap-1 text-slate-700">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                <span>ลูกค้า: <strong>{notif.customerName}</strong></span>
                              </div>
                            )}
                            {notif.customerPhone && notif.customerPhone !== '-' && (
                              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                <span className="text-slate-800 font-mono font-bold text-xs">
                                  📞 {formatPhone(notif.customerPhone)}
                                </span>
                                <a
                                  href={`tel:${notif.customerPhone.replace(/[^0-9]/g, '')}`}
                                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-white font-bold text-xs shadow-sm transition-colors ${
                                    isCompleted
                                      ? 'bg-emerald-600 hover:bg-emerald-700'
                                      : 'bg-amber-600 hover:bg-amber-700'
                                  }`}
                                >
                                  <Phone className="w-3 h-3" />
                                  {isCompleted ? 'โทรแจ้งรับเครื่อง' : 'โทรสอบถามค่าอะไหล่'}
                                </a>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1 text-[10px]">
                            <Link
                              href="/registration"
                              onClick={() => {
                                markAsRead(notif.id);
                                setIsOpen(false);
                              }}
                              className="text-blue-600 hover:underline inline-flex items-center gap-0.5 font-semibold"
                            >
                              เปิดระบบลงทะเบียน/ส่งมอบ <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                            {!notif.isRead && (
                              <button
                                onClick={() => markAsRead(notif.id)}
                                className="text-slate-400 hover:text-slate-600 flex items-center gap-0.5 font-medium"
                              >
                                <CheckCircle2 className="w-3 h-3" /> รับทราบ
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
