import axios, { AxiosInstance } from 'axios';

const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Browser: route through Next.js rewrite → http://api:3001/api/:path*
    // No separate /api Nginx location needed, avoiding conflicts with other services
    return '/fixitcenter/api';
  }
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://api:3001';
  return raw.endsWith('/api') ? raw : `${raw}/api`;
};

const api: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Request interceptor: inject Bearer token and route through Next.js rewrite
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      config.baseURL = '/fixitcenter/api';
      const token = localStorage.getItem('access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 → redirect to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      typeof window !== 'undefined' &&
      !window.location.pathname.startsWith('/login') &&
      !window.location.pathname.includes('/track') &&
      window.location.pathname !== '/'
    ) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/fixitcenter/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    name?: string;
    role: string;
    centerId?: string;
    centerName?: string;
    permissions?: string[];
  };
}

export const authApi = {
  login: async (credentials: LoginCredentials) => {
    if (typeof window !== 'undefined') {
      // Use /fixitcenter/api so Next.js rewrites proxy to http://api:3001/api internally
      const res = await fetch('/fixitcenter/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const err: any = new Error(data.message || 'Login failed');
        err.response = { status: res.status, data };
        throw err;
      }
      return { data };
    }
    return api.post<AuthResponse>('/auth/login', credentials);
  },
  me: () => api.get<AuthResponse['user']>('/auth/me'),
};

// ─── Users & Roles ───────────────────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  description: string | null;
  _count?: { users: number };
}

export interface UserItem {
  id: string;
  username: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  roleId?: string;
  centerId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  role?: { id: string; name: string; description: string | null };
  center?: { id: string; name: string; code: string } | null;
}

export const userApi = {
  getAll: (centerId?: string) =>
    api.get<UserItem[]>('/users', { params: centerId ? { centerId } : undefined }),
  getRoles: () => api.get<Role[]>('/users/roles'),
  getById: (id: string) => api.get<UserItem>(`/users/${id}`),
  create: (data: {
    username: string;
    password: string;
    fullName: string;
    email?: string;
    phone?: string;
    roleId: string;
    centerId?: string;
    isActive?: boolean;
  }) => api.post<UserItem>('/users', data),
  update: (id: string, data: Partial<{
    fullName: string;
    email: string;
    phone: string;
    roleId: string;
    centerId: string | null;
    isActive: boolean;
    password?: string;
  }>) => api.patch<UserItem>(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
};

// ─── Missions (ภารกิจ & ช่วงเวลา) ────────────────────────────────────────────

export interface Mission {
  id: string;
  name: string;
  fiscalYear: number;
  startDate: string;
  endDate: string;
  description?: string | null;
  isActive: boolean;
  centers?: Center[];
  _count?: { centers: number; repairOrders: number };
}

export const missionApi = {
  getAll: () => api.get<Mission[]>('/missions'),
  getActive: () => api.get<Mission>('/missions/active'),
  getById: (id: string) => api.get<Mission>(`/missions/${id}`),
  create: (data: {
    name: string;
    fiscalYear: number;
    startDate: string;
    endDate: string;
    description?: string;
    isActive?: boolean;
  }) => api.post<Mission>('/missions', data),
  update: (id: string, data: Partial<{
    name: string;
    fiscalYear: number;
    startDate: string;
    endDate: string;
    description: string;
    isActive: boolean;
  }>) => api.patch<Mission>(`/missions/${id}`, data),
  delete: (id: string) => api.delete(`/missions/${id}`),
};

// ─── Service Centers (ศูนย์บริการ) ──────────────────────────────────────────

export interface Center {
  id: string;
  name: string;
  code: string;
  region?: string | null;
  address?: string | null;
  phone?: string | null;
  missionId: string;
  lineGroupId?: string | null;
  isActive: boolean;
  mission?: { id: string; name: string; fiscalYear?: number };
  _count?: { repairOrders: number; users: number };
}

export const centerApi = {
  getAll: (missionId?: string) =>
    api.get<Center[]>('/centers', { params: missionId ? { missionId } : undefined }),
  getById: (id: string) => api.get<Center>(`/centers/${id}`),
  create: (data: {
    name: string;
    code: string;
    region?: string;
    address?: string;
    phone?: string;
    missionId: string;
    lineGroupId?: string;
    isActive?: boolean;
  }) => api.post<Center>('/centers', data),
  update: (id: string, data: Partial<{
    name: string;
    code: string;
    region: string;
    address: string;
    phone: string;
    missionId: string;
    lineGroupId: string;
    isActive: boolean;
  }>) => api.patch<Center>(`/centers/${id}`, data),
  delete: (id: string) => api.delete(`/centers/${id}`),
};

// ─── Repair Orders ────────────────────────────────────────────────────────────

export interface RepairOrder {
  id: string;
  queueNumber: string;
  status: string;
  trade?: 'ELECTRICAL' | 'ELECTRONICS' | 'AUTOMOTIVE' | 'KITCHEN';
  tradeCode?: string;
  deviceCategory?: string;
  deviceBrand?: string;
  deviceModel?: string;
  serialNumber?: string;
  problemDesc?: string;
  deviceCondition?: string;
  accessories?: string;
  additionalDetails?: string;
  problemImages?: string[];
  idCardImage?: string | null;
  customerSignature?: string | null;
  handoverSignature?: string | null;
  handoverBy?: string | null;
  closedAt?: string | null;
  registeredAt?: string | null;
  center?: Center | any;
  mission?: Mission | any;
  customer: {
    id?: string;
    firstName: string;
    lastName: string;
    nationalId: string;
    phone: string;
    address: string;
  };
  device?: {
    brand?: string;
    model?: string;
    serial?: string;
    problemDesc?: string;
    tradeCode?: string;
  };
  items?: Array<{ id?: string; description?: string; name?: string; quantity: number; unitCost?: number; cost?: number }>;
  parts?: Array<{ description: string; quantity: number; cost?: number; unitCost?: number }>;
  notes?: string;
  centerId: string;
  missionId: string;
  createdAt: string;
  updatedAt: string;
  economicValueSaved?: number;
  partsCost?: number;
  marketRepairCost?: number;
}

export const repairOrderApi = {
  getAll: (params?: { centerId?: string; status?: string; trade?: string; tradeCode?: string; missionId?: string; search?: string; page?: number; limit?: number }) =>
    api.get<{ data: RepairOrder[]; total: number; page: number; totalPages: number } | RepairOrder[]>('/repair-orders', { params }),
  getActiveAlerts: (centerId?: string) =>
    api.get<any[]>('/repair-orders/alerts/active', { params: centerId ? { centerId } : undefined }),
  track: (query: string) => api.get<RepairOrder[]>('/repair-orders/track', { params: { query } }),
  getById: (id: string) => api.get<RepairOrder>(`/repair-orders/${id}`),
  getByQueueNumber: (queueNumber: string) =>
    api.get<RepairOrder>(`/repair-orders/queue/${queueNumber}`),
  getByQrToken: (token: string) =>
    api.get<RepairOrder>(`/repair-orders/qr/${token}`),
  create: (data: Partial<RepairOrder> | any) =>
    api.post<RepairOrder>('/repair-orders', data),
  update: (id: string, data: any) =>
    api.patch<RepairOrder>(`/repair-orders/${id}`, data),
  delete: (id: string) =>
    api.delete(`/repair-orders/${id}`),
  updateStatus: (id: string, status: string, note?: string) =>
    api.patch<RepairOrder>(`/repair-orders/${id}/status`, { status, note }),
  addParts: (id: string, items: Array<{ description: string; quantity: number; unitCost: number; isProcured?: boolean }>) =>
    api.post<RepairOrder>(`/repair-orders/${id}/items`, { items }),
  saveChecklist: (id: string, checklist: { criteria: Array<{ id: string; label: string; passed: boolean; notes?: string }>; overallPassed: boolean; notes?: string }) =>
    api.post<RepairOrder>(`/repair-orders/${id}/checklist`, checklist),
  saveSignature: (id: string, data: { type: 'SUPERVISOR' | 'CUSTOMER'; dataBase64: string; signerName?: string }) =>
    api.post<RepairOrder>(`/repair-orders/${id}/signature`, data),
  handover: (
    id: string,
    data: {
      customerSignature: string;
      handoverSignature?: string;
      handoverBy?: string;
      handoverNotes?: string;
    }
  ) => api.post<RepairOrder>(`/repair-orders/${id}/handover`, data),
  updateEconomicValue: (id: string, data: { partsCost?: number; marketRepairCost?: number }) =>
    api.patch<RepairOrder>(`/repair-orders/${id}/economic-value`, data),
  submitQC: (
    id: string,
    data: {
      inspectionChecklist: Record<string, boolean>;
      partsCost: number;
      marketRepairCost: number;
      economicValueSaved: number;
      supervisorSignature: string;
      customerSignature: string;
    }
  ) => api.post<RepairOrder>(`/repair-orders/${id}/qc`, data),
};

// ─── Dashboard ───────────────────────────────────────────────────────────────

export interface CenterWithStats {
  id: string;
  name: string;
  code: string;
  region?: string | null;
  phone?: string | null;
  address?: string | null;
  isActive: boolean;
  missionName?: string;
  totalRepairs: number;
  completedRepairs: number;
  inProgressRepairs: number;
  economicValueSaved: number;
  technicianCount?: number;
}

export interface DashboardStats {
  totalRepairs: number;
  completedRepairs?: number;
  completed?: number;
  inProgressRepairs?: number;
  inProgress?: number;
  pendingRepairs?: number;
  economicValueSaved: number;
  tradeBreakdown: { ELECTRICAL: number; ELECTRONICS: number; AUTOMOTIVE: number; KITCHEN?: number };
  tradeStats?: {
    ELECTRICAL: { total: number; completed: number; inProgress: number };
    ELECTRONICS: { total: number; completed: number; inProgress: number };
    AUTOMOTIVE: { total: number; completed: number; inProgress: number };
  };
  dailyRepairs: Array<{ date: string; count: number }>;
  recentOrders?: RepairOrder[];
  centerBreakdown?: Array<{ centerId: string; centerName: string; count: number }>;
  centers?: CenterWithStats[];
}

export const dashboardApi = {
  getStats: (centerId?: string, missionId?: string) =>
    api.get<DashboardStats>('/dashboard/summary', { params: { centerId, missionId } }),
};

// ─── Queue Board ─────────────────────────────────────────────────────────────

export interface QueueBoardData {
  ELECTRICAL: Array<{ queueNumber: string; status: string; deviceCategory?: string }>;
  ELECTRONICS: Array<{ queueNumber: string; status: string; deviceCategory?: string }>;
  AUTOMOTIVE: Array<{ queueNumber: string; status: string; deviceCategory?: string }>;
  KITCHEN: Array<{ queueNumber: string; status: string; deviceCategory?: string }>;
}

export const queueApi = {
  getBoard: (centerId: string, missionId?: string) =>
    api.get<QueueBoardData>('/dashboard/queue-board', { params: { centerId, missionId } }),
};

// ─── Repair Categories (ประเภทงานซ่อม) ────────────────────────────────────────

export interface RepairCategory {
  id: string;
  code: string;
  name: string;
  tradeCode: 'ELECTRICAL' | 'ELECTRONICS' | 'AUTOMOTIVE' | 'KITCHEN';
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export const categoryApi = {
  getAll: (tradeCode?: string) =>
    api.get<RepairCategory[]>('/categories', { params: tradeCode ? { tradeCode } : undefined }),
  getById: (id: string) => api.get<RepairCategory>(`/categories/${id}`),
  create: (data: {
    code: string;
    name: string;
    tradeCode: string;
    description?: string;
  }) => api.post<RepairCategory>('/categories', data),
  update: (id: string, data: Partial<{
    code: string;
    name: string;
    tradeCode: string;
    description: string;
    isActive: boolean;
  }>) => api.patch<RepairCategory>(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

// ─────────────────────────────────────────
// Kitchen Logs (ครัวอาชีวะ)
// ─────────────────────────────────────────

export interface KitchenLog {
  id: string;
  missionId: string;
  centerId: string;
  serviceDate: string;
  menuName: string;
  categoryCode: string;
  quantity: number;
  boxQty?: number;
  waterQty?: number;
  reliefQty?: number;
  budgetPerUnit?: number | null;
  totalBudget?: number | null;
  unit: string;
  targetLocation: string;
  recipientOrg?: string | null;
  coordinatorName?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  center?: { id: string; name: string; code: string };
  mission?: { id: string; name: string; fiscalYear: number };
}

export interface KitchenSummary {
  totalEntries: number;
  totalQuantity: number;
  totalBoxes: number;
  totalWater: number;
  totalRelief: number;
}

export const kitchenApi = {
  getAll: (centerId?: string, missionId?: string) =>
    api.get<KitchenLog[]>('/kitchen', { params: { centerId, missionId } }),
  getSummary: (centerId?: string, missionId?: string) =>
    api.get<KitchenSummary>('/kitchen/summary', { params: { centerId, missionId } }),
  getById: (id: string) => api.get<KitchenLog>(`/kitchen/${id}`),
  create: (data: Partial<KitchenLog>) => api.post<KitchenLog>('/kitchen', data),
  update: (id: string, data: Partial<KitchenLog>) => api.patch<KitchenLog>(`/kitchen/${id}`, data),
  delete: (id: string) => api.delete(`/kitchen/${id}`),
};

export interface VehicleLog {
  id: string;
  missionId: string;
  centerId: string;
  serviceDate: string;
  serviceDetails: string;
  vehicleType: string;
  serviceCount: number;
  completedCount: number;
  budgetPerUnit?: number | null;
  totalBudget?: number | null;
  targetLocation?: string | null;
  recipientOrg?: string | null;
  coordinatorName?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  center?: { id: string; name: string; code: string };
  mission?: { id: string; name: string; fiscalYear: number };
}

export interface VehicleSummary {
  totalEntries: number;
  totalServices: number;
  totalCompleted: number;
  totalBudget: number;
}

export const vehicleApi = {
  getAll: (centerId?: string, missionId?: string) =>
    api.get<VehicleLog[]>('/vehicle-logs', { params: { centerId, missionId } }),
  getSummary: (centerId?: string, missionId?: string) =>
    api.get<VehicleSummary>('/vehicle-logs/summary', { params: { centerId, missionId } }),
  getById: (id: string) => api.get<VehicleLog>(`/vehicle-logs/${id}`),
  create: (data: Partial<VehicleLog>) => api.post<VehicleLog>('/vehicle-logs', data),
  update: (id: string, data: Partial<VehicleLog>) => api.patch<VehicleLog>(`/vehicle-logs/${id}`, data),
  delete: (id: string) => api.delete(`/vehicle-logs/${id}`),
  syncFromOrders: (centerId?: string, missionId?: string) =>
    api.post<{ count: number; createdCount: number }>('/vehicle-logs/sync', null, { params: { centerId, missionId } }),
};

export interface ApplianceLog {
  id: string;
  missionId: string;
  centerId: string;
  serviceDate: string;
  serviceDetails: string;
  applianceType: string;
  serviceCount: number;
  completedCount: number;
  budgetPerUnit?: number | null;
  totalBudget?: number | null;
  targetLocation?: string | null;
  recipientOrg?: string | null;
  coordinatorName?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  center?: { id: string; name: string; code: string };
  mission?: { id: string; name: string; fiscalYear: number };
}

export interface ApplianceSummary {
  totalEntries: number;
  totalServices: number;
  totalCompleted: number;
  totalBudget: number;
}

export const applianceApi = {
  getAll: (centerId?: string, missionId?: string) =>
    api.get<ApplianceLog[]>('/appliance-logs', { params: { centerId, missionId } }),
  getSummary: (centerId?: string, missionId?: string) =>
    api.get<ApplianceSummary>('/appliance-logs/summary', { params: { centerId, missionId } }),
  getById: (id: string) => api.get<ApplianceLog>(`/appliance-logs/${id}`),
  create: (data: Partial<ApplianceLog>) => api.post<ApplianceLog>('/appliance-logs', data),
  update: (id: string, data: Partial<ApplianceLog>) => api.patch<ApplianceLog>(`/appliance-logs/${id}`, data),
  delete: (id: string) => api.delete(`/appliance-logs/${id}`),
  syncFromOrders: (centerId?: string, missionId?: string) =>
    api.post<{ count: number; createdCount: number }>('/appliance-logs/sync', null, { params: { centerId, missionId } }),
};



export default api;

