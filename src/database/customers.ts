import { Customer } from "@/types/debt";
import { generateId, toUnix, fromUnix } from "./utils";

const STORAGE_KEY = "db_customers";

interface CustomerRecord {
  i: string;
  n: string;
  p?: string;
  a?: string;
  ca: number;
  ua: number;
}

function fromRecord(r: CustomerRecord): Customer {
  return {
    id: r.i,
    name: r.n,
    phone: r.p,
    address: r.a,
    createdAt: fromUnix(r.ca),
    updatedAt: fromUnix(r.ua),
  };
}

function loadCustomers(): CustomerRecord[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveCustomers(customers: CustomerRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
}

export function getCustomers(): Customer[] {
  return loadCustomers().map(fromRecord);
}

export function getCustomerById(id: string): Customer | undefined {
  const customers = loadCustomers();
  const record = customers.find((c) => c.i === id);
  return record ? fromRecord(record) : undefined;
}

export function addCustomer(
  data: Omit<Customer, "id" | "createdAt" | "updatedAt">,
): Customer {
  const now = toUnix(new Date());
  const newCustomer: CustomerRecord = {
    i: generateId(),
    n: data.name,
    p: data.phone,
    a: data.address,
    ca: now,
    ua: now,
  };

  const customers = loadCustomers();
  customers.push(newCustomer);
  saveCustomers(customers);

  return fromRecord(newCustomer);
}

export function updateCustomer(
  id: string,
  data: Partial<Omit<Customer, "id" | "createdAt" | "updatedAt">>,
): Customer | undefined {
  const customers = loadCustomers();
  const index = customers.findIndex((c) => c.i === id);

  if (index === -1) return undefined;

  customers[index] = {
    ...customers[index],
    n: data.name ?? customers[index].n,
    p: data.phone ?? customers[index].p,
    a: data.address ?? customers[index].a,
    ua: toUnix(new Date()),
  };

  saveCustomers(customers);
  return fromRecord(customers[index]);
}

export function deleteCustomer(id: string): boolean {
  const customers = loadCustomers();
  const filtered = customers.filter((c) => c.i !== id);

  if (filtered.length === customers.length) return false;

  saveCustomers(filtered);
  return true;
}

export function searchCustomers(query: string): Customer[] {
  const customers = getCustomers();
  const lowerQuery = query.toLowerCase();
  return customers.filter(
    (c) =>
      c.name.toLowerCase().includes(lowerQuery) ||
      (c.phone && c.phone.includes(query)),
  );
}

