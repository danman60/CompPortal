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
  Bell,
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
  Edit3,
  Star,
  Search,
  FileWarning,
  RefreshCw,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import {
  mp3Storage,
  type MP3ScanResult,
  type MP3ScanSummary,
} from '@/lib/mp3-storage';
import {
  saveCompetitionState,
  loadCompetitionState,
  clearCompetitionState,
  isStateValid,
  getCurrentDayString,
  needsDayTransition,
  type PersistedCompetitionState,
} from '@/lib/competitionStorage';

// Types
interface Routine {
  id: string;
  routineId: string;
  title: string | null;
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



interface BreakRequest {
  id: string;
  judgeName: string;
  judgeNumber: number | null;
  requestedDurationMinutes: number;
  reason: string | null;
  status: string;
  createdAt: Date;
}

interface ActiveBreak {
  id: string;
  breakType: string;
  title: string | null;
  reason: string | null;
  durationMinutes: number;
  elapsedMinutes: number;
  remainingMinutes: number;
  startedAt: Date;
  scheduledEndTime: Date;
}

// Score type for Task 13
interface RoutineScore {
  scoreId: string;
  judgeId: string;
  judgeName: string;
  score: number;
  comments: string | null;
  timestamp: Date | null;
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

  // Break management state (Task #6)
  const [breakRequests, setBreakRequests] = useState<BreakRequest[]>([]);
  const [activeBreak, setActiveBreak] = useState<ActiveBreak | null>(null);
  const [showEmergencyBreakModal, setShowEmergencyBreakModal] = useState(false);
  const [emergencyBreakDuration, setEmergencyBreakDuration] = useState(5);
  const [emergencyBreakReason, setEmergencyBreakReason] = useState('');
  const [breakCountdown, setBreakCountdown] = useState(0);

  // Score editing state (Task #13)
  const [showScoreEditModal, setShowScoreEditModal] = useState(false);
  const [editingScore, setEditingScore] = useState<RoutineScore | null>(null);
  const [newScoreValue, setNewScoreValue] = useState<number>(0);
  const [scoreEditReason, setScoreEditReason] = useState('');

  // State persistence (Task #14)
  const [stateRestored, setStateRestored] = useState(false);
  const [showRestoredBanner, setShowRestoredBanner] = useState(false);

  // MP3 Pre-Scan state (Task #15)
  const [showScanModal, setShowScanModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ scanned: 0, total: 0, currentFile: '' });
  const [scanResults, setScanResults] = useState<MP3ScanSummary | null>(null);

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

  

  // Fetch break requests (Task #6)
  const { data: breakRequestsData } = trpc.liveCompetition.getBreakRequests.useQuery(
    { competitionId },
    { enabled: !!competitionId, refetchInterval: 3000 }
  );

  // Fetch active break (Task #6)
  const { data: activeBreakData } = trpc.liveCompetition.getActiveBreak.useQuery(
    { competitionId },
    { enabled: !!competitionId, refetchInterval: 1000 }
  );

  // Fetch scores for current routine (Task #13)
  const currentRoutineId = routines[competitionState.currentRoutineIndex]?.routineId || '';
  const { data: scoresData, refetch: refetchScores } = trpc.liveCompetition.getRoutineScores.useQuery(
    { routineId: currentRoutineId },
    { enabled: !!currentRoutineId, refetchInterval: 5000 }
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

  

  // Break management mutations (Task #6)
  const approveBreakMutation = trpc.liveCompetition.approveBreak.useMutation({
    onSuccess: () => {
      // Refetch break requests
    },
  });

  const denyBreakMutation = trpc.liveCompetition.denyBreak.useMutation({
    onSuccess: () => {
      // Refetch break requests
    },
  });

  const addEmergencyBreakMutation = trpc.liveCompetition.addEmergencyBreak.useMutation({
    onSuccess: (data) => {
      setShowEmergencyBreakModal(false);
      setEmergencyBreakDuration(5);
      setEmergencyBreakReason('');
      setCompetitionState(prev => ({ ...prev, status: 'break' }));
    },
  });

  const endBreakEarlyMutation = trpc.liveCompetition.endBreakEarly.useMutation({
    onSuccess: (data) => {
      setActiveBreak(null);
      setCompetitionState(prev => ({
        ...prev,
        status: 'paused',
        delayMinutes: Math.max(0, prev.delayMinutes - (data.timeSavedMinutes || 0))
      }));
    },
  });

  // Score edit mutation (Task #13)
  const editScoreMutation = trpc.liveCompetition.editScore.useMutation({
    onSuccess: () => {
      setShowScoreEditModal(false);
      setEditingScore(null);
      setNewScoreValue(0);
      setScoreEditReason('');
      refetchScores();
    },
  });

// Update routines when data loads
  useEffect(() => {
    if (lineupData?.routines) {
      setRoutines(lineupData.routines as Routine[]);
    }
  }, [lineupData]);

  // Update judges when data loads
  // Update break requests when data loads (Task #6)
  useEffect(() => {
    if (breakRequestsData) {
      setBreakRequests(breakRequestsData as BreakRequest[]);
    }
  }, [breakRequestsData]);

  // Update active break when data loads (Task #6)
  useEffect(() => {
    if (activeBreakData) {
      setActiveBreak(activeBreakData as ActiveBreak);
      setCompetitionState(prev => ({ ...prev, status: 'break' }));
      setBreakCountdown(activeBreakData.remainingMinutes * 60);
    } else {
      setActiveBreak(null);
      if (competitionState.status === 'break') {
        setCompetitionState(prev => ({ ...prev, status: 'paused' }));
      }
    }
  }, [activeBreakData]);

  // Break countdown timer (Task #6)
  useEffect(() => {
    if (!activeBreak || breakCountdown <= 0) return;

    const timer = setInterval(() => {
      setBreakCountdown(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [activeBreak, breakCountdown]);

  // Load persisted state on mount (Task #14)
  useEffect(() => {
    if (!competitionId || stateRestored) return;

    const loadPersistedState = async () => {
      try {
        const persisted = await loadCompetitionState(competitionId);
        if (persisted && isStateValid(persisted)) {
          // Check if we need a day transition
          if (needsDayTransition(persisted)) {
            console.log('Day transition detected, clearing old state');
            await clearCompetitionState(competitionId);
            return;
          }

          // Restore the state
          setCompetitionState({
            status: persisted.status,
            currentRoutineIndex: persisted.currentRoutineIndex,
            startTime: persisted.startTime,
            pausedAt: persisted.pausedAt,
            delayMinutes: persisted.delayMinutes,
          });
          setBreakCountdown(persisted.breakCountdown);
          setShowRestoredBanner(true);

          // Auto-hide banner after 5 seconds
          setTimeout(() => setShowRestoredBanner(false), 5000);
        }
        setStateRestored(true);
      } catch (error) {
        console.error('Failed to load persisted state:', error);
        setStateRestored(true);
      }
    };

    loadPersistedState();
  }, [competitionId, stateRestored]);

  // Save state when competition state changes (Task #14)
  useEffect(() => {
    if (!competitionId || !stateRestored) return;

    // Build routine statuses map
    const routineStatuses: Record<string, 'queued' | 'current' | 'completed' | 'skipped'> = {};
    routines.forEach(r => {
      routineStatuses[r.id] = r.liveStatus;
    });

    const stateToSave: PersistedCompetitionState = {
      competitionId,
      currentRoutineIndex: competitionState.currentRoutineIndex,
      status: competitionState.status,
      startTime: competitionState.startTime,
      pausedAt: competitionState.pausedAt,
      delayMinutes: competitionState.delayMinutes,
      competitionDay: getCurrentDayString(),
      lastSyncedAt: Date.now(),
      activeBreakId: activeBreak?.id || null,
      breakCountdown,
      routineStatuses,
    };

    // Debounce saves with setTimeout
    const saveTimeout = setTimeout(() => {
      saveCompetitionState(stateToSave).catch(err => {
        console.error('Failed to save competition state:', err);
      });
    }, 500);

    return () => clearTimeout(saveTimeout);
  }, [competitionId, competitionState, routines, activeBreak, breakCountdown, stateRestored]);

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



  // Break request handlers (Task #6)
  const handleApproveBreak = useCallback((requestId: string, durationMinutes: number) => {
    approveBreakMutation.mutate({ requestId, actualDurationMinutes: durationMinutes });
  }, [approveBreakMutation]);

  const handleDenyBreak = useCallback((requestId: string) => {
    denyBreakMutation.mutate({ requestId, reason: 'Denied by CD' });
  }, [denyBreakMutation]);

  const handleAddEmergencyBreak = useCallback(() => {
    if (!competitionId) return;
    addEmergencyBreakMutation.mutate({
      competitionId,
      durationMinutes: emergencyBreakDuration,
      reason: emergencyBreakReason || 'Emergency break',
    });
  }, [competitionId, emergencyBreakDuration, emergencyBreakReason, addEmergencyBreakMutation]);

  const handleEndBreakEarly = useCallback(() => {
    if (!activeBreak) return;
    endBreakEarlyMutation.mutate({ breakId: activeBreak.id });
  }, [activeBreak, endBreakEarlyMutation]);

  const formatBreakTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Score edit handlers (Task #13)
  const handleOpenScoreEdit = useCallback((score: RoutineScore) => {
    setEditingScore(score);
    setNewScoreValue(score.score);
    setScoreEditReason('');
    setShowScoreEditModal(true);
  }, []);

  const handleSaveScoreEdit = useCallback(() => {
    if (!editingScore) return;
    editScoreMutation.mutate({
      scoreId: editingScore.scoreId,
      newValue: newScoreValue,
      reason: scoreEditReason || undefined,
    });
  }, [editingScore, newScoreValue, scoreEditReason, editScoreMutation]);

  // MP3 Pre-Scan handler (Task #15)
  const handleStartScan = useCallback(async () => {
    if (!competitionId || isScanning) return;

    setIsScanning(true);
    setScanResults(null);
    setScanProgress({ scanned: 0, total: 0, currentFile: '' });

    try {
      const results = await mp3Storage.scanCompetitionFiles(
        competitionId,
        (scanned, total, currentFile) => {
          setScanProgress({ scanned, total, currentFile: currentFile || '' });
        }
      );
      setScanResults(results);
    } catch (error) {
      console.error('MP3 scan error:', error);
    } finally {
      setIsScanning(false);
    }
  }, [competitionId, isScanning]);

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
    setShowEmergencyBreakModal(true);
  }, []);

  const handleEndBreak = useCallback(() => {
    if (activeBreak) {
      handleEndBreakEarly();
    } else {
      setCompetitionState((prev) => ({
        ...prev,
        status: 'running',
      }));
    }
  }, [activeBreak, handleEndBreakEarly]);

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
          {/* Pre-Scan MP3s Button (Task #15) */}
          <button
            onClick={() => setShowScanModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors text-sm"
          >
            <Search className="w-4 h-4" />
            Pre-Scan MP3s
          </button>

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

      {/* Session Restored Banner (Task #14) */}
      {showRestoredBanner && (
        <div className="bg-blue-500/20 border border-blue-500/50 px-4 py-2 mx-4 mt-2 rounded-lg flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2 text-blue-300">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Session restored from previous state</span>
          </div>
          <button
            onClick={() => setShowRestoredBanner(false)}
            className="text-blue-400 hover:text-blue-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

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
                {activeBreak && (
                  <>
                    <div className="text-6xl font-mono text-yellow-300 mb-4">
                      {formatBreakTime(breakCountdown)}
                    </div>
                    <div className="text-xl text-gray-300 mb-2">
                      {activeBreak.title || 'Break in progress'}
                    </div>
                    {activeBreak.reason && (
                      <div className="text-sm text-gray-400 mb-4">{activeBreak.reason}</div>
                    )}
                  </>
                )}
                {!activeBreak && (
                  <div className="text-xl text-gray-300 mb-4">Competition paused</div>
                )}
                <button
                  onClick={handleEndBreak}
                  disabled={endBreakEarlyMutation.isPending}
                  className="mt-4 px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl text-lg font-medium transition-colors disabled:opacity-50"
                >
                  {endBreakEarlyMutation.isPending ? 'Ending...' : 'End Break Early'}
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
          {/* Current Routine Scores (Task #13) */}
          {scoresData && scoresData.scores.length > 0 && (
            <div className="p-3 border-t border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">Current Scores</span>
                {scoresData.averageScore && (
                  <span className="ml-auto text-white font-bold">
                    Avg: {scoresData.averageScore.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {scoresData.scores.map((score: RoutineScore) => (
                  <div key={score.scoreId} className="p-2 bg-gray-700/30 rounded-lg border border-gray-600/30 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{score.judgeName}</div>
                      <div className="text-2xl font-bold text-yellow-300">{score.score.toFixed(1)}</div>
                    </div>
                    <button
                      onClick={() => handleOpenScoreEdit(score)}
                      className="p-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                      title="Edit score"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Break Requests (Task #6) */}
          {breakRequests.length > 0 && (
            <div className="p-3 border-t border-gray-700/50">
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-medium text-orange-400">Break Requests</span>
              </div>
              <div className="space-y-2">
                {breakRequests.map((req) => (
                  <div key={req.id} className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">
                        {req.judgeName}
                        {req.judgeNumber && <span className="text-gray-400 ml-1">#{req.judgeNumber}</span>}
                      </span>
                      <span className="text-orange-300 font-medium">{req.requestedDurationMinutes}m</span>
                    </div>
                    {req.reason && (
                      <div className="text-sm text-gray-400 mb-2">{req.reason}</div>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveBreak(req.id, req.requestedDurationMinutes)}
                        disabled={approveBreakMutation.isPending}
                        className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition-colors disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleDenyBreak(req.id)}
                        disabled={denyBreakMutation.isPending}
                        className="flex-1 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors disabled:opacity-50"
                      >
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      
      
      {/* Emergency Break Modal (Task #6) */}
      {showEmergencyBreakModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Add Emergency Break</h3>
              <button
                onClick={() => setShowEmergencyBreakModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Duration (minutes)</label>
              <div className="flex gap-2">
                {[2, 5, 10, 15, 30].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setEmergencyBreakDuration(mins)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                      emergencyBreakDuration === mins
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Reason (optional)</label>
              <input
                type="text"
                value={emergencyBreakReason}
                onChange={(e) => setEmergencyBreakReason(e.target.value)}
                placeholder="e.g., Technical issue, Judge break"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEmergencyBreakModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEmergencyBreak}
                disabled={addEmergencyBreakMutation.isPending}
                className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {addEmergencyBreakMutation.isPending ? 'Adding...' : 'Start Break'}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Score Edit Modal (Task #13) */}
      {showScoreEditModal && editingScore && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Edit Score</h3>
              <button
                onClick={() => setShowScoreEditModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-1">Judge</div>
              <div className="text-lg font-medium text-white">{editingScore.judgeName}</div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-1">Original Score</div>
              <div className="text-2xl font-bold text-yellow-300">{editingScore.score.toFixed(1)}</div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">New Score (60-100)</label>
              <input
                type="number"
                min="60"
                max="100"
                step="0.1"
                value={newScoreValue}
                onChange={(e) => setNewScoreValue(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-xl font-bold focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">Reason for change (optional)</label>
              <input
                type="text"
                value={scoreEditReason}
                onChange={(e) => setScoreEditReason(e.target.value)}
                placeholder="e.g., Correction, Judge request"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowScoreEditModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveScoreEdit}
                disabled={editScoreMutation.isPending || newScoreValue < 60 || newScoreValue > 100}
                className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {editScoreMutation.isPending ? 'Saving...' : 'Save Score'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MP3 Pre-Scan Modal (Task #15) */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-lg w-full mx-4 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Search className="w-5 h-5" />
                MP3 Pre-Scan
              </h3>
              <button
                onClick={() => setShowScanModal(false)}
                className="text-gray-400 hover:text-white"
                disabled={isScanning}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-400 text-sm mb-6">
              Scan all downloaded MP3 files to verify they can be played during competition.
              Corrupted files will be flagged for re-download.
            </p>

            {/* Scan Progress */}
            {isScanning && (
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                  <span>Scanning...</span>
                  <span>{scanProgress.scanned} / {scanProgress.total}</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-purple-500 transition-all duration-200"
                    style={{ width: `${scanProgress.total > 0 ? (scanProgress.scanned / scanProgress.total * 100) : 0}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {scanProgress.currentFile || 'Preparing...'}
                </div>
              </div>
            )}

            {/* Scan Results */}
            {scanResults && !isScanning && (
              <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1 bg-green-500/20 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-400">{scanResults.validFiles}</div>
                    <div className="text-xs text-green-300">Valid</div>
                  </div>
                  <div className="flex-1 bg-red-500/20 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-400">{scanResults.corruptedFiles.length}</div>
                    <div className="text-xs text-red-300">Corrupted</div>
                  </div>
                </div>

                {/* Corrupted Files List */}
                {scanResults.corruptedFiles.length > 0 && (
                  <div className="bg-red-500/10 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <div className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-1">
                      <FileWarning className="w-4 h-4" />
                      Corrupted Files:
                    </div>
                    {scanResults.corruptedFiles.map((file, idx) => (
                      <div key={idx} className="text-xs text-gray-400 py-1 border-b border-red-500/20 last:border-0">
                        <div className="font-medium text-white">{file.filename}</div>
                        <div className="text-red-300">{file.error}</div>
                      </div>
                    ))}
                  </div>
                )}

                {scanResults.corruptedFiles.length === 0 && (
                  <div className="bg-green-500/10 rounded-lg p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <div className="text-green-300 font-medium">All files validated successfully!</div>
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-2 text-center">
                  Scan completed in {(scanResults.scanDurationMs / 1000).toFixed(1)}s
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowScanModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                disabled={isScanning}
              >
                {scanResults ? 'Close' : 'Cancel'}
              </button>
              <button
                onClick={handleStartScan}
                disabled={isScanning}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Scanning...
                  </>
                ) : scanResults ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Re-Scan
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Start Scan
                  </>
                )}
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
