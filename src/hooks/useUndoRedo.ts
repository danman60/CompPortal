import { useState, useCallback, useEffect } from 'react';
import { hapticLight } from '@/lib/haptics';

interface UseUndoRedoOptions {
  maxHistory?: number;
}

export function useUndoRedo<T>(initialState: T, options: UseUndoRedoOptions = {}) {
  const { maxHistory = 50 } = options;

  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentState = history[currentIndex];
  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    setHistory((prev) => {
      const actualNewState = typeof newState === 'function'
        ? (newState as (prev: T) => T)(prev[currentIndex])
        : newState;

      // Remove future states if we're not at the end
      const newHistory = prev.slice(0, currentIndex + 1);

      // Add new state
      newHistory.push(actualNewState);

      // Limit history size
      if (newHistory.length > maxHistory) {
        return newHistory.slice(newHistory.length - maxHistory);
      }

      return newHistory;
    });

    setCurrentIndex((prev) => Math.min(prev + 1, maxHistory - 1));
  }, [currentIndex, maxHistory]);

  const undo = useCallback(() => {
    if (canUndo) {
      hapticLight();
      setCurrentIndex((prev) => prev - 1);
    }
  }, [canUndo]);

  const redo = useCallback(() => {
    if (canRedo) {
      hapticLight();
      setCurrentIndex((prev) => prev + 1);
    }
  }, [canRedo]);

  const reset = useCallback((newInitialState?: T) => {
    const resetState = newInitialState ?? initialState;
    setHistory([resetState]);
    setCurrentIndex(0);
  }, [initialState]);

  // Keyboard shortcuts: Ctrl+Z (undo), Ctrl+Y or Ctrl+Shift+Z (redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger in input fields unless user explicitly wants it
      const target = e.target as HTMLElement;
      const isEditable = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Only allow in editable fields if they explicitly support undo
      if (isEditable && !target.dataset.undoEnabled) return;

      // Ctrl+Z or Cmd+Z = Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && canUndo) {
        e.preventDefault();
        undo();
      }

      // Ctrl+Y or Cmd+Y or Ctrl+Shift+Z = Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && canRedo) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  return {
    state: currentState,
    setState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
    historyLength: history.length,
  };
}
