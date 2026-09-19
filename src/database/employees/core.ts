import { Employee } from "@/types/employee";
import { generateId, toUnix, fromUnix } from "../utils";

const EMPLOYEES_KEY = "db_employees";

interface EmployeeRecord {
  i: string;
  n: string;
  p: string;
  ph?: string;
  ca: number;
  ua: number;
}

function employeeFromRecord(r: EmployeeRecord): Employee {
  return {
    id: r.i,
    name: r.n,
    position: r.p,
    phone: r.ph,
    createdAt: fromUnix(r.ca),
    updatedAt: fromUnix(r.ua),
  };
}

function loadEmployees(): EmployeeRecord[] {
  try {
    const data = localStorage.getItem(EMPLOYEES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveEmployees(employees: EmployeeRecord[]) {
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees));
}

export function getEmployees(): Employee[] {
  return loadEmployees()
    .map(employeeFromRecord)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function getEmployeeById(id: string): Employee | undefined {
  const records = loadEmployees();
  const record = records.find((r) => r.i === id);
  return record ? employeeFromRecord(record) : undefined;
}

export function createEmployee(
  data: Omit<Employee, "id" | "createdAt" | "updatedAt">,
): Employee {
  const now = toUnix(new Date());
  const newEmployee: EmployeeRecord = {
    i: generateId(),
    n: data.name,
    p: data.position,
    ph: data.phone,
    ca: now,
    ua: now,
  };

  const employees = loadEmployees();
  employees.push(newEmployee);
  saveEmployees(employees);

  return employeeFromRecord(newEmployee);
}

export function updateEmployee(
  id: string,
  data: Partial<Omit<Employee, "id" | "createdAt" | "updatedAt">>,
): Employee | undefined {
  const employees = loadEmployees();
  const index = employees.findIndex((e) => e.i === id);
  if (index === -1) return undefined;

  const now = toUnix(new Date());
  const updated = { ...employees[index], ua: now };

  if (data.name !== undefined) updated.n = data.name;
  if (data.position !== undefined) updated.p = data.position;
  if (data.phone !== undefined) updated.ph = data.phone;

  employees[index] = updated;
  saveEmployees(employees);

  return employeeFromRecord(updated);
}

export function deleteEmployee(id: string): boolean {
  const employees = loadEmployees();
  const filtered = employees.filter((e) => e.i !== id);
  if (filtered.length === employees.length) return false;
  saveEmployees(filtered);
  return true;
}
