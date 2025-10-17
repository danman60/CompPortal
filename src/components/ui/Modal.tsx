/**
 * Modal Component
 *
 * Reusable modal with consistent styling, accessibility, and Escape key support.
 * Replaces 8+ duplicated modal implementations.
 *
 * Created: Wave 2.1 (Modal Component)
 */

'use client';

import { useEffect, ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | 'full';
  variant?: 'default' | 'warning' | 'danger';
  closeOnBackdropClick?: boolean;
  showCloseButton?: boolean;
}

const SIZE_CLASSES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-full',
};

const VARIANT_STYLES = {
  default: {
    border: 'border-white/20',
    gradient: 'from-gray-900 to-gray-800',
  },
  warning: {
    border: 'border-yellow-400/30',
    gradient: 'from-yellow-900/20 to-gray-800',
  },
  danger: {
    border: 'border-red-400/30',
    gradient: 'from-red-900/20 to-gray-800',
  },
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  variant = 'default',
  closeOnBackdropClick = true,
  showCloseButton = true,
}: ModalProps) {
  // Escape key handler
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const variantStyle = VARIANT_STYLES[variant];
  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div
          className={`bg-gradient-to-br ${variantStyle.gradient} rounded-xl border ${variantStyle.border} shadow-2xl ${SIZE_CLASSES[size]} w-full max-h-[90vh] overflow-hidden`}
          onClick={(e) => e.stopPropagation()} // Prevent backdrop click when clicking modal content
        >
          {/* Header */}
          <div className="p-6 border-b border-white/20 flex items-start justify-between">
            <div className="flex-1">
              <h2 id="modal-title" className="text-2xl font-bold text-white">
                {title}
              </h2>
              {description && (
                <p className="text-sm text-gray-400 mt-1">{description}</p>
              )}
            </div>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="ml-4 text-gray-400 hover:text-white transition-colors"
                aria-label="Close modal"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="flex justify-end gap-2 p-6 border-t border-white/20 bg-white/5">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
