'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * Site Pause Button
 * Super Admin only - toggles site-wide maintenance mode
 * Shows traffic light indicator (🟢 Live / 🔴 Paused)
 */
export default function SitePauseButton() {
  const [isToggling, setIsToggling] = useState(false);
  const utils = trpc.useUtils();

  // Get current site status
  const { data: siteStatus } = trpc.siteControl.getSiteStatus.useQuery(undefined, {
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Toggle mutation
  const toggleMutation = trpc.siteControl.toggleSitePause.useMutation({
    onSuccess: () => {
      // Refetch site status
      utils.siteControl.getSiteStatus.invalidate();
      setIsToggling(false);
    },
    onError: (error) => {
      console.error('Failed to toggle site pause:', error);
      alert('Failed to toggle site pause. Check console for details.');
      setIsToggling(false);
    },
  });

  const handleToggle = () => {
    if (isToggling) return;

    const confirmMessage = siteStatus?.isPaused
      ? 'Are you sure you want to UNPAUSE the site? All users will regain access.'
      : 'Are you sure you want to PAUSE the site? All users (except Super Admin) will see maintenance page.';

    if (confirm(confirmMessage)) {
      setIsToggling(true);
      toggleMutation.mutate();
    }
  };

  const isPaused = siteStatus?.isPaused || false;

  return (
    <div className="flex items-center gap-3">
      {/* Status Indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg">
        <div
          className={`w-3 h-3 rounded-full ${
            isPaused ? 'bg-red-500 animate-pulse' : 'bg-green-500'
          }`}
          title={isPaused ? 'Site Paused' : 'Site Live'}
        />
        <span className="text-xs text-gray-300 font-semibold">
          {isPaused ? 'PAUSED' : 'LIVE'}
        </span>
      </div>

      {/* Pause/Unpause Button */}
      <button
        onClick={handleToggle}
        disabled={isToggling}
        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
          isPaused
            ? 'bg-green-500/20 border border-green-400/50 text-green-300 hover:bg-green-500/30'
            : 'bg-red-500/20 border border-red-400/50 text-red-300 hover:bg-red-500/30'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isToggling ? (
          <span className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            {isPaused ? 'Unpausing...' : 'Pausing...'}
          </span>
        ) : (
          <span>{isPaused ? '▶ Unpause Site' : '⏸ Pause Site'}</span>
        )}
      </button>

      {/* Warning banner when paused */}
      {isPaused && (
        <div className="ml-2 px-3 py-1.5 bg-yellow-500/20 border border-yellow-400/50 text-yellow-300 rounded-lg text-xs font-semibold">
          ⚠️ Site in Maintenance Mode
        </div>
      )}
    </div>
  );
}
