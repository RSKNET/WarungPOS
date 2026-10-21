import { CreatableSuggestInput } from "@/components/CreatableSuggestInput";
import { useCategoryStore } from "@/stores";

export interface CategorySelectProps {
  value: string;
  categories: string[];
  onValueChange: (value: string) => void;
  onCategoriesChanged?: () => void;
}

function generatePrefix(name: string): string {
  const clean = name.replace(/[^a-zA-Z]/g, "").toUpperCase();
  if (clean.length <= 3) return clean;
  const consonants = clean.replace(/[AIUEO\s]/g, "");
  if (consonants.length >= 3) return consonants.substring(0, 3);
  return clean.substring(0, 3);
}

export function CategorySelect({
  value,
  categories,
  onValueChange,
  onCategoriesChanged,
}: CategorySelectProps) {
  const { addCategory: storeAddCategory } = useCategoryStore();

  return (
    <CreatableSuggestInput
      value={value}
      items={categories}
      placeholder="Ketik atau cari kategori..."
      onValueChange={onValueChange}
      onCreateItem={(name) => {
        const prefix = generatePrefix(name);
        const result = storeAddCategory(name, prefix);
        if (result) {
          onCategoriesChanged?.();
          return result.name;
        }
        return name;
      }}
    />
  );
}
