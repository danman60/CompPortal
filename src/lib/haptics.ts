/**
 * Haptic Feedback Utilities
 * Uses Web Vibration API for tactile responses on mobile devices
 * https://developer.mozilla.org/en-US/docs/Web/API/Vibration_API
 */

/**
 * Check if haptic feedback is supported
 */
export const isHapticSupported = (): boolean => {
  return typeof window !== 'undefined' && 'vibrate' in navigator;
};

/**
 * Light tap - for hover states, switches, toggles
 * Pattern: Single short pulse (10ms)
 */
export const hapticLight = () => {
  if (isHapticSupported()) {
    navigator.vibrate(10);
  }
};

/**
 * Medium tap - for buttons, selections
 * Pattern: Medium pulse (20ms)
 */
export const hapticMedium = () => {
  if (isHapticSupported()) {
    navigator.vibrate(20);
  }
};

/**
 * Heavy tap - for confirmations, important actions
 * Pattern: Strong pulse (40ms)
 */
export const hapticHeavy = () => {
  if (isHapticSupported()) {
    navigator.vibrate(40);
  }
};

/**
 * Success pattern - for successful operations
 * Pattern: Two quick pulses (10ms, pause 50ms, 10ms)
 */
export const hapticSuccess = () => {
  if (isHapticSupported()) {
    navigator.vibrate([10, 50, 10]);
  }
};

/**
 * Error pattern - for errors, invalid actions
 * Pattern: Three sharp pulses (20ms each, 40ms pauses)
 */
export const hapticError = () => {
  if (isHapticSupported()) {
    navigator.vibrate([20, 40, 20, 40, 20]);
  }
};

/**
 * Warning pattern - for warnings, alerts
 * Pattern: Two medium pulses (30ms, pause 60ms, 30ms)
 */
export const hapticWarning = () => {
  if (isHapticSupported()) {
    navigator.vibrate([30, 60, 30]);
  }
};

/**
 * Selection pattern - for list item selection
 * Pattern: Single sharp pulse (15ms)
 */
export const hapticSelection = () => {
  if (isHapticSupported()) {
    navigator.vibrate(15);
  }
};

/**
 * Impact pattern - for drag and drop, collisions
 * Pattern: Strong impact (50ms)
 */
export const hapticImpact = () => {
  if (isHapticSupported()) {
    navigator.vibrate(50);
  }
};
