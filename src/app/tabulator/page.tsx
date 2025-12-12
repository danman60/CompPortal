'use client';

import { useEffect, useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Play,
  Square,
  ChevronLeft,
  ChevronRight,
  Coffee,
  AlertCircle,
  Clock,
  Users,
  RefreshCw,
  Printer,
  GripVertical,
  CheckCircle2,
  Bell,
  X,
  Check,
} from 'lucide-react';

// Types
interface ScheduleEntry {
  id: string;
  entryNumber: number;
  title: string;
  studioName: string;
  category: string;
  ageGroup: string;
  durationMs: number;
  status: 'queued' | 'current' | 'completed' | 'skipped';
  isBreak?: boolean;
  breakDurationMinutes?: number;
}

interface JudgeScore {
  scoreId: string;
  judgeId: string;
  judgeName: string;
  score: number;
  comments: string | null;
  timestamp: Date | null;
}

interface LiveState {
  competitionId: string;
  competitionState: string;
  currentEntry: {
    id: string;
    title: string;
    entryNumber: number;
    studioName: string;
    category: string;
  } | null;
  currentEntryState: string | null;
  currentEntryStartedAt: string | null;
  scheduleDelayMinutes: number;
  judgesCanSeeScores: boolean;
}

interface BreakRequest {
  id: string;
  judgeId: string;
  judgeName: string;
  judgeNumber: number | null;
  requestedDurationMinutes: number;
  reason: string | null;
  status: string;
  createdAt: Date;
}

export default function TabulatorPage() {
  // State
  const [competitionId, setCompetitionId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [currentScores, setCurrentScores] = useState<JudgeScore[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Get active competitions
  const { data: competitions } = trpc.liveCompetition.getActiveCompetitions.useQuery(
    undefined,
    { enabled: true, refetchInterval: 30000 }
  );

  // Get lineup for selected competition
  const { data: lineup, refetch: refetchLineup } = trpc.liveCompetition.getLineup.useQuery(
    { competitionId: competitionId || '' },
    { enabled: !!competitionId, refetchInterval: 5000 }
  );

  // Get live state
  const { data: liveStateData, refetch: refetchLiveState } = trpc.liveCompetition.getLiveState.useQuery(
    { competitionId: competitionId || '' },
    { enabled: !!competitionId, refetchInterval: 1000 }
  );

  // Get scores for current routine
  const { data: scoresData } = trpc.liveCompetition.getRoutineScores.useQuery(
    {
      routineId: liveState?.currentEntry?.id || '',
    },
    {
      enabled: !!liveState?.currentEntry?.id,
      refetchInterval: 2000,
    }
  );

  // Get pending break requests
  const { data: breakRequests, refetch: refetchBreakRequests } = trpc.liveCompetition.getBreakRequests.useQuery(
    { competitionId: competitionId || '', status: 'pending' },
    { enabled: !!competitionId, refetchInterval: 3000 }
  );

  // Mutations
  const startCompetition = trpc.liveCompetition.startCompetition.useMutation();
  const stopCompetition = trpc.liveCompetition.stopCompetition.useMutation();
  const advanceRoutine = trpc.liveCompetition.advanceRoutine.useMutation();
  const previousRoutine = trpc.liveCompetition.previousRoutine.useMutation();
  const setCurrentRoutine = trpc.liveCompetition.setCurrentRoutine.useMutation();

  // Break request mutations
  const approveBreakMutation = trpc.liveCompetition.approveBreak.useMutation({
    onSuccess: () => {
      toast.success('Break approved');
      refetchBreakRequests();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to approve break');
    },
  });

  const denyBreakMutation = trpc.liveCompetition.denyBreak.useMutation({
    onSuccess: () => {
      toast.success('Break request denied');
      refetchBreakRequests();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to deny break');
    },
  });

  // Update state when data changes
  useEffect(() => {
    if (liveStateData) {
      setLiveState(liveStateData as LiveState);
    }
  }, [liveStateData]);

  useEffect(() => {
    if (lineup?.routines) {
      const entries: ScheduleEntry[] = lineup.routines.map((r: any) => ({
        id: r.id,
        entryNumber: r.order || 0,
        title: r.title,
        studioName: r.studioName,
        category: r.category,
        ageGroup: r.ageGroup || '',
        durationMs: (r.duration || 180) * 1000,
        status: r.id === liveState?.currentEntry?.id ? 'current' : 'queued',
      }));
      setSchedule(entries);
      setIsLoading(false);
    }
  }, [lineup, liveState?.currentEntry?.id]);

  useEffect(() => {
    if (scoresData?.scores) {
      setCurrentScores(scoresData.scores);
    }
  }, [scoresData]);

  // Timer for current routine
  useEffect(() => {
    if (!liveState?.currentEntryStartedAt || liveState.currentEntryState !== 'performing') {
      setTimeRemaining(0);
      return;
    }

    const startTime = new Date(liveState.currentEntryStartedAt).getTime();
    const currentEntry = schedule.find(s => s.id === liveState.currentEntry?.id);
    const duration = currentEntry?.durationMs || 180000;

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setTimeRemaining(remaining);
    }, 100);

    return () => clearInterval(timer);
  }, [liveState?.currentEntryStartedAt, liveState?.currentEntryState, liveState?.currentEntry?.id, schedule]);

  // Set competition when selected
  useEffect(() => {
    if (selectedCompetition) {
      setCompetitionId(selectedCompetition);
    } else if (competitions?.length === 1) {
      setCompetitionId(competitions[0].id);
      setSelectedCompetition(competitions[0].id);
    }
  }, [selectedCompetition, competitions]);

  // Format time
  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Handle control actions
  const handleStart = async () => {
    if (!competitionId) return;
    await startCompetition.mutateAsync({ competitionId });
    refetchLiveState();
  };

  const handleStop = async () => {
    if (!competitionId) return;
    await stopCompetition.mutateAsync({ competitionId });
    refetchLiveState();
  };

  const handleNext = async () => {
    if (!competitionId) return;
    await advanceRoutine.mutateAsync({ competitionId });
    refetchLiveState();
    refetchLineup();
  };

  const handleBack = async () => {
    if (!competitionId) return;
    await previousRoutine.mutateAsync({ competitionId });
    refetchLiveState();
    refetchLineup();
  };

  const handleJumpTo = async (entryId: string) => {
    if (!competitionId) return;
    await setCurrentRoutine.mutateAsync({ competitionId, routineId: entryId });
    refetchLiveState();
    refetchLineup();
  };

  // Get current/next/on-deck indices
  const currentIndex = schedule.findIndex(s => s.id === liveState?.currentEntry?.id);
  const nextEntry = currentIndex >= 0 && currentIndex < schedule.length - 1 ? schedule[currentIndex + 1] : null;
  const onDeckEntry = currentIndex >= 0 && currentIndex < schedule.length - 2 ? schedule[currentIndex + 2] : null;

  // Calculate average score
  const averageScore = currentScores.length > 0 && currentScores.every(s => s.score !== null)
    ? currentScores.reduce((sum, s) => sum + (s.score || 0), 0) / currentScores.length
    : null;

  // Get adjudication level
  const getAdjudicationLevel = (score: number) => {
    if (score >= 92) return { level: 'PLATINUM', color: 'bg-slate-200 text-slate-800' };
    if (score >= 88) return { level: 'HIGH GOLD', color: 'bg-yellow-200 text-yellow-800' };
    if (score >= 84) return { level: 'GOLD', color: 'bg-yellow-100 text-yellow-700' };
    if (score >= 80) return { level: 'HIGH SILVER', color: 'bg-gray-200 text-gray-700' };
    if (score >= 76) return { level: 'SILVER', color: 'bg-gray-100 text-gray-600' };
    return { level: 'BRONZE', color: 'bg-orange-100 text-orange-700' };
  };

  // Edge case alert detection
  const LEVEL_BOUNDARIES = [92, 88, 84, 80, 76];
  const EDGE_THRESHOLD = 0.1;

  interface EdgeCaseAlert {
    id: string;
    type: 'boundary' | 'judge_caused';
    message: string;
    entryNumber: number;
    difference: number;
    judgeName?: string;
  }

  const edgeCaseAlerts: EdgeCaseAlert[] = [];

  // Only check if we have scores for the current routine
  if (averageScore !== null && currentScores.length > 0 && liveState?.currentEntry) {
    const entryNum = liveState.currentEntry.entryNumber;

    // Check if average is near a boundary
    for (const boundary of LEVEL_BOUNDARIES) {
      const diff = Math.abs(averageScore - boundary);
      if (diff <= EDGE_THRESHOLD && diff > 0) {
        const alertId = `boundary-${entryNum}-${boundary}`;
        if (!dismissedAlerts.has(alertId)) {
          const isAbove = averageScore >= boundary;
          const currentLevel = getAdjudicationLevel(averageScore).level;
          edgeCaseAlerts.push({
            id: alertId,
            type: 'boundary',
            message: `Entry #${entryNum} is ${isAbove ? 'just above' : 'just below'} ${currentLevel} by ${diff.toFixed(2)} pts`,
            entryNumber: entryNum,
            difference: diff,
          });
        }
        break; // Only report closest boundary
      }
    }

    // Check if any single judge's score caused a level change
    const validScores = currentScores.filter(s => s.score !== null && s.score !== undefined);
    if (validScores.length >= 2) {
      const sum = validScores.reduce((acc, s) => acc + (s.score || 0), 0);

      for (let i = 0; i < validScores.length; i++) {
        const judgeScore = validScores[i].score || 0;
        const avgWithout = (sum - judgeScore) / (validScores.length - 1);
        const levelWithout = getAdjudicationLevel(avgWithout).level;
        const currentLevel = getAdjudicationLevel(averageScore).level;

        if (levelWithout !== currentLevel) {
          const alertId = `judge-${entryNum}-${validScores[i].judgeId}`;
          if (!dismissedAlerts.has(alertId)) {
            const diff = Math.abs(averageScore - avgWithout);
            const direction = averageScore < avgWithout ? 'bumped down' : 'bumped up';
            edgeCaseAlerts.push({
              id: alertId,
              type: 'judge_caused',
              message: `Entry #${entryNum} ${direction} to ${currentLevel} due to Judge ${['A', 'B', 'C'][i] || i + 1}'s score`,
              entryNumber: entryNum,
              difference: diff,
              judgeName: validScores[i].judgeName || `Judge ${['A', 'B', 'C'][i] || i + 1}`,
            });
          }
        }
      }
    }
  }

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]));
  };

  // Progress percent
  const currentEntry = schedule.find(s => s.id === liveState?.currentEntry?.id);
  const progressPercent = currentEntry
    ? Math.min(100, ((currentEntry.durationMs - timeRemaining) / currentEntry.durationMs) * 100)
    : 0;
  const isLowTime = timeRemaining > 0 && timeRemaining < 30000;

  // Loading state
  if (isLoading && !competitions) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading Tabulator...</div>
      </div>
    );
  }

  // Competition selector if no competition selected
  if (!competitionId && competitions) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-lg mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8 text-center">Tabulator</h1>
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-xl text-white mb-4">Select Competition</h2>
            <select
              value={selectedCompetition}
              onChange={(e) => setSelectedCompetition(e.target.value)}
              className="w-full p-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Choose a competition...</option>
              {competitions.map((comp: any) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Back to Test Page link */}
      <Link
        href="/game-day-test"
        className="fixed top-2 left-2 px-2 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-xs text-white z-50"
      >
        Test Page
      </Link>

      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">TABULATOR</h1>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            liveState?.competitionState === 'active'
              ? 'bg-green-500/20 text-green-400'
              : liveState?.competitionState === 'paused'
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-gray-500/20 text-gray-400'
          }`}>
            {liveState?.competitionState?.toUpperCase() || 'NOT STARTED'}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => { refetchLiveState(); refetchLineup(); }}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL - Schedule */}
        <div className="w-80 bg-gray-800/50 border-r border-gray-700 flex flex-col">
          <div className="p-3 border-b border-gray-700 bg-gray-800">
            <h2 className="font-semibold text-gray-300">SCHEDULE</h2>
            <div className="text-xs text-gray-500 mt-1">
              {schedule.length} routines today
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {schedule.map((entry, index) => {
              const isCurrent = entry.id === liveState?.currentEntry?.id;
              const isNext = nextEntry?.id === entry.id;
              const isOnDeck = onDeckEntry?.id === entry.id;
              const isPast = currentIndex >= 0 && index < currentIndex;

              return (
                <div
                  key={entry.id}
                  onClick={() => handleJumpTo(entry.id)}
                  className={`px-3 py-2 border-b border-gray-700/50 cursor-pointer transition-colors ${
                    isCurrent
                      ? 'bg-blue-600/30 border-l-4 border-l-blue-500'
                      : isNext
                      ? 'bg-yellow-600/20 border-l-4 border-l-yellow-500'
                      : isOnDeck
                      ? 'bg-gray-700/30 border-l-4 border-l-gray-500'
                      : isPast
                      ? 'bg-gray-800/50 opacity-50'
                      : 'hover:bg-gray-700/30'
                  }`}
                >
                  {entry.isBreak ? (
                    <div className="flex items-center gap-2 text-orange-400">
                      <Coffee className="w-4 h-4" />
                      <span className="text-sm font-medium">
                        {entry.breakDurationMinutes} MIN BREAK
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className={`font-mono text-sm ${
                          isCurrent ? 'text-blue-300 font-bold'
                          : isNext ? 'text-yellow-300'
                          : 'text-gray-400'
                        }`}>
                          #{entry.entryNumber}
                        </span>
                        <div className="flex items-center gap-1">
                          {isCurrent && (
                            <span className="text-xs bg-blue-500 px-2 py-0.5 rounded text-white">
                              CURRENT
                            </span>
                          )}
                          {isNext && (
                            <span className="text-xs bg-yellow-500 px-2 py-0.5 rounded text-gray-900">
                              NEXT
                            </span>
                          )}
                          {isOnDeck && (
                            <span className="text-xs bg-gray-600 px-2 py-0.5 rounded text-gray-300">
                              ON DECK
                            </span>
                          )}
                          {isPast && (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                      </div>
                      <div className={`text-sm font-medium mt-1 ${
                        isCurrent ? 'text-white' : 'text-gray-300'
                      }`}>
                        {entry.title}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {entry.studioName}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER PANEL - Current Routine */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-900">
          {liveState?.currentEntry ? (
            <>
              <div className="text-blue-400 text-lg font-semibold tracking-wider mb-2">
                NOW PERFORMING
              </div>
              <div className="text-gray-400 text-2xl mb-1">
                Entry #{liveState.currentEntry.entryNumber}
              </div>
              <div className="text-white text-5xl font-bold text-center mb-3 max-w-2xl">
                {liveState.currentEntry.title}
              </div>
              <div className="text-gray-300 text-xl mb-2">
                {liveState.currentEntry.studioName}
              </div>
              <div className="text-gray-500 mb-8">
                {liveState.currentEntry.category}
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-xl">
                <div className="h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full transition-all duration-100 ${
                      isLowTime ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-center">
                  <div className={`text-6xl font-mono font-bold tabular-nums ${
                    isLowTime ? 'text-red-400 animate-pulse' : 'text-white'
                  }`}>
                    {formatTime(timeRemaining)}
                  </div>
                  <div className="text-gray-500 text-sm mt-1">TIME REMAINING</div>
                </div>
              </div>

              {/* Next Up Preview */}
              {nextEntry && (
                <div className="mt-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="text-yellow-400 text-sm font-semibold mb-1">UP NEXT</div>
                  <div className="text-white font-medium">
                    #{nextEntry.entryNumber} - {nextEntry.title}
                  </div>
                  <div className="text-gray-500 text-sm">{nextEntry.studioName}</div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <div className="text-gray-400 text-2xl mb-4">No routine currently performing</div>
              <div className="text-gray-600">Use the controls below to start the competition</div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL - Scores & Break Requests */}
        <div className="w-80 bg-gray-800/50 border-l border-gray-700 flex flex-col">
          {/* Break Requests Section */}
          {breakRequests && breakRequests.length > 0 && (
            <div className="border-b border-gray-700 bg-orange-900/30">
              <div className="p-3 border-b border-orange-700/50 bg-orange-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-orange-400 animate-pulse" />
                  <h2 className="font-semibold text-orange-300">BREAK REQUESTS</h2>
                </div>
                <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {breakRequests.length}
                </span>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {breakRequests.map((request: BreakRequest) => (
                  <div key={request.id} className="p-3 border-b border-orange-700/30 last:border-b-0">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-white font-medium text-sm">
                          {request.judgeName}
                          {request.judgeNumber && (
                            <span className="text-orange-400/80 ml-1">#{request.judgeNumber}</span>
                          )}
                        </div>
                        <div className="text-orange-300 text-sm">
                          {request.requestedDurationMinutes} min break
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => approveBreakMutation.mutate({ requestId: request.id })}
                          disabled={approveBreakMutation.isPending}
                          className="p-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded transition-colors"
                          title="Approve"
                        >
                          <Check className="w-4 h-4 text-white" />
                        </button>
                        <button
                          onClick={() => denyBreakMutation.mutate({ requestId: request.id })}
                          disabled={denyBreakMutation.isPending}
                          className="p-1.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded transition-colors"
                          title="Deny"
                        >
                          <X className="w-4 h-4 text-white" />
                        </button>
                      </div>
                    </div>
                    {request.reason && (
                      <div className="text-gray-400 text-xs italic">
                        "{request.reason}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 border-b border-gray-700 bg-gray-800">
            <h2 className="font-semibold text-gray-300">LIVE SCORES</h2>
          </div>
          <div className="flex-1 p-4 overflow-y-auto">
            {liveState?.currentEntry ? (
              <>
                {/* Judge Scores */}
                <div className="space-y-3 mb-6">
                  {['A', 'B', 'C'].map((letter, i) => {
                    const score = currentScores[i];
                    return (
                      <div key={letter} className="flex items-center justify-between">
                        <span className="text-gray-400">Judge {letter}</span>
                        <span className={`font-mono text-xl ${
                          score?.score !== null && score?.score !== undefined
                            ? 'text-white'
                            : 'text-gray-600'
                        }`}>
                          {score?.score !== null && score?.score !== undefined
                            ? score.score.toFixed(2)
                            : '--.-'
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Divider */}
                <div className="border-t border-gray-700 my-4" />

                {/* Average */}
                <div className="text-center">
                  <div className="text-gray-400 text-sm mb-1">AVERAGE</div>
                  <div className="text-4xl font-bold font-mono text-white mb-2">
                    {averageScore !== null ? averageScore.toFixed(2) : '--.-'}
                  </div>
                  {averageScore !== null && (
                    <div className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold ${
                      getAdjudicationLevel(averageScore).color
                    }`}>
                      {getAdjudicationLevel(averageScore).level}
                    </div>
                  )}
                </div>

                {/* Judge Status */}
                <div className="mt-8 pt-4 border-t border-gray-700">
                  <div className="text-gray-400 text-xs mb-3">JUDGE STATUS</div>
                  <div className="space-y-2">
                    {['A', 'B', 'C'].map((letter, i) => {
                      const score = currentScores[i];
                      const hasScore = score?.score !== null && score?.score !== undefined;
                      return (
                        <div key={letter} className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">Judge {letter}</span>
                          <div className={`flex items-center gap-1.5 ${
                            hasScore ? 'text-green-400' : 'text-gray-600'
                          }`}>
                            <div className={`w-2 h-2 rounded-full ${
                              hasScore ? 'bg-green-500' : 'bg-gray-600'
                            }`} />
                            <span className="text-xs">
                              {hasScore ? 'Scored' : 'Waiting'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-gray-500 text-center mt-8">
                Select a routine to view scores
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CONTROL BAR */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Navigation Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleBack}
              disabled={!competitionId || currentIndex <= 0}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              BACK
            </button>

            {liveState?.competitionState === 'active' ? (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors"
              >
                <Square className="w-5 h-5" />
                STOP
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={!competitionId}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
              >
                <Play className="w-5 h-5" />
                START
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={!competitionId || currentIndex >= schedule.length - 1}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              NEXT
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="w-px h-8 bg-gray-700 mx-2" />

            <button
              className="flex items-center gap-2 px-4 py-2 bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 rounded-lg font-medium transition-colors"
            >
              <Coffee className="w-5 h-5" />
              + BREAK
            </button>
          </div>

          {/* Schedule Status */}
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              <span className="text-gray-500">Position:</span>{' '}
              <span className="text-white font-medium">
                {currentIndex >= 0 ? currentIndex + 1 : '-'} / {schedule.length}
              </span>
            </div>
            <div className={`text-sm ${
              (liveState?.scheduleDelayMinutes || 0) > 0
                ? 'text-yellow-400'
                : 'text-green-400'
            }`}>
              {(liveState?.scheduleDelayMinutes || 0) > 0
                ? `+${liveState?.scheduleDelayMinutes} min behind`
                : 'On Schedule'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Edge Case Alert Bar */}
      {edgeCaseAlerts.length > 0 && (
        <div className="bg-yellow-900/80 border-t border-yellow-600/50">
          {edgeCaseAlerts.map((alert) => (
            <div
              key={alert.id}
              className="px-4 py-2 flex items-center justify-between border-b border-yellow-700/30 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <span className="text-yellow-100 text-sm font-medium">
                  {alert.message}
                </span>
                {alert.type === 'judge_caused' && (
                  <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 text-xs">
                    REVIEW
                  </span>
                )}
              </div>
              <button
                onClick={() => handleDismissAlert(alert.id)}
                className="p-1 text-yellow-400 hover:text-yellow-200 hover:bg-yellow-800/50 rounded transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
