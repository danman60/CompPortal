'use client';

/**
 * RoutineTable Component (Rebuild Spec Section 1)
 *
 * Fixed-width table for unscheduled routines with:
 * - Exact pixel column widths (NO Tailwind width classes)
 * - Draggable rows for scheduling
 * - Dark purple/indigo theme maintained
 * - Minimal, focused implementation
 *
 * Created: Phase 4 - Schedule Page Rebuild
 * Spec: SCHEDULE_PAGE_REBUILD_SPEC.md Section 1 (Lines 94-144)
 */

import React from 'react';
import { useDraggable } from '@dnd-kit/core';

export interface RoutineTableRow {
  id: string;
  title: string;
  studioCode: string;
  classificationName: string;
  entrySizeName: string;
  routineAge: number | null;
  ageGroupName: string;
  categoryName: string;
  duration: number;
}

interface RoutineTableProps {
  routines: RoutineTableRow[];
  isLoading?: boolean;
}

// Helper: Get classification color
function getClassificationColor(classification: string): string {
  const lower = classification.toLowerCase();
  if (lower.includes('emerald')) return 'bg-emerald-600 text-white';
  if (lower.includes('sapphire')) return 'bg-blue-600 text-white';
  if (lower.includes('crystal')) return 'bg-cyan-600 text-white';
  if (lower.includes('titanium')) return 'bg-slate-600 text-white';
  if (lower.includes('production')) return 'bg-purple-600 text-white';
  return 'bg-gray-500 text-white';
}

// Draggable Table Row
function DraggableRoutineRow({ routine }: { routine: RoutineTableRow }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: routine.id,
  });

  const style = isDragging ? { opacity: 0.5 } : {};

  return (
    <tr
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="border-b border-white/10 hover:bg-white/5 transition-colors cursor-grab active:cursor-grabbing"
    >
      {/* Checkbox - 32px */}
      <td className="px-1 py-2 align-middle" style={{ width: '32px' }}>
        <div className="w-4 h-4" /> {/* Placeholder for checkbox */}
      </td>

      {/* Entry # - 60px (blank for unscheduled) */}
      <td className="px-1 py-2 text-xs text-white/60 align-middle text-center" style={{ width: '60px' }}>
        -
      </td>

      {/* Time - 80px (blank for unscheduled) */}
      <td className="px-1 py-2 text-xs text-white/60 align-middle" style={{ width: '80px' }}>
        -
      </td>

      {/* Routine - 180px */}
      <td className="px-1 py-2 text-xs font-medium text-white align-middle" style={{ width: '180px' }}>
        <div className="truncate-cell" title={routine.title}>
          {routine.title}
        </div>
      </td>

      {/* Studio - 60px */}
      <td className="px-1 py-2 text-xs text-white/80 align-middle text-center" style={{ width: '60px' }}>
        {routine.studioCode}
      </td>

      {/* Classification - 100px */}
      <td className="px-1 py-2 align-middle" style={{ width: '100px' }}>
        <span className={`inline-block px-1.5 py-0.5 rounded-md text-xs font-semibold truncate ${getClassificationColor(routine.classificationName)}`}>
          {routine.classificationName}
        </span>
      </td>

      {/* Size - 80px */}
      <td className="px-1 py-2 text-xs text-white/80 align-middle" style={{ width: '80px' }}>
        <div className="truncate-cell">{routine.entrySizeName}</div>
      </td>

      {/* Routine Age - 60px */}
      <td className="px-1 py-2 text-xs text-white/80 align-middle text-center" style={{ width: '60px' }}>
        {routine.routineAge ?? '-'}
      </td>

      {/* Age Group - 100px */}
      <td className="px-1 py-2 text-xs text-white/80 align-middle" style={{ width: '100px' }}>
        <div className="truncate-cell">{routine.ageGroupName}</div>
      </td>

      {/* Category - 100px */}
      <td className="px-1 py-2 text-xs text-white/80 align-middle" style={{ width: '100px' }}>
        <div className="truncate-cell">{routine.categoryName}</div>
      </td>

      {/* Duration - 80px */}
      <td className="px-1 py-2 text-xs text-white/80 align-middle" style={{ width: '80px' }}>
        ⏱️ {routine.duration} min
      </td>
    </tr>
  );
}

export function RoutineTable({ routines, isLoading = false }: RoutineTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400"></div>
      </div>
    );
  }

  if (routines.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-white/60 text-sm">All routines scheduled!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="schedule-table" style={{ tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th className="px-1 py-2 text-left text-xs font-semibold text-white bg-indigo-600/20 border-b border-indigo-600/30" style={{ width: '32px' }}>
              {/* Checkbox header */}
            </th>
            <th className="px-1 py-2 text-left text-xs font-semibold text-white bg-indigo-600/20 border-b border-indigo-600/30" style={{ width: '60px' }}>
              #
            </th>
            <th className="px-1 py-2 text-left text-xs font-semibold text-white bg-indigo-600/20 border-b border-indigo-600/30" style={{ width: '80px' }}>
              Time
            </th>
            <th className="px-1 py-2 text-left text-xs font-semibold text-white bg-indigo-600/20 border-b border-indigo-600/30" style={{ width: '180px' }}>
              Routine
            </th>
            <th className="px-1 py-2 text-left text-xs font-semibold text-white bg-indigo-600/20 border-b border-indigo-600/30" style={{ width: '60px' }}>
              Studio
            </th>
            <th className="px-1 py-2 text-left text-xs font-semibold text-white bg-indigo-600/20 border-b border-indigo-600/30" style={{ width: '100px' }}>
              Classification
            </th>
            <th className="px-1 py-2 text-left text-xs font-semibold text-white bg-indigo-600/20 border-b border-indigo-600/30" style={{ width: '80px' }}>
              Size
            </th>
            <th className="px-1 py-2 text-left text-xs font-semibold text-white bg-indigo-600/20 border-b border-indigo-600/30" style={{ width: '60px' }}>
              Age
            </th>
            <th className="px-1 py-2 text-left text-xs font-semibold text-white bg-indigo-600/20 border-b border-indigo-600/30" style={{ width: '100px' }}>
              Age Group
            </th>
            <th className="px-1 py-2 text-left text-xs font-semibold text-white bg-indigo-600/20 border-b border-indigo-600/30" style={{ width: '100px' }}>
              Category
            </th>
            <th className="px-1 py-2 text-left text-xs font-semibold text-white bg-indigo-600/20 border-b border-indigo-600/30" style={{ width: '80px' }}>
              Duration
            </th>
          </tr>
        </thead>
        <tbody>
          {routines.map((routine) => (
            <DraggableRoutineRow key={routine.id} routine={routine} />
          ))}
        </tbody>
      </table>

      <style jsx>{`
        .truncate-cell {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          padding-right: 8px;
        }
      `}</style>
    </div>
  );
}
