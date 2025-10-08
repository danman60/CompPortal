import toast from 'react-hot-toast';

/**
 * Copy text to clipboard with toast notification
 */
export async function copyToClipboard(text: string, label?: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label || 'Text'} copied to clipboard!`);
  } catch (error) {
    toast.error('Failed to copy to clipboard');
    console.error('Clipboard error:', error);
  }
}
