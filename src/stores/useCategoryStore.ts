import { create } from "zustand";
import {
  Category,
  getCategories,
  addCategory as dbAddCategory,
  updateCategory as dbUpdateCategory,
  deleteCategory as dbDeleteCategory,
} from "@/database/categories";

interface CategoryState {
  categories: Category[];
  loadCategories: () => void;
  addCategory: (name: string, prefix: string) => Category | null;
  updateCategory: (id: string, name: string, prefix: string) => Category | null;
  deleteCategory: (id: string) => boolean;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: getCategories(),

  loadCategories: () => {
    set({ categories: getCategories() });
  },

  addCategory: (name, prefix) => {
    const result = dbAddCategory(name, prefix);
    if (result) {
      set({ categories: getCategories() });
    }
    return result;
  },

  updateCategory: (id, name, prefix) => {
    const result = dbUpdateCategory(id, name, prefix);
    if (result) {
      set({ categories: getCategories() });
    }
    return result;
  },

  deleteCategory: (id) => {
    const ok = dbDeleteCategory(id);
    if (ok) {
      set({ categories: getCategories() });
    }
    return ok;
  },
}));

