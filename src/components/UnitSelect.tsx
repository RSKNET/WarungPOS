import { useState, useEffect } from "react";
import { useUnitStore } from "@/stores";
import { toTitleCase } from "@/lib/text";
import { SuggestInput, SuggestOption } from "@/components/SuggestInput";

interface UnitSelectProps {
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
  const [search, setSearch] = useState(value);
  const { addUnit: storeAddUnit } = useUnitStore();

  useEffect(() => {
    setSearch(value);
  }, [value]);

  const handleCreateUnit = (name: string) => {
    const titleCaseName = toTitleCase(name.trim());
    if (!titleCaseName) return;

    const exists = units.find(
      (u) => u.toLowerCase() === titleCaseName.toLowerCase(),
    );

    if (exists) {
      onValueChange(exists);
      setSearch(exists);
    } else {
      const result = storeAddUnit(titleCaseName);
      if (result) {
        onValueChange(result.name);
        setSearch(result.name);
        onUnitsChanged?.();
      } else {
        onValueChange(titleCaseName);
        setSearch(titleCaseName);
      }
    }
  };

  const options: SuggestOption[] = units.map((u) => ({
    id: u,
    label: u,
  }));

  const exactMatch = units.some(
    (u) => u.toLowerCase() === search.trim().toLowerCase(),
  );

  return (
    <SuggestInput
      value={search}
      options={options}
      placeholder="Pcs / Dus / Renceng..."
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
          handleCreateUnit(trimmed);
        }
      }}
    />
  );
}

