import { create } from "zustand";
import { Product, ProductVariant } from "@/types/pos";
import {
  getProducts,
  getVariants,
  addProduct as dbAddProduct,
  updateProduct as dbUpdateProduct,
  deleteProduct as dbDeleteProduct,
  addVariant as dbAddVariant,
  updateVariant as dbUpdateVariant,
  deleteVariant as dbDeleteVariant,
  deleteVariantsByProductId as dbDeleteVariantsByProductId,
} from "@/database";

interface ProductState {
  products: Product[];
  variants: ProductVariant[];
  isLoading: boolean;
  loadData: () => void;
  addProduct: (productData: Omit<Product, "id" | "createdAt" | "updatedAt">) => Product;
  updateProduct: (id: string, updates: Partial<Product>) => Product | null;
  deleteProduct: (id: string) => boolean;
  addVariant: (variant: Omit<ProductVariant, "id">) => ProductVariant;
  updateVariant: (id: string, updates: Partial<ProductVariant>) => ProductVariant | null;
  deleteVariant: (id: string) => boolean;
}

export const useProductStore = create<ProductState>((set) => ({
  products: getProducts(),
  variants: getVariants(),
  isLoading: false,

  loadData: () => {
    set({ products: getProducts(), variants: getVariants() });
  },

  addProduct: (productData) => {
    const result = dbAddProduct(productData);
    set({ products: getProducts(), variants: getVariants() });
    return result;
  },

  updateProduct: (id, updates) => {
    const updated = dbUpdateProduct(id, updates);
    if (updated) {
      set({ products: getProducts(), variants: getVariants() });
    }
    return updated;
  },

  deleteProduct: (id) => {
    const ok = dbDeleteProduct(id);
    if (ok) {
      dbDeleteVariantsByProductId(id);
      set({ products: getProducts(), variants: getVariants() });
    }
    return ok;
  },

  addVariant: (v) => {
    const result = dbAddVariant(v);
    set({ variants: getVariants() });
    return result;
  },

  updateVariant: (id, updates) => {
    const updated = dbUpdateVariant(id, updates);
    if (updated) {
      set({ variants: getVariants() });
    }
    return updated;
  },

  deleteVariant: (id) => {
    const ok = dbDeleteVariant(id);
    if (ok) {
      set({ variants: getVariants() });
    }
    return ok;
  },
}));

