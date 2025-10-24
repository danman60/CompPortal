'use client';

interface ConflictPanelProps {
  conflicts: any[];
  onClose: () => void;
}

/**
 * Panel showing scheduling conflicts (back-to-back dancers, etc.)
 */
export function ConflictPanel({ conflicts, onClose }: ConflictPanelProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600/20 border-red-400/30 text-red-300';
      case 'warning':
        return 'bg-yellow-600/20 border-yellow-400/30 text-yellow-300';
      case 'info':
        return 'bg-blue-600/20 border-blue-400/30 text-blue-300';
      default:
        return 'bg-white/10 border-white/20 text-white/70';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❓';
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          ⚠️ Conflicts ({conflicts.length})
        </h3>
        <button
          onClick={onClose}
          className="text-white/40 hover:text-white/70 transition-colors"
        >
          ✕
        </button>
      </div>

      {conflicts.length === 0 ? (
        <p className="text-white/70 text-sm text-center py-4">
          ✅ No conflicts detected! Schedule looks good.
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {conflicts.map((conflict) => (
            <div
              key={conflict.id}
              className={`rounded-lg border p-3 ${getSeverityColor(conflict.severity)}`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xl">{getSeverityIcon(conflict.severity)}</span>
                <div className="flex-1">
                  <div className="font-semibold text-sm mb-1 capitalize">
                    {conflict.conflict_type.replace(/_/g, ' ')}
                  </div>
                  <p className="text-xs opacity-90">{conflict.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
