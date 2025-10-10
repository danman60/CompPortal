interface FormErrorProps {
  message?: string;
  show?: boolean;
}

/**
 * Form error message component
 * Displays validation errors with consistent styling
 */
export default function FormError({ message, show = true }: FormErrorProps) {
  if (!message || !show) return null;

  return (
    <div className="flex items-start gap-2 mt-1 text-red-400 text-sm animate-fade-in">
      <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <span>{message}</span>
    </div>
  );
}

/**
 * Helper function to get input classes with validation state
 */
export function getInputClasses(hasError?: boolean, baseClasses?: string) {
  const base = baseClasses || 'w-full px-4 py-3 bg-white/5 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 transition-all';

  const borderClass = hasError
    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
    : 'border-white/20 focus:ring-purple-500 focus:border-purple-500';

  return `${base} ${borderClass}`;
}

/**
 * Helper function to get label classes with validation state
 */
export function getLabelClasses(hasError?: boolean, required?: boolean) {
  const base = 'block text-sm font-medium mb-2';
  const colorClass = hasError ? 'text-red-400' : 'text-gray-300';

  return `${base} ${colorClass}`;
}

/**
 * Required field indicator
 */
export function RequiredIndicator() {
  return <span className="text-red-400 ml-1" aria-label="required">*</span>;
}
