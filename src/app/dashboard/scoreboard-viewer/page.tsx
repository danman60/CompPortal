'use client';

/**
 * Public Scoreboard Viewer Display
 * Task #25: At Competition Mode - Audience-facing live scoreboard
 *
 * Features:
 * - Full-screen display optimized for large screens/projectors
 * - Real-time routine information (current, next up, completed)
 * - Live score updates as judges submit
 * - Competition standings/leaderboard
 * - Break/intermission announcements
 * - Professional design with smooth animations
 * - Read-only (no controls) - pure viewer mode
 * - WebSocket integration for instant updates
 */

import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WSEvent, type RoutineStatePayload, type ScorePayload } from '@/lib/websocket-types';
import { motion, AnimatePresence } from 'framer-motion';

interface Routine extends RoutineStatePayload {
  id?: string;
  scores: number[];
  averageScore: number | null;
}

interface Standing {
  routineTitle: string;
  studioName: string;
  category: string;
  averageScore: number;
  rank: number;
}

export default function ScoreboardViewerPage() {
  // Viewer ID - no auth needed
  const viewerId = 'viewer-' + Math.random().toString(36).substring(7);
  const competitionId = 'comp-demo-2025'; // TODO: Get from URL param

  // WebSocket connection
  const { connected, on, off } = useWebSocket({
    competitionId,
    userId: viewerId,
    role: 'viewer' as any, // Type assertion since viewer isn't in the role union
  });

  // State
  const [currentRoutine, setCurrentRoutine] = useState<Routine | null>(null);
  const [nextRoutine, setNextRoutine] = useState<RoutineStatePayload | null>(null);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [isBreak, setIsBreak] = useState(false);
  const [breakInfo, setBreakInfo] = useState<{ reason: string; duration: number } | null>(null);
  const [judgeCount, setJudgeCount] = useState(4); // TODO: Get from competition config

  // Listen for routine events
  useEffect(() => {
    const handleRoutineCurrent = (payload: RoutineStatePayload) => {
      console.log('Routine current:', payload);
      setCurrentRoutine({
        ...payload,
        id: payload.routineId,
        scores: [],
        averageScore: null,
      });
      setIsBreak(false);
    };

    const handleRoutineCompleted = (payload: RoutineStatePayload) => {
      console.log('Routine completed:', payload);

      // Move to standings if it has scores
      if (currentRoutine && currentRoutine.averageScore !== null) {
        const newStanding: Standing = {
          routineTitle: currentRoutine.title,
          studioName: currentRoutine.studioName,
          category: currentRoutine.category,
          averageScore: currentRoutine.averageScore,
          rank: 0, // Will be calculated
        };

        setStandings(prev => {
          const updated = [...prev, newStanding].sort((a, b) => b.averageScore - a.averageScore);
          return updated.map((standing, idx) => ({ ...standing, rank: idx + 1 }));
        });
      }

      setCurrentRoutine(null);
    };

    const handleScoreSubmitted = (payload: ScorePayload) => {
      console.log('Score submitted:', payload);

      if (currentRoutine && payload.routineId === currentRoutine.routineId) {
        const newScores = [...currentRoutine.scores, payload.score];
        const avg = newScores.reduce((sum, s) => sum + s, 0) / newScores.length;

        setCurrentRoutine(prev => prev ? {
          ...prev,
          scores: newScores,
          averageScore: avg,
        } : null);
      }
    };

    const handleBreakStart = (payload: { reason: string; duration: number }) => {
      console.log('Break started:', payload);
      setIsBreak(true);
      setBreakInfo(payload);
      setCurrentRoutine(null);
    };

    const handleBreakEnd = () => {
      console.log('Break ended');
      setIsBreak(false);
      setBreakInfo(null);
    };

    on(WSEvent.ROUTINE_CURRENT, handleRoutineCurrent);
    on(WSEvent.ROUTINE_COMPLETED, handleRoutineCompleted);
    on(WSEvent.SCORE_SUBMITTED, handleScoreSubmitted);
    on(WSEvent.BREAK_START, handleBreakStart);
    on(WSEvent.BREAK_END, handleBreakEnd);

    return () => {
      off(WSEvent.ROUTINE_CURRENT, handleRoutineCurrent);
      off(WSEvent.ROUTINE_COMPLETED, handleRoutineCompleted);
      off(WSEvent.SCORE_SUBMITTED, handleScoreSubmitted);
      off(WSEvent.BREAK_START, handleBreakStart);
      off(WSEvent.BREAK_END, handleBreakEnd);
    };
  }, [on, off, currentRoutine]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-5xl font-bold text-white">Dance Competition 2025</h1>
          <p className="text-white/60 text-xl mt-2">Live Scoreboard</p>
        </div>
        <div className={`flex items-center gap-3 px-6 py-3 rounded-full text-lg font-medium ${
          connected
            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
            : 'bg-red-500/20 text-red-300 border border-red-500/30'
        }`}>
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          {connected ? 'Live' : 'Offline'}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Left Column: Current Routine (2/3 width) */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">

            {/* Break Mode */}
            {isBreak && breakInfo && (
              <motion.div
                key="break"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-16 text-center"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="text-9xl mb-8"
                >
                  ⏸️
                </motion.div>
                <h2 className="text-6xl font-bold text-white mb-6">{breakInfo.reason}</h2>
                <p className="text-white/60 text-2xl">Competition will resume shortly</p>
              </motion.div>
            )}

            {/* Current Routine */}
            {!isBreak && currentRoutine && (
              <motion.div
                key={currentRoutine.routineId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-12"
              >
                <div className="text-white/60 text-xl uppercase tracking-wider mb-4">
                  Now Performing
                </div>

                <h2 className="text-7xl font-bold text-white mb-6">
                  {currentRoutine.title}
                </h2>

                <div className="flex items-center gap-6 text-3xl text-white/80 mb-8">
                  <span className="flex items-center gap-3">
                    <span className="text-4xl">🏫</span>
                    {currentRoutine.studioName}
                  </span>
                  <span className="text-white/40">•</span>
                  <span className="flex items-center gap-3">
                    <span className="text-4xl">🎭</span>
                    {currentRoutine.category}
                  </span>
                </div>

                {/* Dancers */}
                {currentRoutine.dancers.length > 0 && (
                  <div className="bg-white/5 rounded-2xl p-6 mb-8">
                    <div className="text-white/60 text-xl uppercase tracking-wider mb-4">
                      Dancers ({currentRoutine.dancers.length})
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {currentRoutine.dancers.map((dancer, idx) => (
                        <div
                          key={idx}
                          className="bg-white/10 backdrop-blur-sm px-6 py-3 rounded-xl text-white text-xl border border-white/20"
                        >
                          {dancer}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Score Display */}
                <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl p-8 border border-indigo-500/30">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-white/80 text-2xl font-medium">Scores</span>
                    <span className="text-white text-xl">
                      {currentRoutine.scores.length}/{judgeCount} judges
                    </span>
                  </div>

                  {/* Average Score */}
                  {currentRoutine.averageScore !== null ? (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-center"
                    >
                      <div className="text-white/60 text-xl mb-2">Average Score</div>
                      <div className="text-8xl font-bold text-white">
                        {currentRoutine.averageScore.toFixed(2)}
                      </div>
                    </motion.div>
                  ) : (
                    <div className="text-center py-8 text-white/40 text-2xl">
                      Waiting for scores...
                    </div>
                  )}

                  {/* Individual Scores */}
                  {currentRoutine.scores.length > 0 && (
                    <div className="flex justify-center gap-4 mt-8">
                      {currentRoutine.scores.map((score, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: idx * 0.1 }}
                          className="bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 text-3xl font-bold text-white border border-white/20"
                        >
                          {score.toFixed(1)}
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="mt-6">
                    <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentRoutine.scores.length / judgeCount) * 100}%` }}
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-600"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Waiting State */}
            {!isBreak && !currentRoutine && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-16 text-center"
              >
                <div className="text-9xl mb-8">🎭</div>
                <h2 className="text-6xl font-bold text-white mb-6">
                  Starting Soon
                </h2>
                <p className="text-white/60 text-2xl">
                  The next routine will begin shortly
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Standings (1/3 width) */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl border border-white/20 p-8">
          <h3 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <span>🏆</span>
            Standings
          </h3>

          {standings.length > 0 ? (
            <div className="space-y-4">
              {standings.slice(0, 10).map((standing, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`
                    bg-white/5 rounded-2xl p-6 border
                    ${standing.rank === 1 ? 'border-yellow-500/50 bg-yellow-500/10' : ''}
                    ${standing.rank === 2 ? 'border-gray-400/50 bg-gray-400/10' : ''}
                    ${standing.rank === 3 ? 'border-orange-600/50 bg-orange-600/10' : ''}
                    ${standing.rank > 3 ? 'border-white/10' : ''}
                  `}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`
                        text-3xl font-bold
                        ${standing.rank === 1 ? 'text-yellow-300' : ''}
                        ${standing.rank === 2 ? 'text-gray-300' : ''}
                        ${standing.rank === 3 ? 'text-orange-400' : ''}
                        ${standing.rank > 3 ? 'text-white/60' : ''}
                      `}>
                        #{standing.rank}
                      </div>
                      {standing.rank <= 3 && (
                        <span className="text-3xl">
                          {standing.rank === 1 ? '🥇' : standing.rank === 2 ? '🥈' : '🥉'}
                        </span>
                      )}
                    </div>
                    <div className="text-3xl font-bold text-white">
                      {standing.averageScore.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-white font-medium text-xl mb-1">
                    {standing.routineTitle}
                  </div>
                  <div className="text-white/60 text-lg">
                    {standing.studioName}
                  </div>
                  <div className="text-white/40 text-sm mt-1">
                    {standing.category}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-white/40 text-xl">
              <div className="text-6xl mb-4">📊</div>
              <p>No scores yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-white/40 text-lg">
        <p>Scores are displayed as they are submitted by judges</p>
      </div>
    </div>
  );
}
