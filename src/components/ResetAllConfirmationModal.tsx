'use client';

/**
 * Reset All Confirmation Modal
 *
 * Dangerous destructive action with typed confirmation
 * - Requires typing "RESET" to confirm
 * - Deletes all schedule versions, drafts, and blocks
 * - Cannot be undone
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
    <Modal isOpen={isOpen} onClose={handleClose} title="⚠️ Reset All Drafts & Versions">
      <div className="space-y-4">
        {/* Warning Message */}
        <div className="bg-orange-900/30 border border-orange-500/50 rounded-lg p-4">
          <h3 className="text-orange-400 font-bold text-sm mb-2">
            ⚠️ RESET TO FRESH START
          </h3>
          <p className="text-orange-300 text-sm">
            This will clear the current schedule:
          </p>
          <ul className="list-disc list-inside text-orange-300 text-sm mt-2 space-y-1">
            <li>Unschedule all routines (all days)</li>
            <li>Delete all schedule blocks (awards/breaks)</li>
            <li>Clear all unsaved draft changes</li>
          </ul>
        </div>

        {/* What Will NOT Be Deleted */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <h3 className="text-green-400 font-bold text-sm mb-2">
            ✅ What Will Be Preserved
          </h3>
          <ul className="list-disc list-inside text-green-300 text-sm space-y-1">
            <li>Version history (browse previous versions)</li>
            <li>All routines (entries) remain in database</li>
            <li>All dancers and studios remain</li>
            <li>Competition settings unchanged</li>
          </ul>
          <p className="text-green-300 text-sm mt-2">
            You can re-schedule routines and view past versions after reset.
          </p>
        </div>

        {/* Confirmation Input */}
        <div className="space-y-2">
          <label className="block text-white text-sm font-medium">
            Type <span className="font-mono bg-red-900/50 px-2 py-0.5 rounded text-red-300">RESET</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            className="w-full px-4 py-2 border border-white/20 bg-black/20 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Type RESET here"
            autoComplete="off"
            disabled={isLoading}
          />
          {confirmationText && !isValid && (
            <p className="text-red-400 text-xs">
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
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-600 cursor-not-allowed text-gray-400'
            }`}
          >
            {isLoading ? 'Resetting...' : 'Reset All Drafts & Versions'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
