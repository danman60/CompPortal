'use client';

/**
 * Schedule Block Modal
 *
 * Create or edit award/break blocks:
 * - Custom title input
 * - Duration selector (15/30/45/60 minutes)
 * - Block type (award/break)
 * - Save to database via createScheduleBlock mutation
 */

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { trpc } from '@/lib/trpc';

interface ScheduleBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (block: {
    type: 'award' | 'break';
    title: string;
    duration: number;
    placement?: {
      type: 'after_routine' | 'by_time';
      routineNumber?: number;
      time?: string; // HH:MM format
    };
    blockId?: string; // ID of created block (for placement)
  }) => void;
  competitionId: string;
  tenantId: string;
  initialBlock?: {
    id: string;
    type: 'award' | 'break';
    title: string;
    duration: number;
    placement?: {
      routineNumber?: number; // For edit mode: pre-populate with current position
    };
  } | null;
  mode?: 'create' | 'edit';
  preselectedType?: 'award' | 'break';
}

const DURATION_OPTIONS = [15, 30, 45, 60];

export function ScheduleBlockModal({
  isOpen,
  onClose,
  onSave,
  competitionId,
  tenantId,
  initialBlock = null,
  mode = 'create',
  preselectedType,
}: ScheduleBlockModalProps) {
  const [blockType, setBlockType] = useState<'award' | 'break'>(
    preselectedType || initialBlock?.type || 'award'
  );
  const [title, setTitle] = useState(initialBlock?.title || '');
  const [duration, setDuration] = useState(initialBlock?.duration || 30);
  const [error, setError] = useState('');

  // Placement options
  const [placementType, setPlacementType] = useState<'after_routine' | 'by_time'>('after_routine');
  const [routineNumber, setRoutineNumber] = useState<number | ''>('');
  const [timeValue, setTimeValue] = useState<string>('09:00');

  // Reset form when modal opens with new initial data
  useEffect(() => {
    if (isOpen) {
      setBlockType(preselectedType || initialBlock?.type || 'award');
      setTitle(initialBlock?.title || '');
      setDuration(initialBlock?.duration || 30);
      setError('');
      setPlacementType('after_routine');
      // Pre-populate routine number if editing an existing block
      setRoutineNumber(initialBlock?.placement?.routineNumber || '');
      setTimeValue('09:00');
    }
  }, [isOpen, initialBlock, preselectedType]);

  const createBlock = trpc.scheduling.createScheduleBlock.useMutation({
    onSuccess: (data) => {
      // Pass blockId to parent along with other data
      onSave({
        type: blockType,
        title: title.trim() || getDefaultTitle(),
        duration,
        placement: {
          type: placementType,
          routineNumber: placementType === 'after_routine' && routineNumber !== '' ? routineNumber : undefined,
          time: placementType === 'by_time' ? timeValue : undefined,
        },
        blockId: data.id, // Include the created block ID
      });
      handleClose();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate
    if (duration < 5 || duration > 120) {
      setError('Duration must be between 5 and 120 minutes');
      return;
    }

    // Validate placement
    if (placementType === 'after_routine' && routineNumber === '') {
      setError('Please enter a routine number for placement');
      return;
    }

    const finalTitle = title.trim() || getDefaultTitle();

    // If editing, just return the data (parent handles update)
    if (mode === 'edit') {
      onSave({
        type: blockType,
        title: finalTitle,
        duration,
        placement: {
          type: placementType,
          routineNumber: placementType === 'after_routine' && routineNumber !== '' ? routineNumber : undefined,
          time: placementType === 'by_time' ? timeValue : undefined,
        },
      });
      handleClose();
      return;
    }

    // If creating, call backend mutation (onSuccess will call onSave)
    createBlock.mutate({
      competitionId,
      tenantId,
      blockType,
      title: finalTitle,
      durationMinutes: duration,
    });
  };

  const handleClose = () => {
    setTitle('');
    setDuration(30);
    setError('');
    onClose();
  };

  const getDefaultTitle = () => {
    if (blockType === 'award') {
      return 'Award Ceremony';
    }
    return `${duration} Minute Break`;
  };

  const getPlaceholder = () => {
    if (blockType === 'award') {
      return 'e.g., "Jazz Awards Ceremony", "Senior Division Awards"';
    }
    return 'e.g., "Lunch Break", "Costume Change Break"';
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 grid place-items-center z-50 p-4">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-6 max-w-md w-full shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">
              {mode === 'edit' ? '✏️ Edit' : '➕ Add'} Schedule Block
            </h3>
            <p className="text-gray-400 text-sm">
              {blockType === 'award' ? 'Award ceremony timing' : 'Scheduled break period'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Block Type Selector - Only show if not preselected */}
          {!preselectedType && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-purple-300 mb-3">
                Block Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setBlockType('award')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    blockType === 'award'
                      ? 'bg-amber-600/20 border-amber-500 shadow-lg'
                      : 'bg-white/5 border-white/20 hover:border-amber-500/50'
                  }`}
                >
                  <div className="text-3xl mb-2">🏆</div>
                  <div className="text-sm font-medium text-white">Award</div>
                  <div className="text-xs text-gray-400 mt-1">Ceremony</div>
                </button>
                <button
                  type="button"
                  onClick={() => setBlockType('break')}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    blockType === 'break'
                      ? 'bg-cyan-600/20 border-cyan-500 shadow-lg'
                      : 'bg-white/5 border-white/20 hover:border-cyan-500/50'
                  }`}
                >
                  <div className="text-3xl mb-2">☕</div>
                  <div className="text-sm font-medium text-white">Break</div>
                  <div className="text-xs text-gray-400 mt-1">Scheduled</div>
                </button>
              </div>
            </div>
          )}

          {/* Title Input */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-sm font-medium text-purple-300 mb-2">
              Title <span className="text-gray-500">(optional)</span>
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              maxLength={100}
            />
            <div className="text-xs text-gray-500 mt-1">
              Leave empty for default: "{getDefaultTitle()}"
            </div>
          </div>

          {/* Duration Selector */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-purple-300 mb-3">
              Duration
            </label>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => setDuration(minutes)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    duration === minutes
                      ? 'bg-purple-600/30 border-purple-500 shadow-lg'
                      : 'bg-white/5 border-white/20 hover:border-purple-500/50'
                  }`}
                >
                  <div className="text-lg font-bold text-white">{minutes}</div>
                  <div className="text-xs text-gray-400">min</div>
                </button>
              ))}
            </div>

            {/* Custom Duration */}
            <div className="mt-3">
              <label htmlFor="customDuration" className="text-xs text-gray-400 mb-1 block">
                Or enter custom duration (5-120 min):
              </label>
              <input
                type="number"
                id="customDuration"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                min={5}
                max={120}
                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
              />
              <div className="text-xs text-purple-300 mt-2 flex items-center gap-1">
                <span>⏰</span>
                <span>Block start times auto-round to nearest 5-minute increment</span>
              </div>
            </div>
          </div>

          {/* Placement Options */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-purple-300 mb-3">
              Placement
            </label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setPlacementType('after_routine')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  placementType === 'after_routine'
                    ? 'bg-purple-600/30 border-purple-500 shadow-lg'
                    : 'bg-white/5 border-white/20 hover:border-purple-500/50'
                }`}
              >
                <div className="text-2xl mb-2">#️⃣</div>
                <div className="text-sm font-medium text-white">After Routine</div>
                <div className="text-xs text-gray-400 mt-1">Enter routine number</div>
              </button>
              <button
                type="button"
                onClick={() => setPlacementType('by_time')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  placementType === 'by_time'
                    ? 'bg-cyan-600/30 border-cyan-500 shadow-lg'
                    : 'bg-white/5 border-white/20 hover:border-cyan-500/50'
                }`}
              >
                <div className="text-2xl mb-2">🕐</div>
                <div className="text-sm font-medium text-white">By Time</div>
                <div className="text-xs text-gray-400 mt-1">Enter specific time</div>
              </button>
            </div>

            {/* After Routine Input */}
            {placementType === 'after_routine' && (
              <div>
                <label htmlFor="routineNumber" className="text-xs text-gray-400 mb-1 block">
                  Routine number to place after:
                </label>
                <input
                  type="number"
                  id="routineNumber"
                  value={routineNumber}
                  onChange={(e) => setRoutineNumber(e.target.value === '' ? '' : parseInt(e.target.value))}
                  min={1}
                  placeholder="e.g., 42"
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                />
                <div className="text-xs text-purple-300 mt-2">
                  💡 Block will be inserted after this routine in the schedule
                </div>
              </div>
            )}

            {/* By Time Input */}
            {placementType === 'by_time' && (
              <div>
                <label htmlFor="timeValue" className="text-xs text-gray-400 mb-1 block">
                  Time to place block (HH:MM format):
                </label>
                <input
                  type="time"
                  id="timeValue"
                  value={timeValue}
                  onChange={(e) => setTimeValue(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                />
                <div className="text-xs text-cyan-300 mt-2 flex items-center gap-1">
                  <span>⏰</span>
                  <span>Times auto-round to nearest 5-minute increment</span>
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Preview */}
          <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
            <div className="text-xs text-purple-300 mb-2">Preview:</div>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                blockType === 'award'
                  ? 'bg-gradient-to-br from-amber-500 to-yellow-600'
                  : 'bg-gradient-to-br from-cyan-500 to-blue-600'
              }`}>
                <span className="text-xl">{blockType === 'award' ? '🏆' : '☕'}</span>
              </div>
              <div>
                <div className="font-medium text-white">
                  {title.trim() || getDefaultTitle()}
                </div>
                <div className="text-xs text-purple-300">
                  {duration} minute{duration !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={createBlock.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createBlock.isPending}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {createBlock.isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Saving...</span>
                </>
              ) : (
                <span>{mode === 'edit' ? '💾 Save Changes' : '➕ Add Block'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // Render modal using portal to document.body to prevent CSS interference
  return typeof window !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
}
