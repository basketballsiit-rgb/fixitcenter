'use client';

import { create } from 'zustand';
import { repairOrderApi, RepairOrder } from '@/lib/api';

interface RepairOrderState {
  orders: RepairOrder[];
  currentOrder: RepairOrder | null;
  loading: boolean;
  error: string | null;
}

interface RepairOrderActions {
  fetchOrders: (params?: { centerId?: string; status?: string; trade?: string }) => Promise<void>;
  fetchOrderByQueueNumber: (queueNumber: string) => Promise<void>;
  setCurrentOrder: (order: RepairOrder | null) => void;
  updateOrderStatus: (id: string, status: string) => Promise<void>;
  addOrder: (order: RepairOrder) => void;
  updateOrderInList: (order: RepairOrder) => void;
  clearError: () => void;
}

export const useRepairOrderStore = create<RepairOrderState & RepairOrderActions>((set, get) => ({
  orders: [],
  currentOrder: null,
  loading: false,
  error: null,

  fetchOrders: async (params) => {
    set({ loading: true, error: null });
    try {
      const response = await repairOrderApi.getAll(params);
      const list = Array.isArray(response.data) ? response.data : ((response.data as any)?.data || []);
      set({ orders: list, loading: false });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'ไม่สามารถโหลดรายการซ่อมได้';
      set({ loading: false, error: message });
    }
  },

  fetchOrderByQueueNumber: async (queueNumber) => {
    set({ loading: true, error: null });
    try {
      const response = await repairOrderApi.getByQueueNumber(queueNumber);
      set({ currentOrder: response.data, loading: false });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'ไม่พบหมายเลขคิวนี้';
      set({ loading: false, error: message, currentOrder: null });
    }
  },

  setCurrentOrder: (order) => set({ currentOrder: order }),

  updateOrderStatus: async (id, status) => {
    try {
      const response = await repairOrderApi.updateStatus(id, status);
      const updated = response.data;
      const orders = get().orders.map((o) => (o.id === id ? updated : o));
      set({ orders, currentOrder: updated });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'ไม่สามารถอัปเดตสถานะได้';
      set({ error: message });
    }
  },

  addOrder: (order) =>
    set((state) => ({ orders: [order, ...state.orders] })),

  updateOrderInList: (order) =>
    set((state) => ({
      orders: state.orders.map((o) => (o.id === order.id ? order : o)),
      currentOrder: state.currentOrder?.id === order.id ? order : state.currentOrder,
    })),

  clearError: () => set({ error: null }),
}));
