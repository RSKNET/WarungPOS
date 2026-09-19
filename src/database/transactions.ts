import { Transaction, CartItem, ProductVariant } from "@/types/pos";
import { TransactionRecord, CartItemRecord } from "./types";
import { generateId, toUnix, fromUnix } from "./utils";
import { getDB } from "./db";
import { getProductsAsync } from "./products";
import { updateVariantStockAsync, getVariantsAsync } from "./variants";

function itemToRecord(item: CartItem): CartItemRecord {
  const price =
    item.priceType === "wholesale"
      ? item.variant.wholesalePrice
      : item.variant.retailPrice;
  return {
    pi: item.product.id,
    pn: item.product.name,
    pp: price,
    q: item.quantity,
    pt: item.priceType === "wholesale" ? 1 : 0,
    sb: item.subtotal,
    vi: item.variant.id,
    vn: item.variant.name,
    vs: item.variant.sku,
  };
}

async function itemFromRecord(r: CartItemRecord): Promise<CartItem> {
  const products = await getProductsAsync();
  const product = products.find((p) => p.id === r.pi);

  let variant: ProductVariant;

  if (r.vi) {

    const variants = await getVariantsAsync();
    const found = variants.find((v) => v.id === r.vi);
    if (found) {
      variant = found;
    } else {

      variant = makeGhostVariant(r);
    }
  } else {

    variant = makeGhostVariant(r);
  }

  return {
    product: product || {
      id: r.pi,
      name: r.pn,
      category: "",
      createdAt: "",
      updatedAt: "",
    },
    variant,
    quantity: r.q,
    priceType: r.pt === 1 ? "wholesale" : "retail",
    subtotal: r.sb,
  };
}

function makeGhostVariant(r: CartItemRecord): ProductVariant {
  const primarySku = r.vs || "";
  return {
    id: r.vi || `ghost_${r.pi}`,
    productId: r.pi,
    name: r.vn || "Pcs",
    sku: primarySku,
    skus: primarySku ? [primarySku] : [],
    costPrice: 0,
    retailPrice: r.pt === 0 ? r.pp : 0,
    wholesalePrice: r.pt === 1 ? r.pp : 0,
    wholesaleMinQty: 1,
    stock: 0,
    createdAt: "",
    updatedAt: "",
  };
}

async function fromRecord(r: TransactionRecord): Promise<Transaction> {
  const items = await Promise.all(r.it.map(itemFromRecord));
  return {
    id: r.i,
    items,
    total: r.t,
    payment: r.p,
    change: r.ch,
    createdAt: fromUnix(r.ca),
    customerName: r.cn,
    paymentType: r.pt === 1 ? "debt" : "cash",
    customerId: r.ci,
  };
}

export async function getTransactionsAsync(): Promise<Transaction[]> {
  const db = await getDB();
  const records = await db.getAll("transactions");
  records.sort((a, b) => b.ca - a.ca);
  return Promise.all(records.map(fromRecord));
}

export async function saveTransactionAsync(
  transaction: Omit<Transaction, "id" | "createdAt">,
): Promise<Transaction> {
  const db = await getDB();
  const now = toUnix(new Date());

  const newRecord: TransactionRecord = {
    i: generateId(),
    it: transaction.items.map(itemToRecord),
    t: transaction.total,
    p: transaction.payment,
    ch: transaction.change,
    ca: now,
    cn: transaction.customerName || undefined,
    pt: transaction.paymentType === "debt" ? 1 : 0,
    ci: transaction.customerId,
  };

  await db.put("transactions", newRecord);

  for (const item of transaction.items) {
    if (item.variant.id && !item.variant.id.startsWith("ghost_")) {
      await updateVariantStockAsync(item.variant.id, -item.quantity);
    }
  }

  return fromRecord(newRecord);
}

export async function getTodayTransactionsAsync(): Promise<Transaction[]> {
  const transactions = await getTransactionsAsync();
  const today = new Date().toDateString();
  return transactions.filter(
    (t) => new Date(t.createdAt).toDateString() === today,
  );
}

export async function getTodayRevenueAsync(): Promise<number> {
  const todayTx = await getTodayTransactionsAsync();
  return todayTx.reduce((sum, t) => sum + t.total, 0);
}

let cachedTransactions: Transaction[] = [];
let txCacheInitialized = false;
let txCachePromise: Promise<void> | null = null;

export function clearTransactionsCache(): void {
  cachedTransactions = [];
  txCacheInitialized = false;
  txCachePromise = null;
}

async function ensureTxCache(): Promise<void> {
  if (txCacheInitialized) return;
  if (txCachePromise) return txCachePromise;

  txCachePromise = (async () => {
    try {
      const timeoutPromise = new Promise<Transaction[]>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000),
      );
      cachedTransactions = await Promise.race([
        getTransactionsAsync(),
        timeoutPromise,
      ]);
    } catch {
      cachedTransactions = [];
    }
    txCacheInitialized = true;
  })();

  return txCachePromise;
}

export async function waitForTransactions(): Promise<Transaction[]> {
  try {
    await ensureTxCache();
  } catch {
    txCacheInitialized = true;
  }
  return cachedTransactions;
}

export function getTransactions(): Transaction[] {
  ensureTxCache();
  return cachedTransactions;
}

export function saveTransaction(
  transaction: Omit<Transaction, "id" | "createdAt">,
): Transaction {
  const now = new Date().toISOString();
  const newTransaction: Transaction = {
    ...transaction,
    id: generateId(),
    createdAt: now,
    paymentType: transaction.paymentType || "cash",
  };
  cachedTransactions.unshift(newTransaction);

  saveTransactionAsync(transaction).then((t) => {
    const idx = cachedTransactions.findIndex(
      (ct) => ct.id === newTransaction.id,
    );
    if (idx !== -1) cachedTransactions[idx] = t;
  });

  return newTransaction;
}

export function getTodayTransactions(): Transaction[] {
  const today = new Date().toDateString();
  return cachedTransactions.filter(
    (t) => new Date(t.createdAt).toDateString() === today,
  );
}

export function getTodayRevenue(): number {
  return getTodayTransactions().reduce((sum, t) => sum + t.total, 0);
}

ensureTxCache();

