'use client';

/**
 * Reset All Confirmation Modal (UI-only, draft clear)
 *
 * Safe UI-only action - clears draft state without touching database
 * - Requires typing "RESET" to confirm
 * - Clears UI draft state only
 * - Database schedule preserved
 */

import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface ResetAllConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ResetAllConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: ResetAllConfirmationModalProps) {
  const [confirmationText, setConfirmationText] = useState('');

  const handleConfirm = () => {
    if (confirmationText === 'RESET') {
      onConfirm();
      setConfirmationText(''); // Clear input after confirm
    }
  };

  const handleClose = () => {
    setConfirmationText(''); // Clear input on close
    onClose();
  };

  const isValid = confirmationText === 'RESET';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="🗑️ Reset All Drafts (UI Only)">
      <div className="space-y-4">
        {/* Warning Message */}
        <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
          <h3 className="text-blue-400 font-bold text-sm mb-2">
            🗑️ CLEAR UI DRAFTS
          </h3>
          <p className="text-blue-300 text-sm">
            This will clear all unsaved draft changes from the UI:
          </p>
          <ul className="list-disc list-inside text-blue-300 text-sm mt-2 space-y-1">
            <li>Clear all unsaved draft changes (all days)</li>
            <li>UI will reset to last saved database state</li>
            <li>No database changes will be made</li>
          </ul>
        </div>

        {/* What Will NOT Be Deleted */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <h3 className="text-green-400 font-bold text-sm mb-2">
            ✅ Database Preserved (100% Safe)
          </h3>
          <ul className="list-disc list-inside text-green-300 text-sm space-y-1">
            <li>All saved schedules remain in database</li>
            <li>All schedule blocks (awards/breaks) preserved</li>
            <li>All version history preserved</li>
            <li>All routines (entries) remain in database</li>
            <li>All dancers and studios remain</li>
          </ul>
          <p className="text-green-300 text-sm mt-2">
            Simply reload the page to restore last saved state.
          </p>
        </div>

        {/* Confirmation Input */}
        <div className="space-y-2">
          <label className="block text-white text-sm font-medium">
            Type <span className="font-mono bg-orange-900/50 px-2 py-0.5 rounded text-orange-300">RESET</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            className="w-full px-4 py-2 border border-white/20 bg-black/20 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type RESET here"
            autoComplete="off"
            disabled={isLoading}
          />
          {confirmationText && !isValid && (
            <p className="text-orange-400 text-xs">
              Must type exactly "RESET" (all caps)
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleClose}
            variant="secondary"
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || isLoading}
            className={`flex-1 ${
              isValid
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-gray-600 cursor-not-allowed text-gray-400'
            }`}
          >
            {isLoading ? 'Clearing...' : 'Clear All Drafts (UI Only)'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
