'use client';

import { Toaster as HotToaster } from 'react-hot-toast';

/**
 * Toast notification wrapper component
 * Provides consistent styling for all toast notifications
 *
 * Usage:
 * - Import and add <Toaster /> to your root layout
 * - Use toast.success(), toast.error(), toast.loading() anywhere
 *
 * @example
 * ```tsx
 * import { toast } from 'react-hot-toast';
 *
 * toast.success('Dancer created successfully!');
 * toast.error('Failed to save entry');
 * ```
 */
export function Toaster() {
  return (
    <HotToaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        // Default options for all toasts
        duration: 4000,
        style: {
          background: 'rgba(17, 17, 17, 0.95)',
          color: '#fff',
          padding: '16px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 6px rgba(0, 0, 0, 0.3)',
          fontSize: '14px',
          maxWidth: '500px',
        },

        // Success toast (green accent)
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#10b981',
            secondary: '#fff',
          },
          style: {
            border: '1px solid rgba(16, 185, 129, 0.3)',
          },
        },

        // Error toast (red accent)
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
          style: {
            border: '1px solid rgba(239, 68, 68, 0.3)',
          },
        },

        // Loading toast (purple accent)
        loading: {
          iconTheme: {
            primary: '#8b5cf6',
            secondary: '#fff',
          },
          style: {
            border: '1px solid rgba(139, 92, 246, 0.3)',
          },
        },
      }}
    />
  );
}
