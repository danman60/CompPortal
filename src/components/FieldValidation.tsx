'use client';

import { ReactNode } from 'react';

interface FieldErrorProps {
  error?: string;
  show?: boolean;
  className?: string;
}

/**
 * Field Error Message
 * Displays validation error with icon and animation
 */
export function FieldError({ error, show = true, className = '' }: FieldErrorProps) {
  if (!error || !show) return null;

  return (
    <div className={`flex items-start gap-2 mt-1 text-red-400 text-sm animate-fade-in ${className}`}>
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{error}</span>
    </div>
  );
}

interface FieldSuccessProps {
  message?: string;
  show?: boolean;
  className?: string;
}

/**
 * Field Success Message
 * Displays success state with checkmark icon
 */
export function FieldSuccess({ message = 'Valid', show = true, className = '' }: FieldSuccessProps) {
  if (!show) return null;

  return (
    <div className={`flex items-center gap-2 mt-1 text-green-400 text-sm animate-fade-in ${className}`}>
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

interface FieldWarningProps {
  message: string;
  show?: boolean;
  className?: string;
}

/**
 * Field Warning Message
 * Displays warning state with warning icon
 */
export function FieldWarning({ message, show = true, className = '' }: FieldWarningProps) {
  if (!show) return null;

  return (
    <div className={`flex items-start gap-2 mt-1 text-yellow-400 text-sm animate-fade-in ${className}`}>
      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

interface FieldHintProps {
  children: ReactNode;
  className?: string;
}

/**
 * Field Hint
 * Helper text that appears below input field
 */
export function FieldHint({ children, className = '' }: FieldHintProps) {
  return (
    <div className={`mt-1 text-gray-400 text-sm ${className}`}>
      {children}
    </div>
  );
}

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  success?: boolean;
  warning?: string;
  hint?: string;
  label?: string;
  showValidIcon?: boolean;
}

/**
 * Validated Input Component
 * Complete input with label, validation states, and messages
 */
export function ValidatedInput({
  error,
  success,
  warning,
  hint,
  label,
  showValidIcon = true,
  className = '',
  ...props
}: ValidatedInputProps) {
  const hasError = !!error;
  const hasSuccess = success && !hasError;
  const hasWarning = !!warning && !hasError;

  const inputClasses = `
    w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur-md border
    transition-all duration-200
    ${hasError ? 'border-red-500 focus:border-red-400' : ''}
    ${hasSuccess ? 'border-green-500 focus:border-green-400' : ''}
    ${hasWarning ? 'border-yellow-500 focus:border-yellow-400' : ''}
    ${!hasError && !hasSuccess && !hasWarning ? 'border-white/20 focus:border-purple-500' : ''}
    text-white placeholder-gray-400
    focus:outline-none focus:ring-2 focus:ring-purple-500/50
    ${className}
  `;

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-200 mb-2">
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          className={inputClasses}
          {...props}
        />
        {/* Valid checkmark icon */}
        {hasSuccess && showValidIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
        {/* Error icon */}
        {hasError && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        )}
      </div>

      {/* Validation messages */}
      <FieldError error={error} />
      <FieldSuccess show={hasSuccess && showValidIcon} />
      <FieldWarning message={warning || ''} show={hasWarning} />
      {hint && !hasError && !hasWarning && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}

interface ValidatedTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  success?: boolean;
  warning?: string;
  hint?: string;
  label?: string;
  showCharCount?: boolean;
  maxCharCount?: number;
}

/**
 * Validated Textarea Component
 * Complete textarea with label, validation states, and character count
 */
export function ValidatedTextarea({
  error,
  success,
  warning,
  hint,
  label,
  showCharCount = false,
  maxCharCount,
  value,
  className = '',
  ...props
}: ValidatedTextareaProps) {
  const hasError = !!error;
  const hasSuccess = success && !hasError;
  const hasWarning = !!warning && !hasError;

  const charCount = typeof value === 'string' ? value.length : 0;
  const isNearLimit = maxCharCount && charCount > maxCharCount * 0.9;

  const textareaClasses = `
    w-full px-4 py-3 rounded-lg bg-white/10 backdrop-blur-md border
    transition-all duration-200
    ${hasError ? 'border-red-500 focus:border-red-400' : ''}
    ${hasSuccess ? 'border-green-500 focus:border-green-400' : ''}
    ${hasWarning ? 'border-yellow-500 focus:border-yellow-400' : ''}
    ${!hasError && !hasSuccess && !hasWarning ? 'border-white/20 focus:border-purple-500' : ''}
    text-white placeholder-gray-400
    focus:outline-none focus:ring-2 focus:ring-purple-500/50
    resize-vertical min-h-[100px]
    ${className}
  `;

  return (
    <div className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-200 mb-2">
          {label}
          {props.required && <span className="text-red-400 ml-1">*</span>}
        </label>
      )}
      <textarea
        className={textareaClasses}
        value={value}
        maxLength={maxCharCount}
        {...props}
      />

      {/* Character count */}
      {showCharCount && maxCharCount && (
        <div className={`text-right text-sm mt-1 ${isNearLimit ? 'text-yellow-400' : 'text-gray-400'}`}>
          {charCount} / {maxCharCount}
        </div>
      )}

      {/* Validation messages */}
      <FieldError error={error} />
      <FieldSuccess show={hasSuccess} />
      <FieldWarning message={warning || ''} show={hasWarning} />
      {hint && !hasError && !hasWarning && <FieldHint>{hint}</FieldHint>}
    </div>
  );
}
