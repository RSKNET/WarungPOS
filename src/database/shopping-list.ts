import {
  ShoppingCategory,
  ShoppingItem,
  ArchivedShoppingItem,
  ShoppingArchiveByCategory,
  ArchivedItemsByDate,
} from "@/types/shopping-list";
import { generateId } from "./utils";

const SHOPPING_CATEGORIES_KEY = "db_shopping_categories";
const SHOPPING_ITEMS_KEY = "db_shopping_items";
const SHOPPING_ARCHIVE_KEY = "db_shopping_archive";
const SHOPPING_LAST_CHECK_KEY = "db_shopping_last_check_date";

const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export function getShoppingCategories(): ShoppingCategory[] {
  try {
    const data = localStorage.getItem(SHOPPING_CATEGORIES_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function createShoppingCategory(name: string): ShoppingCategory {
  const categories = getShoppingCategories();
  const newCategory: ShoppingCategory = {
    id: generateId(),
    name,
    createdAt: new Date().toISOString(),
  };
  categories.push(newCategory);
  localStorage.setItem(SHOPPING_CATEGORIES_KEY, JSON.stringify(categories));
  return newCategory;
}

export function deleteShoppingCategory(id: string): void {
  const categories = getShoppingCategories().filter((c) => c.id !== id);
  localStorage.setItem(SHOPPING_CATEGORIES_KEY, JSON.stringify(categories));
  const items = getShoppingItems().filter((i) => i.categoryId !== id);
  localStorage.setItem(SHOPPING_ITEMS_KEY, JSON.stringify(items));
}

export function getShoppingItems(): ShoppingItem[] {
  try {
    const data = localStorage.getItem(SHOPPING_ITEMS_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function createShoppingItem(
  item: Omit<ShoppingItem, "id" | "createdAt" | "isPurchased">,
): ShoppingItem {
  const items = getShoppingItems();
  const newItem: ShoppingItem = {
    ...item,
    id: generateId(),
    isPurchased: false,
    createdAt: new Date().toISOString(),
  };
  items.push(newItem);
  localStorage.setItem(SHOPPING_ITEMS_KEY, JSON.stringify(items));
  return newItem;
}

export function updateShoppingItem(
  id: string,
  data: Partial<ShoppingItem>,
): void {
  const items = getShoppingItems().map((item) =>
    item.id === id ? { ...item, ...data } : item,
  );
  localStorage.setItem(SHOPPING_ITEMS_KEY, JSON.stringify(items));
}

export function deleteShoppingItem(id: string): void {
  const items = getShoppingItems().filter((i) => i.id !== id);
  localStorage.setItem(SHOPPING_ITEMS_KEY, JSON.stringify(items));
}

export function toggleShoppingItemPurchased(id: string): void {
  const items = getShoppingItems().map((item) =>
    item.id === id ? { ...item, isPurchased: !item.isPurchased } : item,
  );
  localStorage.setItem(SHOPPING_ITEMS_KEY, JSON.stringify(items));
}

export function clearPurchasedItems(): void {
  const items = getShoppingItems().filter((i) => !i.isPurchased);
  localStorage.setItem(SHOPPING_ITEMS_KEY, JSON.stringify(items));
}

export function getArchivedItems(): ArchivedShoppingItem[] {
  try {
    const data = localStorage.getItem(SHOPPING_ARCHIVE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function archivePurchasedItems(): number {
  const items = getShoppingItems();
  const purchasedItems = items.filter((i) => i.isPurchased);

  if (purchasedItems.length === 0) return 0;

  const archived = getArchivedItems();
  const now = new Date().toISOString();

  const archivedItems: ArchivedShoppingItem[] = purchasedItems.map((item) => ({
    ...item,
    archivedAt: now,
  }));

  localStorage.setItem(
    SHOPPING_ARCHIVE_KEY,
    JSON.stringify([...archived, ...archivedItems]),
  );

  const remainingItems = items.filter((i) => !i.isPurchased);
  localStorage.setItem(SHOPPING_ITEMS_KEY, JSON.stringify(remainingItems));

  return purchasedItems.length;
}

export function deleteArchivedItemsByDate(date: string): void {
  const archived = getArchivedItems();
  const filtered = archived.filter((item) => {
    const itemDate = new Date(item.archivedAt).toISOString().split("T")[0];
    return itemDate !== date;
  });
  localStorage.setItem(SHOPPING_ARCHIVE_KEY, JSON.stringify(filtered));
}

export function clearAllArchived(): void {
  localStorage.setItem(SHOPPING_ARCHIVE_KEY, JSON.stringify([]));
}

export function getLastCheckDate(): string | null {
  return localStorage.getItem(SHOPPING_LAST_CHECK_KEY);
}

export function setLastCheckDate(date: string): void {
  localStorage.setItem(SHOPPING_LAST_CHECK_KEY, date);
}

export function checkAndAutoArchive(): number {
  const today = new Date().toISOString().split("T")[0];
  const lastCheck = getLastCheckDate();

  if (lastCheck !== today) {
    const count = archivePurchasedItems();
    setLastCheckDate(today);
    return count;
  }

  return 0;
}

export function toggleAllItemsInCategory(
  categoryId: string,
  purchased: boolean,
): void {
  const items = getShoppingItems().map((item) =>
    item.categoryId === categoryId ? { ...item, isPurchased: purchased } : item,
  );
  localStorage.setItem(SHOPPING_ITEMS_KEY, JSON.stringify(items));
}

export function getArchivedItemsByCategory(): ShoppingArchiveByCategory[] {
  const archived = getArchivedItems();
  const categoryMap = new Map<string, Map<string, ArchivedShoppingItem[]>>();

  archived.forEach((item) => {
    if (!categoryMap.has(item.categoryId)) {
      categoryMap.set(item.categoryId, new Map());
    }

    const categoryDates = categoryMap.get(item.categoryId)!;
    const date = new Date(item.archivedAt);
    const dateKey = date.toISOString().split("T")[0];

    if (!categoryDates.has(dateKey)) {
      categoryDates.set(dateKey, []);
    }
    categoryDates.get(dateKey)!.push(item);
  });

  const result: ShoppingArchiveByCategory[] = [];

  categoryMap.forEach((dateGroups, categoryId) => {
    const dateGroupsArray: ArchivedItemsByDate[] = [];
    let totalItems = 0;

    dateGroups.forEach((items, dateKey) => {
      const date = new Date(dateKey + "T00:00:00");
      const dayName = DAY_NAMES[date.getDay()];
      const displayDate = `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;

      dateGroupsArray.push({
        date: dateKey,
        dayName,
        displayDate,
        items: items.sort(
          (a, b) =>
            new Date(b.archivedAt).getTime() - new Date(a.archivedAt).getTime(),
        ),
      });
      totalItems += items.length;
    });

    dateGroupsArray.sort((a, b) => b.date.localeCompare(a.date));

    const firstItem = dateGroupsArray[0]?.items[0];
    if (firstItem) {
      result.push({
        categoryId,
        categoryName: firstItem.categoryName,
        dateGroups: dateGroupsArray,
        totalItems,
      });
    }
  });

  return result.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

