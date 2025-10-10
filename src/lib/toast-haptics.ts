/**
 * Toast notifications with haptic feedback
 * Wraps react-hot-toast with mobile haptic responses
 */

import toast, { type Toast } from 'react-hot-toast';
import {
  hapticSuccess,
  hapticError,
  hapticWarning,
  hapticMedium,
} from './haptics';

/**
 * Show success toast with haptic feedback
 */
export const toastSuccess = (message: string, options?: Partial<Toast>) => {
  hapticSuccess();
  return toast.success(message, {
    position: 'top-right',
    duration: 3000,
    ...options,
  });
};

/**
 * Show error toast with haptic feedback
 */
export const toastError = (message: string, options?: Partial<Toast>) => {
  hapticError();
  return toast.error(message, {
    position: 'top-right',
    duration: 4000,
    ...options,
  });
};

/**
 * Show warning/custom toast with haptic feedback
 */
export const toastWarning = (message: string, options?: Partial<Toast>) => {
  hapticWarning();
  return toast(message, {
    position: 'top-right',
    duration: 3500,
    icon: '⚠️',
    ...options,
  });
};

/**
 * Show info toast with haptic feedback
 */
export const toastInfo = (message: string, options?: Partial<Toast>) => {
  hapticMedium();
  return toast(message, {
    position: 'top-right',
    duration: 3000,
    icon: 'ℹ️',
    ...options,
  });
};

/**
 * Show loading toast (no haptic)
 */
export const toastLoading = (message: string, options?: Partial<Toast>) => {
  return toast.loading(message, {
    position: 'top-right',
    ...options,
  });
};

/**
 * Promise toast with haptics
 */
export const toastPromise = <T,>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  },
  options?: Partial<Toast>
) => {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: (data) => {
        hapticSuccess();
        return typeof messages.success === 'function'
          ? messages.success(data)
          : messages.success;
      },
      error: (error) => {
        hapticError();
        return typeof messages.error === 'function'
          ? messages.error(error)
          : messages.error;
      },
    },
    {
      position: 'top-right',
      ...options,
    }
  );
};
