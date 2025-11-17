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
}

interface DayTabsProps {
  days: CompetitionDay[];
  activeDay: string;
  onDayChange: (date: string) => void;
  competitionId: string;
  tenantId: string;
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
}: DayTabsProps) {
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editedTime, setEditedTime] = useState<string>('');

  const updateDayStartTimeMutation = trpc.scheduling.updateDayStartTime.useMutation({
    onSuccess: () => {
      toast.success('Start time updated successfully');
      setEditingDay(null);
      // Note: Parent component should refetch routines to see updated times
    },
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

    await updateDayStartTimeMutation.mutateAsync({
      tenantId,
      competitionId,
      date: day.date,
      newStartTime: fullTime,
    });
  };

  const handleCancelClick = () => {
    setEditingDay(null);
    setEditedTime('');
  };

  return (
    <div className="mb-6 border-b border-gray-200 bg-white rounded-t-lg">
      <div className="flex gap-2 overflow-x-auto px-4 pt-4">
        {days.map((day) => {
          const isActive = activeDay === day.date;
          const isEditing = editingDay === day.date;
          const dateObj = parseISO(day.date);

          return (
            <div
              key={day.date}
              className={`
                flex-shrink-0 min-w-[240px] px-4 py-3 rounded-t-lg border-b-2 cursor-pointer transition-all
                ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white border-blue-600 shadow-lg'
                    : 'bg-gray-50 text-gray-700 border-transparent hover:bg-gray-100'
                }
              `}
              onClick={() => !isEditing && onDayChange(day.date)}
            >
              {/* Day Label */}
              <div className="font-semibold text-sm mb-2">
                {format(dateObj, 'EEEE, MMMM d')}
              </div>

              {/* Start Time + Routine Count */}
              <div className="flex items-center justify-between gap-3 text-xs">
                {/* Start Time Input */}
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <input
                        type="time"
                        value={editedTime}
                        onChange={(e) => setEditedTime(e.target.value)}
                        className="px-2 py-1 border border-gray-300 rounded text-gray-900 text-xs w-24"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSaveClick(day);
                        }}
                        className="text-green-600 hover:text-green-700"
                        disabled={updateDayStartTimeMutation.isPending}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCancelClick();
                        }}
                        className="text-red-600 hover:text-red-700"
                        disabled={updateDayStartTimeMutation.isPending}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className={isActive ? 'text-white/90' : 'text-gray-600'}>
                        {day.startTime.substring(0, 5)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(day);
                        }}
                        className={`${
                          isActive
                            ? 'text-white/80 hover:text-white'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
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
                        : 'bg-gray-200 text-gray-700'
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
    </div>
  );
}
