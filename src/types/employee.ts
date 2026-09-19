export interface Employee {
  id: string;
  name: string;
  position: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeEarning {
  id: string;
  employeeId: string;
  employeeName: string;
  transactionId?: string;
  type: "salary" | "commission" | "bonus" | "other";
  description: string;
  amount: number;
  isPaid: boolean;
  paidAt?: string;
  createdAt: string;
}

export interface EmployeeDebt {
  id: string;
  employeeId: string;
  employeeName: string;
  description: string;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
  status: "unpaid" | "partial" | "paid";
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

export interface EmployeeDebtPayment {
  id: string;
  debtId: string;
  employeeId: string;
  amount: number;
  method: "cash" | "salary_deduction";
  createdAt: string;
}

export interface EmployeeSettlement {
  id: string;
  employeeId: string;
  employeeName: string;
  type: "admin_to_employee" | "employee_to_admin";
  amount: number;
  description: string;
  createdAt: string;
}

