'use client';

import { useState } from 'react';
import { Conflict, ConflictSeverity } from '@/hooks/useConflictDetection';

const SeverityIcons: Record<ConflictSeverity, string> = {
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️',
};

const SeverityColors: Record<ConflictSeverity, string> = {
  error: 'border-red-500/30 bg-red-500/10',
  warning: 'border-yellow-500/30 bg-yellow-500/10',
  info: 'border-blue-500/30 bg-blue-500/10',
};

const SeverityTextColors: Record<ConflictSeverity, string> = {
  error: 'text-red-400',
  warning: 'text-yellow-400',
  info: 'text-blue-400',
};

interface ConflictItemProps {
  conflict: Conflict;
  onDismiss?: (conflictId: string) => void;
  onViewItem?: (itemId: string) => void;
  className?: string;
}

/**
 * Conflict Item
 * Displays a single conflict with details and actions
 */
export function ConflictItem({
  conflict,
  onDismiss,
  onViewItem,
  className = '',
}: ConflictItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`
        border rounded-lg p-4 transition-all
        ${SeverityColors[conflict.severity]}
        ${className}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className="text-2xl flex-shrink-0">{SeverityIcons[conflict.severity]}</span>
          <div className="flex-1 min-w-0">
            <h4 className={`font-semibold ${SeverityTextColors[conflict.severity]}`}>
              {conflict.title}
            </h4>
            <p className="text-sm text-gray-300 mt-1">{conflict.description}</p>

            {/* Affected items count */}
            {conflict.affectedItems.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-gray-400 hover:text-white transition-colors mt-2 flex items-center gap-1"
              >
                <span>
                  {conflict.affectedItems.length} affected item{conflict.affectedItems.length !== 1 ? 's' : ''}
                </span>
                <svg
                  className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Dismiss button */}
        {onDismiss && (
          <button
            onClick={() => onDismiss(conflict.id)}
            className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400 hover:text-white flex-shrink-0"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Expanded: Affected items */}
      {isExpanded && conflict.affectedItems.length > 0 && (
        <div className="mt-3 pl-11 space-y-1">
          {conflict.affectedItems.map((item) => (
            <div
              key={item.id}
              className="text-sm text-gray-300 flex items-center justify-between gap-2 py-1"
            >
              <span>• {item.label}</span>
              {onViewItem && (
                <button
                  onClick={() => onViewItem(item.id)}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  View
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Resolution suggestion */}
      {conflict.resolution && (
        <div className="mt-3 pl-11 text-sm text-gray-400 italic">
          💡 {conflict.resolution}
        </div>
      )}
    </div>
  );
}

interface ConflictListProps {
  conflicts: Conflict[];
  title?: string;
  emptyMessage?: string;
  onDismiss?: (conflictId: string) => void;
  onViewItem?: (itemId: string) => void;
  groupBySeverity?: boolean;
  className?: string;
}

/**
 * Conflict List
 * Displays a list of conflicts, optionally grouped by severity
 */
export function ConflictList({
  conflicts,
  title = 'Conflicts Detected',
  emptyMessage = 'No conflicts detected',
  onDismiss,
  onViewItem,
  groupBySeverity = true,
  className = '',
}: ConflictListProps) {
  if (conflicts.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-4xl mb-2">✅</div>
        <p className="text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  if (!groupBySeverity) {
    return (
      <div className={`space-y-3 ${className}`}>
        {title && <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>}
        {conflicts.map((conflict) => (
          <ConflictItem
            key={conflict.id}
            conflict={conflict}
            onDismiss={onDismiss}
            onViewItem={onViewItem}
          />
        ))}
      </div>
    );
  }

  const errors = conflicts.filter(c => c.severity === 'error');
  const warnings = conflicts.filter(c => c.severity === 'warning');
  const infos = conflicts.filter(c => c.severity === 'info');

  return (
    <div className={`space-y-6 ${className}`}>
      {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}

      {/* Errors */}
      {errors.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-red-400 mb-3">
            Errors ({errors.length})
          </h4>
          <div className="space-y-3">
            {errors.map((conflict) => (
              <ConflictItem
                key={conflict.id}
                conflict={conflict}
                onDismiss={onDismiss}
                onViewItem={onViewItem}
              />
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-yellow-400 mb-3">
            Warnings ({warnings.length})
          </h4>
          <div className="space-y-3">
            {warnings.map((conflict) => (
              <ConflictItem
                key={conflict.id}
                conflict={conflict}
                onDismiss={onDismiss}
                onViewItem={onViewItem}
              />
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      {infos.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-blue-400 mb-3">
            Information ({infos.length})
          </h4>
          <div className="space-y-3">
            {infos.map((conflict) => (
              <ConflictItem
                key={conflict.id}
                conflict={conflict}
                onDismiss={onDismiss}
                onViewItem={onViewItem}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ConflictBadgeProps {
  errorCount: number;
  warningCount: number;
  infoCount?: number;
  onClick?: () => void;
  className?: string;
}

/**
 * Conflict Badge
 * Compact indicator showing conflict counts
 */
export function ConflictBadge({
  errorCount,
  warningCount,
  infoCount = 0,
  onClick,
  className = '',
}: ConflictBadgeProps) {
  const totalCount = errorCount + warningCount + infoCount;

  if (totalCount === 0) return null;

  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full transition-all
        ${errorCount > 0 ? 'bg-red-500/20 border border-red-500/50 text-red-300' :
        warningCount > 0 ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-300' :
        'bg-blue-500/20 border border-blue-500/50 text-blue-300'}
        hover:scale-105
        ${className}
      `}
      aria-label={`${totalCount} conflict${totalCount !== 1 ? 's' : ''} detected`}
    >
      {errorCount > 0 && (
        <span className="flex items-center gap-1">
          <span className="text-sm">❌</span>
          <span className="text-xs font-bold">{errorCount}</span>
        </span>
      )}
      {warningCount > 0 && (
        <span className="flex items-center gap-1">
          <span className="text-sm">⚠️</span>
          <span className="text-xs font-bold">{warningCount}</span>
        </span>
      )}
      {infoCount > 0 && errorCount === 0 && warningCount === 0 && (
        <span className="flex items-center gap-1">
          <span className="text-sm">ℹ️</span>
          <span className="text-xs font-bold">{infoCount}</span>
        </span>
      )}
    </button>
  );
}

interface ConflictPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: Conflict[];
  onDismiss?: (conflictId: string) => void;
  onViewItem?: (itemId: string) => void;
  onRecheck?: () => void;
  isRechecking?: boolean;
  className?: string;
}

/**
 * Conflict Panel
 * Sliding panel for viewing and managing conflicts
 */
export function ConflictPanel({
  isOpen,
  onClose,
  conflicts,
  onDismiss,
  onViewItem,
  onRecheck,
  isRechecking = false,
  className = '',
}: ConflictPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`fixed right-0 top-0 bottom-0 w-full md:w-96 bg-gradient-to-br from-gray-900 to-gray-800 border-l border-white/20 z-50 overflow-hidden shadow-2xl animate-slide-left ${className}`}>
        {/* Header */}
        <div className="sticky top-0 bg-gray-900/95 backdrop-blur-md border-b border-white/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/50 flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Conflicts</h2>
                <p className="text-xs text-gray-400">{conflicts.length} detected</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Recheck button */}
          {onRecheck && (
            <button
              onClick={onRecheck}
              disabled={isRechecking}
              className="w-full px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isRechecking ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Rechecking...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Recheck</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Conflict list */}
        <div className="overflow-y-auto h-full pb-20 p-4">
          <ConflictList
            conflicts={conflicts}
            title=""
            onDismiss={onDismiss}
            onViewItem={onViewItem}
            groupBySeverity
          />
        </div>
      </div>
    </>
  );
}
