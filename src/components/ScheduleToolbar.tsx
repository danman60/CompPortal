'use client';

/**
 * ScheduleToolbar Component
 *
 * Top toolbar for scheduling page with:
 * - Schedule status badge (Draft/Finalized/Published)
 * - Action buttons (Save, Finalize, Publish)
 * - View mode toggle (CD/Judge/Studio/Public)
 * - Competition info display
 *
 * Created: Session 56 (Frontend Component Extraction)
 * Spec: SCHEDULING_SPEC_V4_UNIFIED.md
 */

import { useState } from 'react';

export type ScheduleStatus = 'draft' | 'finalized' | 'published';
export type ViewMode = 'cd' | 'judge' | 'studio' | 'public';

interface ScheduleToolbarProps {
  // Schedule state
  status: ScheduleStatus;
  competitionName: string;
  competitionDates: string;

  // View mode
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;

  // Actions
  onSaveDraft?: () => void;
  onFinalize?: () => void;
  onPublish?: () => void;
  onExport?: () => void;

  // Undo/Redo
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;

  // Studio Requests Panel
  onViewRequests?: () => void;
  requestsCount?: number;

  // Loading states
  isSaving?: boolean;
  isFinalizing?: boolean;
  isPublishing?: boolean;

  // Stats
  totalRoutines?: number;
  scheduledRoutines?: number;
  unscheduledRoutines?: number;
}

export function ScheduleToolbar({
  status,
  competitionName,
  competitionDates,
  viewMode,
  onViewModeChange,
  onSaveDraft,
  onFinalize,
  onPublish,
  onExport,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  onViewRequests,
  requestsCount = 0,
  isSaving = false,
  isFinalizing = false,
  isPublishing = false,
  totalRoutines = 0,
  scheduledRoutines = 0,
  unscheduledRoutines = 0,
}: ScheduleToolbarProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Status badge configuration
  const statusConfig = {
    draft: {
      label: '📝 Draft',
      bgColor: 'bg-gray-700',
      textColor: 'text-gray-200',
      borderColor: 'border-gray-600',
    },
    finalized: {
      label: '🔒 Finalized',
      bgColor: 'bg-blue-700',
      textColor: 'text-blue-200',
      borderColor: 'border-blue-600',
    },
    published: {
      label: '✅ Published',
      bgColor: 'bg-green-700',
      textColor: 'text-green-200',
      borderColor: 'border-green-600',
    },
  };

  const currentStatus = statusConfig[status];

  // View mode configuration
  const viewModes: { id: ViewMode; label: string; icon: string; description: string }[] = [
    { id: 'cd', label: 'CD View', icon: '👑', description: 'Full names + codes' },
    { id: 'judge', label: 'Judge View', icon: '⚖️', description: 'Codes only' },
    { id: 'studio', label: 'Studio View', icon: '🏫', description: 'Studio-specific' },
    { id: 'public', label: 'Public View', icon: '👁️', description: 'Published schedule' },
  ];

  return (
    <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 border-b border-white/10 px-6 py-4">
      {/* Top Row: Competition Info + Status + Actions */}
      <div className="flex items-center justify-between mb-4">
        {/* Left: Competition Info */}
        <div>
          <h1 className="text-4xl font-bold text-white">{competitionName}</h1>
          <p className="text-xl text-yellow-400 font-medium">{competitionDates}</p>
        </div>

        {/* Center: Status Badge */}
        <div
          className={`
            px-4 py-2 rounded-lg border-2 font-semibold text-sm
            ${currentStatus.bgColor} ${currentStatus.textColor} ${currentStatus.borderColor}
          `}
          data-status={status}
        >
          {currentStatus.label}
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Undo/Redo Controls */}
          {onUndo && onRedo && (
            <div className="flex items-center gap-1 bg-black/20 rounded-lg p-1 mr-2">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                title="Undo (Ctrl+Z)"
                data-action="undo"
              >
                ↶ Undo
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                className="px-3 py-2 text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-medium"
                title="Redo (Ctrl+Y)"
                data-action="redo"
              >
                ↷ Redo
              </button>
            </div>
          )}

          {/* Studio Requests Button (CD only) */}
          {onViewRequests && (
            <button
              onClick={onViewRequests}
              className="relative px-4 py-2 bg-indigo-700 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors"
              data-action="view-requests"
              title="View studio scheduling requests"
            >
              📝 Requests
              {requestsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                  {requestsCount}
                </span>
              )}
            </button>
          )}

          {/* Save Draft Button */}
          {status === 'draft' && onSaveDraft && (
            <button
              onClick={onSaveDraft}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-action="save-draft"
            >
              {isSaving ? '💾 Saving...' : '💾 Save Draft'}
            </button>
          )}

          {/* Finalize Button */}
          {status === 'draft' && onFinalize && (
            <button
              onClick={onFinalize}
              disabled={isFinalizing || unscheduledRoutines > 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-action="finalize"
              title={unscheduledRoutines > 0 ? `Cannot finalize: ${unscheduledRoutines} unscheduled routines` : 'Finalize schedule (locks editing)'}
            >
              {isFinalizing ? '🔒 Finalizing...' : '🔒 Finalize Schedule'}
            </button>
          )}

          {/* Publish Button */}
          {status === 'finalized' && onPublish && (
            <button
              onClick={onPublish}
              disabled={isPublishing}
              className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              data-action="publish"
            >
              {isPublishing ? '✅ Publishing...' : '✅ Publish Schedule'}
            </button>
          )}

          {/* Export Menu */}
          {onExport && (
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white font-medium rounded-lg transition-colors"
                data-action="export"
              >
                📥 Export
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-white/20 rounded-lg shadow-xl z-50">
                  <button
                    onClick={() => {
                      onExport();
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-white hover:bg-purple-700 rounded-t-lg transition-colors"
                  >
                    📄 Export PDF
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-white hover:bg-purple-700 transition-colors"
                  >
                    📊 Export Excel
                  </button>
                  <button
                    onClick={() => {
                      setShowExportMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-white hover:bg-purple-700 rounded-b-lg transition-colors"
                  >
                    📧 Email Studios
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: View Mode Toggle + Stats */}
      <div className="flex items-center justify-between">
        {/* Left: View Mode Toggle */}
        <div className="flex items-center gap-2 bg-black/20 rounded-lg p-1">
          {viewModes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => onViewModeChange(mode.id)}
              className={`
                px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${
                  viewMode === mode.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                    : 'bg-transparent text-gray-300 hover:bg-white/10'
                }
              `}
              data-view={mode.id}
              title={mode.description}
            >
              {mode.icon} {mode.label}
            </button>
          ))}
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Total Routines:</span>
            <span className="font-bold text-white">{totalRoutines}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Scheduled:</span>
            <span className="font-bold text-green-400">{scheduledRoutines}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Unscheduled:</span>
            <span className={`font-bold ${unscheduledRoutines > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
              {unscheduledRoutines}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
