'use client';

/**
 * Nuclear Reset Confirmation Modal (DESTRUCTIVE)
 *
 * ⚠️ CRITICAL: Permanently deletes schedule + version history
 * - Requires typing "NUCLEAR RESET" to confirm (stronger confirmation)
 * - Deletes all schedule versions (permanent history loss)
 * - Unschedules all routines (clears schedule)
 * - Deletes all schedule blocks
 * - NEVER touches entries/reservations/dancers
 */

import { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';

interface NuclearResetConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function NuclearResetConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: NuclearResetConfirmationModalProps) {
  const [confirmationText, setConfirmationText] = useState('');

  const handleConfirm = () => {
    if (confirmationText === 'NUCLEAR RESET') {
      onConfirm();
      setConfirmationText(''); // Clear input after confirm
    }
  };

  const handleClose = () => {
    setConfirmationText(''); // Clear input on close
    onClose();
  };

  const isValid = confirmationText === 'NUCLEAR RESET';

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="☢️ NUCLEAR RESET - DESTRUCTIVE ACTION">
      <div className="space-y-4">
        {/* Danger Warning */}
        <div className="bg-red-900/50 border-2 border-red-500 rounded-lg p-4">
          <h3 className="text-red-300 font-bold text-base mb-2 flex items-center gap-2">
            <span className="text-2xl">☢️</span>
            PERMANENT DESTRUCTIVE ACTION
          </h3>
          <p className="text-red-200 text-sm font-bold">
            This action CANNOT BE UNDONE and will permanently delete:
          </p>
          <ul className="list-disc list-inside text-red-200 text-sm mt-2 space-y-1">
            <li><strong>All schedule version history</strong> (permanent loss)</li>
            <li><strong>All scheduled routines</strong> (reset to unscheduled)</li>
            <li><strong>All schedule blocks</strong> (awards/breaks deleted)</li>
            <li><strong>All unsaved draft changes</strong></li>
          </ul>
          <p className="text-red-200 text-sm mt-3 font-bold">
            ⚠️ Version history will be PERMANENTLY DELETED. You will NOT be able to browse or restore previous versions.
          </p>
        </div>

        {/* What Will Be Preserved */}
        <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
          <h3 className="text-green-400 font-bold text-sm mb-2">
            ✅ What Will Be Preserved
          </h3>
          <ul className="list-disc list-inside text-green-300 text-sm space-y-1">
            <li>All competition entries (routines remain in system)</li>
            <li>All dancers and studios</li>
            <li>All reservations and invoices</li>
            <li>Competition settings and configuration</li>
          </ul>
          <p className="text-green-300 text-sm mt-2">
            Routines will be reset to "unscheduled" state. You can re-schedule them, but version history will be gone forever.
          </p>
        </div>

        {/* Confirmation Input */}
        <div className="space-y-2">
          <label className="block text-white text-sm font-medium">
            Type <span className="font-mono bg-red-900 px-2 py-0.5 rounded text-red-200 border border-red-500">NUCLEAR RESET</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            className="w-full px-4 py-2 border-2 border-red-500/50 bg-black/40 rounded-lg text-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
            placeholder="Type NUCLEAR RESET here"
            autoComplete="off"
            disabled={isLoading}
          />
          {confirmationText && !isValid && (
            <p className="text-red-400 text-xs">
              Must type exactly "NUCLEAR RESET" (all caps, with space)
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
            className={`flex-1 border-2 ${
              isValid
                ? 'bg-red-800 hover:bg-red-700 text-white border-red-500'
                : 'bg-gray-600 cursor-not-allowed text-gray-400 border-gray-500'
            }`}
          >
            {isLoading ? 'Deleting...' : '☢️ Nuclear Reset (Permanent)'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
