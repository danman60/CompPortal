'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle, EyeOff, ChevronDown } from 'lucide-react';

/**
 * StatusBadge Component
 *
 * 3-state schedule status selector with confirmations:
 * - unpublished: Draft, not visible to studios
 * - tentative: Shared with studios, subject to change
 * - final: Locked, visible to studios (future locking mechanism)
 */

type ScheduleStatus = 'unpublished' | 'tentative' | 'final';

interface StatusBadgeProps {
  status: ScheduleStatus;
  onToggle: (newStatus: ScheduleStatus) => void;
  disabled?: boolean;
}

const STATUS_CONFIG = {
  unpublished: {
    label: 'UNPUBLISHED',
    icon: EyeOff,
    bgClass: 'bg-gray-500/20 text-gray-300 border-gray-500/50 hover:bg-gray-500/30',
    description: 'Draft - not visible to studios',
    nextStatus: 'tentative' as ScheduleStatus,
    confirmMessage: 'Share this schedule with studios as TENTATIVE? Studios will be able to see it but know it may change.',
  },
  tentative: {
    label: 'TENTATIVE',
    icon: AlertCircle,
    bgClass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50 hover:bg-yellow-500/30',
    description: 'Shared with studios - subject to change',
    nextStatus: 'final' as ScheduleStatus,
    confirmMessage: 'Mark this schedule as FINAL? This indicates the schedule is locked and will not change.',
  },
  final: {
    label: 'FINAL',
    icon: CheckCircle,
    bgClass: 'bg-green-500/20 text-green-300 border-green-500/50 hover:bg-green-500/30',
    description: 'Locked - visible to studios',
    nextStatus: 'unpublished' as ScheduleStatus,
    confirmMessage: 'Revert schedule to UNPUBLISHED? This will hide it from studios.',
  },
};

export function StatusBadge({
  status,
  onToggle,
  disabled = false,
}: StatusBadgeProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.unpublished;
  const Icon = config.icon;

  const handleStatusChange = (newStatus: ScheduleStatus) => {
    if (newStatus === status) {
      setShowDropdown(false);
      return;
    }

    const targetConfig = STATUS_CONFIG[status];
    let message = '';

    // Custom confirmation messages based on transition
    if (status === 'unpublished' && newStatus === 'tentative') {
      message = 'Share this schedule with studios as TENTATIVE? Studios will be able to see it but know it may change.';
    } else if (status === 'tentative' && newStatus === 'final') {
      message = 'Mark this schedule as FINAL? This indicates the schedule is locked and will not change.';
    } else if (status === 'tentative' && newStatus === 'unpublished') {
      message = 'Hide this schedule from studios? It will revert to UNPUBLISHED.';
    } else if (status === 'final' && newStatus === 'tentative') {
      message = 'Unlock this schedule? It will change to TENTATIVE (shared but may change).';
    } else if (status === 'final' && newStatus === 'unpublished') {
      message = 'Hide this schedule from studios? It will revert to UNPUBLISHED.';
    }

    if (confirm(message)) {
      onToggle(newStatus);
    }
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={disabled}
        className={`
          px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5
          transition-all border
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${config.bgClass}
        `}
        title={config.description}
      >
        <Icon className="h-4 w-4" />
        {config.label}
        <ChevronDown className={`h-3 w-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && !disabled && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowDropdown(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl min-w-[200px]">
            {(['unpublished', 'tentative', 'final'] as ScheduleStatus[]).map((s) => {
              const itemConfig = STATUS_CONFIG[s];
              const ItemIcon = itemConfig.icon;
              const isActive = s === status;

              return (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`
                    w-full px-3 py-2 text-left flex items-center gap-2 text-sm
                    hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg
                    ${isActive ? 'bg-gray-700/50' : ''}
                  `}
                >
                  <ItemIcon className={`h-4 w-4 ${
                    s === 'unpublished' ? 'text-gray-400' :
                    s === 'tentative' ? 'text-yellow-400' :
                    'text-green-400'
                  }`} />
                  <div>
                    <div className={`font-medium ${
                      s === 'unpublished' ? 'text-gray-300' :
                      s === 'tentative' ? 'text-yellow-300' :
                      'text-green-300'
                    }`}>
                      {itemConfig.label}
                      {isActive && <span className="ml-2 text-xs opacity-60">✓</span>}
                    </div>
                    <div className="text-xs text-gray-500">{itemConfig.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
