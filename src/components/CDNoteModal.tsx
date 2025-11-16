'use client';

/**
 * CD Note Modal Component
 *
 * Modal for Competition Directors to add private notes to routines
 * - Private notes only visible to CD
 * - Used for scheduling reminders, special considerations, etc.
 * - Separate from studio requests
 *
 * Created: Session 58+ (Routine Notes UI implementation)
 */

import { useState } from 'react';

interface CDNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  routineId: string;
  routineTitle: string;
  onSubmit: (content: string) => void;
  isSubmitting?: boolean;
}

export function CDNoteModal({
  isOpen,
  onClose,
  routineId,
  routineTitle,
  onSubmit,
  isSubmitting = false,
}: CDNoteModalProps) {
  const [noteContent, setNoteContent] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (noteContent.trim()) {
      onSubmit(noteContent);
      setNoteContent(''); // Reset after submit
    }
  };

  const handleClose = () => {
    setNoteContent('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-white/10 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              📝 Add Private Note
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              For: <span className="text-white font-medium">{routineTitle}</span>
            </p>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-300">
            🔒 <strong>Private Note:</strong> Only you can see this note. Use it for scheduling reminders, special considerations, or internal notes about this routine.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Note Content */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Note Content
              </label>
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Enter your private note here..."
                rows={4}
                className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                disabled={isSubmitting}
                required
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !noteContent.trim()}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                ) : (
                  '💾 Save Note'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
