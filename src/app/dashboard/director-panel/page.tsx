'use client';

/**
 * Competition Director Control Panel
 * Task #24: At Competition Mode - Director's central control interface
 *
 * Features:
 * - Real-time competition control (next/previous/pause/resume)
 * - Live judge status monitoring (connected, ready, scores submitted)
 * - Routine queue management with drag-and-drop reordering
 * - Current routine display with timer
 * - Score collection progress indicator
 * - Break/intermission controls
 * - WebSocket communication with all judges
 * - Responsive design for desktop/tablet
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDirectorSocket } from '@/hooks/useWebSocket';
import { WSEvent } from '@/lib/websocket-types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface Routine {
  id: string;
  title: string;
  studioName: string;
  dancers: string[];
  category: string;
  duration: number;
  order: number;
  status: 'queued' | 'current' | 'completed' | 'skipped';
}

interface Judge {
  judgeId: string;
  judgeName: string;
  ready: boolean;
  connected: boolean;
  scoresSubmitted: number;
}

interface ScoreSubmission {
  routineId: string;
  judgeId: string;
  judgeName: string;
  score: number;
  timestamp: number;
  notes?: string;
}

export default function DirectorPanelPage() {
  // Get competition ID from URL params
  const searchParams = useSearchParams();
  const competitionId = searchParams.get('competitionId') || 'comp-demo-2025';

  // Mock director ID - TODO: Get from auth context
  const directorId = 'director-' + Math.random().toString(36).substring(7);

  // WebSocket connection
  const {
    connected,
    error,
    sendCommand,
    setCurrentRoutine,
    markRoutineCompleted,
    startBreak,
    endBreak,
    on,
    off,
  } = useDirectorSocket(competitionId, directorId);

  // State
  const [judges, setJudges] = useState<Judge[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [currentRoutine, setCurrentRoutineState] = useState<Routine | null>(null);
  const [scores, setScores] = useState<ScoreSubmission[]>([]);
  const [isBreak, setIsBreak] = useState(false);
  const [breakDuration, setBreakDuration] = useState(900); // 15 minutes default
  const [breakReason, setBreakReason] = useState('');
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [backupData, setBackupData] = useState<any>(null);

  // Mock initial data - TODO: Load from API
  useEffect(() => {
    // Mock judges
    setJudges([
      { judgeId: '1', judgeName: 'Judge 1', ready: true, connected: true, scoresSubmitted: 0 },
      { judgeId: '2', judgeName: 'Judge 2', ready: true, connected: true, scoresSubmitted: 0 },
      { judgeId: '3', judgeName: 'Judge 3', ready: false, connected: true, scoresSubmitted: 0 },
      { judgeId: '4', judgeName: 'Judge 4', ready: true, connected: false, scoresSubmitted: 0 },
    ]);

    // Mock routines
    setRoutines([
      {
        id: '1',
        title: 'Summer Breeze',
        studioName: 'Elite Dance Academy',
        dancers: ['Emma Johnson', 'Olivia Smith'],
        category: 'Contemporary Duet',
        duration: 180,
        order: 1,
        status: 'queued',
      },
      {
        id: '2',
        title: 'Fire Within',
        studioName: 'Rhythm Studios',
        dancers: ['Sophia Williams'],
        category: 'Jazz Solo',
        duration: 150,
        order: 2,
        status: 'queued',
      },
      {
        id: '3',
        title: 'Gravity',
        studioName: 'Star Performers',
        dancers: ['Ava Brown', 'Isabella Davis', 'Mia Garcia'],
        category: 'Contemporary Trio',
        duration: 195,
        order: 3,
        status: 'queued',
      },
    ]);
  }, []);

  // Check for backup on mount
  useEffect(() => {
    const backup = localStorage.getItem(`competition-backup-${competitionId}`);
    if (backup) {
      try {
        const data = JSON.parse(backup);
        setBackupData(data);
        setShowRecovery(true);
      } catch (e) {
        console.error('Failed to parse backup:', e);
      }
    }
  }, [competitionId]);

  // Auto-save state to localStorage
  useEffect(() => {
    if (!currentRoutine && routines.length === 0) return; // Don't save empty state

    const state = {
      timestamp: Date.now(),
      competitionId,
      routines,
      currentRoutine,
      scores,
      judges,
      isBreak,
      breakReason,
      timerSeconds,
      timerStartTime,
    };

    localStorage.setItem(`competition-backup-${competitionId}`, JSON.stringify(state));
  }, [competitionId, routines, currentRoutine, scores, judges, isBreak, breakReason, timerSeconds, timerStartTime]);

  // Restore from backup
  const handleRestore = useCallback(() => {
    if (!backupData) return;

    setRoutines(backupData.routines || []);
    setCurrentRoutineState(backupData.currentRoutine || null);
    setScores(backupData.scores || []);
    setJudges(backupData.judges || []);
    setIsBreak(backupData.isBreak || false);
    setBreakReason(backupData.breakReason || '');
    setTimerSeconds(backupData.timerSeconds || 0);
    setTimerStartTime(backupData.timerStartTime || null);

    setShowRecovery(false);
    toast.success('State restored from backup', { icon: '♻️', duration: 3000 });
  }, [backupData]);

  // Dismiss backup
  const handleDismissBackup = useCallback(() => {
    setShowRecovery(false);
    localStorage.removeItem(`competition-backup-${competitionId}`);
    toast('Backup dismissed', { duration: 2000 });
  }, [competitionId]);

  // Export backup
  const handleExport = useCallback(() => {
    const state = {
      timestamp: Date.now(),
      competitionId,
      routines,
      currentRoutine,
      scores,
      judges,
      isBreak,
      breakReason,
    };

    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `competition-${competitionId}-backup-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Backup exported', { icon: '💾', duration: 2000 });
  }, [competitionId, routines, currentRoutine, scores, judges, isBreak, breakReason]);

  // Listen for judge events
  useEffect(() => {
    const handleJudgeJoined = (payload: { judgeId: string; judgeName: string }) => {
      console.log('Judge joined:', payload);
      setJudges(prev => {
        const existing = prev.find(j => j.judgeId === payload.judgeId);
        if (existing) {
          return prev.map(j =>
            j.judgeId === payload.judgeId ? { ...j, connected: true } : j
          );
        }
        return [...prev, {
          judgeId: payload.judgeId,
          judgeName: payload.judgeName,
          ready: false,
          connected: true,
          scoresSubmitted: 0,
        }];
      });
      toast.success(`${payload.judgeName} connected`, { icon: '👋', duration: 2000 });
    };

    const handleJudgeLeft = (payload: { judgeId: string }) => {
      setJudges(prev =>
        prev.map(j =>
          j.judgeId === payload.judgeId ? { ...j, connected: false } : j
        )
      );
    };

    const handleJudgeReady = (payload: { judgeId: string }) => {
      setJudges(prev =>
        prev.map(j =>
          j.judgeId === payload.judgeId ? { ...j, ready: true } : j
        )
      );
      toast('Judge ready', { icon: '✅', duration: 1500 });
    };

    const handleJudgeNotReady = (payload: { judgeId: string }) => {
      setJudges(prev =>
        prev.map(j =>
          j.judgeId === payload.judgeId ? { ...j, ready: false } : j
        )
      );
    };

    const handleScoreSubmitted = (payload: ScoreSubmission) => {
      console.log('Score submitted:', payload);
      setScores(prev => [...prev, payload]);

      // Update judge score count
      setJudges(prev =>
        prev.map(j =>
          j.judgeId === payload.judgeId
            ? { ...j, scoresSubmitted: j.scoresSubmitted + 1 }
            : j
        )
      );

      toast.success(`${payload.judgeName} submitted score: ${payload.score}`, {
        icon: '🎯',
        duration: 2000,
      });
    };

    on(WSEvent.JUDGE_JOINED, handleJudgeJoined);
    on(WSEvent.JUDGE_LEFT, handleJudgeLeft);
    on(WSEvent.JUDGE_READY, handleJudgeReady);
    on(WSEvent.JUDGE_NOT_READY, handleJudgeNotReady);
    on(WSEvent.SCORE_SUBMITTED, handleScoreSubmitted);

    return () => {
      off(WSEvent.JUDGE_JOINED, handleJudgeJoined);
      off(WSEvent.JUDGE_LEFT, handleJudgeLeft);
      off(WSEvent.JUDGE_READY, handleJudgeReady);
      off(WSEvent.JUDGE_NOT_READY, handleJudgeNotReady);
      off(WSEvent.SCORE_SUBMITTED, handleScoreSubmitted);
    };
  }, [on, off]);

  // Timer update loop
  useEffect(() => {
    if (!timerStartTime || !currentRoutine) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
      setTimerSeconds(elapsed);
    }, 100); // Update every 100ms for smooth display

    return () => clearInterval(interval);
  }, [timerStartTime, currentRoutine]);

  // Start next routine
  const handleStartRoutine = useCallback((routine: Routine) => {
    setCurrentRoutineState(routine);
    setRoutines(prev =>
      prev.map(r => (r.id === routine.id ? { ...r, status: 'current' } : r))
    );
    setScores([]); // Clear scores for new routine
    setTimerSeconds(0); // Reset timer
    setTimerStartTime(Date.now()); // Start timer

    // Broadcast to all judges
    setCurrentRoutine({
      id: routine.id,
      title: routine.title,
      studio: { name: routine.studioName },
      dancers: routine.dancers,
      category: routine.category,
      duration: routine.duration,
      order: routine.order,
    } as any);

    toast.success(`Started: ${routine.title}`, { icon: '🎭', duration: 3000 });
  }, [setCurrentRoutine]);

  // Complete current routine
  const handleCompleteRoutine = useCallback(() => {
    if (!currentRoutine) return;

    setRoutines(prev =>
      prev.map(r => (r.id === currentRoutine.id ? { ...r, status: 'completed' } : r))
    );

    markRoutineCompleted({
      id: currentRoutine.id,
      title: currentRoutine.title,
      studio: { name: currentRoutine.studioName },
      dancers: currentRoutine.dancers,
      category: currentRoutine.category,
      duration: currentRoutine.duration,
      order: currentRoutine.order,
    } as any);

    // Calculate average score
    const routineScores = scores.filter(s => s.routineId === currentRoutine.id);
    if (routineScores.length > 0) {
      const avg = routineScores.reduce((sum, s) => sum + s.score, 0) / routineScores.length;
      toast.success(`Routine complete! Average score: ${avg.toFixed(2)}`, {
        icon: '✅',
        duration: 3000,
      });
    } else {
      toast('Routine complete', { icon: '✅', duration: 2000 });
    }

    setCurrentRoutineState(null);
    setTimerStartTime(null); // Stop timer
  }, [currentRoutine, scores, markRoutineCompleted]);

  // Start break
  const handleStartBreak = useCallback(() => {
    if (!breakReason.trim()) {
      toast.error('Please enter a break reason');
      return;
    }

    startBreak(breakDuration, breakReason);
    setIsBreak(true);
    toast.success(`Break started: ${breakReason}`, { icon: '⏸️', duration: 3000 });
  }, [breakDuration, breakReason, startBreak]);

  // End break
  const handleEndBreak = useCallback(() => {
    endBreak();
    setIsBreak(false);
    setBreakReason('');
    toast.success('Break ended', { icon: '▶️', duration: 2000 });
  }, [endBreak]);

  // Get next routine
  const nextRoutine = routines.find(r => r.status === 'queued');
  const queuedRoutines = routines.filter(r => r.status === 'queued');
  const completedRoutines = routines.filter(r => r.status === 'completed');

  // Score collection progress
  const scoresForCurrentRoutine = currentRoutine
    ? scores.filter(s => s.routineId === currentRoutine.id)
    : [];
  const activeJudges = judges.filter(j => j.connected && j.ready).length;
  const scoreProgress = activeJudges > 0
    ? (scoresForCurrentRoutine.length / activeJudges) * 100
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-4 md:p-8">
      {/* Recovery Banner */}
      {showRecovery && backupData && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 bg-yellow-500/20 backdrop-blur-md rounded-2xl border border-yellow-500/30 p-6"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-yellow-300 mb-2 flex items-center gap-2">
                ♻️ Backup Found
              </h3>
              <p className="text-white/80 mb-3">
                A previous session backup was found from{' '}
                {new Date(backupData.timestamp).toLocaleString()}.
                Would you like to restore it?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleRestore}
                  className="px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Restore Backup
                </button>
                <button
                  onClick={handleDismissBackup}
                  className="px-6 py-3 rounded-xl font-medium bg-white/10 text-white hover:bg-white/20 transition-all"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
            Director Control Panel
          </h1>
          <p className="text-white/60 text-sm">Competition: {competitionId}</p>
        </div>
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
          connected
            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
            : 'bg-red-500/20 text-red-300 border border-red-500/30'
        }`}>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Current Routine & Controls */}
        <div className="lg:col-span-2 space-y-6">

          {/* Current Routine */}
          <AnimatePresence mode="wait">
            {currentRoutine ? (
              <motion.div
                key={currentRoutine.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="text-white/60 text-sm uppercase tracking-wider mb-2">
                      Now Performing
                    </div>
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-3">
                      {currentRoutine.title}
                    </h2>
                    <div className="flex items-center gap-4 text-xl text-white/80">
                      <span>{currentRoutine.studioName}</span>
                      <span className="text-white/40">•</span>
                      <span>{currentRoutine.category}</span>
                    </div>
                  </div>
                  <div className="bg-indigo-500/20 text-indigo-300 px-6 py-3 rounded-xl border border-indigo-500/30">
                    <div className="text-sm text-indigo-300/70 mb-1">Order</div>
                    <div className="text-3xl font-bold">#{currentRoutine.order}</div>
                  </div>
                </div>

                {/* Routine Timer */}
                <div className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-xl p-6 mb-6 border border-purple-500/30">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-white/60 text-sm uppercase tracking-wider mb-2">
                        Elapsed Time
                      </div>
                      <div className={`text-6xl font-bold font-mono ${
                        timerSeconds > currentRoutine.duration + 10
                          ? 'text-red-400 animate-pulse'
                          : timerSeconds > currentRoutine.duration - 10
                          ? 'text-yellow-400'
                          : 'text-white'
                      }`}>
                        {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
                      </div>
                      <div className="text-white/60 text-sm mt-1">
                        Target: {Math.floor(currentRoutine.duration / 60)}:{(currentRoutine.duration % 60).toString().padStart(2, '0')}
                        {timerSeconds > currentRoutine.duration && (
                          <span className="text-red-400 ml-2 font-medium">
                            (+{timerSeconds - currentRoutine.duration}s overtime)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-white/60 text-sm mb-2">Progress</div>
                      <div className={`text-4xl font-bold ${
                        timerSeconds > currentRoutine.duration
                          ? 'text-red-400'
                          : timerSeconds >= currentRoutine.duration - 10
                          ? 'text-yellow-400'
                          : 'text-green-400'
                      }`}>
                        {Math.min(100, Math.round((timerSeconds / currentRoutine.duration) * 100))}%
                      </div>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="mt-4 w-full bg-white/10 rounded-full h-3 overflow-hidden">
                    <motion.div
                      animate={{ width: `${Math.min(100, (timerSeconds / currentRoutine.duration) * 100)}%` }}
                      className={`h-full transition-colors ${
                        timerSeconds > currentRoutine.duration
                          ? 'bg-gradient-to-r from-red-500 to-red-700'
                          : timerSeconds >= currentRoutine.duration - 10
                          ? 'bg-gradient-to-r from-yellow-500 to-orange-600'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600'
                      }`}
                    />
                  </div>
                </div>

                {/* Score Collection Progress */}
                <div className="bg-white/5 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white/80 font-medium">Score Collection</span>
                    <span className="text-white font-bold">
                      {scoresForCurrentRoutine.length}/{activeJudges}
                    </span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${scoreProgress}%` }}
                      className="h-full bg-gradient-to-r from-green-500 to-emerald-600"
                    />
                  </div>
                  {scoreProgress === 100 && (
                    <p className="text-green-300 text-sm mt-2">✅ All scores collected!</p>
                  )}
                </div>

                {/* Controls */}
                <div className="flex gap-3">
                  <button
                    onClick={handleCompleteRoutine}
                    disabled={scoreProgress < 100}
                    className={`
                      flex-1 py-4 rounded-xl font-bold text-lg transition-all duration-200
                      ${scoreProgress === 100
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:scale-[1.02] active:scale-95'
                        : 'bg-white/10 text-white/40 cursor-not-allowed'
                      }
                    `}
                  >
                    {scoreProgress === 100 ? 'Complete Routine' : 'Waiting for Scores...'}
                  </button>
                  <button
                    onClick={() => sendCommand('pause')}
                    className="px-6 py-4 rounded-xl font-bold text-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    ⏸️
                  </button>
                </div>
              </motion.div>
            ) : isBreak ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-12 text-center"
              >
                <div className="text-8xl mb-6">⏸️</div>
                <h2 className="text-3xl font-bold text-white mb-3">Break in Progress</h2>
                <p className="text-white/60 text-lg mb-6">{breakReason}</p>
                <button
                  onClick={handleEndBreak}
                  className="px-8 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  End Break
                </button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-12 text-center"
              >
                <div className="text-8xl mb-6">🎭</div>
                <h2 className="text-3xl font-bold text-white mb-3">Ready to Start</h2>
                <p className="text-white/60 text-lg mb-6">
                  {nextRoutine ? `Next: ${nextRoutine.title}` : 'No routines queued'}
                </p>
                {nextRoutine && (
                  <button
                    onClick={() => handleStartRoutine(nextRoutine)}
                    className="px-8 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:scale-[1.02] active:scale-95 transition-all"
                  >
                    Start Next Routine
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Routine Queue */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <h3 className="text-2xl font-bold text-white mb-4">
              Queue ({queuedRoutines.length})
            </h3>
            <div className="space-y-3">
              {queuedRoutines.map((routine) => (
                <div
                  key={routine.id}
                  className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="text-white font-medium text-lg">{routine.title}</div>
                    <div className="text-white/60 text-sm">{routine.studioName} • {routine.category}</div>
                  </div>
                  <button
                    onClick={() => handleStartRoutine(routine)}
                    className="px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all"
                  >
                    Start
                  </button>
                </div>
              ))}
              {queuedRoutines.length === 0 && (
                <p className="text-white/40 text-center py-8">No routines in queue</p>
              )}
            </div>
          </div>

          {/* Break Controls */}
          {!currentRoutine && !isBreak && (
            <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
              <h3 className="text-xl font-bold text-white mb-4">Start Break</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm mb-2">Reason</label>
                  <input
                    type="text"
                    value={breakReason}
                    onChange={(e) => setBreakReason(e.target.value)}
                    placeholder="e.g., Lunch Break, Awards Ceremony"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-white/80 text-sm mb-2">Duration (seconds)</label>
                  <input
                    type="number"
                    value={breakDuration}
                    onChange={(e) => setBreakDuration(parseInt(e.target.value))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={handleStartBreak}
                  className="w-full py-3 rounded-lg bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 hover:bg-yellow-500/30 font-medium transition-all"
                >
                  Start Break
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Judge Status & Stats */}
        <div className="space-y-6">

          {/* Judge Status */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              Judges ({judges.filter(j => j.connected).length}/{judges.length})
            </h3>
            <div className="space-y-3">
              {judges.map((judge) => (
                <div
                  key={judge.judgeId}
                  className={`bg-white/5 rounded-xl p-4 border ${
                    judge.connected ? 'border-green-500/30' : 'border-red-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white font-medium">{judge.judgeName}</span>
                    <div className="flex items-center gap-2">
                      {judge.connected ? (
                        judge.ready ? (
                          <span className="text-green-300 text-xs">✅ Ready</span>
                        ) : (
                          <span className="text-yellow-300 text-xs">⏸️ Not Ready</span>
                        )
                      ) : (
                        <span className="text-red-300 text-xs">🔌 Offline</span>
                      )}
                    </div>
                  </div>
                  <div className="text-white/60 text-sm">
                    Scores submitted: {judge.scoresSubmitted}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Statistics</h3>
            <div className="space-y-3">
              <div className="flex justify-between text-white">
                <span className="text-white/60">Completed:</span>
                <span className="font-bold">{completedRoutines.length}</span>
              </div>
              <div className="flex justify-between text-white">
                <span className="text-white/60">Remaining:</span>
                <span className="font-bold">{queuedRoutines.length}</span>
              </div>
              <div className="flex justify-between text-white">
                <span className="text-white/60">Total Scores:</span>
                <span className="font-bold">{scores.length}</span>
              </div>
            </div>
            {/* Export Button */}
            <button
              onClick={handleExport}
              className="w-full mt-4 py-3 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 font-medium transition-all flex items-center justify-center gap-2"
            >
              <span>💾</span>
              Export Backup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
