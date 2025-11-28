'use client';

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Pencil, Check, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'react-hot-toast';

interface CompetitionDay {
  date: string; // ISO date: "2026-04-11"
  routineCount: number;
  startTime: string; // HH:mm:ss format: "08:00:00"
  endTime?: string; // HH:mm:ss format: "18:00:00" (calculated from last routine)
}

interface DayTabsProps {
  days: CompetitionDay[];
  activeDay: string;
  onDayChange: (date: string) => void;
  competitionId: string;
  tenantId: string;
  onResetDay?: () => void;
  onResetAll?: () => void;
  onStartTimeUpdated?: () => void;
  onCreateBlock?: (type: 'award' | 'break') => void;
}

/**
 * Day Tabs Component for Schedule V4
 *
 * Features:
 * - One tab per competition day
 * - Active tab highlighting (blue gradient)
 * - Routine count badge per day
 * - Editable start time per day (click pencil icon)
 * - Auto-recalculates all routine times on that day when start time changed
 */
export function DayTabs({
  days,
  activeDay,
  onDayChange,
  competitionId,
  tenantId,
  onResetDay,
  onResetAll,
  onStartTimeUpdated,
  onCreateBlock,
}: DayTabsProps) {
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editedTime, setEditedTime] = useState<string>('');

  const updateDayStartTimeMutation = trpc.scheduling.updateDayStartTime.useMutation({
    onError: (error) => {
      toast.error(`Failed to update start time: ${error.message}`);
    },
  });

  const handleEditClick = (day: CompetitionDay) => {
    setEditingDay(day.date);
    // Convert HH:mm:ss to HH:mm for input
    setEditedTime(day.startTime.substring(0, 5));
  };

  const handleSaveClick = async (day: CompetitionDay) => {
    if (!editedTime) {
      toast.error('Please enter a valid time');
      return;
    }

    // Convert HH:mm to HH:mm:ss
    const fullTime = `${editedTime}:00`;

    console.log('[DayTabs] Saving start time:', {
      tenantId,
      competitionId,
      date: day.date,
      newStartTime: fullTime,
    });

    try {
      // Wait for mutation to complete
      await updateDayStartTimeMutation.mutateAsync({
        tenantId,
        competitionId,
        date: day.date,
        newStartTime: fullTime,
      });

      // Wait for refetch to complete before closing edit mode
      await onStartTimeUpdated?.();

      toast.success('Start time updated successfully');
      setEditingDay(null);
    } catch (error: any) {
      // When using mutateAsync, onError doesn't fire - handle here instead
      console.error('[DayTabs] Failed to update start time:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      toast.error(`Failed to update start time: ${errorMessage}`);
      // Don't close edit mode on error - let user try again
    }
  };

  const handleCancelClick = () => {
    setEditingDay(null);
    setEditedTime('');
  };

  return (
    <div className="mb-4">
      {/* Day Tabs + Buttons Row */}
      <div className="flex items-stretch gap-3 mb-3">
        {/* Day Tabs with compact background */}
        <div className="flex gap-2 overflow-x-auto bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-3 shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
          {days.map((day) => {
            const isActive = activeDay === day.date;
            const isEditing = editingDay === day.date;
            const dateObj = parseISO(day.date);

            return (
              <div
                key={day.date}
                className={`
                  flex-shrink-0 min-w-[180px] px-3 py-2 rounded-lg cursor-pointer transition-all
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-600 to-purple-500 text-white border-2 border-purple-400 shadow-lg'
                      : 'bg-white/10 text-white/80 border-2 border-white/20 hover:bg-white/20 hover:border-white/30'
                  }
                `}
                onClick={() => !isEditing && onDayChange(day.date)}
              >
              {/* Day Label */}
              <div className="font-semibold text-xs mb-1">
                {format(dateObj, 'EEEE, MMMM d')}
              </div>

              {/* Start Time + End Time + Routine Count */}
              <div className="flex items-center justify-between gap-2 text-xs">
                {/* Start/End Time Display */}
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <input
                        type="time"
                        value={editedTime}
                        onChange={(e) => setEditedTime(e.target.value)}
                        className="px-1.5 py-0.5 border border-white/30 bg-black/20 rounded text-white text-xs w-20 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveClick(day);
                        }}
                        className="text-green-400 hover:text-green-300"
                        disabled={updateDayStartTimeMutation.isPending}
                      >
                        <Check className="h-3 w-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelClick();
                        }}
                        className="text-red-400 hover:text-red-300"
                        disabled={updateDayStartTimeMutation.isPending}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={isActive ? 'text-white/90' : 'text-white/70'}>
                        {day.startTime.substring(0, 5)}
                        {day.endTime && ` - ${day.endTime.substring(0, 5)}`}
                      </span>
                      {/* Only show edit button when there are routines to update */}
                      {day.routineCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(day);
                          }}
                          className={`${
                            isActive
                              ? 'text-white/80 hover:text-white'
                              : 'text-white/60 hover:text-white/80'
                          }`}
                          title="Edit start time (recalculates all routine times)"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Routine Count Badge */}
                <span
                  className={`
                    px-2 py-1 rounded-full text-xs font-semibold
                    ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-purple-600/50 text-white'
                    }
                  `}
                >
                  {day.routineCount} {day.routineCount === 1 ? 'routine' : 'routines'}
                </span>
              </div>
            </div>
          );
        })}
        </div>

        {/* Block Creation Buttons beside day tabs */}
        {onCreateBlock && (
          <div className="flex items-stretch gap-2 flex-shrink-0">
            <button
              onClick={() => onCreateBlock('award')}
              className="flex-shrink-0 min-w-[180px] px-3 py-2 rounded-lg transition-all bg-amber-900/30 text-amber-300 border-2 border-amber-500/50 hover:bg-amber-900/50 hover:border-amber-500 flex flex-col justify-center"
              title="Add award ceremony block"
            >
              <div className="font-semibold text-xs mb-1">🏆 +Award</div>
              <div className="text-xs text-amber-200/80">Add ceremony block</div>
            </button>
            <button
              onClick={() => onCreateBlock('break')}
              className="flex-shrink-0 min-w-[180px] px-3 py-2 rounded-lg transition-all bg-cyan-900/30 text-cyan-300 border-2 border-cyan-500/50 hover:bg-cyan-900/50 hover:border-cyan-500 flex flex-col justify-center"
            >
              <div className="font-semibold text-xs mb-1">☕ +Break</div>
              <div className="text-xs text-cyan-200/80">Add break block</div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
