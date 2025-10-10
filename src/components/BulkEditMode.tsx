'use client';

import { useState, ReactNode } from 'react';

interface BulkEditModeProps {
  selectedCount: number;
  onCancel: () => void;
  children: ReactNode;
  position?: 'top' | 'bottom';
  className?: string;
}

/**
 * Bulk Edit Mode Toolbar
 * Floating action bar that appears when items are selected
 */
export function BulkEditToolbar({
  selectedCount,
  onCancel,
  children,
  position = 'bottom',
  className = '',
}: BulkEditModeProps) {
  if (selectedCount === 0) return null;

  const positionClasses = position === 'top'
    ? 'top-4 animate-slide-down'
    : 'bottom-4 animate-slide-up';

  return (
    <div className={`fixed left-1/2 -translate-x-1/2 z-50 ${positionClasses} ${className}`}>
      <div className="bg-purple-500/90 backdrop-blur-md rounded-full shadow-2xl border border-purple-400/50 px-6 py-3 flex items-center gap-4">
        {/* Selection count */}
        <div className="flex items-center gap-2 text-white font-medium">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{selectedCount} selected</span>
        </div>

        {/* Divider */}
        <div className="w-px h-6 bg-white/30" />

        {/* Actions */}
        <div className="flex items-center gap-2">
          {children}
        </div>

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="ml-2 p-2 hover:bg-white/10 rounded-full transition-colors text-white"
          aria-label="Cancel selection"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface BulkActionButtonProps {
  onClick: () => void;
  icon: ReactNode;
  label: string;
  variant?: 'default' | 'danger' | 'success';
  disabled?: boolean;
}

/**
 * Bulk Action Button
 * Individual action button for the bulk edit toolbar
 */
export function BulkActionButton({
  onClick,
  icon,
  label,
  variant = 'default',
  disabled = false,
}: BulkActionButtonProps) {
  const variantClasses = {
    default: 'bg-white/10 hover:bg-white/20 text-white',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-400/50',
    success: 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border-green-400/50',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        px-4 py-2 rounded-lg font-medium transition-all
        flex items-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        border border-transparent
        ${variantClasses[variant]}
      `}
      aria-label={label}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

interface SelectAllCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label?: string;
  className?: string;
}

/**
 * Select All Checkbox
 * Checkbox for selecting all items with indeterminate state
 */
export function SelectAllCheckbox({
  checked,
  indeterminate = false,
  onChange,
  label = 'Select all',
  className = '',
}: SelectAllCheckboxProps) {
  return (
    <label className={`flex items-center gap-2 cursor-pointer select-none ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center transition-all
            ${checked || indeterminate
              ? 'bg-purple-500 border-purple-500'
              : 'bg-white/10 border-white/30 hover:border-purple-400'
            }
          `}
        >
          {indeterminate ? (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M18 12H6" />
            </svg>
          ) : checked ? (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ) : null}
        </div>
      </div>
      <span className="text-sm font-medium text-gray-200">{label}</span>
    </label>
  );
}

interface ItemCheckboxProps {
  checked: boolean;
  onChange: () => void;
  label?: string;
  className?: string;
}

/**
 * Item Checkbox
 * Checkbox for individual item selection
 */
export function ItemCheckbox({
  checked,
  onChange,
  label,
  className = '',
}: ItemCheckboxProps) {
  return (
    <label
      className={`flex items-center gap-2 cursor-pointer select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="sr-only"
        />
        <div
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center transition-all
            ${checked
              ? 'bg-purple-500 border-purple-500 scale-110'
              : 'bg-white/10 border-white/30 hover:border-purple-400 hover:scale-105'
            }
          `}
        >
          {checked && (
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </div>
      {label && <span className="text-sm font-medium text-gray-200">{label}</span>}
    </label>
  );
}

interface BulkEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void | Promise<void>;
  title: string;
  children: ReactNode;
  selectedCount: number;
  isSaving?: boolean;
}

/**
 * Bulk Edit Modal
 * Modal for editing multiple selected items
 */
export function BulkEditModal({
  isOpen,
  onClose,
  onSave,
  title,
  children,
  selectedCount,
  isSaving = false,
}: BulkEditModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      await onSave();
      onClose();
    } catch (error) {
      console.error('Bulk edit failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-white/20 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <div>
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              <p className="text-sm text-gray-400 mt-1">Editing {selectedCount} items</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {children}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-white/20 bg-white/5">
            <button
              onClick={onClose}
              disabled={isProcessing || isSaving}
              className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isProcessing || isSaving}
              className="px-6 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white font-medium transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isProcessing || isSaving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
