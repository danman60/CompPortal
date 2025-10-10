'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface SwipeToDeleteProps {
  children: ReactNode;
  onDelete: () => void | Promise<void>;
  deleteLabel?: string;
  deleteIcon?: ReactNode;
  threshold?: number;
  disabled?: boolean;
  confirmDelete?: boolean;
  className?: string;
}

/**
 * Swipe-to-Delete Component
 * Mobile-optimized swipe gesture to reveal delete action
 *
 * Features:
 * - Touch-based swipe detection
 * - Smooth animations
 * - Confirmation option
 * - Customizable threshold
 * - Auto-close on outside click
 */
export default function SwipeToDelete({
  children,
  onDelete,
  deleteLabel = 'Delete',
  deleteIcon,
  threshold = 80,
  disabled = false,
  confirmDelete = false,
  className = '',
}: SwipeToDeleteProps) {
  const [swiped, setSwiped] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef(0);
  const currentX = useRef(0);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close swipe when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (swiped && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSwiped(false);
        setTranslateX(0);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [swiped]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isDeleting) return;

    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || disabled || isDeleting) return;

    currentX.current = e.touches[0].clientX;
    const diff = startX.current - currentX.current;

    // Only allow left swipe (positive diff)
    if (diff > 0) {
      // Cap at threshold + 20px for resistance effect
      const maxSwipe = threshold + 20;
      const newTranslate = Math.min(diff, maxSwipe);
      setTranslateX(newTranslate);
    } else {
      // Allow right swipe to close if already swiped
      if (swiped) {
        const newTranslate = Math.max(0, threshold + diff);
        setTranslateX(newTranslate);
      }
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging.current || disabled || isDeleting) return;

    isDragging.current = false;

    if (translateX >= threshold) {
      // Swipe threshold reached - show delete button
      setSwiped(true);
      setTranslateX(threshold);
    } else {
      // Didn't reach threshold - snap back
      setSwiped(false);
      setTranslateX(0);
    }
  };

  const handleDelete = async () => {
    if (disabled || isDeleting) return;

    if (confirmDelete && !window.confirm('Are you sure you want to delete this item?')) {
      return;
    }

    setIsDeleting(true);

    try {
      await onDelete();
    } catch (error) {
      console.error('Delete failed:', error);
      setIsDeleting(false);
      setSwiped(false);
      setTranslateX(0);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled || isDeleting) return;

    // Desktop simulation
    startX.current = e.clientX;
    isDragging.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || disabled || isDeleting) return;

    currentX.current = e.clientX;
    const diff = startX.current - currentX.current;

    if (diff > 0) {
      const maxSwipe = threshold + 20;
      const newTranslate = Math.min(diff, maxSwipe);
      setTranslateX(newTranslate);
    } else {
      if (swiped) {
        const newTranslate = Math.max(0, threshold + diff);
        setTranslateX(newTranslate);
      }
    }
  };

  const handleMouseUp = () => {
    if (!isDragging.current || disabled || isDeleting) return;

    isDragging.current = false;

    if (translateX >= threshold) {
      setSwiped(true);
      setTranslateX(threshold);
    } else {
      setSwiped(false);
      setTranslateX(0);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging.current && !swiped) {
      isDragging.current = false;
      setSwiped(false);
      setTranslateX(0);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${isDeleting ? 'opacity-50' : ''} ${className}`}
    >
      {/* Delete action button (behind content) */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-end px-4 bg-red-500"
        style={{ width: `${threshold}px` }}
      >
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex flex-col items-center gap-1 text-white font-medium disabled:opacity-50"
          aria-label={deleteLabel}
        >
          {deleteIcon || (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
          <span className="text-xs">{deleteLabel}</span>
        </button>
      </div>

      {/* Content (swipeable) */}
      <div
        className="relative bg-white/10 backdrop-blur-md transition-transform"
        style={{
          transform: `translateX(-${translateX}px)`,
          transitionDuration: isDragging.current ? '0ms' : '200ms',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </div>

      {/* Loading overlay */}
      {isDeleting && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-white">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Deleting...</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Swipe-to-Delete List Item
 * Pre-styled list item with swipe-to-delete
 */
export function SwipeToDeleteListItem({
  children,
  onDelete,
  deleteLabel,
  confirmDelete = true,
  className = '',
}: Omit<SwipeToDeleteProps, 'threshold' | 'deleteIcon'>) {
  return (
    <SwipeToDelete
      onDelete={onDelete}
      deleteLabel={deleteLabel}
      confirmDelete={confirmDelete}
      threshold={80}
      className={className}
    >
      <div className="p-4 border border-white/20 rounded-lg">
        {children}
      </div>
    </SwipeToDelete>
  );
}

/**
 * Swipe-to-Archive Component
 * Similar to delete but for archiving actions
 */
export function SwipeToArchive({
  children,
  onArchive,
  archiveLabel = 'Archive',
  className = '',
  ...props
}: Omit<SwipeToDeleteProps, 'onDelete' | 'deleteLabel' | 'deleteIcon'> & {
  onArchive: () => void | Promise<void>;
  archiveLabel?: string;
}) {
  return (
    <SwipeToDelete
      onDelete={onArchive}
      deleteLabel={archiveLabel}
      deleteIcon={
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
        </svg>
      }
      className={className}
      {...props}
    >
      <div className="p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg">
        {children}
      </div>
    </SwipeToDelete>
  );
}
