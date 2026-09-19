export interface ShoppingCategory {
  id: string;
  name: string;
  createdAt: string;
}

export interface ShoppingItem {
  id: string;
  categoryId: string;
  categoryName: string;
  productName: string;
  brand: string;
  quantity: number;
  unit: string;
  isPurchased: boolean;
  photo?: string;
  createdAt: string;
}

export interface ArchivedShoppingItem extends ShoppingItem {
  archivedAt: string;
}

export interface ShoppingArchiveGroup {
  date: string;
  dayName: string;
  displayDate: string;
  items: ArchivedShoppingItem[];
}

export interface ArchivedItemsByDate {
  date: string;
  dayName: string;
  displayDate: string;
  items: ArchivedShoppingItem[];
}

export interface ShoppingArchiveByCategory {
  categoryId: string;
  categoryName: string;
  dateGroups: ArchivedItemsByDate[];
  totalItems: number;
}

