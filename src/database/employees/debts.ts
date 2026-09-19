import { EmployeeDebt, EmployeeDebtPayment } from "@/types/employee";
import { generateId, toUnix, fromUnix } from "../utils";

const EMPLOYEE_DEBTS_KEY = "db_employee_debts";
const EMPLOYEE_DEBT_PAYMENTS_KEY = "db_employee_debt_payments";

interface DebtRecord {
  i: string;
  ei: string;
  en: string;
  d: string;
  a: number;
  pa: number;
  ra: number;
  st: 0 | 1 | 2;
  ca: number;
  ua: number;
  pat?: number;
}

function debtStatusFromNumber(n: 0 | 1 | 2): EmployeeDebt["status"] {
  switch (n) {
    case 0:
      return "unpaid";
    case 1:
      return "partial";
    case 2:
      return "paid";
  }
}

function debtFromRecord(r: DebtRecord): EmployeeDebt {
  return {
    id: r.i,
    employeeId: r.ei,
    employeeName: r.en,
    description: r.d,
    amount: r.a,
    paidAmount: r.pa,
    remainingAmount: r.ra,
    status: debtStatusFromNumber(r.st),
    createdAt: fromUnix(r.ca),
    updatedAt: fromUnix(r.ua),
    paidAt: r.pat ? fromUnix(r.pat) : undefined,
  };
}

function loadDebts(): DebtRecord[] {
  try {
    const data = localStorage.getItem(EMPLOYEE_DEBTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveDebts(debts: DebtRecord[]) {
  localStorage.setItem(EMPLOYEE_DEBTS_KEY, JSON.stringify(debts));
}

interface PaymentRecord {
  i: string;
  di: string;
  ei: string;
  a: number;
  m: 0 | 1;
  ca: number;
}

function paymentMethodToNumber(method: EmployeeDebtPayment["method"]): 0 | 1 {
  return method === "cash" ? 0 : 1;
}

function paymentMethodFromNumber(n: 0 | 1): EmployeeDebtPayment["method"] {
  return n === 0 ? "cash" : "salary_deduction";
}

function paymentFromRecord(r: PaymentRecord): EmployeeDebtPayment {
  return {
    id: r.i,
    debtId: r.di,
    employeeId: r.ei,
    amount: r.a,
    method: paymentMethodFromNumber(r.m),
    createdAt: fromUnix(r.ca),
  };
}

function loadPayments(): PaymentRecord[] {
  try {
    const data = localStorage.getItem(EMPLOYEE_DEBT_PAYMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function savePayments(payments: PaymentRecord[]) {
  localStorage.setItem(EMPLOYEE_DEBT_PAYMENTS_KEY, JSON.stringify(payments));
}

export function getEmployeeDebts(): EmployeeDebt[] {
  return loadDebts()
    .map(debtFromRecord)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function getEmployeeDebtById(id: string): EmployeeDebt | undefined {
  const records = loadDebts();
  const record = records.find((r) => r.i === id);
  return record ? debtFromRecord(record) : undefined;
}

export function getDebtsByEmployeeId(employeeId: string): EmployeeDebt[] {
  return getEmployeeDebts().filter((d) => d.employeeId === employeeId);
}

export function getUnpaidEmployeeDebts(): EmployeeDebt[] {
  return getEmployeeDebts().filter((d) => d.status !== "paid");
}

export function getUnpaidDebtsByEmployeeId(employeeId: string): EmployeeDebt[] {
  return getEmployeeDebts().filter(
    (d) => d.employeeId === employeeId && d.status !== "paid",
  );
}

export function createEmployeeDebt(data: {
  employeeId: string;
  employeeName: string;
  description: string;
  amount: number;
}): EmployeeDebt {
  const now = toUnix(new Date());
  const newDebt: DebtRecord = {
    i: generateId(),
    ei: data.employeeId,
    en: data.employeeName,
    d: data.description,
    a: data.amount,
    pa: 0,
    ra: data.amount,
    st: 0,
    ca: now,
    ua: now,
  };

  const debts = loadDebts();
  debts.push(newDebt);
  saveDebts(debts);

  return debtFromRecord(newDebt);
}

export function payEmployeeDebt(
  debtId: string,
  amount: number,
  method: EmployeeDebtPayment["method"],
): { debt: EmployeeDebt; payment: EmployeeDebtPayment } | undefined {
  const debts = loadDebts();
  const index = debts.findIndex((d) => d.i === debtId);
  if (index === -1) return undefined;

  const debt = debts[index];
  const now = toUnix(new Date());

  const paymentRecord: PaymentRecord = {
    i: generateId(),
    di: debtId,
    ei: debt.ei,
    a: amount,
    m: paymentMethodToNumber(method),
    ca: now,
  };

  const payments = loadPayments();
  payments.push(paymentRecord);
  savePayments(payments);

  debt.pa += amount;
  debt.ra = Math.max(0, debt.a - debt.pa);
  debt.ua = now;

  if (debt.ra === 0) {
    debt.st = 2;
    debt.pat = now;
  } else if (debt.pa > 0) {
    debt.st = 1;
  }

  saveDebts(debts);

  return {
    debt: debtFromRecord(debt),
    payment: paymentFromRecord(paymentRecord),
  };
}

export function getEmployeeDebtPayments(debtId: string): EmployeeDebtPayment[] {
  return loadPayments()
    .filter((p) => p.di === debtId)
    .map(paymentFromRecord)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function deleteEmployeeDebt(id: string): boolean {
  const debts = loadDebts();
  const filtered = debts.filter((d) => d.i !== id);
  if (filtered.length === debts.length) return false;
  saveDebts(filtered);
  return true;
}

export function getEmployeeTotalDebt(employeeId: string): number {
  return getDebtsByEmployeeId(employeeId)
    .filter((d) => d.status !== "paid")
    .reduce((sum, d) => sum + d.remainingAmount, 0);
}

export function getEmployeesWithDebt(): {
  employeeId: string;
  employeeName: string;
  totalDebt: number;
  debtCount: number;
}[] {
  const debts = getUnpaidEmployeeDebts();
  const employeeMap = new Map<
    string,
    { employeeName: string; totalDebt: number; debtCount: number }
  >();

  for (const debt of debts) {
    const existing = employeeMap.get(debt.employeeId);
    if (existing) {
      existing.totalDebt += debt.remainingAmount;
      existing.debtCount += 1;
    } else {
      employeeMap.set(debt.employeeId, {
        employeeName: debt.employeeName,
        totalDebt: debt.remainingAmount,
        debtCount: 1,
      });
    }
  }

  return Array.from(employeeMap.entries())
    .map(([employeeId, data]) => ({ employeeId, ...data }))
    .sort((a, b) => b.totalDebt - a.totalDebt);
}
