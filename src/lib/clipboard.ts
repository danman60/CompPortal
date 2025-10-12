import toast from 'react-hot-toast';
import { logger } from './logger';

/**
 * Copy text to clipboard with toast notification
 */
export async function copyToClipboard(text: string, label?: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label || 'Text'} copied to clipboard!`);
  } catch (error) {
    toast.error('Failed to copy to clipboard');
    logger.error('Clipboard error', { error: error instanceof Error ? error : new Error(String(error)) });
  }
}
