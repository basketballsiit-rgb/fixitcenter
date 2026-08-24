'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { maskNationalId, timeAgo } from '@/lib/utils';
import type { RepairOrder } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

type OrderStatus = 'PENDING' | 'DIAGNOSING' | 'WAITING_PARTS' | 'REPAIRING' | 'QC_PENDING';

const COLUMNS: { id: OrderStatus; label: string; color: string; headerBg: string }[] = [
  { id: 'PENDING', label: 'รอดำเนินการ', color: 'bg-gray-100', headerBg: 'bg-gray-600' },
  { id: 'DIAGNOSING', label: 'กำลังวินิจฉัย', color: 'bg-blue-50', headerBg: 'bg-blue-600' },
  { id: 'WAITING_PARTS', label: 'รออะไหล่', color: 'bg-yellow-50', headerBg: 'bg-yellow-500' },
  { id: 'REPAIRING', label: 'กำลังซ่อม', color: 'bg-orange-50', headerBg: 'bg-orange-500' },
  { id: 'QC_PENDING', label: 'รอ QC', color: 'bg-purple-50', headerBg: 'bg-purple-600' },
];

const TRADE_COLORS: Record<string, string> = {
  ELECTRICAL: 'bg-yellow-100 text-yellow-800',
  ELECTRONICS: 'bg-blue-100 text-blue-800',
  AUTOMOTIVE: 'bg-green-100 text-green-800',
  KITCHEN: 'bg-rose-100 text-rose-800',
};

const TRADE_LABELS: Record<string, string> = {
  ELECTRICAL: 'ไฟฟ้า',
  ELECTRONICS: 'อิเล็กทรอนิกส์',
  AUTOMOTIVE: 'ยานยนต์',
  KITCHEN: 'ครัวอาชีวะ',
};

interface KanbanBoardProps {
  orders: RepairOrder[];
  onCardClick?: (order: RepairOrder) => void;
}

function OrderCard({ order, onClick }: { order: RepairOrder; onClick?: () => void }) {
  const customerName = `${order.customer?.firstName || 'ลูกค้า'} ${order.customer?.lastName ? `${order.customer.lastName[0]}.` : ''}`;
  const tradeKey = (order.tradeCode || order.trade || 'ELECTRICAL') as keyof typeof TRADE_COLORS;
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-lg font-bold text-primary">{order.queueNumber}</span>
        <Badge className={cn('text-xs', TRADE_COLORS[tradeKey] || 'bg-gray-100')}>
          {TRADE_LABELS[tradeKey] || tradeKey}
        </Badge>
      </div>
      <p className="text-sm font-medium truncate">{customerName}</p>
      <p className="text-xs text-muted-foreground truncate mt-0.5">
        {order.deviceBrand || order.device?.brand || '-'} {order.deviceModel || order.device?.model || ''}
      </p>
      <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
        {timeAgo(order.createdAt)}
      </p>
    </div>
  );
}

export function KanbanBoard({ orders, onCardClick }: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 h-full">
      {COLUMNS.map((col) => {
        const colOrders = orders.filter((o) => o.status === col.id);
        return (
          <div key={col.id} className={cn('rounded-lg flex flex-col', col.color)}>
            <div className={cn('rounded-t-lg px-3 py-2 flex items-center justify-between', col.headerBg)}>
              <span className="text-white text-sm font-semibold">{col.label}</span>
              <span className="bg-white/30 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                {colOrders.length}
              </span>
            </div>
            <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto max-h-[600px]">
              {colOrders.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground">ไม่มีรายการ</p>
                </div>
              ) : (
                colOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onClick={() => onCardClick?.(order)}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
