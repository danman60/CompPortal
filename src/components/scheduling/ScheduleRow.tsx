'use client';

/**
 * ScheduleRow Component - Schedule V4 Redesign
 *
 * Draggable table row component for the chronological schedule view.
 * Features:
 * - 6-column layout: # | Time | Routine | Studio | Classification | Category
 * - Drag-and-drop reordering with DnD Kit
 * - Trophy helper highlighting for last routine in overalls category
 * - Conflict detection with visual indicators
 * - Classification color coding from database
 *
 * Trophy Helper Logic:
 * - If routine is last in its Overalls category (GroupSize • AgeGroup • Classification)
 * - Shows gold border, 🏆 icon, and badge
 * - Click opens modal with detailed award recommendations
 *
 * Related: SCHEDULE_REDESIGN_V4.md Phase 4.2
 */

import { useDraggable } from '@dnd-kit/core';
import { useState } from 'react';
import { Dialog } from '@headlessui/react';

interface Routine {
  id: string;
  title: string;
  studioName: string;
  studioCode: string;
  classificationName: string;
  classificationColor?: string | null; // From database classifications.color_code
  categoryName: string;
  ageGroupName: string;
  entrySizeName: string;
  participantCount: number;
}

interface TrophyHelperInfo {
  overallCategory: string; // "Solo • Pre-Junior • Emerald"
  suggestedAwardTime?: string; // HH:mm format
  routineCount: number; // Total routines in this category
}

interface ScheduleRowProps {
  routine: Routine;
  entryNumber: number; // Sequential #100, #101, #102...
  performanceTime: string; // HH:mm format
  isTrophyHelper: boolean; // True if last routine in overalls category
  trophyHelperInfo?: TrophyHelperInfo; // Award details
  hasConflict: boolean; // True if dancer has conflict
  conflictMessage?: string; // Conflict description
  viewMode: 'cd' | 'studio' | 'judge' | 'public';
  onClick?: (routineId: string) => void;
}

export function ScheduleRow({
  routine,
  entryNumber,
  performanceTime,
  isTrophyHelper,
  trophyHelperInfo,
  hasConflict,
  conflictMessage,
  viewMode,
  onClick,
}: ScheduleRowProps) {
  const [showTrophyModal, setShowTrophyModal] = useState(false);

  // DnD Kit draggable
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: routine.id,
    data: {
      type: 'routine',
      routine,
    },
  });

  // Apply drag transform
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  // Determine studio name based on view mode
  const studioDisplay =
    viewMode === 'judge' || viewMode === 'public'
      ? routine.studioCode
      : routine.studioName;

  // Get classification background color
  const classificationStyle = routine.classificationColor
    ? { backgroundColor: routine.classificationColor }
    : { backgroundColor: '#6b7280' }; // Gray-500 default

  // Row classes
  const rowClasses = [
    'relative',
    'border-b',
    'border-gray-200',
    'hover:bg-gray-50',
    'transition-colors',
    'cursor-pointer',
    isDragging ? 'opacity-50' : '',
    isTrophyHelper ? 'border-l-4 border-l-yellow-400' : '',
    hasConflict ? 'border-2 border-red-500 bg-red-50' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const handleRowClick = () => {
    if (isTrophyHelper) {
      setShowTrophyModal(true);
    }
    if (onClick) {
      onClick(routine.id);
    }
  };

  return (
    <>
      <tr
        ref={setNodeRef}
        style={style}
        className={rowClasses}
        onClick={handleRowClick}
        {...attributes}
        {...listeners}
      >
        {/* Entry Number */}
        <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
          #{entryNumber}
        </td>

        {/* Performance Time */}
        <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
          {performanceTime}
        </td>

        {/* Routine Title */}
        <td className="px-4 py-3 text-sm font-medium text-gray-900">
          <div className="flex items-center gap-2">
            {isTrophyHelper && (
              <span className="text-yellow-500 text-base" title="Award Recommendation">
                🏆
              </span>
            )}
            <span className="truncate max-w-[200px]" title={routine.title}>
              {routine.title}
            </span>
          </div>
          {isTrophyHelper && trophyHelperInfo && (
            <div className="mt-1 inline-block">
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-md border border-yellow-300 font-medium">
                Last: {trophyHelperInfo.overallCategory}
              </span>
            </div>
          )}
        </td>

        {/* Studio Name/Code */}
        <td className="px-4 py-3 text-sm text-gray-700">
          {studioDisplay}
        </td>

        {/* Classification (with color background) */}
        <td className="px-4 py-3">
          <span
            className="inline-block px-3 py-1 text-xs font-semibold text-white rounded-full"
            style={classificationStyle}
          >
            {routine.classificationName}
          </span>
        </td>

        {/* Category (Dance Style) */}
        <td className="px-4 py-3 text-sm text-gray-700">
          {routine.categoryName}
        </td>

        {/* Conflict Badge (fixed position within row) */}
        {hasConflict && (
          <td className="absolute top-1/2 -translate-y-1/2 right-2 z-30 pointer-events-none">
            <span
              className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-md border border-red-500 font-medium shadow-lg whitespace-nowrap"
              title={conflictMessage || 'Conflict detected'}
            >
              ⚠️ Conflict
            </span>
          </td>
        )}
      </tr>

      {/* Trophy Helper Modal */}
      {isTrophyHelper && trophyHelperInfo && (
        <Dialog
          open={showTrophyModal}
          onClose={() => setShowTrophyModal(false)}
          className="relative z-50"
        >
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

          {/* Modal Container */}
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Dialog.Panel className="mx-auto max-w-md rounded-xl bg-white shadow-2xl border-2 border-yellow-400">
              {/* Header */}
              <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 px-6 py-4 rounded-t-xl">
                <Dialog.Title className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-2xl">🏆</span>
                  Award Recommendation
                </Dialog.Title>
              </div>

              {/* Content */}
              <div className="px-6 py-5 space-y-4">
                <div>
                  <div className="text-sm text-gray-500 mb-1">Last Routine In Category:</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {trophyHelperInfo.overallCategory}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">This Routine:</span>
                    <span className="font-medium text-gray-900">
                      #{entryNumber} "{routine.title}"
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Performance Time:</span>
                    <span className="font-medium text-gray-900">{performanceTime}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total in Category:</span>
                    <span className="font-medium text-gray-900">
                      {trophyHelperInfo.routineCount} routine{trophyHelperInfo.routineCount !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {trophyHelperInfo.suggestedAwardTime && (
                    <div className="flex justify-between items-center bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                      <span className="text-sm text-yellow-800 font-medium">Suggested Award Time:</span>
                      <span className="font-bold text-yellow-900">
                        {trophyHelperInfo.suggestedAwardTime}
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                  <strong>💡 Tip:</strong> Consider scheduling an award ceremony block after this routine
                  to present overalls for {trophyHelperInfo.overallCategory}.
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex justify-end">
                <button
                  onClick={() => setShowTrophyModal(false)}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      )}
    </>
  );
}
