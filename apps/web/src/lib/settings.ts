export interface StandardRatesConfig {
  vehicleDefaultRate: number;
  motorcycleRate: number;
  carRate: number;
  agriEngineRate: number;

  applianceDefaultRate: number;
  generalApplianceRate: number;
  vocationalToolRate: number;
  fanCookerRate: number;

  mealBoxRate: number;
  waterBottleRate: number;
  reliefKitRate: number;
}

export const DEFAULT_STANDARD_RATES: StandardRatesConfig = {
  vehicleDefaultRate: 300,
  motorcycleRate: 300,
  carRate: 500,
  agriEngineRate: 350,

  applianceDefaultRate: 150,
  generalApplianceRate: 150,
  vocationalToolRate: 200,
  fanCookerRate: 100,

  mealBoxRate: 50,
  waterBottleRate: 7,
  reliefKitRate: 500,
};

const SETTINGS_KEY = 'npc_standard_budget_rates';

export function getStandardRates(): StandardRatesConfig {
  if (typeof window === 'undefined') return DEFAULT_STANDARD_RATES;
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return DEFAULT_STANDARD_RATES;
    return { ...DEFAULT_STANDARD_RATES, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_STANDARD_RATES;
  }
}

export function saveStandardRates(rates: Partial<StandardRatesConfig>): StandardRatesConfig {
  if (typeof window === 'undefined') return DEFAULT_STANDARD_RATES;
  try {
    const current = getStandardRates();
    const updated = { ...current, ...rates };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return DEFAULT_STANDARD_RATES;
  }
}

export function getRateFromCategoryList(
  nameOrCode?: string,
  categories?: Array<{ code: string; name: string; standardBudget?: number | null }>,
  defaultFallback?: number
): number | null {
  if (!nameOrCode || !categories || categories.length === 0) return null;
  const match = categories.find(
    (c) =>
      c.code.toLowerCase() === nameOrCode.toLowerCase() ||
      c.name.toLowerCase() === nameOrCode.toLowerCase() ||
      nameOrCode.toLowerCase().includes(c.name.toLowerCase()) ||
      c.name.toLowerCase().includes(nameOrCode.toLowerCase())
  );
  if (match && typeof match.standardBudget === 'number' && match.standardBudget > 0) {
    return Number(match.standardBudget);
  }
  return defaultFallback ?? null;
}

export function getVehicleRate(
  vehicleType?: string,
  categories?: Array<{ code: string; name: string; standardBudget?: number | null }>
): number {
  if (categories && categories.length > 0) {
    const found = getRateFromCategoryList(vehicleType, categories);
    if (found !== null) return found;
  }

  const rates = getStandardRates();
  if (!vehicleType) return rates.vehicleDefaultRate;
  const lower = vehicleType.toLowerCase();
  if (lower.includes('จักรยานยนต์') || lower.includes('มอเตอร์ไซค์')) return rates.motorcycleRate;
  if (lower.includes('ยนต์') || lower.includes('รถยนต์') || lower.includes('กระบะ')) return rates.carRate;
  if (lower.includes('เกษตร') || lower.includes('เครื่องยนต์') || lower.includes('ตัดหญ้า')) return rates.agriEngineRate;
  return rates.vehicleDefaultRate;
}

export function getApplianceRate(
  applianceType?: string,
  categories?: Array<{ code: string; name: string; standardBudget?: number | null }>
): number {
  if (categories && categories.length > 0) {
    const found = getRateFromCategoryList(applianceType, categories);
    if (found !== null) return found;
  }

  const rates = getStandardRates();
  if (!applianceType) return rates.applianceDefaultRate;
  const lower = applianceType.toLowerCase();
  if (lower.includes('พัดลม') || lower.includes('หม้อหุงข้าว') || lower.includes('เตารีด')) return rates.fanCookerRate;
  if (lower.includes('วิชาชีพ') || lower.includes('เครื่องมือช่าง') || lower.includes('ตู้เย็น') || lower.includes('เครื่องซักผ้า')) return rates.vocationalToolRate;
  return rates.applianceDefaultRate;
}
