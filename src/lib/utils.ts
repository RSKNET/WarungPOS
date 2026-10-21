import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function groupByEntity<T>(
  items: T[],
  getId: (item: T) => string,
  getName: (item: T) => string,
  getAmount: (item: T) => number
): { id: string; name: string; items: T[]; total: number }[] {
  const map = new Map<string, { id: string; name: string; items: T[]; total: number }>();

  for (const item of items) {
    const id = getId(item);
    let group = map.get(id);
    if (!group) {
      group = {
        id,
        name: getName(item),
        items: [],
        total: 0,
      };
      map.set(id, group);
    }
    group.items.push(item);
    group.total += getAmount(item);
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}


