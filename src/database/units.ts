import { Unit } from "@/types/unit";
import { generateId, getStorageItem } from "./utils";
import { getVariants } from "./variants";

const STORAGE_KEY = "db_units";

function initUnits(): Unit[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    return JSON.parse(stored);
  }

  const units: Unit[] = [];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
  return units;
}

export function getUnits(): Unit[] {
  return initUnits().sort((a, b) => a.createdAt - b.createdAt);
}

export function getUnitNames(): string[] {
  return getUnits().map((u) => u.name).sort((a, b) => a.localeCompare(b, "id", { sensitivity: "base" }));
}

export function addUnit(name: string): Unit | null {
  const units = getUnits();

  if (units.some((u) => u.name.toLowerCase() === name.toLowerCase())) {
    return null;
  }

  const newUnit: Unit = {
    id: generateId(),
    name: name.trim(),
    createdAt: Date.now(),
  };

  units.push(newUnit);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
  return newUnit;
}

export function updateUnit(id: string, name: string): Unit | null {
  const units = getUnits();
  const index = units.findIndex((u) => u.id === id);

  if (index === -1) return null;

  if (
    units.some(
      (u) => u.id !== id && u.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    return null;
  }

  units[index] = {
    ...units[index],
    name: name.trim(),
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(units));
  return units[index];
}

export function deleteUnit(id: string): boolean {
  const units = getUnits();
  const filtered = units.filter((u) => u.id !== id);

  if (filtered.length === units.length) return false;
  if (filtered.length === 0) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

export function isUnitInUse(unitName: string): boolean {
  const variants = getVariants();
  if (variants.some((v) => v.name.toLowerCase() === unitName.toLowerCase())) {
    return true;
  }

  const shoppingItems = getStorageItem<{ unit: string }[]>("db_shopping_items", []);
  return shoppingItems.some((i) => i.unit?.toLowerCase() === unitName.toLowerCase());
}

