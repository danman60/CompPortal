'use client';

import { SchedulingConflict } from '@/lib/scheduling';

interface ConflictPanelProps {
  conflicts: SchedulingConflict[];
  onRefresh: () => Promise<any>;
}

export default function ConflictPanel({ conflicts, onRefresh }: ConflictPanelProps) {
  const errors = conflicts.filter(c => c.severity === 'error');
  const warnings = conflicts.filter(c => c.severity === 'warning');

  const getConflictIcon = (type: SchedulingConflict['type']) => {
    switch (type) {
      case 'dancer_overlap':
        return '👥';
      case 'costume_change':
        return '👗';
      case 'session_capacity':
        return '📊';
      case 'time_overflow':
        return '⏰';
      case 'studio_preference':
        return '🏢';
      default:
        return '⚠️';
    }
  };

  const getConflictTypeLabel = (type: SchedulingConflict['type']) => {
    switch (type) {
      case 'dancer_overlap':
        return 'Dancer Overlap';
      case 'costume_change':
        return 'Costume Change Time';
      case 'session_capacity':
        return 'Session Capacity';
      case 'time_overflow':
        return 'Time Overflow';
      case 'studio_preference':
        return 'Studio Preference';
      default:
        return 'Unknown';
    }
  };

  if (conflicts.length === 0) {
    return (
      <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-md rounded-xl border border-green-400/30 p-8 text-center">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-2xl font-bold text-white mb-2">No Conflicts Detected</h3>
        <p className="text-gray-300">
          The current schedule has no conflicts. All entries are properly scheduled!
        </p>
        <button
          onClick={onRefresh}
          className="mt-4 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all"
        >
          🔄 Re-check Conflicts
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
              <span>⚠️</span>
              Schedule Conflicts
            </h3>
            <p className="text-gray-300">
              Found {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
              {' '}({errors.length} error{errors.length !== 1 ? 's' : ''}, {warnings.length} warning{warnings.length !== 1 ? 's' : ''})
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-all"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-red-400">{errors.length}</div>
            <div className="text-sm text-gray-300">Errors (must fix)</div>
          </div>
          <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-4">
            <div className="text-3xl font-bold text-yellow-400">{warnings.length}</div>
            <div className="text-sm text-gray-300">Warnings (review)</div>
          </div>
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <div className="bg-red-500/20 border-b border-red-400/30 p-4">
            <h4 className="text-xl font-bold text-red-400 flex items-center gap-2">
              <span>🚨</span>
              Errors ({errors.length})
            </h4>
            <p className="text-sm text-gray-300 mt-1">
              These conflicts prevent the schedule from being valid and must be resolved
            </p>
          </div>
          <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
            {errors.map((conflict, index) => (
              <div
                key={index}
                className="bg-red-500/10 border border-red-400/30 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{getConflictIcon(conflict.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
                        ERROR
                      </span>
                      <span className="text-white font-semibold">
                        {getConflictTypeLabel(conflict.type)}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{conflict.message}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {conflict.entryIds.map((entryId) => (
                        <span
                          key={entryId}
                          className="px-2 py-1 bg-white/10 text-gray-300 rounded"
                        >
                          Entry: {entryId.slice(0, 8)}...
                        </span>
                      ))}
                      {conflict.dancerIds?.map((dancerId) => (
                        <span
                          key={dancerId}
                          className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded"
                        >
                          Dancer: {dancerId.slice(0, 8)}...
                        </span>
                      ))}
                      {conflict.sessionId && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                          Session: {conflict.sessionId.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
          <div className="bg-yellow-500/20 border-b border-yellow-400/30 p-4">
            <h4 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
              <span>⚠️</span>
              Warnings ({warnings.length})
            </h4>
            <p className="text-sm text-gray-300 mt-1">
              These are potential issues that should be reviewed but don't prevent scheduling
            </p>
          </div>
          <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
            {warnings.map((conflict, index) => (
              <div
                key={index}
                className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="text-3xl">{getConflictIcon(conflict.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded">
                        WARNING
                      </span>
                      <span className="text-white font-semibold">
                        {getConflictTypeLabel(conflict.type)}
                      </span>
                    </div>
                    <p className="text-gray-300 text-sm mb-2">{conflict.message}</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {conflict.entryIds.map((entryId) => (
                        <span
                          key={entryId}
                          className="px-2 py-1 bg-white/10 text-gray-300 rounded"
                        >
                          Entry: {entryId.slice(0, 8)}...
                        </span>
                      ))}
                      {conflict.dancerIds?.map((dancerId) => (
                        <span
                          key={dancerId}
                          className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded"
                        >
                          Dancer: {dancerId.slice(0, 8)}...
                        </span>
                      ))}
                      {conflict.sessionId && (
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">
                          Session: {conflict.sessionId.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
