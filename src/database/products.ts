import { Product } from "@/types/pos";
import { ProductRecord } from "./types";
import { generateId, toUnix, fromUnix } from "./utils";
import { getDB } from "./db";
import {
  addVariantAsync,
  clearVariantsCache,
  waitForVariants,
  refreshVariants,
} from "./variants";

function toRecord(p: Product): ProductRecord {
  return {
    i: p.id,
    n: p.name,
    c: p.category,
    u: "",
    ca:
      typeof p.createdAt === "string"
        ? toUnix(p.createdAt)
        : (p.createdAt as unknown as number),
    ua:
      typeof p.updatedAt === "string"
        ? toUnix(p.updatedAt)
        : (p.updatedAt as unknown as number),
  };
}

function fromRecord(r: ProductRecord): Product {
  return {
    id: r.i,
    name: r.n,
    category: r.c,
    createdAt: fromUnix(r.ca),
    updatedAt: fromUnix(r.ua),
  };
}

export async function getProductsAsync(): Promise<Product[]> {
  const db = await getDB();
  const records = await db.getAll("products");
  return records.map(fromRecord);
}

export async function addProductAsync(
  product: Omit<Product, "id" | "createdAt" | "updatedAt">,
): Promise<Product> {
  const db = await getDB();
  const now = toUnix(new Date());
  const newRecord: ProductRecord = {
    i: generateId(),
    n: product.name,
    c: product.category,
    u: "",
    ca: now,
    ua: now,
  };
  await db.put("products", newRecord);
  return fromRecord(newRecord);
}

export async function updateProductAsync(
  id: string,
  data: Partial<Product>,
): Promise<Product | null> {
  const db = await getDB();
  const record = await db.get("products", id);
  if (!record) return null;

  const updated: ProductRecord = {
    ...record,
    ...(data.name !== undefined && { n: data.name }),
    ...(data.category !== undefined && { c: data.category }),
    ua: toUnix(new Date()),
  };

  await db.put("products", updated);
  return fromRecord(updated);
}

export async function deleteProductAsync(id: string): Promise<boolean> {
  const db = await getDB();
  const record = await db.get("products", id);
  if (!record) return false;
  await db.delete("products", id);
  return true;
}

export async function migrateProductsToVariants(): Promise<void> {
  const migrationKey = "variants_migrated_v1";
  if (localStorage.getItem(migrationKey)) return;

  const db = await getDB();
  const allProducts = await db.getAll("products");
  const allVariants = await db.getAll("variants");
  const productIdsWithVariants = new Set(allVariants.map((v) => v.pi));
  const now = Date.now();

  let migrated = 0;

  for (const rec of allProducts) {
    if (productIdsWithVariants.has(rec.i)) continue;

    const hasSku = rec.s !== undefined;
    const hasPrice = rec.rp !== undefined;

    if (!hasSku && !hasPrice) continue;

    const variantRecord = {
      i: generateId(),
      pi: rec.i,
      n: rec.u || "Pcs",
      s: rec.s || "",
      cp: rec.cp || 0,
      rp: rec.rp || 0,
      wp: rec.wp || 0,
      wq: rec.wq || 1,
      st: rec.st || 0,
      ca: rec.ca || now,
      ua: rec.ua || now,
    };

    await db.put("variants", variantRecord);
    migrated++;
  }

  if (migrated > 0) {
    await clearVariantsCache();
  }

  localStorage.setItem(migrationKey, "1");
}

let cachedProducts: Product[] = [];
let cacheInitialized = false;
let cachePromise: Promise<void> | null = null;

export function clearProductsCache(): void {
  cachedProducts = [];
  cacheInitialized = false;
  cachePromise = null;
}

async function ensureCache(): Promise<void> {
  if (cacheInitialized) return;
  if (cachePromise) return cachePromise;

  cachePromise = (async () => {
    try {
      await migrateProductsToVariants();
      const timeoutPromise = new Promise<Product[]>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), 5000),
      );
      cachedProducts = await Promise.race([getProductsAsync(), timeoutPromise]);
    } catch {
      cachedProducts = [];
    }
    cacheInitialized = true;
  })();

  return cachePromise;
}

export async function waitForProducts(): Promise<Product[]> {
  try {
    await ensureCache();
  } catch {
    cacheInitialized = true;
  }
  return cachedProducts;
}

export function getProducts(): Product[] {
  return cachedProducts;
}

export function isProductsCacheReady(): boolean {
  return cacheInitialized;
}

export async function refreshProducts(): Promise<Product[]> {
  await migrateProductsToVariants();
  cachedProducts = await getProductsAsync();
  await refreshVariants();
  return cachedProducts;
}

export function saveProducts(products: Product[]): void {
  cachedProducts = products;
  (async () => {
    const db = await getDB();
    const tx = db.transaction("products", "readwrite");
    await tx.store.clear();
    for (const product of products) {
      await tx.store.put(toRecord(product));
    }
    await tx.done;
  })();
}

export function addProduct(
  product: Omit<Product, "id" | "createdAt" | "updatedAt">,
): Product {
  const now = new Date().toISOString();
  const id = generateId();
  const newProduct: Product = { ...product, id, createdAt: now, updatedAt: now };
  cachedProducts = [...cachedProducts, newProduct];
  (async () => {
    const db = await getDB();
    await db.put("products", toRecord(newProduct));
  })();
  return newProduct;
}

export function updateProduct(
  id: string,
  data: Partial<Product>,
): Product | null {
  const index = cachedProducts.findIndex((p) => p.id === id);
  if (index === -1) return null;
  const updated = { ...cachedProducts[index], ...data, updatedAt: new Date().toISOString() };
  cachedProducts = cachedProducts.map((p) => (p.id === id ? updated : p));
  updateProductAsync(id, data);
  return updated;
}

export function deleteProduct(id: string): boolean {
  const exists = cachedProducts.some((p) => p.id === id);
  if (!exists) return false;
  cachedProducts = cachedProducts.filter((p) => p.id !== id);
  deleteProductAsync(id);
  return true;
}

export function updateStock(_id: string, _quantity: number): boolean {
  return false;
}

export async function updateStockAsync(
  _id: string,
  _quantity: number,
): Promise<boolean> {
  return false;
}

export function addProductAsync_compat(
  product: Omit<Product, "id" | "createdAt" | "updatedAt">,
): Promise<Product> {
  return addProductAsync(product);
}

export { waitForVariants, addVariantAsync };

ensureCache();

