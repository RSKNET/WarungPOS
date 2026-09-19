export function compareAlpha(a: string, b: string): number {
  return a.localeCompare(b, "id", { sensitivity: "base" });
}

export function sortAlpha<T>(items: T[], key: keyof T): T[] {
  return [...items].sort((a, b) =>
    compareAlpha(String(a[key]), String(b[key]))
  );
}

export function sortProducts<T extends { stock: number; name: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const stockDiff = a.stock - b.stock;
    if (stockDiff !== 0) return stockDiff;
    return compareAlpha(a.name, b.name);
  });
}
export function sortShoppingItems<T extends { isPurchased: boolean; productName: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.isPurchased !== b.isPurchased) return a.isPurchased ? 1 : -1;
    return compareAlpha(a.productName, b.productName);
  });
}

