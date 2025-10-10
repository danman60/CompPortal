import toast from 'react-hot-toast';

interface UndoToastOptions {
  message: string;
  onUndo: () => void;
  duration?: number;
}

/**
 * Show a toast notification with an undo button for destructive actions.
 * The undo button is available for 5 seconds by default.
 */
export function showUndoToast({ message, onUndo, duration = 5000 }: UndoToastOptions) {
  let undoClicked = false;

  const toastId = toast.success(
    (t) => (
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button
          onClick={() => {
            undoClicked = true;
            onUndo();
            toast.dismiss(t.id);
            toast('Action undone', { icon: '↩️', duration: 2000 });
          }}
          className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded-md text-sm font-semibold transition-colors"
        >
          Undo
        </button>
      </div>
    ),
    {
      duration,
      position: 'bottom-center',
    }
  );

  return {
    toastId,
    wasUndone: () => undoClicked,
  };
}
