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

  // Start next routine
  const handleStartRoutine = useCallback((routine: Routine) => {
    setCurrentRoutineState(routine);
    setRoutines(prev =>
      prev.map(r => (r.id === routine.id ? { ...r, status: 'current' } : r))
    );
    setScores([]); // Clear scores for new routine

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
          </div>
        </div>
      </div>
    </div>
  );
}
