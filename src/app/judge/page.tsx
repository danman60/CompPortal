'use client';

/**
 * Judge Tablet Scoring Interface
 *
 * Tablet-optimized scoring interface for judges during Game Day.
 *
 * Features:
 * - Current routine display (entry #, title, studio, category)
 * - Score input: slider + manual typing (00.00-99.99 format)
 * - Award level auto-display based on score
 * - Comments text field
 * - Special awards nomination field
 * - Submit button (locks score after submission)
 * - WebSocket sync for real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Award,
  Coffee,
  Clock,
  Send,
  Lock,
  Unlock,
  MessageSquare,
  Star,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Music,
  Users,
  ArrowLeft,
} from 'lucide-react';

// Types
interface CurrentRoutine {
  id: string;
  entryNumber: number;
  title: string;
  studioName: string;
  category: string;
  ageGroup: string;
  size: string;
  dancers: string[];
  durationMs: number;
}

interface AdjudicationLevel {
  name: string;
  min: number;
  max: number;
  color: string;
}

interface JudgeState {
  currentRoutine: CurrentRoutine | null;
  score: string; // String to preserve XX.XX format
  comments: string;
  specialAwards: string;
  isSubmitted: boolean;
  isSubmitting: boolean;
  isConnected: boolean;
  judgePosition: 'A' | 'B' | 'C';
  breakRequestStatus: 'none' | 'pending' | 'approved' | 'denied';
  breakRequestDuration: number | null;
  judgeName: string;
}

// Default adjudication levels (will be loaded from competition settings)
const DEFAULT_LEVELS: AdjudicationLevel[] = [
  { name: 'Dynamic Diamond', min: 95.0, max: 99.99, color: '#00D4FF' },
  { name: 'Titanium', min: 92.0, max: 94.99, color: '#C0C0C0' },
  { name: 'Platinum', min: 88.0, max: 91.99, color: '#E5E4E2' },
  { name: 'High Gold', min: 85.0, max: 87.99, color: '#FFD700' },
  { name: 'Gold', min: 80.0, max: 84.99, color: '#DAA520' },
  { name: 'Silver', min: 75.0, max: 79.99, color: '#C0C0C0' },
  { name: 'Bronze', min: 70.0, max: 74.99, color: '#CD7F32' },
];

export default function JudgePage() {
  // State
  const [state, setState] = useState<JudgeState>({
    currentRoutine: null,
    score: '',
    comments: '',
    specialAwards: '',
    isSubmitted: false,
    isSubmitting: false,
    isConnected: false,
    judgePosition: 'A',
    judgeName: 'Judge A',
    breakRequestStatus: 'none',
    breakRequestDuration: null,
  });

  const [adjudicationLevels] = useState<AdjudicationLevel[]>(DEFAULT_LEVELS);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const scoreInputRef = useRef<HTMLInputElement>(null);

  // Demo data for testing (will be replaced with WebSocket data)
  useEffect(() => {
    const demoRoutine: CurrentRoutine = {
      id: '1',
      entryNumber: 101,
      title: 'Rise Up',
      studioName: 'Elite Dance Academy',
      category: 'Contemporary',
      ageGroup: 'Teen',
      size: 'Small Group',
      dancers: ['Emma Smith', 'Olivia Johnson', 'Sophia Williams', 'Ava Brown', 'Isabella Jones'],
      durationMs: 180000,
    };

    setState((prev) => ({
      ...prev,
      currentRoutine: demoRoutine,
      isConnected: true,
    }));
  }, []);

  // Parse score string to number
  const parseScore = (scoreStr: string): number | null => {
    if (!scoreStr || scoreStr === '') return null;
    const num = parseFloat(scoreStr);
    if (isNaN(num) || num < 0 || num > 99.99) return null;
    return num;
  };

  // Format score to XX.XX
  const formatScore = (num: number): string => {
    return num.toFixed(2);
  };

  // Validate score format (XX.XX)
  const isValidScoreFormat = (scoreStr: string): boolean => {
    if (scoreStr === '') return true; // Empty is valid (not set yet)
    const regex = /^\d{1,2}(\.\d{0,2})?$/;
    return regex.test(scoreStr);
  };

  // Get award level based on score
  const getAwardLevel = (scoreStr: string): AdjudicationLevel | null => {
    const score = parseScore(scoreStr);
    if (score === null) return null;

    for (const level of adjudicationLevels) {
      if (score >= level.min && score <= level.max) {
        return level;
      }
    }
    return null;
  };

  // Handle score input change
  const handleScoreChange = (value: string) => {
    // Allow empty or valid format
    if (value === '' || isValidScoreFormat(value)) {
      setState((prev) => ({ ...prev, score: value }));
      setError(null);
    }
  };

  // Handle score slider change
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setState((prev) => ({ ...prev, score: formatScore(value) }));
    setError(null);
  };

  // Handle score input blur (format to XX.XX)
  const handleScoreBlur = () => {
    const score = parseScore(state.score);
    if (score !== null) {
      setState((prev) => ({ ...prev, score: formatScore(score) }));
    }
  };

  // Submit score
  const handleSubmit = useCallback(async () => {
    const score = parseScore(state.score);

    if (score === null) {
      setError('Please enter a valid score (00.00-99.99)');
      return;
    }

    if (state.isSubmitting || state.isSubmitted) return;

    setState((prev) => ({ ...prev, isSubmitting: true }));
    setError(null);

    try {
      // TODO: Call tRPC mutation to submit score
      // await submitScore.mutateAsync({
      //   entryId: state.currentRoutine?.id,
      //   score,
      //   comments: state.comments,
      //   specialAwards: state.specialAwards,
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        isSubmitted: true,
      }));

      setSuccessMessage('Score submitted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);

      // TODO: WebSocket broadcast score:submitted
    } catch (err) {
      setState((prev) => ({ ...prev, isSubmitting: false }));
      setError(err instanceof Error ? err.message : 'Failed to submit score');
    }
  }, [state.score, state.comments, state.specialAwards, state.isSubmitting, state.isSubmitted]);

  

  // Handle break request (Task #8)
  const handleBreakRequest = useCallback(async (durationMinutes: number) => {
    if (state.breakRequestStatus === 'pending') return;

    setState(prev => ({
      ...prev,
      breakRequestStatus: 'pending',
      breakRequestDuration: durationMinutes,
    }));

    try {
      // TODO: Call tRPC mutation to request break
      // await requestBreak.mutateAsync({
      //   competitionId: currentCompetitionId,
      //   durationMinutes,
      //   reason: 'Judge break request',
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500));

      setSuccessMessage(`Break request (${durationMinutes}m) sent to CD`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Simulate CD response after 5 seconds (for demo)
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          breakRequestStatus: 'approved', // or 'denied' based on CD response
        }));
        setTimeout(() => {
          setState(prev => ({
            ...prev,
            breakRequestStatus: 'none',
            breakRequestDuration: null,
          }));
        }, 5000);
      }, 5000);

    } catch (err) {
      setState(prev => ({
        ...prev,
        breakRequestStatus: 'none',
        breakRequestDuration: null,
      }));
      setError(err instanceof Error ? err.message : 'Failed to request break');
    }
  }, [state.breakRequestStatus]);

  // Get current award level
  const currentAwardLevel = getAwardLevel(state.score);
  const sliderValue = parseScore(state.score) ?? 85;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-gray-900 to-black text-white">
      {/* Back to Test Page link */}
      <Link
        href="/game-day-test"
        className="fixed top-2 left-2 px-2 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-xs text-white z-50 flex items-center gap-1"
      >
        <ArrowLeft size={12} />
        Test Page
      </Link>

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-900/50">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold"
            style={{ backgroundColor: '#6366F1' }}
          >
            {state.judgePosition}
          </div>
          <div>
            <div className="font-semibold text-white">{state.judgeName}</div>
            <div className="text-xs text-gray-400">Judge Position {state.judgePosition}</div>
          </div>
        </div>

        {/* Connection Status */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            state.isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}
        >
          {state.isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
          {state.isConnected ? 'Live' : 'Offline'}
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-2xl mx-auto">
        {/* Current Routine Card */}
        {state.currentRoutine ? (
          <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-2xl border border-indigo-500/30 p-6 mb-6">
            <div className="text-sm font-medium text-indigo-300 mb-2">NOW SCORING</div>

            {/* Entry Number */}
            <div className="text-6xl font-bold text-white mb-2">
              #{state.currentRoutine.entryNumber}
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-white mb-1">{state.currentRoutine.title}</h1>

            {/* Studio */}
            <div className="text-lg text-gray-300 mb-3">{state.currentRoutine.studioName}</div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 bg-indigo-500/30 rounded-full text-indigo-200 text-sm">
                {state.currentRoutine.category}
              </span>
              <span className="px-3 py-1 bg-purple-500/30 rounded-full text-purple-200 text-sm">
                {state.currentRoutine.ageGroup}
              </span>
              <span className="px-3 py-1 bg-pink-500/30 rounded-full text-pink-200 text-sm">
                {state.currentRoutine.size}
              </span>
            </div>

            {/* Dancers */}
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Users className="w-4 h-4" />
              <span>{state.currentRoutine.dancers.length} dancers</span>
            </div>
          </div>
        ) : (
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-8 mb-6 text-center">
            <Music className="w-12 h-12 mx-auto mb-3 text-gray-500" />
            <p className="text-gray-400">Waiting for next routine...</p>
          </div>
        )}

        {/* Scoring Section */}
        <div
          className={`bg-gray-800/50 rounded-2xl border p-6 mb-6 ${
            state.isSubmitted ? 'border-green-500/50' : 'border-gray-700'
          }`}
        >
          {/* Score Input */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-300">Score</label>
              {state.isSubmitted ? (
                <Lock className="w-4 h-4 text-green-400" />
              ) : (
                <Unlock className="w-4 h-4 text-gray-500" />
              )}
            </div>

            {/* Large Score Display / Input */}
            <div className="flex items-center justify-center mb-4">
              <input
                ref={scoreInputRef}
                type="text"
                inputMode="decimal"
                value={state.score}
                onChange={(e) => handleScoreChange(e.target.value)}
                onBlur={handleScoreBlur}
                disabled={state.isSubmitted}
                placeholder="00.00"
                className={`text-6xl font-bold text-center w-48 bg-transparent border-b-4 focus:outline-none ${
                  state.isSubmitted
                    ? 'text-green-400 border-green-500'
                    : currentAwardLevel
                    ? 'border-indigo-500 text-white'
                    : 'text-gray-400 border-gray-600'
                }`}
                style={{ color: currentAwardLevel?.color }}
              />
            </div>

            {/* Slider */}
            <div className="px-2">
              <input
                type="range"
                min="0"
                max="99.99"
                step="0.01"
                value={sliderValue}
                onChange={handleSliderChange}
                disabled={state.isSubmitted}
                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0.00</span>
                <span>50.00</span>
                <span>99.99</span>
              </div>
            </div>
          </div>

          {/* Award Level Display */}
          {currentAwardLevel && (
            <div
              className="flex items-center justify-center gap-3 py-4 rounded-xl mb-6 border"
              style={{
                backgroundColor: `${currentAwardLevel.color}15`,
                borderColor: `${currentAwardLevel.color}40`,
              }}
            >
              <Award className="w-8 h-8" style={{ color: currentAwardLevel.color }} />
              <span
                className="text-2xl font-bold"
                style={{ color: currentAwardLevel.color }}
              >
                {currentAwardLevel.name}
              </span>
            </div>
          )}

          {/* Comments */}
          <div className="mb-4">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <MessageSquare className="w-4 h-4" />
              Comments (optional)
            </label>
            <textarea
              value={state.comments}
              onChange={(e) => setState((prev) => ({ ...prev, comments: e.target.value }))}
              disabled={state.isSubmitted}
              placeholder="Add performance notes..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
          </div>

          {/* Special Awards */}
          <div className="mb-6">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
              <Star className="w-4 h-4" />
              Special Award Nomination (optional)
            </label>
            <input
              type="text"
              value={state.specialAwards}
              onChange={(e) => setState((prev) => ({ ...prev, specialAwards: e.target.value }))}
              disabled={state.isSubmitted}
              placeholder="e.g., Best Choreography, Outstanding Technique..."
              className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg mb-4 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg mb-4 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {successMessage}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!state.score || state.isSubmitting || state.isSubmitted || !state.currentRoutine}
            className={`w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
              state.isSubmitted
                ? 'bg-green-600 text-white cursor-not-allowed'
                : state.isSubmitting
                ? 'bg-indigo-600 text-white cursor-wait'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {state.isSubmitted ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Score Submitted
              </>
            ) : state.isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Submit Score
              </>
            )}
          </button>

          {state.isSubmitted && (
            <p className="text-center text-sm text-gray-500 mt-3">
              Score locked. Only the Competition Director can edit.
            </p>
          )}
        </div>

        
        {/* Break Request Section (Task #8) */}
        <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Coffee className="w-5 h-5 text-orange-400" />
            <h3 className="font-medium text-white">Request Break</h3>
          </div>

          {state.breakRequestStatus === 'pending' ? (
            <div className="flex items-center justify-center gap-3 py-4 bg-orange-500/10 rounded-xl border border-orange-500/30">
              <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-orange-300">
                Awaiting CD approval ({state.breakRequestDuration}m)
              </span>
            </div>
          ) : state.breakRequestStatus === 'approved' ? (
            <div className="flex items-center justify-center gap-3 py-4 bg-green-500/10 rounded-xl border border-green-500/30">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-300">Break approved!</span>
            </div>
          ) : state.breakRequestStatus === 'denied' ? (
            <div className="flex items-center justify-center gap-3 py-4 bg-red-500/10 rounded-xl border border-red-500/30">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-300">Break request denied</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleBreakRequest(2)}
                disabled={!state.isConnected}
                className="py-4 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
              >
                <Clock className="w-5 h-5" />
                <span>2 min</span>
              </button>
              <button
                onClick={() => handleBreakRequest(5)}
                disabled={!state.isConnected}
                className="py-4 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
              >
                <Clock className="w-5 h-5" />
                <span>5 min</span>
              </button>
              <button
                onClick={() => handleBreakRequest(10)}
                disabled={!state.isConnected}
                className="py-4 px-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex flex-col items-center gap-1"
              >
                <Clock className="w-5 h-5" />
                <span>10 min</span>
              </button>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-3 text-center">
            Break request will be sent to Competition Director for approval
          </p>
        </div>

        {/* Quick Reference - Award Levels */}
        <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Award Levels Reference</h3>
          <div className="grid grid-cols-2 gap-2">
            {adjudicationLevels.map((level) => (
              <div
                key={level.name}
                className="flex items-center justify-between px-3 py-2 rounded-lg"
                style={{ backgroundColor: `${level.color}10` }}
              >
                <span className="text-sm font-medium" style={{ color: level.color }}>
                  {level.name}
                </span>
                <span className="text-xs text-gray-500">
                  {level.min.toFixed(2)}-{level.max.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
