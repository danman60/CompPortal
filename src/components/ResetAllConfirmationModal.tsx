'use client';

/**
 * Reset All Confirmation Modal
 *
 * Resets all days (works like Reset Day but for entire competition)
 * - Simple confirmation (no typing required)
 * - Unschedules all routines (all days)
 * - Deletes all schedule blocks
 * - Clears all drafts
 */

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
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🗑️ Reset All Days">
      <div className="space-y-4">
        {/* Warning Message */}
        <div className="bg-orange-900/30 border border-orange-500/50 rounded-lg p-4">
          <h3 className="text-orange-400 font-bold text-sm mb-2">
            ⚠️ Reset All Days
          </h3>
          <p className="text-orange-300 text-sm">
            This will reset the entire competition schedule:
          </p>
          <ul className="list-disc list-inside text-orange-300 text-sm mt-2 space-y-1">
            <li>Unschedule all routines (all days)</li>
            <li>Delete all schedule blocks (awards/breaks)</li>
            <li>Clear all unsaved draft changes</li>
          </ul>
        </div>

        {/* What Will Be Preserved */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <h3 className="text-green-400 font-bold text-sm mb-2">
            ✅ What Will Be Preserved
          </h3>
          <ul className="list-disc list-inside text-green-300 text-sm space-y-1">
            <li>All version history (can view previous versions)</li>
            <li>All routines (entries) remain in database</li>
            <li>All dancers and studios remain</li>
            <li>Competition settings unchanged</li>
          </ul>
          <p className="text-green-300 text-sm mt-2">
            You can re-schedule routines after reset. Version history preserved for review.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={onClose}
            variant="secondary"
            disabled={isLoading}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isLoading ? 'Resetting...' : 'Reset All Days'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
