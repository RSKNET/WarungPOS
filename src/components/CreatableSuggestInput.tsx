import { useState, useEffect } from "react";
import { toTitleCase } from "@/lib/text";
import { SuggestInput, SuggestOption } from "@/components/SuggestInput";

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

export { UnitSelect } from "./UnitSelect";
export type { UnitSelectProps } from "./UnitSelect";
export { CategorySelect } from "./CategorySelect";
export type { CategorySelectProps } from "./CategorySelect";
