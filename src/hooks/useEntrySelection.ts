import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

/**
 * Custom hook for managing entry selection with keyboard shortcuts
 * Extracted from EntriesList.tsx (lines 33, 122-202)
 * Supports Ctrl+A for select all and Escape to clear selection
 */
export function useEntrySelection(
  sortedEntries: any[],
  viewMode: 'cards' | 'table',
  deleteMutation: any
) {
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  // Checkbox handlers
  const handleSelectAll = () => {
    if (selectedEntries.size === sortedEntries.length) {
      setSelectedEntries(new Set());
    } else {
      setSelectedEntries(new Set(sortedEntries.map(e => e.id)));
    }
  };

  const handleSelectEntry = (entryId: string) => {
    const newSelected = new Set(selectedEntries);
    if (newSelected.has(entryId)) {
      newSelected.delete(entryId);
    } else {
      newSelected.add(entryId);
    }
    setSelectedEntries(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedEntries.size === 0) return;

    const count = selectedEntries.size;
    const entryIds = Array.from(selectedEntries);

    toast.promise(
      (async () => {
        for (const entryId of entryIds) {
          await deleteMutation.mutateAsync({ id: entryId });
        }
      })(),
      {
        loading: `Deleting ${count} routine${count > 1 ? 's' : ''}...`,
        success: `${count} routine${count > 1 ? 's' : ''} deleted successfully`,
        error: 'Failed to delete routines',
      }
    );
  };

  // Bulk selection shortcuts
  const handleSelectAllFiltered = () => {
    setSelectedEntries(new Set(sortedEntries.map(e => e.id)));
    toast.success(`${sortedEntries.length} routines selected`);
  };

  const handleClearSelection = () => {
    setSelectedEntries(new Set());
    toast.success('Selection cleared');
  };

  // Keyboard shortcuts for bulk selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only in table mode
      if (viewMode !== 'table') return;

      // Ctrl+A / Cmd+A - Select All Filtered
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && sortedEntries.length > 0) {
        e.preventDefault();
        handleSelectAllFiltered();
      }

      // Escape - Clear Selection
      if (e.key === 'Escape' && selectedEntries.size > 0) {
        e.preventDefault();
        handleClearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, sortedEntries, selectedEntries]);

  // Clear selection when delete mutation completes
  useEffect(() => {
    if (deleteMutation.isSuccess) {
      setSelectedEntries(new Set());
    }
  }, [deleteMutation.isSuccess]);

  return {
    selectedEntries,
    setSelectedEntries,
    handleSelectAll,
    handleSelectEntry,
    handleBulkDelete,
    handleSelectAllFiltered,
    handleClearSelection,
  };
}
