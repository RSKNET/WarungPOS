import { getVariants, getCategoryPrefixes } from "@/database";

export function generateSKU(category: string): string {
  const categoryPrefixes = getCategoryPrefixes();
  const prefix = categoryPrefixes[category] || "PRD";
  const variants = getVariants();

  const existingNums = variants
    .map((v) => v.sku)
    .filter((s): s is string => typeof s === "string" && s.startsWith(prefix))
    .map((s) => {
      const num = parseInt(s.replace(prefix, ""), 10);
      return isNaN(num) ? 0 : num;
    });

  const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
  const nextNum = (maxNum + 1).toString().padStart(4, "0");

  return `${prefix}${nextNum}`;
}

export function generateSKUWithExisting(
  category: string,
  existingSKUs: string[],
): string {
  const categoryPrefixes = getCategoryPrefixes();
  const prefix = categoryPrefixes[category] || "PRD";
  const variants = getVariants();

  const allSkus = [
    ...variants
      .map((v) => v.sku)
      .filter((s): s is string => typeof s === "string" && s.startsWith(prefix)),
    ...existingSKUs.filter((sku) => typeof sku === "string" && sku.startsWith(prefix)),
  ];

  const existingNums = allSkus.map((sku) => {
    const num = parseInt(sku.replace(prefix, ""), 10);
    return isNaN(num) ? 0 : num;
  });

  const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : 0;
  const nextNum = (maxNum + 1).toString().padStart(4, "0");

  return `${prefix}${nextNum}`;
}

