import { useState, useCallback, useMemo } from 'react';

interface UseBulkSelectionOptions<T> {
  items: T[];
  getItemId: (item: T) => string | number;
  onSelectionChange?: (selectedIds: Set<string | number>) => void;
}

/**
 * Hook for managing bulk selection state
 * Features:
 * - Select/deselect individual items
 * - Select/deselect all
 * - Selection count tracking
 * - Keyboard shortcuts support
 */
export function useBulkSelection<T>({
  items,
  getItemId,
  onSelectionChange,
}: UseBulkSelectionOptions<T>) {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  const toggleSelection = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      onSelectionChange?.(newSet);
      return newSet;
    });
  }, [onSelectionChange]);

  const selectAll = useCallback(() => {
    const allIds = new Set(items.map(getItemId));
    setSelectedIds(allIds);
    onSelectionChange?.(allIds);
  }, [items, getItemId, onSelectionChange]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
    onSelectionChange?.(new Set());
  }, [onSelectionChange]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === items.length) {
      deselectAll();
    } else {
      selectAll();
    }
  }, [selectedIds.size, items.length, selectAll, deselectAll]);

  const isSelected = useCallback((id: string | number) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedIds.has(getItemId(item)));
  }, [items, selectedIds, getItemId]);

  const isAllSelected = items.length > 0 && selectedIds.size === items.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < items.length;

  return {
    selectedIds,
    selectedItems,
    selectedCount: selectedIds.size,
    toggleSelection,
    selectAll,
    deselectAll,
    toggleSelectAll,
    isSelected,
    isAllSelected,
    isSomeSelected,
  };
}
