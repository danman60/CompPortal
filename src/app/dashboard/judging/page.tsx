'use client';

/**
 * Judge Tablet Responsive Interface
 * Task #23: At Competition Mode - Judge scoring interface optimized for tablets
 *
 * Features:
 * - Responsive design for 7"-12" tablets (portrait/landscape)
 * - Real-time routine updates via WebSocket
 * - Large touch-friendly score input buttons
 * - Visual feedback for score submission
 * - Judge ready/not ready status toggle
 * - Current routine display with dancer info
 * - Score history for current competition
 * - Offline indicator when disconnected
 */

import { useState, useEffect, useCallback } from 'react';
import { useJudgeSocket } from '@/hooks/useWebSocket';
import { WSEvent } from '@/lib/websocket-types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

interface Routine {
  routineId: string;
  title: string;
  studioName: string;
  dancers: string[];
  category: string;
  duration: number;
  order: number;
}

interface SubmittedScore {
  routineId: string;
  score: number;
  timestamp: number;
  notes?: string;
}

export default function JudgingPage() {
  // Mock judge ID - TODO: Get from auth context
  const judgeId = 'judge-' + Math.random().toString(36).substring(7);
  const competitionId = 'comp-demo-2025'; // TODO: Get from route params or context

  // WebSocket connection
  const {
    connected,
    error,
    submitScore,
    setReady,
    on,
    off,
  } = useJudgeSocket(competitionId, judgeId);

  // State
  const [currentRoutine, setCurrentRoutine] = useState<Routine | null>(null);
  const [selectedScore, setSelectedScore] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [scoreHistory, setScoreHistory] = useState<SubmittedScore[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Listen for routine changes
  useEffect(() => {
    const handleRoutineCurrent = (payload: Routine) => {
      console.log('New routine:', payload);
      setCurrentRoutine(payload);
      setSelectedScore(null); // Reset score selection
      setNotes(''); // Reset notes
      toast.success(`Now Performing: ${payload.title}`, {
        icon: '🎭',
        duration: 3000,
      });
    };

    const handleRoutineCompleted = (payload: Routine) => {
      console.log('Routine completed:', payload);
      if (payload.routineId === currentRoutine?.routineId) {
        setCurrentRoutine(null);
        toast('Routine Complete', {
          icon: '✅',
          duration: 2000,
        });
      }
    };

    on(WSEvent.ROUTINE_CURRENT, handleRoutineCurrent);
    on(WSEvent.ROUTINE_COMPLETED, handleRoutineCompleted);

    return () => {
      off(WSEvent.ROUTINE_CURRENT, handleRoutineCurrent);
      off(WSEvent.ROUTINE_COMPLETED, handleRoutineCompleted);
    };
  }, [on, off, currentRoutine?.routineId]);

  // Handle ready status toggle
  const handleReadyToggle = useCallback(() => {
    const newReadyState = !isReady;
    setIsReady(newReadyState);
    setReady(newReadyState);

    toast(newReadyState ? 'You are ready to score' : 'Marked as not ready', {
      icon: newReadyState ? '✅' : '⏸️',
      duration: 2000,
    });
  }, [isReady, setReady]);

  // Handle score submission
  const handleSubmitScore = useCallback(() => {
    if (!currentRoutine) {
      toast.error('No routine is currently performing');
      return;
    }

    if (selectedScore === null) {
      toast.error('Please select a score');
      return;
    }

    setIsSubmitting(true);

    // Submit score via WebSocket
    submitScore(currentRoutine.routineId, selectedScore, notes || undefined);

    // Add to local history
    const submission: SubmittedScore = {
      routineId: currentRoutine.routineId,
      score: selectedScore,
      timestamp: Date.now(),
      notes: notes || undefined,
    };
    setScoreHistory(prev => [submission, ...prev]);

    // Reset UI
    setSelectedScore(null);
    setNotes('');
    setIsSubmitting(false);

    toast.success(`Score ${selectedScore} submitted!`, {
      icon: '🎯',
      duration: 2000,
    });
  }, [currentRoutine, selectedScore, notes, submitScore]);

  // Quick score buttons (1-10 scale)
  const scoreButtons = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Connection status indicator
  const ConnectionStatus = () => (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
      connected
        ? 'bg-green-500/20 text-green-300 border border-green-500/30'
        : 'bg-red-500/20 text-red-300 border border-red-500/30'
    }`}>
      <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
      {connected ? 'Connected' : 'Disconnected'}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">Judge Panel</h1>
          <p className="text-white/60 text-sm">Competition: {competitionId}</p>
        </div>
        <ConnectionStatus />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column: Current Routine Info */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {currentRoutine ? (
              <motion.div
                key={currentRoutine.routineId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 mb-6"
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
                      <span className="flex items-center gap-2">
                        <span className="text-2xl">🏫</span>
                        {currentRoutine.studioName}
                      </span>
                      <span className="text-white/40">•</span>
                      <span className="flex items-center gap-2">
                        <span className="text-2xl">🎭</span>
                        {currentRoutine.category}
                      </span>
                    </div>
                  </div>
                  <div className="bg-indigo-500/20 text-indigo-300 px-6 py-3 rounded-xl border border-indigo-500/30 text-center">
                    <div className="text-sm text-indigo-300/70 mb-1">Order</div>
                    <div className="text-3xl font-bold">#{currentRoutine.order}</div>
                  </div>
                </div>

                {/* Dancers */}
                {currentRoutine.dancers.length > 0 && (
                  <div className="bg-white/5 rounded-xl p-4 mb-6">
                    <div className="text-white/60 text-sm uppercase tracking-wider mb-3">
                      Dancers ({currentRoutine.dancers.length})
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentRoutine.dancers.map((dancer, idx) => (
                        <div
                          key={idx}
                          className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-lg text-white border border-white/20"
                        >
                          {dancer}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Score Input */}
                <div className="space-y-6">
                  <div>
                    <label className="block text-white/80 text-lg font-medium mb-4">
                      Select Score (1-10)
                    </label>
                    <div className="grid grid-cols-5 md:grid-cols-10 gap-3">
                      {scoreButtons.map((score) => (
                        <button
                          key={score}
                          onClick={() => setSelectedScore(score)}
                          className={`
                            aspect-square rounded-xl font-bold text-2xl transition-all duration-200
                            ${selectedScore === score
                              ? 'bg-gradient-to-br from-green-400 to-green-600 text-white scale-110 shadow-2xl border-2 border-green-300'
                              : 'bg-white/10 backdrop-blur-sm text-white/80 hover:bg-white/20 hover:scale-105 border border-white/20'
                            }
                            active:scale-95
                          `}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Notes (Optional) */}
                  <div>
                    <label className="block text-white/80 text-lg font-medium mb-3">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add performance notes..."
                      className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handleSubmitScore}
                    disabled={selectedScore === null || isSubmitting}
                    className={`
                      w-full py-6 rounded-xl font-bold text-xl transition-all duration-200
                      ${selectedScore !== null && !isSubmitting
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-2xl hover:scale-[1.02] active:scale-95'
                        : 'bg-white/10 text-white/40 cursor-not-allowed'
                      }
                    `}
                  >
                    {isSubmitting ? 'Submitting...' : selectedScore !== null ? `Submit Score: ${selectedScore}` : 'Select a Score'}
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-12 text-center"
              >
                <div className="text-8xl mb-6">⏳</div>
                <h2 className="text-3xl font-bold text-white mb-3">
                  Waiting for Next Routine
                </h2>
                <p className="text-white/60 text-lg">
                  The competition director will start the next routine shortly
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: Controls & History */}
        <div className="space-y-6">

          {/* Ready Status Toggle */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">Judge Status</h3>
            <button
              onClick={handleReadyToggle}
              className={`
                w-full py-4 rounded-xl font-bold text-lg transition-all duration-200
                ${isReady
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
                  : 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:from-yellow-600 hover:to-orange-700'
                }
                hover:scale-[1.02] active:scale-95 shadow-lg
              `}
            >
              {isReady ? '✅ Ready to Score' : '⏸️ Not Ready'}
            </button>
            <p className="text-white/60 text-sm mt-3 text-center">
              Toggle your ready status for the director
            </p>
          </div>

          {/* Score History */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6">
            <h3 className="text-xl font-bold text-white mb-4">
              Score History ({scoreHistory.length})
            </h3>

            {scoreHistory.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {scoreHistory.map((submission, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-white/5 rounded-xl p-4 border border-white/10"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/80 text-sm">
                        {new Date(submission.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-2xl font-bold text-green-400">
                        {submission.score}
                      </span>
                    </div>
                    {submission.notes && (
                      <p className="text-white/60 text-sm italic">
                        "{submission.notes}"
                      </p>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-white/40">
                <div className="text-4xl mb-3">📊</div>
                <p>No scores submitted yet</p>
              </div>
            )}
          </div>

          {/* Connection Error */}
          {error && (
            <div className="bg-red-500/20 backdrop-blur-md rounded-2xl border border-red-500/30 p-6">
              <h3 className="text-xl font-bold text-red-300 mb-2">
                Connection Error
              </h3>
              <p className="text-red-200/80 text-sm">
                {error}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Custom Scrollbar Styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}
