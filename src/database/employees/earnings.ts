import { EmployeeEarning } from "@/types/employee";
import { generateId, toUnix, fromUnix } from "../utils";

const EARNINGS_KEY = "db_employee_earnings";

interface EarningRecord {
  i: string;
  ei: string;
  en: string;
  ti?: string;
  t: 0 | 1 | 2 | 3;
  d: string;
  a: number;
  ip: boolean;
  pa?: number;
  ca: number;
}

function earningTypeToNumber(type: EmployeeEarning["type"]): 0 | 1 | 2 | 3 {
  switch (type) {
    case "salary":
      return 0;
    case "commission":
      return 1;
    case "bonus":
      return 2;
    case "other":
      return 3;
  }
}

function earningTypeFromNumber(n: 0 | 1 | 2 | 3): EmployeeEarning["type"] {
  switch (n) {
    case 0:
      return "salary";
    case 1:
      return "commission";
    case 2:
      return "bonus";
    case 3:
      return "other";
  }
}

function earningFromRecord(r: EarningRecord): EmployeeEarning {
  return {
    id: r.i,
    employeeId: r.ei,
    employeeName: r.en,
    transactionId: r.ti,
    type: earningTypeFromNumber(r.t),
    description: r.d,
    amount: r.a,
    isPaid: r.ip,
    paidAt: r.pa ? fromUnix(r.pa) : undefined,
    createdAt: fromUnix(r.ca),
  };
}

function loadEarnings(): EarningRecord[] {
  try {
    const data = localStorage.getItem(EARNINGS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveEarnings(earnings: EarningRecord[]) {
  localStorage.setItem(EARNINGS_KEY, JSON.stringify(earnings));
}

export function getEarnings(): EmployeeEarning[] {
  return loadEarnings()
    .map(earningFromRecord)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function getEarningsByEmployeeId(employeeId: string): EmployeeEarning[] {
  return getEarnings().filter((e) => e.employeeId === employeeId);
}

export function getUnpaidEarnings(): EmployeeEarning[] {
  return getEarnings().filter((e) => !e.isPaid);
}

export function getUnpaidEarningsByEmployeeId(
  employeeId: string,
): EmployeeEarning[] {
  return getEarnings().filter((e) => e.employeeId === employeeId && !e.isPaid);
}

export function createEarning(
  data: Omit<EmployeeEarning, "id" | "createdAt" | "isPaid" | "paidAt">,
): EmployeeEarning {
  const now = toUnix(new Date());
  const newEarning: EarningRecord = {
    i: generateId(),
    ei: data.employeeId,
    en: data.employeeName,
    ti: data.transactionId,
    t: earningTypeToNumber(data.type),
    d: data.description,
    a: data.amount,
    ip: false,
    ca: now,
  };

  const earnings = loadEarnings();
  earnings.push(newEarning);
  saveEarnings(earnings);

  return earningFromRecord(newEarning);
}

export function markEarningAsPaid(id: string): EmployeeEarning | undefined {
  const earnings = loadEarnings();
  const index = earnings.findIndex((e) => e.i === id);
  if (index === -1) return undefined;

  const now = toUnix(new Date());
  earnings[index].ip = true;
  earnings[index].pa = now;

  saveEarnings(earnings);
  return earningFromRecord(earnings[index]);
}

export function deleteEarning(id: string): boolean {
  const earnings = loadEarnings();
  const filtered = earnings.filter((e) => e.i !== id);
  if (filtered.length === earnings.length) return false;
  saveEarnings(filtered);
  return true;
}

export function getEmployeeTotalUnpaidEarnings(employeeId: string): number {
  return getEarningsByEmployeeId(employeeId)
    .filter((e) => !e.isPaid)
    .reduce((sum, e) => sum + e.amount, 0);
}
