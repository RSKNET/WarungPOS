import { ProductVariant } from "@/types/pos";
import { VariantRecord } from "./types";
import { generateId, toUnix, fromUnix } from "./utils";
import { getDB } from "./db";

function toRecord(v: ProductVariant): VariantRecord {
  return {
    i: v.id,
    pi: v.productId,
    n: v.name,
    s: v.sku,
    ss: [v.sku],
    cp: v.costPrice || 0,
    rp: v.retailPrice,
    wp: v.wholesalePrice,
    wq: v.wholesaleMinQty,
    st: v.stock,
    ca:
      typeof v.createdAt === "string"
        ? toUnix(v.createdAt)
        : (v.createdAt as unknown as number),
    ua:
      typeof v.updatedAt === "string"
        ? toUnix(v.updatedAt)
        : (v.updatedAt as unknown as number),
  };
}

function fromRecord(r: VariantRecord): ProductVariant {
  return {
    id: r.i,
    productId: r.pi,
    name: r.n,
    sku: r.s || "",
    skus: r.ss || (r.s ? [r.s] : []),
    costPrice: r.cp || 0,
    retailPrice: r.rp,
    wholesalePrice: r.wp,
    wholesaleMinQty: r.wq,
    stock: r.st || 0,
    createdAt: fromUnix(r.ca),
    updatedAt: fromUnix(r.ua),
  };
}

export async function getVariantsAsync(): Promise<ProductVariant[]> {
  const db = await getDB();
  const records = await db.getAll("variants");
  return records.map(fromRecord);
}

export async function getVariantsByProductIdAsync(
  productId: string,
): Promise<ProductVariant[]> {
  const db = await getDB();
  const records = await db.getAllFromIndex("variants", "by-productId", productId);
  return records.map(fromRecord);
}

export async function getVariantBySkuAsync(
  sku: string,
): Promise<ProductVariant | null> {
  const db = await getDB();
  const record = await db.getFromIndex("variants", "by-sku", sku);
  if (record) return fromRecord(record);

  const all = await db.getAll("variants");
  const found = all.find((r) => r.ss && r.ss.includes(sku));
  return found ? fromRecord(found) : null;
}

export async function addVariantAsync(
  variant: Omit<ProductVariant, "id" | "createdAt" | "updatedAt" | "skus">,
): Promise<ProductVariant> {
  const db = await getDB();
  const now = toUnix(new Date());
  const newRecord: VariantRecord = {
    i: generateId(),
    pi: variant.productId,
    n: variant.name,
    s: variant.sku,
    ss: [variant.sku],
    cp: variant.costPrice || 0,
    rp: variant.retailPrice,
    wp: variant.wholesalePrice,
    wq: variant.wholesaleMinQty,
    st: variant.stock,
    ca: now,
    ua: now,
  };
  await db.put("variants", newRecord);
  return fromRecord(newRecord);
}

export async function updateVariantAsync(
  id: string,
  data: Partial<ProductVariant>,
): Promise<ProductVariant | null> {
  const db = await getDB();
  const record = await db.get("variants", id);
  if (!record) return null;

  const updated: VariantRecord = {
    ...record,
    ...(data.name !== undefined && { n: data.name }),
    s: data.sku !== undefined ? data.sku : record.s,
    ss: data.sku !== undefined ? [data.sku] : (record.ss || [record.s]),
    ...(data.costPrice !== undefined && { cp: data.costPrice }),
    ...(data.retailPrice !== undefined && { rp: data.retailPrice }),
    ...(data.wholesalePrice !== undefined && { wp: data.wholesalePrice }),
    ...(data.wholesaleMinQty !== undefined && { wq: data.wholesaleMinQty }),
    ...(data.stock !== undefined && { st: data.stock }),
    ua: toUnix(new Date()),
  };

  await db.put("variants", updated);
  return fromRecord(updated);
}

export async function updateVariantStockAsync(
  id: string,
  quantity: number,
): Promise<boolean> {
  const db = await getDB();
  const record = await db.get("variants", id);
  if (!record) return false;

  record.st += quantity;
  record.ua = toUnix(new Date());
  await db.put("variants", record);
  return true;
}

export async function deleteVariantAsync(id: string): Promise<boolean> {
  const db = await getDB();
  const record = await db.get("variants", id);
  if (!record) return false;
  await db.delete("variants", id);
  return true;
}

export async function deleteVariantsByProductIdAsync(
  productId: string,
): Promise<void> {
  const db = await getDB();
  const records = await db.getAllFromIndex("variants", "by-productId", productId);
  const tx = db.transaction("variants", "readwrite");
  for (const r of records) {
    await tx.store.delete(r.i);
  }
  await tx.done;
}

let cachedVariants: ProductVariant[] = [];
let cacheInitialized = false;
let cachePromise: Promise<void> | null = null;

export function clearVariantsCache(): void {
  cachedVariants = [];
  cacheInitialized = false;
  cachePromise = null;
}

async function ensureCache(): Promise<void> {
  if (cacheInitialized) return;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    try {
      cachedVariants = await getVariantsAsync();
    } catch {
      cachedVariants = [];
    }
    cacheInitialized = true;
  })();

  return cachePromise;
}

export async function waitForVariants(): Promise<ProductVariant[]> {
  try {
    await ensureCache();
  } catch {
    cacheInitialized = true;
  }
  return cachedVariants;
}

export function getVariants(): ProductVariant[] {
  return cachedVariants;
}

export function getVariantsByProductId(productId: string): ProductVariant[] {
  return cachedVariants.filter((v) => v.productId === productId);
}

export function getVariantBySku(sku: string): ProductVariant | null {
  return cachedVariants.find((v) => v.sku === sku || (v.skus && v.skus.includes(sku))) || null;
}

export async function refreshVariants(): Promise<ProductVariant[]> {
  cachedVariants = await getVariantsAsync();
  return cachedVariants;
}

export function addVariant(
  variant: Omit<ProductVariant, "id" | "createdAt" | "updatedAt" | "skus">,
): ProductVariant {
  const now = new Date().toISOString();
  const id = generateId();
  const newVariant: ProductVariant = {
    ...variant,
    id,
    skus: [variant.sku],
    createdAt: now,
    updatedAt: now,
  };
  cachedVariants = [...cachedVariants, newVariant];
  (async () => {
    const db = await getDB();
    await db.put("variants", toRecord(newVariant));
  })();
  return newVariant;
}

export function updateVariant(
  id: string,
  data: Partial<ProductVariant>,
): ProductVariant | null {
  const index = cachedVariants.findIndex((v) => v.id === id);
  if (index === -1) return null;
  const oldVariant = cachedVariants[index];
  const updated = {
    ...oldVariant,
    ...data,
    skus: data.sku !== undefined ? [data.sku] : oldVariant.skus,
    updatedAt: new Date().toISOString(),
  };
  cachedVariants = cachedVariants.map((v) => (v.id === id ? updated : v));
  updateVariantAsync(id, data);
  return updated;
}

export function deleteVariant(id: string): boolean {
  const exists = cachedVariants.some((v) => v.id === id);
  if (!exists) return false;
  cachedVariants = cachedVariants.filter((v) => v.id !== id);
  deleteVariantAsync(id);
  return true;
}

export function deleteVariantsByProductId(productId: string): void {
  cachedVariants = cachedVariants.filter((v) => v.productId !== productId);
  deleteVariantsByProductIdAsync(productId);
}

export function updateVariantStock(id: string, quantity: number): boolean {
  const index = cachedVariants.findIndex((v) => v.id === id);
  if (index === -1) return false;
  cachedVariants = cachedVariants.map((v) =>
    v.id === id
      ? { ...v, stock: v.stock + quantity, updatedAt: new Date().toISOString() }
      : v,
  );
  updateVariantStockAsync(id, quantity);
  return true;
}

export function saveVariants(variants: ProductVariant[]): void {
  cachedVariants = variants;
  (async () => {
    const db = await getDB();
    const tx = db.transaction("variants", "readwrite");
    await tx.store.clear();
    for (const v of variants) {
      await tx.store.put(toRecord(v));
    }
    await tx.done;
  })();
}

ensureCache();

