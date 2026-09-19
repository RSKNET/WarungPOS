import { MarkupRule } from "@/types/markup";
import { roundToThousand } from "@/lib/format";

const STORAGE_KEY = "warungpos_markup_rules";

export function getMarkupRules(): MarkupRule[] {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return [];

  const rules = JSON.parse(data) as MarkupRule[];
  return rules.map((rule) => ({
    ...rule,
    markupType: rule.markupType || "percent",
    retailMarkupFixed: rule.retailMarkupFixed || 0,
    wholesaleMarkupFixed: rule.wholesaleMarkupFixed || 0,
  }));
}

export function saveMarkupRules(rules: MarkupRule[]): void {
  const sorted = [...rules].sort((a, b) => a.minPrice - b.minPrice);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
}

export function addMarkupRule(
  data: Omit<MarkupRule, "id" | "createdAt" | "updatedAt">,
): MarkupRule {
  const rules = getMarkupRules();
  const now = new Date().toISOString();

  const newRule: MarkupRule = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  rules.push(newRule);
  saveMarkupRules(rules);
  return newRule;
}

export function updateMarkupRule(
  id: string,
  data: Partial<MarkupRule>,
): MarkupRule | null {
  const rules = getMarkupRules();
  const index = rules.findIndex((r) => r.id === id);

  if (index === -1) return null;

  rules[index] = {
    ...rules[index],
    ...data,
    updatedAt: new Date().toISOString(),
  };

  saveMarkupRules(rules);
  return rules[index];
}

export function deleteMarkupRule(id: string): boolean {
  const rules = getMarkupRules();
  const filtered = rules.filter((r) => r.id !== id);

  if (filtered.length === rules.length) return false;

  saveMarkupRules(filtered);
  return true;
}

export function getMarkupForPrice(
  costPrice: number,
  categoryId?: string | null,
): {
  type: "percent" | "fixed";
  retailPercent: number;
  wholesalePercent: number;
  retailFixed: number;
  wholesaleFixed: number;
} | null {
  const rules = getMarkupRules();

  if (categoryId) {
    for (const rule of rules) {
      if (rule.categoryId !== categoryId) continue;

      const minMatch = costPrice >= rule.minPrice;
      const maxMatch = rule.maxPrice === null || costPrice <= rule.maxPrice;

      if (minMatch && maxMatch) {
        return {
          type: rule.markupType || "percent",
          retailPercent: rule.retailMarkupPercent,
          wholesalePercent: rule.wholesaleMarkupPercent,
          retailFixed: rule.retailMarkupFixed || 0,
          wholesaleFixed: rule.wholesaleMarkupFixed || 0,
        };
      }
    }
  }

  for (const rule of rules) {
    if (rule.categoryId !== null) continue;

    const minMatch = costPrice >= rule.minPrice;
    const maxMatch = rule.maxPrice === null || costPrice <= rule.maxPrice;

    if (minMatch && maxMatch) {
      return {
        type: rule.markupType || "percent",
        retailPercent: rule.retailMarkupPercent,
        wholesalePercent: rule.wholesaleMarkupPercent,
        retailFixed: rule.retailMarkupFixed || 0,
        wholesaleFixed: rule.wholesaleMarkupFixed || 0,
      };
    }
  }

  return null;
}

export function calculateSellingPrices(
  costPrice: number,
  categoryId?: string | null,
): { retailPrice: number; wholesalePrice: number } | null {
  const markup = getMarkupForPrice(costPrice, categoryId);

  if (!markup) return null;

  let rawRetail: number;
  let rawWholesale: number;

  if (markup.type === "fixed") {
    rawRetail = costPrice + markup.retailFixed;
    rawWholesale = costPrice + markup.wholesaleFixed;
  } else {
    rawRetail = costPrice * (1 + markup.retailPercent / 100);
    rawWholesale = costPrice * (1 + markup.wholesalePercent / 100);
  }

  return {
    retailPrice: roundToThousand(rawRetail),
    wholesalePrice: roundToThousand(rawWholesale),
  };
}

