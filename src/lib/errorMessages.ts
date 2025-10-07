/**
 * Maps technical error messages to user-friendly messages
 */
export function getFriendlyErrorMessage(error: string): string {
  const errorLower = error.toLowerCase();

  // UUID validation errors
  if (errorLower.includes('uuid') || errorLower.includes('invalid input syntax')) {
    return 'Please select a valid option from the list';
  }

  // Foreign key constraint errors
  if (errorLower.includes('foreign key') || errorLower.includes('violates foreign key constraint')) {
    return 'Cannot delete - this item is being used elsewhere';
  }

  // Unique constraint errors
  if (errorLower.includes('unique') || errorLower.includes('duplicate key')) {
    return 'This item already exists';
  }

  // Not found errors
  if (errorLower.includes('not found') || errorLower.includes('does not exist')) {
    return 'Item not found - it may have been deleted';
  }

  // Permission/authentication errors
  if (errorLower.includes('unauthorized') || errorLower.includes('permission denied')) {
    return 'You don\'t have permission to perform this action';
  }

  // Network errors
  if (errorLower.includes('network') || errorLower.includes('fetch failed')) {
    return 'Connection error - please check your internet and try again';
  }

  // Timeout errors
  if (errorLower.includes('timeout') || errorLower.includes('timed out')) {
    return 'Request timed out - please try again';
  }

  // Validation errors
  if (errorLower.includes('required') || errorLower.includes('must be')) {
    return 'Please fill in all required fields';
  }

  // Default: return the original error if no match
  return error;
}
