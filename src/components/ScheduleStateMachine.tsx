'use client';

/**
 * Schedule State Machine Component
 *
 * Manages competition schedule state transitions:
 * - Draft: Free editing, auto-renumbering
 * - Finalized: Locked entry numbers, ready to publish
 * - Published: Public viewing enabled, studio names revealed
 */

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface ScheduleStateMachineProps {
  competitionId: string;
  tenantId: string;
  currentState: 'draft' | 'finalized' | 'published';
  onStateChange?: () => void;
}

export function ScheduleStateMachine({
  competitionId,
  tenantId,
  currentState,
  onStateChange,
}: ScheduleStateMachineProps) {
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const utils = trpc.useContext();

  // Get conflicts to check if can finalize
  const { data: conflictsData } = trpc.scheduling.getConflicts.useQuery({
    competitionId,
    tenantId,
  });

  const finalizeSchedule = trpc.scheduling.finalizeSchedule.useMutation({
    onSuccess: () => {
      setShowFinalizeModal(false);
      utils.scheduling.invalidate();
      onStateChange?.();
    },
    onError: (error) => {
      alert(`Error finalizing schedule: ${error.message}`);
    },
  });

  const publishSchedule = trpc.scheduling.publishSchedule.useMutation({
    onSuccess: () => {
      setShowPublishModal(false);
      utils.scheduling.invalidate();
      onStateChange?.();
    },
    onError: (error) => {
      alert(`Error publishing schedule: ${error.message}`);
    },
  });

  const unlockSchedule = trpc.scheduling.unlockSchedule.useMutation({
    onSuccess: () => {
      setShowUnlockModal(false);
      utils.scheduling.invalidate();
      onStateChange?.();
    },
    onError: (error) => {
      alert(`Error unlocking schedule: ${error.message}`);
    },
  });

  const handleFinalize = () => {
    finalizeSchedule.mutate({ competitionId, tenantId });
  };

  const handlePublish = () => {
    publishSchedule.mutate({ competitionId, tenantId });
  };

  const handleUnlock = () => {
    unlockSchedule.mutate({ competitionId, tenantId });
  };

  // Check for critical conflicts
  const criticalConflicts = conflictsData?.conflicts?.filter(
    (c) => c.severity === 'critical'
  ) || [];
  const hasCriticalConflicts = criticalConflicts.length > 0;

  // State badge styling
  const stateBadgeClasses = {
    draft: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    finalized: 'bg-blue-100 text-blue-800 border-blue-300',
    published: 'bg-green-100 text-green-800 border-green-300',
  };

  const stateLabels = {
    draft: '✏️ Draft',
    finalized: '🔒 Finalized',
    published: '🌐 Published',
  };

  return (
    <div className="flex items-center gap-4">
      {/* State Badge */}
      <div
        className={`px-4 py-2 rounded-lg border-2 font-medium ${
          stateBadgeClasses[currentState]
        }`}
      >
        {stateLabels[currentState]}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {/* Draft -> Finalize */}
        {currentState === 'draft' && (
          <button
            onClick={() => setShowFinalizeModal(true)}
            disabled={hasCriticalConflicts}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              hasCriticalConflicts
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
            }`}
            title={
              hasCriticalConflicts
                ? 'Cannot finalize: Critical conflicts must be resolved first'
                : 'Lock entry numbers and prevent further edits'
            }
          >
            🔒 Finalize Schedule
          </button>
        )}

        {/* Finalized -> Publish */}
        {currentState === 'finalized' && (
          <button
            onClick={() => setShowPublishModal(true)}
            className="px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 transition-colors"
            title="Make schedule public and reveal studio names"
          >
            🌐 Publish Schedule
          </button>
        )}

        {/* Published/Finalized -> Unlock (revert to draft) */}
        {(currentState === 'finalized' || currentState === 'published') && (
          <button
            onClick={() => setShowUnlockModal(true)}
            className="px-4 py-2 rounded-lg font-medium bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-600 hover:to-amber-700 transition-colors"
            title="Revert to draft mode for editing"
          >
            🔓 Unlock & Edit
          </button>
        )}
      </div>

      {/* Finalize Confirmation Modal */}
      {showFinalizeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md shadow-xl">
            <h3 className="text-xl font-bold mb-4">Finalize Schedule?</h3>
            <p className="text-gray-700 mb-4">
              This will:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li>Lock all entry numbers</li>
              <li>Prevent further schedule edits</li>
              <li>Prepare schedule for publishing</li>
              <li>Check for any critical conflicts</li>
            </ul>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowFinalizeModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFinalize}
                disabled={finalizeSchedule.isPending}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400"
              >
                {finalizeSchedule.isPending ? 'Finalizing...' : 'Finalize Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Confirmation Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md shadow-xl">
            <h3 className="text-xl font-bold mb-4">Publish Schedule?</h3>
            <p className="text-gray-700 mb-4">
              This will:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li>Make schedule visible to public</li>
              <li>Reveal studio names (replace codes)</li>
              <li>Allow studios to view final schedule</li>
              <li>Send notifications (if enabled)</li>
            </ul>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={publishSchedule.isPending}
                className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-green-400"
              >
                {publishSchedule.isPending ? 'Publishing...' : 'Publish Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Confirmation Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md shadow-xl">
            <h3 className="text-xl font-bold mb-4 text-amber-600">⚠️ Unlock Schedule?</h3>
            <p className="text-gray-700 mb-4">
              This will:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-6 space-y-2">
              <li>Revert schedule to draft mode</li>
              <li>Allow editing and reordering</li>
              <li>Hide schedule from public (if published)</li>
              <li>Reset entry numbering</li>
            </ul>
            <p className="text-amber-600 font-medium mb-6">
              ⚠️ Use with caution! Studios may have already viewed the published schedule.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowUnlockModal(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlock}
                disabled={unlockSchedule.isPending}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:bg-amber-400"
              >
                {unlockSchedule.isPending ? 'Unlocking...' : 'Unlock Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Critical Conflicts Warning */}
      {hasCriticalConflicts && currentState === 'draft' && (
        <div className="ml-4 px-3 py-2 bg-red-100 text-red-800 rounded-lg text-sm font-medium">
          ⚠️ {criticalConflicts.length} critical conflict{criticalConflicts.length > 1 ? 's' : ''} must be resolved before finalizing
        </div>
      )}
    </div>
  );
}
