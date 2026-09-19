import { Debt, DebtItem, DebtPayment } from "@/types/debt";
import { CartItem } from "@/types/pos";
import { generateId, toUnix, fromUnix } from "./utils";

const DEBTS_KEY = "db_debts";
const PAYMENTS_KEY = "db_debt_payments";

interface DebtItemRecord {
  pi: string;
  pn: string;
  pp: number;
  q: number;
  sb: number;
}

interface DebtRecord {
  i: string;
  ci: string;
  cn: string;
  it: DebtItemRecord[];
  t: number;
  pa: number;
  ra: number;
  st: 0 | 1 | 2;
  ca: number;
  ua: number;
  pat?: number;
}

interface PaymentRecord {
  i: string;
  di: string;
  ci?: string;
  a: number;
  ca: number;
}

function itemToRecord(item: CartItem): DebtItemRecord {
  return {
    pi: item.product.id,
    pn: item.product.name,
    pp:
      item.priceType === "wholesale"
        ? item.variant.wholesalePrice
        : item.variant.retailPrice,
    q: item.quantity,
    sb: item.subtotal,
  };
}

function itemFromRecord(r: DebtItemRecord): DebtItem {
  return {
    productId: r.pi,
    productName: r.pn,
    price: r.pp,
    quantity: r.q,
    subtotal: r.sb,
  };
}

function statusFromNumber(n: 0 | 1 | 2): Debt["status"] {
  switch (n) {
    case 0:
      return "unpaid";
    case 1:
      return "partial";
    case 2:
      return "paid";
  }
}

function fromRecord(r: DebtRecord): Debt {
  return {
    id: r.i,
    customerId: r.ci,
    customerName: r.cn,
    items: r.it.map(itemFromRecord),
    total: r.t,
    paidAmount: r.pa,
    remainingAmount: r.ra,
    status: statusFromNumber(r.st),
    createdAt: fromUnix(r.ca),
    updatedAt: fromUnix(r.ua),
    paidAt: r.pat ? fromUnix(r.pat) : undefined,
  };
}

function loadDebts(): DebtRecord[] {
  try {
    const data = localStorage.getItem(DEBTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveDebts(debts: DebtRecord[]) {
  localStorage.setItem(DEBTS_KEY, JSON.stringify(debts));
}

function loadPayments(): PaymentRecord[] {
  try {
    const data = localStorage.getItem(PAYMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function savePayments(payments: PaymentRecord[]) {
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments));
}

export function getDebts(): Debt[] {
  return loadDebts()
    .map(fromRecord)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function getDebtById(id: string): Debt | undefined {
  const debts = loadDebts();
  const record = debts.find((d) => d.i === id);
  return record ? fromRecord(record) : undefined;
}

export function getDebtsByCustomerId(customerId: string): Debt[] {
  return getDebts().filter((d) => d.customerId === customerId);
}

export function getUnpaidDebts(): Debt[] {
  return getDebts().filter((d) => d.status !== "paid");
}

export async function createDebt(
  customerId: string,
  customerName: string,
  items: CartItem[],
  total: number,
): Promise<Debt> {
  const now = toUnix(new Date());

  const newDebt: DebtRecord = {
    i: generateId(),
    ci: customerId,
    cn: customerName,
    it: items.map(itemToRecord),
    t: total,
    pa: 0,
    ra: total,
    st: 0,
    ca: now,
    ua: now,
  };

  const debts = loadDebts();
  debts.push(newDebt);
  saveDebts(debts);

  return fromRecord(newDebt);
}

function payDebtInternal(debtId: string, amount: number): Debt | undefined {
  const debts = loadDebts();
  const index = debts.findIndex((d) => d.i === debtId);

  if (index === -1) return undefined;

  const debt = debts[index];
  const now = toUnix(new Date());

  debt.pa += amount;
  debt.ra = Math.max(0, debt.t - debt.pa);
  debt.ua = now;

  if (debt.ra === 0) {
    debt.st = 2;
    debt.pat = now;
  } else if (debt.pa > 0) {
    debt.st = 1;
  }

  saveDebts(debts);
  return fromRecord(debt);
}

export function payCustomerDebt(
  customerId: string,
  amount: number,
): { payment: DebtPayment; updatedDebts: Debt[] } | undefined {
  if (amount <= 0) return undefined;

  const customerDebts = getDebtsByCustomerId(customerId)
    .filter((d) => d.status !== "paid")
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );

  if (customerDebts.length === 0) return undefined;

  const now = toUnix(new Date());

  const paymentRecord: PaymentRecord = {
    i: generateId(),
    di: `customer-${customerId}`,
    ci: customerId,
    a: amount,
    ca: now,
  };

  const payments = loadPayments();
  payments.push(paymentRecord);
  savePayments(payments);

  let remainingPayment = amount;
  const updatedDebts: Debt[] = [];

  for (const debt of customerDebts) {
    if (remainingPayment <= 0) break;

    const payAmount = Math.min(remainingPayment, debt.remainingAmount);
    const updated = payDebtInternal(debt.id, payAmount);
    if (updated) {
      updatedDebts.push(updated);
    }
    remainingPayment -= payAmount;
  }

  return {
    payment: {
      id: paymentRecord.i,
      debtId: paymentRecord.di,
      customerId: paymentRecord.ci,
      amount: paymentRecord.a,
      createdAt: fromUnix(paymentRecord.ca),
    },
    updatedDebts,
  };
}

export function payDebt(
  debtId: string,
  amount: number,
): { debt: Debt; payment: DebtPayment } | undefined {
  const debts = loadDebts();
  const index = debts.findIndex((d) => d.i === debtId);

  if (index === -1) return undefined;

  const debt = debts[index];
  const now = toUnix(new Date());

  const paymentRecord: PaymentRecord = {
    i: generateId(),
    di: debtId,
    ci: debt.ci,
    a: amount,
    ca: now,
  };

  const payments = loadPayments();
  payments.push(paymentRecord);
  savePayments(payments);

  const updated = payDebtInternal(debtId, amount);
  if (!updated) return undefined;

  return {
    debt: updated,
    payment: {
      id: paymentRecord.i,
      debtId: paymentRecord.di,
      customerId: paymentRecord.ci,
      amount: paymentRecord.a,
      createdAt: fromUnix(paymentRecord.ca),
    },
  };
}

export function getCustomerPayments(customerId: string): DebtPayment[] {
  return loadPayments()
    .filter((p) => p.ci === customerId || p.di === `customer-${customerId}`)
    .map((p) => ({
      id: p.i,
      debtId: p.di,
      customerId: p.ci,
      amount: p.a,
      createdAt: fromUnix(p.ca),
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function getDebtPayments(debtId: string): DebtPayment[] {
  return loadPayments()
    .filter((p) => p.di === debtId)
    .map((p) => ({
      id: p.i,
      debtId: p.di,
      customerId: p.ci,
      amount: p.a,
      createdAt: fromUnix(p.ca),
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function getAllPayments(): DebtPayment[] {
  return loadPayments()
    .map((p) => ({
      id: p.i,
      debtId: p.di,
      customerId: p.ci,
      amount: p.a,
      createdAt: fromUnix(p.ca),
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
}

export function getCustomerTotalDebt(customerId: string): number {
  return getDebtsByCustomerId(customerId)
    .filter((d) => d.status !== "paid")
    .reduce((sum, d) => sum + d.remainingAmount, 0);
}

export function getCustomersWithDebt(): {
  customerId: string;
  customerName: string;
  totalDebt: number;
  debtCount: number;
}[] {
  const debts = getDebts();
  const customerMap = new Map<
    string,
    { customerName: string; totalDebt: number; debtCount: number }
  >();

  for (const debt of debts) {
    const existing = customerMap.get(debt.customerId);
    if (existing) {
      existing.totalDebt += debt.remainingAmount;
      existing.debtCount += 1;
    } else {
      customerMap.set(debt.customerId, {
        customerName: debt.customerName,
        totalDebt: debt.remainingAmount,
        debtCount: 1,
      });
    }
  }

  return Array.from(customerMap.entries())
    .map(([customerId, data]) => ({
      customerId,
      ...data,
    }))
    .sort((a, b) => b.totalDebt - a.totalDebt);
}

export function deleteCustomerDebtHistory(customerId: string): boolean {
  const totalDebt = getCustomerTotalDebt(customerId);
  if (totalDebt > 0) return false;

  const debts = loadDebts();
  const filteredDebts = debts.filter((d) => d.ci !== customerId);
  saveDebts(filteredDebts);

  const payments = loadPayments();
  const filteredPayments = payments.filter((p) => p.ci !== customerId);
  savePayments(filteredPayments);

  return true;
}

