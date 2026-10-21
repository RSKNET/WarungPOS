import { useState, useCallback, useMemo } from "react";

export function useBulkSelection<T>(
  items: T[],
  getId: (item: T) => string = (item) => (item as { id: string }).id
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const isAllSelected = useMemo(() => {
    return items.length > 0 && items.every((item) => selectedIds.has(getId(item)));
  }, [items, selectedIds, getId]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((item) => getId(item))));
    }
  }, [items, isAllSelected, getId]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  const selectedCount = selectedIds.size;

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.has(getId(item)));
  }, [items, selectedIds, getId]);

  return {
    selectedIds,
    setSelectedIds,
    selectedCount,
    selectedItems,
    isAllSelected,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,
  };
}
