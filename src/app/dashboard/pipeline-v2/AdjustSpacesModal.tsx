'use client';

import { useState } from 'react';

interface AdjustSpacesModalProps {
  reservationId: string;
  studioName: string;
  competitionName: string;
  currentSpaces: number;
  entryCount: number;
  onClose: () => void;
  onSave: (newSpaces: number) => Promise<void>;
}

export function AdjustSpacesModal({
  studioName,
  competitionName,
  currentSpaces,
  entryCount,
  onClose,
  onSave,
}: AdjustSpacesModalProps) {
  const [newSpaces, setNewSpaces] = useState(currentSpaces);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (newSpaces === currentSpaces) return;
    setIsSaving(true);
    try {
      await onSave(newSpaces);
      onClose();
    } catch {
      // Error handled by mutation
    } finally {
      setIsSaving(false);
    }
  };

  const delta = newSpaces - currentSpaces;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-white/10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Edit Reservation Spaces</h2>
          <p className="text-gray-400 text-sm">
            Adjust spaces for <strong className="text-white">{studioName}</strong> - <strong className="text-white">{competitionName}</strong>
          </p>
        </div>

        {/* Current Info */}
        <div className="bg-white/5 rounded-lg p-4 mb-6 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Current Spaces:</span>
            <span className="text-white font-semibold">{currentSpaces}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Entries Created:</span>
            <span className="text-white font-semibold">{entryCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Minimum Allowed:</span>
            <span className="text-yellow-300 font-semibold">{entryCount}</span>
          </div>
        </div>

        {/* Spaces Input */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">New Space Count</label>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setNewSpaces(Math.max(entryCount, newSpaces - 1))}
              className="px-4 py-2 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg font-bold hover:bg-red-500/30 transition-all"
            >
              -
            </button>
            <input
              type="number"
              value={newSpaces}
              onChange={(e) => setNewSpaces(Math.max(entryCount, parseInt(e.target.value) || 0))}
              min={entryCount}
              className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white text-center text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => setNewSpaces(newSpaces + 1)}
              className="px-4 py-2 bg-green-500/20 border border-green-500/30 text-green-300 rounded-lg font-bold hover:bg-green-500/30 transition-all"
            >
              +
            </button>
          </div>
          {newSpaces < entryCount && (
            <p className="text-red-400 text-xs mt-2">
              Cannot reduce below {entryCount} (studio has created entries)
            </p>
          )}
        </div>

        {/* Delta Display */}
        {delta !== 0 && (
          <div className={`rounded-lg p-4 mb-6 ${
            delta > 0
              ? 'bg-green-500/10 border border-green-500/30'
              : 'bg-yellow-500/10 border border-yellow-500/30'
          }`}>
            <p className={`text-sm font-semibold ${
              delta > 0 ? 'text-green-300' : 'text-yellow-300'
            }`}>
              {delta > 0 ? '↑' : '↓'} {delta > 0 ? 'Increasing' : 'Decreasing'} by {Math.abs(delta)} space(s)
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-white/10 text-gray-300 font-semibold rounded-lg hover:bg-white/20 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || newSpaces === currentSpaces}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
