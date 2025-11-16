'use client';

/**
 * TimelineHeader Component
 *
 * Visual timeline header for schedule grid showing:
 * - Competition days (with dates)
 * - Session names (Saturday AM, Saturday PM, etc.)
 * - Time ranges
 * - Total routines + blocks per session
 *
 * Created: Session 56 (Frontend Component Extraction)
 * Spec: SCHEDULING_SPEC_V4_UNIFIED.md
 */

import { format } from 'date-fns';

export interface TimelineSession {
  id: string; // Zone ID: saturday-am, saturday-pm, etc.
  name: string; // Display name
  day: Date; // Competition day
  startTime: string; // e.g., "09:00 AM"
  endTime: string; // e.g., "12:00 PM"
  routineCount: number; // Number of routines scheduled
  blockCount: number; // Number of award/break blocks
  color: string; // Tailwind gradient classes
}

interface TimelineHeaderProps {
  sessions: TimelineSession[];
  activeSession?: string; // Currently selected session ID
  onSessionClick?: (sessionId: string) => void;
  viewMode?: 'day' | 'session'; // Show by day or by session
}

export function TimelineHeader({
  sessions,
  activeSession,
  onSessionClick,
  viewMode = 'session',
}: TimelineHeaderProps) {
  if (viewMode === 'day') {
    return <DayViewHeader sessions={sessions} activeSession={activeSession} onSessionClick={onSessionClick} />;
  }

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4 mb-4">
      <div className="grid grid-cols-4 gap-4">
        {sessions.map((session) => {
          const isActive = activeSession === session.id;
          const totalItems = session.routineCount + session.blockCount;

          return (
            <button
              key={session.id}
              onClick={() => onSessionClick?.(session.id)}
              className={`
                relative rounded-lg p-4 transition-all border-2
                ${isActive
                  ? `${session.color} border-white/50 shadow-xl scale-105`
                  : 'bg-black/20 border-white/20 hover:border-purple-500 hover:scale-102'
                }
              `}
              data-session={session.id}
            >
              {/* Day Badge */}
              <div className="text-xs font-semibold text-gray-300 mb-1">
                {format(session.day, 'EEEE, MMMM d')}
              </div>

              {/* Session Name */}
              <h3 className={`text-lg font-bold mb-2 ${isActive ? 'text-white' : 'text-gray-200'}`}>
                {session.name}
              </h3>

              {/* Time Range */}
              <div className={`text-sm mb-3 ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                {session.startTime} - {session.endTime}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between text-xs">
                <div className={`flex items-center gap-1 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                  <span>🩰</span>
                  <span>{session.routineCount} routines</span>
                </div>
                {session.blockCount > 0 && (
                  <div className={`flex items-center gap-1 ${isActive ? 'text-yellow-300' : 'text-gray-500'}`}>
                    <span>📦</span>
                    <span>{session.blockCount} blocks</span>
                  </div>
                )}
              </div>

              {/* Total Badge */}
              {totalItems > 0 && (
                <div
                  className={`
                    absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg
                    ${isActive ? 'bg-white text-purple-900' : 'bg-purple-600 text-white'}
                  `}
                >
                  {totalItems}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Alternative view: Group sessions by day
function DayViewHeader({
  sessions,
  activeSession,
  onSessionClick,
}: {
  sessions: TimelineSession[];
  activeSession?: string;
  onSessionClick?: (sessionId: string) => void;
}) {
  // Group sessions by day
  const sessionsByDay = sessions.reduce((acc, session) => {
    const dayKey = format(session.day, 'yyyy-MM-dd');
    if (!acc[dayKey]) {
      acc[dayKey] = {
        date: session.day,
        sessions: [],
      };
    }
    acc[dayKey].sessions.push(session);
    return acc;
  }, {} as Record<string, { date: Date; sessions: TimelineSession[] }>);

  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4 mb-4 space-y-6">
      {Object.entries(sessionsByDay).map(([dayKey, { date, sessions: daySessions }]) => (
        <div key={dayKey}>
          {/* Day Header */}
          <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 rounded-lg px-4 py-2 mb-3">
            <h2 className="text-xl font-bold text-white">
              {format(date, 'EEEE, MMMM d, yyyy')}
            </h2>
            <p className="text-sm text-gray-300">
              {daySessions.reduce((sum, s) => sum + s.routineCount, 0)} routines •{' '}
              {daySessions.reduce((sum, s) => sum + s.blockCount, 0)} blocks
            </p>
          </div>

          {/* Sessions for this day */}
          <div className="grid grid-cols-2 gap-3">
            {daySessions.map((session) => {
              const isActive = activeSession === session.id;
              const totalItems = session.routineCount + session.blockCount;

              return (
                <button
                  key={session.id}
                  onClick={() => onSessionClick?.(session.id)}
                  className={`
                    relative rounded-lg p-4 transition-all border-2
                    ${isActive
                      ? `${session.color} border-white/50 shadow-xl scale-105`
                      : 'bg-black/20 border-white/20 hover:border-purple-500'
                    }
                  `}
                  data-session={session.id}
                >
                  {/* Session Name */}
                  <h3 className={`text-lg font-bold mb-2 ${isActive ? 'text-white' : 'text-gray-200'}`}>
                    {session.name}
                  </h3>

                  {/* Time Range */}
                  <div className={`text-sm mb-3 ${isActive ? 'text-white/80' : 'text-gray-400'}`}>
                    {session.startTime} - {session.endTime}
                  </div>

                  {/* Stats */}
                  <div className="space-y-1 text-xs">
                    <div className={`flex items-center gap-2 ${isActive ? 'text-white' : 'text-gray-400'}`}>
                      <span>🩰</span>
                      <span>{session.routineCount} routines</span>
                    </div>
                    {session.blockCount > 0 && (
                      <div className={`flex items-center gap-2 ${isActive ? 'text-yellow-300' : 'text-gray-500'}`}>
                        <span>📦</span>
                        <span>{session.blockCount} blocks</span>
                      </div>
                    )}
                  </div>

                  {/* Total Badge */}
                  {totalItems > 0 && (
                    <div
                      className={`
                        absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-lg
                        ${isActive ? 'bg-white text-purple-900' : 'bg-purple-600 text-white'}
                      `}
                    >
                      {totalItems}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
