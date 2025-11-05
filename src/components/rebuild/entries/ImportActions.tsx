"use client";

import { useState } from 'react';

interface ImportActionsProps {
  canSave: boolean;
  isLoading: boolean;
  validationErrors: string[];
  currentIndex: number;
  totalRoutines: number;
  onSaveAndNext: () => Promise<void>;
  onSkip: () => Promise<void>;
  onDelete: () => Promise<void>;
}

export function ImportActions({
  canSave,
  isLoading,
  validationErrors,
  currentIndex,
  totalRoutines,
  onSaveAndNext,
  onSkip,
  onDelete,
}: ImportActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this routine from the import queue?')) {
      setIsDeleting(true);
      try {
        await onDelete();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 space-y-4">
      {/* Progress Indicator */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10">
        <div>
          <div className="text-sm text-gray-400 uppercase tracking-wide">Import Progress</div>
          <div className="text-xl font-bold text-white">
            Routine {currentIndex + 1} of {totalRoutines}
          </div>
        </div>
        <div className="text-sm text-gray-300">
          {totalRoutines - currentIndex - 1} remaining
        </div>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4">
          <div className="text-sm font-semibold text-red-400 mb-2">Cannot Save - Fix These Issues:</div>
          <ul className="space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="text-sm text-gray-300">• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        <button
          onClick={onSaveAndNext}
          disabled={!canSave || isLoading || isDeleting}
          className="flex-1 min-w-[200px] bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-3 rounded-lg
                   hover:shadow-lg transition-all duration-200 transform hover:scale-105
                   disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                   font-semibold text-center"
        >
          {isLoading ? 'Saving...' : currentIndex + 1 === totalRoutines ? 'Save & Complete Import' : 'Save & Next Routine'}
        </button>

        <button
          onClick={onSkip}
          disabled={isLoading || isDeleting}
          className="bg-white/10 text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Skip This Routine
        </button>

        <button
          onClick={handleDelete}
          disabled={isLoading || isDeleting}
          className="bg-red-500/20 text-red-300 border border-red-400/30 px-6 py-3 rounded-lg
                   hover:bg-red-500/30 transition-all
                   disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isDeleting ? 'Deleting...' : 'Delete Routine'}
        </button>
      </div>

      {/* Help Text */}
      <div className="text-sm text-gray-400 text-center pt-2">
        Review each routine carefully. You can skip or delete routines and add them manually later.
      </div>
    </div>
  );
}
