import { getDB } from "@/database/db";
import { ProductRecord, VariantRecord, TransactionRecord } from "@/database/types";
import { clearProductsCache } from "@/database/products";
import { clearTransactionsCache } from "@/database/transactions";
import { clearVariantsCache } from "@/database/variants";
import { gzip, gunzip } from "fflate";
import { encrypt, decrypt } from "./encryption";

export interface BackupData {
  version: number;
  createdAt: string;
  appVersion: string;
  data: {
    products: unknown[];
    variants: unknown[];
    transactions: unknown[];
    categories: unknown[];
    units: unknown[];
    customers: unknown[];
    debts: unknown[];
    debtPayments: unknown[];
    employees: unknown[];
    employeeEarnings: unknown[];
    employeeDebts: unknown[];
    employeeDebtPayments: unknown[];
    employeeSettlements: unknown[];
    shoppingCategories: unknown[];
    shoppingItems: unknown[];
    shoppingArchive: unknown[];
    shoppingLastCheckDate: string | null;
    markupRules: unknown[];
    storeSettings: unknown;
    partners?: unknown[];
    partnersIncoming?: unknown[];
    partnersOutgoing?: unknown[];
    partnersPayments?: unknown[];
  };
}

const BACKUP_VERSION = 4;
const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "3.0.0";

function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

function uint8ArrayToString(arr: Uint8Array): string {
  return new TextDecoder().decode(arr);
}

function uint8ArrayToBase64(arr: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < arr.length; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    arr[i] = binary.charCodeAt(i);
  }
  return arr;
}

export interface BackupModulesOptions {
  products?: boolean;
  transactions?: boolean;
  categories?: boolean;
  units?: boolean;
  customers?: boolean;
  debts?: boolean;
  employees?: boolean;
  shoppingItems?: boolean;
  partners?: boolean;
  markupRules?: boolean;
  storeSettings?: boolean;
}

export async function exportBackup(options?: BackupModulesOptions): Promise<Blob> {
  const db = await getDB();
  const opts = options || {};
  const backupData: Partial<BackupData["data"]> = {};

  if (opts.products !== false) {
    backupData.products = await db.getAll("products");
    backupData.variants = await db.getAll("variants");
  }

  if (opts.transactions !== false) {
    backupData.transactions = await db.getAll("transactions");
  }

  if (opts.categories !== false) {
    backupData.categories = JSON.parse(localStorage.getItem("db_categories") || "[]");
  }

  if (opts.units !== false) {
    backupData.units = JSON.parse(localStorage.getItem("db_units") || "[]");
  }

  if (opts.customers !== false || opts.debts !== false) {
    backupData.customers = JSON.parse(localStorage.getItem("db_customers") || "[]");
    backupData.debts = JSON.parse(localStorage.getItem("db_debts") || "[]");
    backupData.debtPayments = JSON.parse(
      localStorage.getItem("db_debt_payments") || "[]"
    );
  }

  if (opts.employees !== false) {
    backupData.employees = JSON.parse(localStorage.getItem("db_employees") || "[]");
    backupData.employeeEarnings = JSON.parse(
      localStorage.getItem("db_employee_earnings") || "[]"
    );
    backupData.employeeDebts = JSON.parse(
      localStorage.getItem("db_employee_debts") || "[]"
    );
    backupData.employeeDebtPayments = JSON.parse(
      localStorage.getItem("db_employee_debt_payments") || "[]"
    );
    backupData.employeeSettlements = JSON.parse(
      localStorage.getItem("db_employee_settlements") || "[]"
    );
  }

  if (opts.shoppingItems !== false) {
    backupData.shoppingCategories = JSON.parse(
      localStorage.getItem("db_shopping_categories") || "[]"
    );
    backupData.shoppingItems = JSON.parse(
      localStorage.getItem("db_shopping_items") || "[]"
    );
    backupData.shoppingArchive = JSON.parse(
      localStorage.getItem("db_shopping_archive") || "[]"
    );
    backupData.shoppingLastCheckDate = localStorage.getItem(
      "db_shopping_last_check_date"
    );
  }

  if (opts.markupRules !== false) {
    backupData.markupRules = JSON.parse(
      localStorage.getItem("warungpos_markup_rules") || "[]"
    );
  }

  if (opts.storeSettings !== false) {
    backupData.storeSettings = JSON.parse(
      localStorage.getItem("store-settings") || "{}"
    );
  }

  if (opts.partners !== false) {
    backupData.partners = JSON.parse(localStorage.getItem("db_partners") || "[]");
    backupData.partnersIncoming = JSON.parse(
      localStorage.getItem("db_partners_incoming") || "[]"
    );
    backupData.partnersOutgoing = JSON.parse(
      localStorage.getItem("db_partners_outgoing") || "[]"
    );
    backupData.partnersPayments = JSON.parse(
      localStorage.getItem("db_partners_payments") || "[]"
    );
  }

  const backup: BackupData = {
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    data: backupData as BackupData["data"],
  };

  const jsonString = JSON.stringify(backup);

  const compressed = await new Promise<Uint8Array>((resolve, reject) => {
    gzip(stringToUint8Array(jsonString), { level: 9 }, (err, data) => {
      if (err) reject(err);
      else resolve(data);
    });
  });

  const base64Compressed = uint8ArrayToBase64(compressed);
  const encrypted = encrypt(base64Compressed);

  return new Blob([encrypted], { type: "application/octet-stream" });
}

export async function downloadBackup(options?: BackupModulesOptions): Promise<{ savedInDownloads?: boolean }> {
  const blob = await exportBackup(options);
  const date = new Date().toISOString().split("T")[0];
  const filename = `warungpos-backup-${date}.wbak`;

  // 1. Android APK native bridge (simpan ke folder Download/WarungPOS/Backup)
  if (typeof window !== "undefined" && window.AndroidBridge) {
    const text = await blob.text();
    const success = window.AndroidBridge.saveToFolder
      ? window.AndroidBridge.saveToFolder(text, filename, "Backup", "application/octet-stream")
      : window.AndroidBridge.saveToDownloads?.(text, filename);
    if (success) {
      return { savedInDownloads: true };
    }
  }

  // 2. Web Share API untuk mobile browser / PWA
  const file = new File([blob], filename, { type: "application/octet-stream" });
  if (typeof navigator !== "undefined" && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: "Backup WarungPOS",
        files: [file],
      });
      return { savedInDownloads: true };
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        console.warn("Share failed, falling back to download link", e);
      } else {
        return { savedInDownloads: true };
      }
    }
  }

  // 3. Desktop web browser download
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return { savedInDownloads: false };
}

export function validateBackup(data: unknown): data is BackupData {
  if (!data || typeof data !== "object") return false;

  const backup = data as BackupData;

  if (typeof backup.version !== "number") return false;
  if (typeof backup.createdAt !== "string") return false;
  if (!backup.data || typeof backup.data !== "object") return false;

  return true;
}

export async function importBackup(file: File): Promise<{
  success: boolean;
  message: string;
  itemCounts?: Record<string, number>;
}> {
  try {
    let data: BackupData;

    if (file.name.endsWith(".wbak")) {
      const encryptedText = await file.text();
      const decryptedBase64 = decrypt(encryptedText);
      const compressed = base64ToUint8Array(decryptedBase64);

      const decompressed = await new Promise<Uint8Array>((resolve, reject) => {
        gunzip(compressed, (err, data) => {
          if (err) reject(err);
          else resolve(data);
        });
      });

      const jsonString = uint8ArrayToString(decompressed);
      data = JSON.parse(jsonString);
    } else {
      const text = await file.text();
      data = JSON.parse(text);
    }

    if (!validateBackup(data)) {
      return { success: false, message: "Format file backup tidak valid" };
    }

    const db = await getDB();
    const itemCounts: Record<string, number> = {};

    if (data.data.products && Array.isArray(data.data.products)) {
      const productsTx = db.transaction("products", "readwrite");
      await productsTx.store.clear();
      for (const product of data.data.products as ProductRecord[]) {
        await productsTx.store.put(product);
      }
      await productsTx.done;
      itemCounts.products = (data.data.products as ProductRecord[]).length;
    }

    if (data.data.variants && Array.isArray(data.data.variants)) {
      const variantsTx = db.transaction("variants", "readwrite");
      await variantsTx.store.clear();
      for (const variant of data.data.variants as VariantRecord[]) {
        await variantsTx.store.put(variant);
      }
      await variantsTx.done;
      itemCounts.variants = (data.data.variants as VariantRecord[]).length;
      localStorage.removeItem("variants_migrated_v1");
    }

    if (data.data.transactions && Array.isArray(data.data.transactions)) {
      const txsTx = db.transaction("transactions", "readwrite");
      await txsTx.store.clear();
      for (const transaction of data.data.transactions as TransactionRecord[]) {
        await txsTx.store.put(transaction);
      }
      await txsTx.done;
      itemCounts.transactions = (
        data.data.transactions as TransactionRecord[]
      ).length;
    }

    if (data.data.categories) {
      localStorage.setItem(
        "db_categories",
        JSON.stringify(data.data.categories),
      );
      itemCounts.categories = (data.data.categories as unknown[]).length;
    }

    if (data.data.units) {
      localStorage.setItem("db_units", JSON.stringify(data.data.units));
      itemCounts.units = (data.data.units as unknown[]).length;
    }

    if (data.data.customers) {
      localStorage.setItem("db_customers", JSON.stringify(data.data.customers));
      itemCounts.customers = (data.data.customers as unknown[]).length;
    }

    if (data.data.debts) {
      localStorage.setItem("db_debts", JSON.stringify(data.data.debts));
      itemCounts.debts = (data.data.debts as unknown[]).length;
    }

    if (data.data.debtPayments) {
      localStorage.setItem(
        "db_debt_payments",
        JSON.stringify(data.data.debtPayments),
      );
      itemCounts.debtPayments = (data.data.debtPayments as unknown[]).length;
    }

    if (data.data.employees) {
      localStorage.setItem("db_employees", JSON.stringify(data.data.employees));
      itemCounts.employees = (data.data.employees as unknown[]).length;
    }

    if (data.data.employeeEarnings) {
      localStorage.setItem(
        "db_employee_earnings",
        JSON.stringify(data.data.employeeEarnings),
      );
      itemCounts.employeeEarnings = (
        data.data.employeeEarnings as unknown[]
      ).length;
    }

    if (data.data.employeeDebts) {
      localStorage.setItem(
        "db_employee_debts",
        JSON.stringify(data.data.employeeDebts),
      );
      itemCounts.employeeDebts = (data.data.employeeDebts as unknown[]).length;
    }

    if (data.data.employeeDebtPayments) {
      localStorage.setItem(
        "db_employee_debt_payments",
        JSON.stringify(data.data.employeeDebtPayments),
      );
      itemCounts.employeeDebtPayments = (
        data.data.employeeDebtPayments as unknown[]
      ).length;
    }

    if (data.data.employeeSettlements) {
      localStorage.setItem(
        "db_employee_settlements",
        JSON.stringify(data.data.employeeSettlements),
      );
      itemCounts.employeeSettlements = (
        data.data.employeeSettlements as unknown[]
      ).length;
    }

    if (data.data.shoppingCategories) {
      localStorage.setItem(
        "db_shopping_categories",
        JSON.stringify(data.data.shoppingCategories),
      );
      itemCounts.shoppingCategories = (
        data.data.shoppingCategories as unknown[]
      ).length;
    }

    if (data.data.shoppingItems) {
      localStorage.setItem(
        "db_shopping_items",
        JSON.stringify(data.data.shoppingItems),
      );
      itemCounts.shoppingItems = (data.data.shoppingItems as unknown[]).length;
    }

    if (data.data.shoppingArchive) {
      localStorage.setItem(
        "db_shopping_archive",
        JSON.stringify(data.data.shoppingArchive),
      );
      itemCounts.shoppingArchive = (
        data.data.shoppingArchive as unknown[]
      ).length;
    }

    if (data.data.shoppingLastCheckDate !== undefined) {
      if (data.data.shoppingLastCheckDate) {
        localStorage.setItem(
          "db_shopping_last_check_date",
          data.data.shoppingLastCheckDate as string,
        );
      } else {
        localStorage.removeItem("db_shopping_last_check_date");
      }
    }

    if (data.data.markupRules) {
      localStorage.setItem(
        "warungpos_markup_rules",
        JSON.stringify(data.data.markupRules),
      );
      itemCounts.markupRules = (data.data.markupRules as unknown[]).length;
    }

    if (data.data.partners) {
      localStorage.setItem("db_partners", JSON.stringify(data.data.partners));
      itemCounts.partners = (data.data.partners as unknown[]).length;
    }

    if (data.data.partnersIncoming) {
      localStorage.setItem(
        "db_partners_incoming",
        JSON.stringify(data.data.partnersIncoming),
      );
      itemCounts.partnersIncoming = (
        data.data.partnersIncoming as unknown[]
      ).length;
    }

    if (data.data.partnersOutgoing) {
      localStorage.setItem(
        "db_partners_outgoing",
        JSON.stringify(data.data.partnersOutgoing),
      );
      itemCounts.partnersOutgoing = (
        data.data.partnersOutgoing as unknown[]
      ).length;
    }

    if (data.data.partnersPayments) {
      localStorage.setItem(
        "db_partners_payments",
        JSON.stringify(data.data.partnersPayments),
      );
      itemCounts.partnersPayments = (
        data.data.partnersPayments as unknown[]
      ).length;
    }

    if (
      data.data.storeSettings &&
      Object.keys(data.data.storeSettings as object).length > 0
    ) {
      localStorage.setItem(
        "store-settings",
        JSON.stringify(data.data.storeSettings),
      );
    }

    clearProductsCache();
    clearTransactionsCache();
    clearVariantsCache();

    return {
      success: true,
      message: "Data berhasil dipulihkan",
      itemCounts,
    };
  } catch {
    return { success: false, message: "Gagal membaca file backup" };
  }
}

export async function getStorageStats(): Promise<{
  products: number;
  transactions: number;
  categories: number;
  units: number;
  customers: number;
  debts: number;
  employees: number;
  shoppingItems: number;
  partners: number;
  markupRules: number;
}> {
  const db = await getDB();

  const products = await db.count("products");
  const transactions = await db.count("transactions");
  const categories = (
    JSON.parse(localStorage.getItem("db_categories") || "[]") as unknown[]
  ).length;
  const units = (
    JSON.parse(localStorage.getItem("db_units") || "[]") as unknown[]
  ).length;
  const customers = (
    JSON.parse(localStorage.getItem("db_customers") || "[]") as unknown[]
  ).length;
  const debts = (
    JSON.parse(localStorage.getItem("db_debts") || "[]") as unknown[]
  ).length;
  const employees = (
    JSON.parse(localStorage.getItem("db_employees") || "[]") as unknown[]
  ).length;
  const shoppingItems = (
    JSON.parse(localStorage.getItem("db_shopping_items") || "[]") as unknown[]
  ).length;
  const partners = (
    JSON.parse(localStorage.getItem("db_partners") || "[]") as unknown[]
  ).length;
  const markupRules = (
    JSON.parse(localStorage.getItem("warungpos_markup_rules") || "[]") as unknown[]
  ).length;

  return {
    products,
    transactions,
    categories,
    units,
    customers,
    debts,
    employees,
    shoppingItems,
    partners,
    markupRules,
  };
}

export async function resetAllData(defaultSettings: unknown): Promise<void> {
  clearProductsCache();
  clearTransactionsCache();
  clearVariantsCache();
  const db = await getDB();

  const productsTx = db.transaction("products", "readwrite");
  await productsTx.store.clear();
  await productsTx.done;

  const variantsTx = db.transaction("variants", "readwrite");
  await variantsTx.store.clear();
  await variantsTx.done;

  const txsTx = db.transaction("transactions", "readwrite");
  await txsTx.store.clear();
  await txsTx.done;

  localStorage.removeItem("variants_migrated_v1");

  const keysToClear = [
    "db_customers",
    "db_debts",
    "db_debt_payments",
    "db_employees",
    "db_employee_earnings",
    "db_employee_debts",
    "db_employee_debt_payments",
    "db_employee_settlements",
    "db_shopping_categories",
    "db_shopping_items",
    "db_shopping_archive",
    "db_shopping_last_check_date",
    "warungpos_markup_rules",
    "db_products",
    "pos_products",
    "db_transactions",
    "pos_transactions",
    "db_partners",
    "db_partners_incoming",
    "db_partners_outgoing",
    "db_partners_payments",
  ];

  for (const key of keysToClear) {
    localStorage.removeItem(key);
  }

  localStorage.setItem("db_categories", "[]");
  localStorage.setItem("db_units", "[]");

  localStorage.setItem("store-settings", JSON.stringify(defaultSettings));
}

