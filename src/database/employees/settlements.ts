import { EmployeeSettlement } from "@/types/employee";
import { generateId, toUnix, fromUnix } from "../utils";

const EMPLOYEE_SETTLEMENTS_KEY = "db_employee_settlements";

interface SettlementRecord {
  i: string;
  ei: string;
  en: string;
  t: 0 | 1;
  a: number;
  d: string;
  ca: number;
}

function settlementTypeToNumber(type: EmployeeSettlement["type"]): 0 | 1 {
  return type === "admin_to_employee" ? 0 : 1;
}

function settlementTypeFromNumber(n: 0 | 1): EmployeeSettlement["type"] {
  return n === 0 ? "admin_to_employee" : "employee_to_admin";
}

function settlementFromRecord(r: SettlementRecord): EmployeeSettlement {
  return {
    id: r.i,
    employeeId: r.ei,
    employeeName: r.en,
    type: settlementTypeFromNumber(r.t),
    amount: r.a,
    description: r.d,
    createdAt: fromUnix(r.ca),
  };
}

function loadSettlements(): SettlementRecord[] {
  try {
    const data = localStorage.getItem(EMPLOYEE_SETTLEMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveSettlements(settlements: SettlementRecord[]) {
  localStorage.setItem(EMPLOYEE_SETTLEMENTS_KEY, JSON.stringify(settlements));
}

export function getSettlements(): EmployeeSettlement[] {
  return loadSettlements()
    .map(settlementFromRecord)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function getSettlementsByEmployeeId(
  employeeId: string,
): EmployeeSettlement[] {
  return getSettlements().filter((s) => s.employeeId === employeeId);
}

export function createSettlement(data: {
  employeeId: string;
  employeeName: string;
  type: EmployeeSettlement["type"];
  amount: number;
  description: string;
}): EmployeeSettlement {
  const now = toUnix(new Date());
  const newSettlement: SettlementRecord = {
    i: generateId(),
    ei: data.employeeId,
    en: data.employeeName,
    t: settlementTypeToNumber(data.type),
    a: data.amount,
    d: data.description,
    ca: now,
  };

  const settlements = loadSettlements();
  settlements.push(newSettlement);
  saveSettlements(settlements);

  return settlementFromRecord(newSettlement);
}

export function deleteSettlement(id: string): boolean {
  const settlements = loadSettlements();
  const filtered = settlements.filter((s) => s.i !== id);
  if (filtered.length === settlements.length) return false;
  saveSettlements(filtered);
  return true;
}
