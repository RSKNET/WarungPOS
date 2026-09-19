import { Partner, PartnerIncoming, PartnerOutgoing, PartnerPayment } from "@/types/partner";
import { generateId } from "./utils";

const PARTNERS_KEY = "db_partners";
const INCOMING_KEY = "db_partners_incoming";
const OUTGOING_KEY = "db_partners_outgoing";
const PAYMENTS_KEY = "db_partners_payments";

export function getPartners(): Partner[] {
  try {
    const data = localStorage.getItem(PARTNERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function getPartnerById(id: string): Partner | undefined {
  return getPartners().find((p) => p.id === id);
}

export function addPartner(data: Omit<Partner, "id" | "createdAt" | "updatedAt">): Partner {
  const now = new Date().toISOString();
  const newPartner: Partner = {
    id: generateId(),
    name: data.name.trim(),
    phone: data.phone?.trim(),
    address: data.address?.trim(),
    createdAt: now,
    updatedAt: now,
  };

  const partners = getPartners();
  partners.push(newPartner);
  localStorage.setItem(PARTNERS_KEY, JSON.stringify(partners));
  return newPartner;
}

export function updatePartner(
  id: string,
  data: Partial<Omit<Partner, "id" | "createdAt" | "updatedAt">>
): Partner | undefined {
  const partners = getPartners();
  const index = partners.findIndex((p) => p.id === id);
  if (index === -1) return undefined;

  partners[index] = {
    ...partners[index],
    name: data.name?.trim() ?? partners[index].name,
    phone: data.phone?.trim() ?? partners[index].phone,
    address: data.address?.trim() ?? partners[index].address,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(PARTNERS_KEY, JSON.stringify(partners));
  return partners[index];
}

export function deletePartner(id: string): boolean {
  const partners = getPartners();
  const filtered = partners.filter((p) => p.id !== id);
  if (filtered.length === partners.length) return false;

  localStorage.setItem(PARTNERS_KEY, JSON.stringify(filtered));

  const incoming = getIncoming();
  localStorage.setItem(INCOMING_KEY, JSON.stringify(incoming.filter((x) => x.partnerId !== id)));

  const outgoing = getOutgoing();
  localStorage.setItem(OUTGOING_KEY, JSON.stringify(outgoing.filter((x) => x.partnerId !== id)));

  const payments = getPartnerPayments();
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(payments.filter((x) => x.partnerId !== id)));

  return true;
}

export function getIncoming(): PartnerIncoming[] {
  try {
    const data = localStorage.getItem(INCOMING_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addIncoming(data: Omit<PartnerIncoming, "id" | "partnerName" | "createdAt">): PartnerIncoming {
  const partner = getPartnerById(data.partnerId);
  const now = new Date().toISOString();

  const newRecord: PartnerIncoming = {
    ...data,
    id: generateId(),
    partnerName: partner?.name || "Mitra Terhapus",
    createdAt: now,
  };

  const list = getIncoming();
  list.push(newRecord);
  localStorage.setItem(INCOMING_KEY, JSON.stringify(list));
  return newRecord;
}

export function deleteIncoming(id: string): boolean {
  const list = getIncoming();
  const filtered = list.filter((x) => x.id !== id);
  if (filtered.length === list.length) return false;

  localStorage.setItem(INCOMING_KEY, JSON.stringify(filtered));
  return true;
}

export function getOutgoing(): PartnerOutgoing[] {
  try {
    const data = localStorage.getItem(OUTGOING_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addOutgoing(data: Omit<PartnerOutgoing, "id" | "partnerName" | "createdAt">): PartnerOutgoing {
  const partner = getPartnerById(data.partnerId);
  const now = new Date().toISOString();

  const newRecord: PartnerOutgoing = {
    ...data,
    id: generateId(),
    partnerName: partner?.name || "Mitra Terhapus",
    createdAt: now,
  };

  const list = getOutgoing();
  list.push(newRecord);
  localStorage.setItem(OUTGOING_KEY, JSON.stringify(list));
  return newRecord;
}

export function deleteOutgoing(id: string): boolean {
  const list = getOutgoing();
  const filtered = list.filter((x) => x.id !== id);
  if (filtered.length === list.length) return false;

  localStorage.setItem(OUTGOING_KEY, JSON.stringify(filtered));
  return true;
}

export function getPartnerPayments(): PartnerPayment[] {
  try {
    const data = localStorage.getItem(PAYMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addPartnerPayment(data: Omit<PartnerPayment, "id" | "partnerName" | "createdAt">): PartnerPayment {
  const partner = getPartnerById(data.partnerId);
  const now = new Date().toISOString();

  const newRecord: PartnerPayment = {
    ...data,
    id: generateId(),
    partnerName: partner?.name || "Mitra Terhapus",
    createdAt: now,
  };

  const list = getPartnerPayments();
  list.push(newRecord);
  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(list));
  return newRecord;
}

export function deletePartnerPayment(id: string): boolean {
  const list = getPartnerPayments();
  const filtered = list.filter((x) => x.id !== id);
  if (filtered.length === list.length) return false;

  localStorage.setItem(PAYMENTS_KEY, JSON.stringify(filtered));
  return true;
}

export interface PartnerBalanceSummary {
  totalIncomingLedger: number;
  totalPaidDebt: number;
  totalOutgoing: number;
  totalWithdrawn: number;
  balance: number;
}

export function getPartnerBalance(partnerId: string): PartnerBalanceSummary {
  const incoming = getIncoming().filter((x) => x.partnerId === partnerId && x.paymentMethod === "offset_ledger");
  const outgoing = getOutgoing().filter((x) => x.partnerId === partnerId);
  const payments = getPartnerPayments().filter((x) => x.partnerId === partnerId);

  const totalIncomingLedger = incoming.reduce((sum, x) => sum + x.totalValue, 0);
  const totalOutgoing = outgoing.reduce((sum, x) => sum + x.totalValue, 0);

  const totalPaidDebt = payments.filter((x) => x.type === "pay_debt").reduce((sum, x) => sum + x.amount, 0);
  const totalWithdrawn = payments.filter((x) => x.type === "withdraw").reduce((sum, x) => sum + x.amount, 0);

  const balance = totalIncomingLedger + totalPaidDebt - totalOutgoing - totalWithdrawn;

  return {
    totalIncomingLedger,
    totalPaidDebt,
    totalOutgoing,
    totalWithdrawn,
    balance,
  };
}

export interface LedgerEntry {
  id: string;
  date: string;
  type: "incoming" | "outgoing" | "payment";
  description: string;
  debit: number;
  credit: number;
}

export function getPartnerLedger(partnerId: string): LedgerEntry[] {
  const incoming = getIncoming().filter((x) => x.partnerId === partnerId);
  const outgoing = getOutgoing().filter((x) => x.partnerId === partnerId);
  const payments = getPartnerPayments().filter((x) => x.partnerId === partnerId);

  const entries: LedgerEntry[] = [];

  incoming.forEach((x) => {

    const desc = `Setoran: ${x.productName} (${x.quantity} ${x.unit}) @ ${x.pricePerUnit}`;
    if (x.paymentMethod === "offset_ledger") {
      entries.push({
        id: x.id,
        date: x.date,
        type: "incoming",
        description: desc,
        debit: 0,
        credit: x.totalValue,
      });
    } else {

      entries.push({
        id: x.id,
        date: x.date,
        type: "incoming",
        description: `${desc} [Tunai Langsung]`,
        debit: x.totalValue,
        credit: x.totalValue,
      });
    }
  });

  outgoing.forEach((x) => {
    entries.push({
      id: x.id,
      date: x.date,
      type: "outgoing",
      description: `Ambil: ${x.description}`,
      debit: x.totalValue,
      credit: 0,
    });
  });

  payments.forEach((x) => {
    const isWithdraw = x.type === "withdraw";
    entries.push({
      id: x.id,
      date: x.date,
      type: "payment",
      description: isWithdraw ? "Tarik Tunai Saldo" : "Setor Tunai (Bayar Hutang)",
      debit: isWithdraw ? x.amount : 0,
      credit: isWithdraw ? 0 : x.amount,
    });
  });

  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

