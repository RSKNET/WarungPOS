import { useState, useEffect } from "react";
import { toTitleCase } from "@/lib/text";
import { SuggestInput, SuggestOption } from "@/components/SuggestInput";
import { useUnitStore, useCategoryStore } from "@/stores";

export interface CreatableSuggestInputProps {
  value: string;
  items: string[];
  placeholder?: string;
  className?: string;
  onValueChange: (value: string) => void;
  onCreateItem: (name: string) => Promise<string | null | undefined> | string | null | undefined;
}

export function CreatableSuggestInput({
  value,
  items,
  placeholder,
  className,
  onValueChange,
  onCreateItem,
}: CreatableSuggestInputProps) {
  const [search, setSearch] = useState(value);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const handleCreate = async (name: string) => {
    const titleCaseName = toTitleCase(name.trim());
    if (!titleCaseName) return;

    const exists = items.find(
      (item) => item.toLowerCase() === titleCaseName.toLowerCase(),
    );

    if (exists) {
      onValueChange(exists);
      setSearch(exists);
      return;
    }

    const created = await onCreateItem(titleCaseName);
    const resolvedName = created || titleCaseName;
    onValueChange(resolvedName);
    setSearch(resolvedName);
  };

  const options: SuggestOption[] = items.map((item) => ({
    id: item,
    label: item,
  }));

  const exactMatch = items.some(
    (item) => item.toLowerCase() === search.trim().toLowerCase(),
  );

  return (
    <SuggestInput
      value={search}
      options={options}
      placeholder={placeholder}
      className={className}
      onChange={(val) => {
        setSearch(val);
        onValueChange(val);
      }}
      onSelectOption={(opt) => {
        onValueChange(opt.label);
        setSearch(opt.label);
      }}
      onBlur={() => {
        const trimmed = search.trim();
        if (trimmed && !exactMatch) {
          handleCreate(trimmed);
        }
      }}
    />
  );
}

export interface UnitSelectProps {
  value: string;
  units: string[];
  onValueChange: (value: string) => void;
  onUnitsChanged?: () => void;
}

export function UnitSelect({
  value,
  units,
  onValueChange,
  onUnitsChanged,
}: UnitSelectProps) {
  const { addUnit: storeAddUnit } = useUnitStore();

  return (
    <CreatableSuggestInput
      value={value}
      items={units}
      placeholder="Pcs / Dus / Renceng..."
      onValueChange={onValueChange}
      onCreateItem={(name) => {
        const result = storeAddUnit(name);
        if (result) {
          onUnitsChanged?.();
          return result.name;
        }
        return name;
      }}
    />
  );
}

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
