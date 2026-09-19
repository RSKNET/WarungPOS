export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DebtItem {
  productId: string;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Debt {
  id: string;
  customerId: string;
  customerName: string;
  items: DebtItem[];
  total: number;
  paidAmount: number;
  remainingAmount: number;
  status: "unpaid" | "partial" | "paid";
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

export interface DebtPayment {
  id: string;
  debtId: string;
  customerId?: string;
  amount: number;
  createdAt: string;
}

