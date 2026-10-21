import { CreatableSuggestInput } from "@/components/CreatableSuggestInput";
import { useUnitStore } from "@/stores";

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
