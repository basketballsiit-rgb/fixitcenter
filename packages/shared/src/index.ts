// ─── Trade & Status Enums ──────────────────────────────────────────────────

export enum TradeCode {
  ELECTRICAL = 'ELECTRICAL',
  ELECTRONICS = 'ELECTRONICS',
  AUTOMOTIVE = 'AUTOMOTIVE',
}

export enum RepairStatus {
  PENDING = 'PENDING',
  DIAGNOSING = 'DIAGNOSING',
  WAITING_PARTS = 'WAITING_PARTS',
  REPAIRING = 'REPAIRING',
  QC_PENDING = 'QC_PENDING',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum SignatureType {
  SUPERVISOR = 'SUPERVISOR',
  CUSTOMER = 'CUSTOMER',
  REGISTRAR = 'REGISTRAR',
}

// ─── Trade Helpers ─────────────────────────────────────────────────────────

export const TRADE_PREFIX: Record<TradeCode, string> = {
  [TradeCode.ELECTRICAL]:  'E',
  [TradeCode.ELECTRONICS]: 'X',
  [TradeCode.AUTOMOTIVE]:  'A',
};

export const TRADE_LABEL: Record<TradeCode, string> = {
  [TradeCode.ELECTRICAL]:  'ไฟฟ้า',
  [TradeCode.ELECTRONICS]: 'อิเล็กทรอนิกส์',
  [TradeCode.AUTOMOTIVE]:  'ยานยนต์',
};

export const TRADE_COLOR: Record<TradeCode, string> = {
  [TradeCode.ELECTRICAL]:  '#EAB308',  // yellow-500
  [TradeCode.ELECTRONICS]: '#3B82F6',  // blue-500
  [TradeCode.AUTOMOTIVE]:  '#22C55E',  // green-500
};

// ─── Status Helpers ────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<RepairStatus, string> = {
  [RepairStatus.PENDING]:       'รอดำเนินการ',
  [RepairStatus.DIAGNOSING]:    'กำลังวินิจฉัย',
  [RepairStatus.WAITING_PARTS]: 'รออะไหล่',
  [RepairStatus.REPAIRING]:     'กำลังซ่อม',
  [RepairStatus.QC_PENDING]:    'รอตรวจสอบ QC',
  [RepairStatus.COMPLETED]:     'ซ่อมเสร็จแล้ว',
  [RepairStatus.CLOSED]:        'ปิดงาน',
  [RepairStatus.CANCELLED]:     'ยกเลิก',
};

export const STATUS_COLOR: Record<RepairStatus, string> = {
  [RepairStatus.PENDING]:       '#6B7280',
  [RepairStatus.DIAGNOSING]:    '#F59E0B',
  [RepairStatus.WAITING_PARTS]: '#EF4444',
  [RepairStatus.REPAIRING]:     '#3B82F6',
  [RepairStatus.QC_PENDING]:    '#8B5CF6',
  [RepairStatus.COMPLETED]:     '#10B981',
  [RepairStatus.CLOSED]:        '#6B7280',
  [RepairStatus.CANCELLED]:     '#DC2626',
};

// ─── State Machine Transitions ─────────────────────────────────────────────

export const ALLOWED_TRANSITIONS: Partial<Record<RepairStatus, RepairStatus[]>> = {
  [RepairStatus.PENDING]:       [RepairStatus.DIAGNOSING, RepairStatus.CANCELLED],
  [RepairStatus.DIAGNOSING]:    [RepairStatus.WAITING_PARTS, RepairStatus.REPAIRING, RepairStatus.CANCELLED],
  [RepairStatus.WAITING_PARTS]: [RepairStatus.REPAIRING, RepairStatus.CANCELLED],
  [RepairStatus.REPAIRING]:     [RepairStatus.QC_PENDING, RepairStatus.CANCELLED],
  [RepairStatus.QC_PENDING]:    [RepairStatus.COMPLETED, RepairStatus.DIAGNOSING, RepairStatus.CANCELLED],
  [RepairStatus.COMPLETED]:     [RepairStatus.CLOSED],
};

export function isValidTransition(from: RepairStatus, to: RepairStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

// ─── Inspection Checklist Criteria ────────────────────────────────────────

export interface ChecklistCriterion {
  id: string;
  label: string;
  passed: boolean;
  notes?: string;
}

export const DEFAULT_CHECKLIST_CRITERIA: Omit<ChecklistCriterion, 'passed' | 'notes'>[] = [
  { id: 'C01', label: 'ตรวจสอบความปลอดภัยของสายไฟ' },
  { id: 'C02', label: 'ตรวจสอบการต่อสายดิน' },
  { id: 'C03', label: 'ตรวจสอบฉนวนกันไฟฟ้า' },
  { id: 'C04', label: 'ทดสอบการทำงานของวงจร' },
  { id: 'C05', label: 'ตรวจสอบชิ้นส่วนที่เปลี่ยน' },
  { id: 'C06', label: 'ทดสอบการทำงานในสภาวะปกติ' },
  { id: 'C07', label: 'ตรวจสอบความสะอาดและเรียบร้อย' },
  { id: 'C08', label: 'ตรวจสอบเอกสารครบถ้วน' },
];

// ─── WebSocket Event Types ─────────────────────────────────────────────────

export interface WsOrderNewEvent {
  order: {
    id: string;
    queueNumber: string;
    tradeCode: TradeCode;
    status: RepairStatus;
    deviceCategory: string;
    registeredAt: string;
  };
}

export interface WsStatusChangeEvent {
  orderId: string;
  queueNumber: string;
  status: RepairStatus;
  centerId: string;
}

export interface WsQueueUpdateEvent {
  centerId: string;
  tradeCode: TradeCode;
  count: number;
}

// ─── API Response Types ───────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardSummary {
  totalRepairs: number;
  completedRepairs: number;
  inProgressRepairs: number;
  pendingRepairs: number;
  economicValueSaved: number;
  tradeBreakdown: Record<TradeCode, number>;
  dailyRepairs: Array<{ date: string; count: number }>;
  centerBreakdown: Array<{ centerId: string; centerName: string; count: number }>;
}

export interface QueueBoardData {
  centerId: string;
  centerName: string;
  queues: Record<TradeCode, Array<{
    id: string;
    queueNumber: string;
    status: RepairStatus;
    deviceCategory: string;
    registeredAt: string;
  }>>;
}
