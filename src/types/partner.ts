export interface Partner {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PartnerIncoming {
  id: string;
  partnerId: string;
  partnerName: string;
  date: string;
  productName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalValue: number;
  paymentMethod: "cash" | "offset_ledger";
  createdAt: string;
}

export interface PartnerOutgoing {
  id: string;
  partnerId: string;
  partnerName: string;
  date: string;
  description: string;
  totalValue: number;
  createdAt: string;
}

export interface PartnerPayment {
  id: string;
  partnerId: string;
  partnerName: string;
  date: string;
  type: "withdraw" | "pay_debt";
  amount: number;
  createdAt: string;
}

