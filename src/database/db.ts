import { openDB, DBSchema, IDBPDatabase } from "idb";
import { ProductRecord, VariantRecord, TransactionRecord } from "./types";

interface WarungPOSDB extends DBSchema {
  products: {
    key: string;
    value: ProductRecord;
    indexes: { "by-sku": string };
  };
  variants: {
    key: string;
    value: VariantRecord;
    indexes: { "by-sku": string; "by-productId": string };
  };
  transactions: {
    key: string;
    value: TransactionRecord;
    indexes: { "by-date": number };
  };
}

const DB_NAME = "warungpos-db";
const DB_VERSION = 2;

let dbInstance: IDBPDatabase<WarungPOSDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<WarungPOSDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<WarungPOSDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {

      if (oldVersion < 1) {
        if (!db.objectStoreNames.contains("products")) {
          const productStore = db.createObjectStore("products", { keyPath: "i" });
          productStore.createIndex("by-sku", "s");
        }
        if (!db.objectStoreNames.contains("transactions")) {
          const txStore = db.createObjectStore("transactions", { keyPath: "i" });
          txStore.createIndex("by-date", "ca");
        }
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains("variants")) {
          const variantStore = db.createObjectStore("variants", { keyPath: "i" });
          variantStore.createIndex("by-sku", "s");
          variantStore.createIndex("by-productId", "pi");
        }

      }
    },
  });

  return dbInstance;
}

export async function migrateFromLocalStorage(): Promise<void> {
  const db = await getDB();

  const oldProducts = localStorage.getItem("db_products");
  if (oldProducts) {
    const products: ProductRecord[] = JSON.parse(oldProducts);
    const tx = db.transaction("products", "readwrite");
    for (const product of products) {
      await tx.store.put(product);
    }
    await tx.done;
    localStorage.removeItem("db_products");
  }

  const legacyProducts = localStorage.getItem("pos_products");
  if (legacyProducts) {
    localStorage.removeItem("pos_products");
  }

  const oldTransactions = localStorage.getItem("db_transactions");
  if (oldTransactions) {
    const transactions: TransactionRecord[] = JSON.parse(oldTransactions);
    const tx = db.transaction("transactions", "readwrite");
    for (const transaction of transactions) {
      await tx.store.put(transaction);
    }
    await tx.done;
    localStorage.removeItem("db_transactions");
  }

  const legacyTransactions = localStorage.getItem("pos_transactions");
  if (legacyTransactions) {
    localStorage.removeItem("pos_transactions");
  }
}

