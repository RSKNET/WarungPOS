export type MarkupType = "percent" | "fixed";

export interface MarkupRule {
  id: string;
  minPrice: number;
  maxPrice: number | null;
  markupType: MarkupType;
  retailMarkupPercent: number;
  wholesaleMarkupPercent: number;
  retailMarkupFixed: number;
  wholesaleMarkupFixed: number;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MarkupRuleFormData = Omit<
  MarkupRule,
  "id" | "createdAt" | "updatedAt"
>;

