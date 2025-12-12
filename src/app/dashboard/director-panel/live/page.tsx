'use client';

/**
 * CD Control Panel - Live Competition Interface
 * Task #4: Competition Director control panel for live competition
 *
 * Features:
 * - Three-panel layout: routine list, current routine, judge status
 * - Controls: Back, Stop, Next, Add Break
 * - Schedule delay indicator
 * - Real-time judge status updates
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
  Users,
  AlertCircle,
  CheckCircle,
  Coffee,
  Timer,
  Wifi,
  WifiOff,
  ChevronRight,
  Music,
  GripVertical,
  X,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

// Types
interface Routine {
  id: string;
  routineId: string;
  title: string;
  studioName: string;
  category: string;
  dancers: string[];
  duration: number;
  order: number;
  liveStatus: 'queued' | 'current' | 'completed' | 'skipped';
}

interface Judge {
  judgeId: string;
  judgeName: string;
  judgeNumber: number | null;
  panelAssignment: string | null;
  confirmed: boolean;
  ready: boolean;
  connected: boolean;
  scoresSubmitted: number;
}

interface CompetitionState {
  status: 'not_started' | 'running' | 'paused' | 'break' | 'completed';
  currentRoutineIndex: number;
  startTime: number | null;
  pausedAt: number | null;
  delayMinutes: number;
}

export default function CDControlPanelLive() {
  const searchParams = useSearchParams();
  const competitionId = searchParams.get('competitionId') || '';

  // State
  const [competitionState, setCompetitionState] = useState<CompetitionState>({
    status: 'not_started',
    currentRoutineIndex: 0,
    startTime: null,
    pausedAt: null,
    delayMinutes: 0,
  });
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isConnected, setIsConnected] = useState(true);

  // Drag-drop reordering state (Task #5)
  const [draggedRoutine, setDraggedRoutine] = useState<Routine | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [pendingReorder, setPendingReorder] = useState<{routine: Routine, newPosition: number} | null>(null);

  // Fetch lineup data
  const { data: lineupData, isLoading: lineupLoading } = trpc.liveCompetition.getLineup.useQuery(
    { competitionId },
    { enabled: !!competitionId }
  );

  // Fetch judges data
  const { data: judgesData, isLoading: judgesLoading } = trpc.liveCompetition.getJudges.useQuery(
    { competitionId },
    { enabled: !!competitionId, refetchInterval: 5000 }
  );

  // Update routine status mutation
  const updateStatusMutation = trpc.liveCompetition.updateRoutineStatus.useMutation();

  // Reorder mutation (Task #5)
  const reorderMutation = trpc.liveCompetition.reorderRoutine.useMutation({
    onSuccess: (data) => {
      if (data.updatedRoutines) {
        // Update local routines with new order
        setRoutines(prev => {
          const updatedMap = new Map(data.updatedRoutines.map((r: any) => [r.id, r.runningOrder]));
          return prev.map(r => ({
            ...r,
            order: updatedMap.get(r.id) || r.order,
          })).sort((a, b) => a.order - b.order);
        });
      }
      setPendingReorder(null);
    },
  });

  // Update routines when data loads
  useEffect(() => {
    if (lineupData?.routines) {
      setRoutines(lineupData.routines as Routine[]);
    }
  }, [lineupData]);

  // Update judges when data loads
  useEffect(() => {
    if (judgesData) {
      setJudges(judgesData as Judge[]);
    }
  }, [judgesData]);

  // Timer for current routine
  useEffect(() => {
    if (competitionState.status !== 'running') return;

    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [competitionState.status]);

  // Get current routine
  const currentRoutine = routines[competitionState.currentRoutineIndex] || null;
  const nextRoutine = routines[competitionState.currentRoutineIndex + 1] || null;
  const onDeckRoutine = routines[competitionState.currentRoutineIndex + 2] || null;

  // Calculate progress
  const completedCount = routines.filter((r) => r.liveStatus === 'completed').length;
  const progressPercent = routines.length > 0 ? (completedCount / routines.length) * 100 : 0;

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  
  // Drag-drop handlers (Task #5)
  const handleDragStart = useCallback((e: React.DragEvent, routine: Routine) => {
    setDraggedRoutine(routine);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', routine.id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (!draggedRoutine) return;

    const newPosition = targetIndex + 1; // running_order is 1-based
    if (draggedRoutine.order !== newPosition) {
      setPendingReorder({ routine: draggedRoutine, newPosition });
    }
    setDraggedRoutine(null);
  }, [draggedRoutine]);

  const handleConfirmReorder = useCallback(() => {
    if (!pendingReorder || !competitionId) return;

    reorderMutation.mutate({
      competitionId,
      routineId: pendingReorder.routine.id,
      newPosition: pendingReorder.newPosition,
    });
  }, [pendingReorder, competitionId, reorderMutation]);

  const handleCancelReorder = useCallback(() => {
    setPendingReorder(null);
  }, []);

// Control handlers
  const handleStart = useCallback(() => {
    if (competitionState.status === 'not_started') {
      setCompetitionState((prev) => ({
        ...prev,
        status: 'running',
        startTime: Date.now(),
      }));
      if (currentRoutine) {
        updateStatusMutation.mutate({
          routineId: currentRoutine.id,
          status: 'current',
          timestamp: Date.now(),
        });
      }
    } else if (competitionState.status === 'paused') {
      setCompetitionState((prev) => ({
        ...prev,
        status: 'running',
        pausedAt: null,
      }));
    }
  }, [competitionState.status, currentRoutine, updateStatusMutation]);

  const handlePause = useCallback(() => {
    setCompetitionState((prev) => ({
      ...prev,
      status: 'paused',
      pausedAt: Date.now(),
    }));
  }, []);

  const handleNext = useCallback(() => {
    if (currentRoutine) {
      // Mark current as completed
      const updatedRoutines = routines.map((r) =>
        r.id === currentRoutine.id ? { ...r, liveStatus: 'completed' as const } : r
      );
      setRoutines(updatedRoutines);

      updateStatusMutation.mutate({
        routineId: currentRoutine.id,
        status: 'completed',
        timestamp: Date.now(),
      });
    }

    // Move to next
    if (competitionState.currentRoutineIndex < routines.length - 1) {
      setCompetitionState((prev) => ({
        ...prev,
        currentRoutineIndex: prev.currentRoutineIndex + 1,
      }));
      setElapsedTime(0);

      if (nextRoutine) {
        updateStatusMutation.mutate({
          routineId: nextRoutine.id,
          status: 'current',
          timestamp: Date.now(),
        });
      }
    } else {
      setCompetitionState((prev) => ({
        ...prev,
        status: 'completed',
      }));
    }
  }, [
    currentRoutine,
    nextRoutine,
    routines,
    competitionState.currentRoutineIndex,
    updateStatusMutation,
  ]);

  const handleBack = useCallback(() => {
    if (competitionState.currentRoutineIndex > 0) {
      // Mark current as queued again
      if (currentRoutine) {
        const updatedRoutines = routines.map((r) =>
          r.id === currentRoutine.id ? { ...r, liveStatus: 'queued' as const } : r
        );
        setRoutines(updatedRoutines);
      }

      setCompetitionState((prev) => ({
        ...prev,
        currentRoutineIndex: prev.currentRoutineIndex - 1,
      }));
      setElapsedTime(0);
    }
  }, [competitionState.currentRoutineIndex, currentRoutine, routines]);

  const handleAddBreak = useCallback(() => {
    setCompetitionState((prev) => ({
      ...prev,
      status: 'break',
    }));
  }, []);

  const handleEndBreak = useCallback(() => {
    setCompetitionState((prev) => ({
      ...prev,
      status: 'running',
    }));
  }, []);

  // Loading state
  if (lineupLoading || judgesLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading competition data...</div>
      </div>
    );
  }

  // No competition selected
  if (!competitionId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">No Competition Selected</h2>
          <p className="text-gray-400">
            Add ?competitionId=YOUR_ID to the URL to load a competition
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-black text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            CD Control Panel
          </div>
          <div className="text-sm text-gray-400">{lineupData?.competitionName || 'Competition'}</div>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>

          {/* Schedule Delay Indicator */}
          {competitionState.delayMinutes !== 0 && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                competitionState.delayMinutes > 0
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-green-500/20 text-green-400'
              }`}
            >
              <Timer className="w-4 h-4" />
              {competitionState.delayMinutes > 0 ? '+' : ''}
              {competitionState.delayMinutes} min
            </div>
          )}

          {/* Progress */}
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>
              {completedCount}/{routines.length}
            </span>
            <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - 3-Panel Layout */}
      <main className="flex h-[calc(100vh-140px)] p-4 gap-4">
        {/* LEFT PANEL - Routine List */}
        <div className="w-80 bg-gray-800/50 rounded-xl border border-gray-700/50 flex flex-col">
          <div className="p-4 border-b border-gray-700/50">
            <h2 className="font-semibold text-gray-300">Routine List</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {routines.map((routine, index) => (
              <div
                key={routine.id}
                draggable
                onDragStart={(e) => handleDragStart(e, routine)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={`p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all ${
                  dragOverIndex === index ? 'ring-2 ring-blue-500 bg-blue-500/20' :
                  draggedRoutine?.id === routine.id ? 'opacity-50' :
                  index === competitionState.currentRoutineIndex
                    ? 'bg-purple-600/30 border border-purple-500/50'
                    : routine.liveStatus === 'completed'
                      ? 'bg-green-500/10 border border-green-500/20'
                      : 'bg-gray-700/30 hover:bg-gray-700/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-400">#{routine.order}</span>
                      {routine.liveStatus === 'completed' && (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      )}
                      {index === competitionState.currentRoutineIndex && (
                        <span className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded">NOW</span>
                      )}
                    </div>
                    <div className="text-white font-medium mt-1 truncate">{routine.title}</div>
                    <div className="text-sm text-gray-400 truncate">{routine.studioName}</div>
                    <div className="text-xs text-gray-500 mt-1">{routine.category}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER PANEL - Current Routine */}
        <div className="flex-1 flex flex-col gap-4">
          {/* Current Routine Card */}
          <div className="flex-1 bg-gradient-to-br from-purple-900/40 to-blue-900/40 rounded-2xl border border-purple-500/30 p-8 flex flex-col justify-center items-center">
            {competitionState.status === 'break' ? (
              <>
                <Coffee className="w-24 h-24 text-yellow-400 mb-6" />
                <div className="text-4xl font-bold text-white mb-2">BREAK</div>
                <div className="text-xl text-gray-300">Competition paused</div>
                <button
                  onClick={handleEndBreak}
                  className="mt-8 px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-lg font-medium transition-colors"
                >
                  End Break
                </button>
              </>
            ) : currentRoutine ? (
              <>
                <div className="text-sm font-medium text-purple-300 mb-2">NOW PERFORMING</div>
                <div className="text-7xl font-bold text-white mb-4">#{currentRoutine.order}</div>
                <h1 className="text-4xl font-bold text-white mb-2 text-center">
                  {currentRoutine.title}
                </h1>
                <div className="text-2xl text-gray-300 mb-4">{currentRoutine.studioName}</div>
                <div className="flex gap-3 mb-6">
                  <span className="px-4 py-2 bg-purple-500/30 rounded-full text-purple-200">
                    {currentRoutine.category}
                  </span>
                  <span className="px-4 py-2 bg-blue-500/30 rounded-full text-blue-200 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {currentRoutine.dancers.length} dancers
                  </span>
                </div>

                {/* Timer */}
                <div className="flex items-center gap-4 text-4xl font-mono">
                  <Clock className="w-8 h-8 text-gray-400" />
                  <span className="text-white">{formatTime(elapsedTime)}</span>
                  <span className="text-gray-500">/</span>
                  <span className="text-gray-400">{formatTime(currentRoutine.duration)}</span>
                </div>

                {/* Music indicator */}
                <div className="mt-6 flex items-center gap-2 text-gray-400">
                  <Music className="w-5 h-5" />
                  <span>Music ready</span>
                </div>
              </>
            ) : (
              <div className="text-center">
                <AlertCircle className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                <div className="text-xl text-gray-400">No routine selected</div>
              </div>
            )}
          </div>

          {/* Up Next Cards */}
          <div className="flex gap-4">
            {/* Next */}
            <div className="flex-1 bg-gray-800/50 rounded-xl border border-gray-700/50 p-4">
              <div className="text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                <ChevronRight className="w-4 h-4" />
                UP NEXT
              </div>
              {nextRoutine ? (
                <>
                  <div className="text-lg font-bold text-white">#{nextRoutine.order}</div>
                  <div className="text-white truncate">{nextRoutine.title}</div>
                  <div className="text-sm text-gray-400 truncate">{nextRoutine.studioName}</div>
                </>
              ) : (
                <div className="text-gray-500">No more routines</div>
              )}
            </div>

            {/* On Deck */}
            <div className="flex-1 bg-gray-800/30 rounded-xl border border-gray-700/30 p-4">
              <div className="text-sm font-medium text-gray-500 mb-2">ON DECK</div>
              {onDeckRoutine ? (
                <>
                  <div className="text-lg font-bold text-gray-300">#{onDeckRoutine.order}</div>
                  <div className="text-gray-300 truncate">{onDeckRoutine.title}</div>
                  <div className="text-sm text-gray-500 truncate">{onDeckRoutine.studioName}</div>
                </>
              ) : (
                <div className="text-gray-600">--</div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Judge Status */}
        <div className="w-72 bg-gray-800/50 rounded-xl border border-gray-700/50 flex flex-col">
          <div className="p-4 border-b border-gray-700/50">
            <h2 className="font-semibold text-gray-300">Judge Status</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {judges.length > 0 ? (
              judges.map((judge) => (
                <div
                  key={judge.judgeId}
                  className="p-3 bg-gray-700/30 rounded-lg border border-gray-600/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-white">
                      {judge.judgeName}
                      {judge.judgeNumber && (
                        <span className="text-gray-400 ml-1">#{judge.judgeNumber}</span>
                      )}
                    </div>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        judge.ready ? 'bg-green-400' : 'bg-gray-500'
                      }`}
                    />
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {judge.panelAssignment || 'No panel'}
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-gray-500">{judge.scoresSubmitted} scores</span>
                    <span
                      className={`px-2 py-0.5 rounded ${
                        judge.confirmed ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'
                      }`}
                    >
                      {judge.confirmed ? 'Confirmed' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No judges assigned</p>
              </div>
            )}
          </div>
        </div>
      </main>

      
      {/* Reorder Confirmation Dialog (Task #5) */}
      {pendingReorder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Confirm Reorder</h3>
              <button
                onClick={handleCancelReorder}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-300 mb-6">
              Move <span className="font-semibold text-white">{pendingReorder.routine.title}</span> to position #{pendingReorder.newPosition}?
            </p>
            <p className="text-sm text-gray-400 mb-6">
              Entry number will stay the same (#{pendingReorder.routine.order}), only the running order will change.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelReorder}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReorder}
                disabled={reorderMutation.isPending}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {reorderMutation.isPending ? 'Moving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM CONTROLS */}
      <footer className="fixed bottom-0 left-0 right-0 bg-gray-900/95 border-t border-gray-700/50 p-4">
        <div className="flex items-center justify-center gap-4">
          {/* Back */}
          <button
            onClick={handleBack}
            disabled={
              competitionState.currentRoutineIndex === 0 ||
              competitionState.status === 'not_started'
            }
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <SkipBack className="w-5 h-5" />
            Back
          </button>

          {/* Play/Pause */}
          {competitionState.status === 'running' ? (
            <button
              onClick={handlePause}
              className="px-8 py-4 bg-yellow-600 hover:bg-yellow-500 text-white rounded-xl flex items-center gap-2 text-lg font-medium transition-colors"
            >
              <Pause className="w-6 h-6" />
              Pause
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={competitionState.status === 'completed' || competitionState.status === 'break'}
              className="px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl flex items-center gap-2 text-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-6 h-6" />
              {competitionState.status === 'not_started' ? 'Start' : 'Resume'}
            </button>
          )}

          {/* Next */}
          <button
            onClick={handleNext}
            disabled={
              competitionState.status === 'not_started' ||
              competitionState.currentRoutineIndex >= routines.length - 1
            }
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <SkipForward className="w-5 h-5" />
          </button>

          {/* Divider */}
          <div className="w-px h-12 bg-gray-700 mx-2" />

          {/* Add Break */}
          <button
            onClick={handleAddBreak}
            disabled={
              competitionState.status === 'not_started' || competitionState.status === 'break'
            }
            className="px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Coffee className="w-5 h-5" />
            Add Break
          </button>
        </div>
      </footer>
    </div>
  );
}
