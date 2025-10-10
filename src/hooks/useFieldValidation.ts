import { useState, useCallback, useEffect } from 'react';

export interface ValidationRule {
  required?: boolean | string;
  minLength?: { value: number; message: string };
  maxLength?: { value: number; message: string };
  pattern?: { value: RegExp; message: string };
  min?: { value: number; message: string };
  max?: { value: number; message: string };
  validate?: (value: any) => string | boolean;
}

export interface FieldValidationResult {
  error?: string;
  isValid: boolean;
  isDirty: boolean;
  isTouched: boolean;
}

interface UseFieldValidationOptions {
  rules: ValidationRule;
  value: any;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

/**
 * Hook for real-time field-level validation
 * Features:
 * - Validates on change/blur
 * - Debounced validation for performance
 * - Tracks dirty/touched state
 * - Multiple validation rules
 */
export function useFieldValidation({
  rules,
  value,
  validateOnChange = true,
  validateOnBlur = true,
  debounceMs = 300,
}: UseFieldValidationOptions): FieldValidationResult & {
  validate: () => void;
  setTouched: () => void;
  reset: () => void;
} {
  const [error, setError] = useState<string | undefined>();
  const [isDirty, setIsDirty] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);

  const validateValue = useCallback((val: any): string | undefined => {
    // Required check
    if (rules.required) {
      const isEmpty = val === undefined || val === null || val === '' || (Array.isArray(val) && val.length === 0);
      if (isEmpty) {
        return typeof rules.required === 'string' ? rules.required : 'This field is required';
      }
    }

    // Skip other validations if value is empty and not required
    if (val === undefined || val === null || val === '') {
      return undefined;
    }

    // Min length check
    if (rules.minLength && typeof val === 'string') {
      if (val.length < rules.minLength.value) {
        return rules.minLength.message;
      }
    }

    // Max length check
    if (rules.maxLength && typeof val === 'string') {
      if (val.length > rules.maxLength.value) {
        return rules.maxLength.message;
      }
    }

    // Pattern check
    if (rules.pattern && typeof val === 'string') {
      if (!rules.pattern.value.test(val)) {
        return rules.pattern.message;
      }
    }

    // Min value check
    if (rules.min !== undefined && typeof val === 'number') {
      if (val < rules.min.value) {
        return rules.min.message;
      }
    }

    // Max value check
    if (rules.max !== undefined && typeof val === 'number') {
      if (val > rules.max.value) {
        return rules.max.message;
      }
    }

    // Custom validation
    if (rules.validate) {
      const result = rules.validate(val);
      if (typeof result === 'string') {
        return result;
      } else if (result === false) {
        return 'Validation failed';
      }
    }

    return undefined;
  }, [rules]);

  const validate = useCallback(() => {
    const validationError = validateValue(value);
    setError(validationError);
    return validationError;
  }, [value, validateValue]);

  const debouncedValidate = useCallback(() => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    const timeout = setTimeout(() => {
      validate();
    }, debounceMs);

    setDebounceTimeout(timeout);
  }, [debounceMs, validate, debounceTimeout]);

  // Validate on value change
  useEffect(() => {
    if (validateOnChange && isDirty) {
      debouncedValidate();
    }

    // Mark as dirty when value changes
    if (value !== undefined && value !== null && value !== '') {
      setIsDirty(true);
    }

    // Cleanup timeout on unmount
    return () => {
      if (debounceTimeout) {
        clearTimeout(debounceTimeout);
      }
    };
  }, [value, validateOnChange, isDirty, debouncedValidate, debounceTimeout]);

  const setTouched = useCallback(() => {
    setIsTouched(true);
    if (validateOnBlur) {
      validate();
    }
  }, [validateOnBlur, validate]);

  const reset = useCallback(() => {
    setError(undefined);
    setIsDirty(false);
    setIsTouched(false);
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }
  }, [debounceTimeout]);

  return {
    error,
    isValid: !error,
    isDirty,
    isTouched,
    validate,
    setTouched,
    reset,
  };
}

/**
 * Email validation pattern
 */
export const emailPattern = {
  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  message: 'Please enter a valid email address',
};

/**
 * Phone validation pattern (North American)
 */
export const phonePattern = {
  value: /^[\d\s()+-]{10,}$/,
  message: 'Please enter a valid phone number',
};

/**
 * URL validation pattern
 */
export const urlPattern = {
  value: /^https?:\/\/.+\..+/,
  message: 'Please enter a valid URL',
};

/**
 * Strong password validation
 */
export const strongPasswordValidation = (value: string): string | boolean => {
  if (value.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (!/[A-Z]/.test(value)) {
    return 'Password must contain an uppercase letter';
  }
  if (!/[a-z]/.test(value)) {
    return 'Password must contain a lowercase letter';
  }
  if (!/[0-9]/.test(value)) {
    return 'Password must contain a number';
  }
  return true;
};
