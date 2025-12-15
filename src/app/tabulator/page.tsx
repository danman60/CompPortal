'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Play,
  Pause,
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
  Calendar,
  ArrowRightLeft,
  Plus,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Link as LinkIcon,
  Unlink,
  Radio,
  Volume2,
  VolumeX,
  Music,
  SkipForward,
  Wifi,
  WifiOff,
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
    musicFileUrl?: string | null;
    musicDurationMs?: number | null;
  } | null;
  currentEntryState: string | null;
  currentEntryStartedAt: string | null;
  scheduleDelayMinutes: number;
  judgesCanSeeScores: boolean;
  operatingDate: string | null;
  // Game Day Audio Control fields
  audioState: 'stopped' | 'playing' | 'paused';
  audioPositionMs: number;
  audioStartedAt: string | null;
  linkedMode: boolean;
  backstageControlEnabled: boolean;
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

// Default test competition for tester environment
const DEFAULT_TEST_COMPETITION_ID = '1b786221-8f8e-413f-b532-06fa20a2ff63';

export default function TabulatorPage() {
  // State - default to test competition
  const [competitionId, setCompetitionId] = useState<string | null>(DEFAULT_TEST_COMPETITION_ID);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [liveState, setLiveState] = useState<LiveState | null>(null);
  const [currentScores, setCurrentScores] = useState<JudgeScore[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompetition, setSelectedCompetition] = useState<string>('');
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showMoveToDay, setShowMoveToDay] = useState<string | null>(null); // entryId
  const [showScratch, setShowScratch] = useState<string | null>(null); // entryId for scratch modal
  const [scratchReason, setScratchReason] = useState('');
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [breakDuration, setBreakDuration] = useState(5); // default 5 minutes
  const [breakPosition, setBreakPosition] = useState<'before' | 'after'>('after');
  const [showScoreEdit, setShowScoreEdit] = useState<string | null>(null); // scoreId
  const [editScoreValue, setEditScoreValue] = useState<number>(0);
  const [editScoreReason, setEditScoreReason] = useState('');
  const [showDateSelector, setShowDateSelector] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to today's date in YYYY-MM-DD format
    return new Date().toISOString().split('T')[0];
  });

  // Game Day Audio Control state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [localAudioPosition, setLocalAudioPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioVolume, setAudioVolume] = useState(1);
  const [audioEnabled, setAudioEnabled] = useState(false); // Track if user has enabled audio (browser autoplay restriction)
  const [autoNextEnabled, setAutoNextEnabled] = useState(false); // Auto-advance to next routine when timer ends
  const [isOnline, setIsOnline] = useState(true); // Network connection status
  const lastAudioStateRef = useRef<string | null>(null); // Track last audio state for conflict detection

  // Get active competitions
  const { data: competitions } = trpc.liveCompetition.getActiveCompetitions.useQuery(
    undefined,
    { enabled: true, refetchInterval: 30000 }
  );

  // Get lineup for selected competition (filtered by selected date)
  const { data: lineup, refetch: refetchLineup } = trpc.liveCompetition.getLineup.useQuery(
    { competitionId: competitionId || '', performanceDate: selectedDate },
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

  // Reorder mutation
  const reorderRoutineMutation = trpc.liveCompetition.reorderRoutine.useMutation({
    onSuccess: () => {
      toast.success('Routine reordered');
      refetchLineup();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to reorder routine');
    },
  });

  // Move to day mutation
  const moveRoutineToDayMutation = trpc.liveCompetition.moveRoutineToDay.useMutation({
    onSuccess: () => {
      toast.success('Routine moved to new day');
      refetchLineup();
      setShowMoveToDay(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to move routine');
    },
  });

  // Emergency break mutation
  const addEmergencyBreakMutation = trpc.liveCompetition.addEmergencyBreak.useMutation({
    onSuccess: () => {
      toast.success('Emergency break added');
      refetchLineup();
      setShowBreakModal(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to add break');
    },
  });

  // Score visibility toggle
  const { data: scoreVisibility, refetch: refetchScoreVisibility } = trpc.liveCompetition.getScoreVisibility.useQuery(
    { competitionId: competitionId || '' },
    { enabled: !!competitionId }
  );

  const setScoreVisibilityMutation = trpc.liveCompetition.setScoreVisibility.useMutation({
    onSuccess: () => {
      toast.success('Score visibility updated');
      refetchScoreVisibility();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update visibility');
    },
  });

  // Score edit mutation
  const editScoreMutation = trpc.liveCompetition.editScore.useMutation({
    onSuccess: () => {
      toast.success('Score updated');
      setShowScoreEdit(null);
      setEditScoreValue(0);
      setEditScoreReason('');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to edit score');
    },
  });

  // Scratch routine mutation
  const scratchRoutineMutation = trpc.liveCompetition.scratchRoutine.useMutation({
    onSuccess: () => {
      toast.success('Routine scratched/withdrawn');
      refetchLineup();
      setShowScratch(null);
      setScratchReason('');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to scratch routine');
    },
  });

  // Set operating date mutation
  const setOperatingDateMutation = trpc.liveCompetition.setOperatingDate.useMutation({
    onSuccess: () => {
      toast.success('Operating date updated');
      refetchLiveState();
      refetchLineup();
      setShowDateSelector(false);
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to set operating date');
    },
  });

  // ============================================
  // Game Day Audio Control Mutations (PRD Phase 2)
  // ============================================
  const setAudioStateMutation = trpc.liveCompetition.setAudioState.useMutation({
    onSuccess: () => {
      refetchLiveState();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update audio state');
    },
  });

  const updateAudioPositionMutation = trpc.liveCompetition.updateAudioPosition.useMutation({
    onError: (err) => {
      console.error('Failed to sync audio position:', err);
    },
  });

  const setLinkedModeMutation = trpc.liveCompetition.setLinkedMode.useMutation({
    onSuccess: () => {
      toast.success('Link mode updated');
      refetchLiveState();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update link mode');
    },
  });

  const setBackstageControlMutation = trpc.liveCompetition.setBackstageControl.useMutation({
    onSuccess: () => {
      toast.success('Backstage control updated');
      refetchLiveState();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update backstage control');
    },
  });

  // Handler for operating date change
  const handleSetOperatingDate = (date: string | null) => {
    if (!competitionId) return;
    // Immediately update selectedDate for faster UI feedback
    const newDate = date || new Date().toISOString().split('T')[0];
    setSelectedDate(newDate);
    setShowDateSelector(false);
    setOperatingDateMutation.mutate({
      competitionId,
      operatingDate: date,
    });
  };

  // Helper to format operating date for display
  // Uses selectedDate (local state) to ensure consistency between top bar and left panel
  const getOperatingDateDisplay = () => {
    if (!selectedDate) return 'Today';
    const date = new Date(selectedDate + 'T12:00:00');
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Update state when data changes
  useEffect(() => {
    if (liveStateData) {
      setLiveState(liveStateData as LiveState);
    }
  }, [liveStateData]);
// Sync selectedDate with operating date when it changes
  // Must normalize to YYYY-MM-DD format for line 1038's date string concatenation
  useEffect(() => {
    if (liveState?.operatingDate) {
      // Extract YYYY-MM-DD from ISO string to avoid "2026-04-10T00:00:00.000ZT12:00:00" bug
      const dateOnly = new Date(liveState.operatingDate).toISOString().split('T')[0];
      if (dateOnly !== selectedDate) {
        setSelectedDate(dateOnly);
      }
    }
  }, [liveState?.operatingDate]);

  useEffect(() => {
    if (lineup?.routines) {
      const entries: ScheduleEntry[] = lineup.routines.map((r: any) => ({
        id: r.id,
        entryNumber: r.entryNumber || 0,
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

  // Auto-select competition based on selected date
  useEffect(() => {
    if (competitions && competitions.length > 0 && selectedDate) {
      // Find competition that includes the selected date
      const matchingComp = competitions.find((comp) => {
        if (!comp.competition_start_date || !comp.competition_end_date) return false;
        // Convert Date to string for comparison
        const startDate = new Date(comp.competition_start_date).toISOString().split('T')[0];
        const endDate = new Date(comp.competition_end_date).toISOString().split('T')[0];
        return selectedDate >= startDate && selectedDate <= endDate;
      });

      if (matchingComp) {
        setCompetitionId(matchingComp.id);
        setSelectedCompetition(matchingComp.id);
      } else if (competitions.length === 1) {
        // Fallback to first competition if no date match
        setCompetitionId(competitions[0].id);
        setSelectedCompetition(competitions[0].id);
      }
    }
  }, [selectedDate, competitions]);

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

  // ============================================
  // Game Day Audio Control Handlers (PRD Phase 2)
  // ============================================

  // Format time for audio display (mm:ss)
  const formatAudioTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Enable audio (handle browser autoplay restrictions)
  const handleEnableAudio = () => {
    setAudioEnabled(true);
    // Create audio element if it doesn't exist
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.onloadedmetadata = () => {
        if (audioRef.current) {
          setAudioDuration(audioRef.current.duration * 1000);
        }
      };
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          setLocalAudioPosition(audioRef.current.currentTime * 1000);
        }
      };
      audioRef.current.onended = () => {
        // When audio ends, update state to stopped
        if (competitionId) {
          setAudioStateMutation.mutate({
            competitionId,
            audioState: 'stopped',
            positionMs: 0,
          });
        }
      };
    }
    toast.success('Audio enabled');
  };

  // Play audio
  const handleAudioPlay = async () => {
    if (!competitionId || !audioRef.current) return;

    try {
      await audioRef.current.play();
      setAudioStateMutation.mutate({
        competitionId,
        audioState: 'playing',
      });
    } catch (err) {
      toast.error('Failed to play audio. Click "Enable Audio" first.');
    }
  };

  // Pause audio
  const handleAudioPause = () => {
    if (!competitionId || !audioRef.current) return;

    audioRef.current.pause();
    const currentPosition = audioRef.current.currentTime * 1000;
    setAudioStateMutation.mutate({
      competitionId,
      audioState: 'paused',
      positionMs: currentPosition,
    });
  };

  // Stop audio
  const handleAudioStop = () => {
    if (!competitionId || !audioRef.current) return;

    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setLocalAudioPosition(0);
    setAudioStateMutation.mutate({
      competitionId,
      audioState: 'stopped',
      positionMs: 0,
    });
  };

  // Seek audio
  const handleAudioSeek = (positionMs: number) => {
    if (!audioRef.current || !competitionId) return;

    audioRef.current.currentTime = positionMs / 1000;
    setLocalAudioPosition(positionMs);
    updateAudioPositionMutation.mutate({
      competitionId,
      positionMs,
    });
  };

  // Toggle linked mode
  const handleToggleLinkedMode = () => {
    if (!competitionId) return;
    setLinkedModeMutation.mutate({
      competitionId,
      linked: !liveState?.linkedMode,
    });
  };

  // Toggle backstage control
  const handleToggleBackstageControl = () => {
    if (!competitionId) return;
    setBackstageControlMutation.mutate({
      competitionId,
      enabled: !liveState?.backstageControlEnabled,
    });
  };

  // Sync audio with current entry (load music file)
  useEffect(() => {
    if (audioRef.current && liveState?.currentEntry?.musicFileUrl) {
      audioRef.current.src = liveState.currentEntry.musicFileUrl;
      audioRef.current.load();
      // Set duration from entry metadata or detect from audio
      if (liveState.currentEntry.musicDurationMs) {
        setAudioDuration(liveState.currentEntry.musicDurationMs);
      }
    }
  }, [liveState?.currentEntry?.id, liveState?.currentEntry?.musicFileUrl]);

  // Sync audio playback state with server state
  useEffect(() => {
    if (!audioRef.current || !audioEnabled) return;

    const serverAudioState = liveState?.audioState;
    const serverPosition = liveState?.audioPositionMs || 0;

    if (serverAudioState === 'playing' && audioRef.current.paused) {
      audioRef.current.currentTime = serverPosition / 1000;
      audioRef.current.play().catch(() => {
        // Autoplay blocked - user needs to interact first
      });
    } else if (serverAudioState === 'paused' && !audioRef.current.paused) {
      audioRef.current.pause();
    } else if (serverAudioState === 'stopped') {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setLocalAudioPosition(0);
    }
  }, [liveState?.audioState, liveState?.audioPositionMs, audioEnabled]);

  // Linked mode: sync audio with tabulation state
  useEffect(() => {
    if (!liveState?.linkedMode || !audioRef.current || !audioEnabled) return;

    const competitionState = liveState.competitionState;

    if (competitionState === 'active' && liveState.audioState !== 'playing') {
      // Competition started, play audio
      handleAudioPlay();
    } else if (competitionState === 'idle' && liveState.audioState === 'playing') {
      // Competition stopped, stop audio
      handleAudioStop();
    }
  }, [liveState?.competitionState, liveState?.linkedMode, audioEnabled]);

  // Network connection status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored');
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Connection lost - some features may not work');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Detect audio state changes from backstage (conflict detection)
  useEffect(() => {
    if (!liveState?.audioState) return;

    const currentState = liveState.audioState;
    const previousState = lastAudioStateRef.current;

    // Skip if this is the first render or if state didn't change
    if (previousState === null || previousState === currentState) {
      lastAudioStateRef.current = currentState;
      return;
    }

    // Check if this change was from another source (backstage)
    // We detect this by checking if the audio element state doesn't match server state
    if (audioRef.current && audioEnabled) {
      const localPlaying = !audioRef.current.paused;
      const serverPlaying = currentState === 'playing';

      // If local state doesn't match server state, show conflict toast
      if (localPlaying !== serverPlaying) {
        toast('Audio state changed by Backstage', {
          icon: '🎵',
          duration: 3000,
        });
      }
    }

    lastAudioStateRef.current = currentState;
  }, [liveState?.audioState, audioEnabled]);

  // Auto-advance to next routine when timer ends
  useEffect(() => {
    if (!autoNextEnabled || !competitionId) return;
    if (timeRemaining === 0 && liveState?.currentEntryState === 'performing') {
      // Timer hit zero, advance to next
      handleNext();
    }
  }, [timeRemaining, autoNextEnabled, liveState?.currentEntryState, competitionId]);

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

  // Drag and drop handlers for reordering
  const handleDragStart = (e: React.DragEvent, entryId: string) => {
    setDraggedId(entryId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', entryId);
  };

  const handleDragOver = (e: React.DragEvent, entryId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedId !== entryId) {
      setDragOverId(entryId);
    }
  };

  const handleDragLeave = () => {
    setDragOverId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetEntryId: string) => {
    e.preventDefault();
    setDragOverId(null);

    if (!draggedId || !competitionId || draggedId === targetEntryId) {
      setDraggedId(null);
      return;
    }

    // Find target position (1-based)
    const targetIndex = schedule.findIndex(s => s.id === targetEntryId);
    if (targetIndex === -1) {
      setDraggedId(null);
      return;
    }

    await reorderRoutineMutation.mutateAsync({
      competitionId,
      routineId: draggedId,
      newPosition: targetIndex + 1, // 1-based position
    });

    setDraggedId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  // Move to day handler
  const handleMoveToDay = async (targetDay: string) => {
    if (!showMoveToDay) return;
    await moveRoutineToDayMutation.mutateAsync({
      routineId: showMoveToDay,
      targetDay,
    });
  };

  // Scratch routine handler
  const handleScratchRoutine = async () => {
    if (!showScratch) return;
    await scratchRoutineMutation.mutateAsync({
      routineId: showScratch,
      reason: scratchReason || undefined,
    });
  };

  // Emergency break handler
  const handleAddBreak = async () => {
    if (!competitionId) return;
    const insertAfter = breakPosition === 'after' ? liveState?.currentEntry?.id : undefined;
    await addEmergencyBreakMutation.mutateAsync({
      competitionId,
      durationMinutes: breakDuration,
      insertAfterEntryId: insertAfter,
    });
  };

  // Score visibility toggle handler
  const handleToggleScoreVisibility = async () => {
    if (!competitionId) return;
    const currentlyVisible = scoreVisibility?.visible ?? false;
    await setScoreVisibilityMutation.mutateAsync({
      competitionId,
      visible: !currentlyVisible,
    });
  };

  // Score edit handler
  const handleEditScore = async () => {
    if (!showScoreEdit || !editScoreReason) {
      toast.error('Reason is required for score edits');
      return;
    }
    await editScoreMutation.mutateAsync({
      scoreId: showScoreEdit,
      newValue: editScoreValue,
      reason: editScoreReason,
    });
  };

  // Open score edit modal
  const openScoreEditModal = (scoreId: string, currentScore: number) => {
    setShowScoreEdit(scoreId);
    setEditScoreValue(currentScore);
    setEditScoreReason('');
  };

  // Get competition days for move to day dropdown
  // Tester competition dates: April 9-12, 2026 (data has entries on all 4 days)
  const competitionDays = ['2026-04-09', '2026-04-10', '2026-04-11', '2026-04-12']; // TODO: Get from competition settings

  // Progress percent
  const currentEntry = schedule.find(s => s.id === liveState?.currentEntry?.id);
  const progressPercent = currentEntry
    ? Math.min(100, ((currentEntry.durationMs - timeRemaining) / currentEntry.durationMs) * 100)
    : 0;
  const isLowTime = timeRemaining > 0 && timeRemaining < 30000;

  // Loading state
  if (isLoading && !competitions) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-gray-300 text-lg font-medium">Loading Tabulator...</div>
        </div>
      </div>
    );
  }

  // Competition selector if no competition selected
  if (!competitionId && competitions) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-black p-8">
        <div className="max-w-lg mx-auto">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">Tabulator</h1>
          <p className="text-gray-400 text-center mb-8">Competition Control Center</p>
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl p-8 border border-gray-700/50 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-6">Select Competition</h2>
            <select
              value={selectedCompetition}
              onChange={(e) => setSelectedCompetition(e.target.value)}
              className="w-full p-4 bg-gray-700/50 text-white rounded-xl border border-gray-600 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
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
    <div className="h-screen bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* Network Disconnection Banner (PRD 10.2) */}
      {!isOnline && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-2 animate-pulse">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold">Disconnected</span>
          <span className="text-red-100">- Connection lost. Some features may not work until connection is restored.</span>
        </div>
      )}

      {/* Back to Test Page link */}
      <Link
        href="/game-day-test"
        className="fixed top-2 left-2 px-2 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-xs text-white z-50"
      >
        Test Page
      </Link>

      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 via-slate-800 to-gray-800 px-4 py-3 border-b border-gray-700/50 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">TABULATOR</h1>
          <div className={`px-3 py-1.5 rounded-full text-sm font-semibold border ${
            liveState?.competitionState === 'active'
              ? 'bg-green-500/20 text-green-400 border-green-500/30'
              : liveState?.competitionState === 'paused'
              ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
          }`}>
            {liveState?.competitionState === 'active' && <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse" />}
            {liveState?.competitionState?.toUpperCase() || 'NOT STARTED'}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Operating Date Selector */}
          <div className="relative">
            <button
              onClick={() => setShowDateSelector(!showDateSelector)}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors border border-gray-600"
              title="Select operating date"
            >
              <Calendar className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-200">{getOperatingDateDisplay()}</span>
            </button>
            {showDateSelector && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50">
                <div className="p-2">
                  <div className="text-xs text-gray-400 px-2 py-1 mb-1">Operating Date</div>
                  <button
                    onClick={() => handleSetOperatingDate(null)}
                    className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                      !selectedDate || !competitionDays.includes(selectedDate) ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-gray-700'
                    }`}
                  >
                    Today (Auto)
                  </button>
                  {competitionDays.map((day) => (
                    <button
                      key={day}
                      onClick={() => handleSetOperatingDate(day)}
                      className={`w-full text-left px-3 py-2 text-sm rounded transition-colors ${
                        selectedDate === day ? 'bg-blue-600 text-white' : 'text-gray-200 hover:bg-gray-700'
                      }`}
                    >
                      {new Date(day + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => { refetchLiveState(); refetchLineup(); }}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
            title="Refresh data"
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
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-300">SCHEDULE</h2>
              <span className="text-xs text-gray-400">
                {selectedDate ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Select date'}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {schedule.length} routines
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {schedule.map((entry, index) => {
              const isCurrent = entry.id === liveState?.currentEntry?.id;
              const isNext = nextEntry?.id === entry.id;
              const isOnDeck = onDeckEntry?.id === entry.id;
              const isPast = currentIndex >= 0 && index < currentIndex;
              const isDraggedOver = dragOverId === entry.id;
              const isBeingDragged = draggedId === entry.id;

              return (
                <div
                  key={entry.id}
                  draggable={!entry.isBreak && !isPast}
                  onDragStart={(e) => handleDragStart(e, entry.id)}
                  onDragOver={(e) => handleDragOver(e, entry.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, entry.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => handleJumpTo(entry.id)}
                  className={`group px-3 py-2 border-b border-gray-700/50 cursor-pointer transition-colors relative ${
                    isDraggedOver
                      ? 'bg-blue-500/40 border-t-2 border-t-blue-400'
                      : isBeingDragged
                      ? 'opacity-50 bg-gray-700'
                      : isCurrent
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
                        <div className="flex items-center gap-2">
                          {/* Drag handle */}
                          {!isPast && (
                            <GripVertical className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity" />
                          )}
                          <span className={`font-mono text-sm ${
                            isCurrent ? 'text-blue-300 font-bold'
                            : isNext ? 'text-yellow-300'
                            : 'text-gray-400'
                          }`}>
                            #{entry.entryNumber}
                          </span>
                        </div>
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
                          {/* Move to day button */}
                          {!isPast && !isCurrent && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMoveToDay(showMoveToDay === entry.id ? null : entry.id);
                                setShowScratch(null);
                              }}
                              className="p-1 text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Move to another day"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Scratch/Withdraw button */}
                          {!isPast && !isCurrent && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowScratch(showScratch === entry.id ? null : entry.id);
                                setShowMoveToDay(null);
                                setScratchReason('');
                              }}
                              className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Scratch/Withdraw routine"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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
                      {/* Move to day dropdown */}
                      {showMoveToDay === entry.id && (
                        <div
                          className="absolute left-full top-0 ml-2 z-50 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-2 min-w-40"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-xs text-gray-400 mb-2 px-2">Move to day:</div>
                          {competitionDays.map((day) => (
                            <button
                              key={day}
                              onClick={() => handleMoveToDay(day)}
                              disabled={moveRoutineToDayMutation.isPending}
                              className="w-full px-3 py-1.5 text-left text-sm text-white hover:bg-gray-700 rounded disabled:opacity-50"
                            >
                              {new Date(day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </button>
                          ))}
                          <button
                            onClick={() => setShowMoveToDay(null)}
                            className="w-full mt-1 px-3 py-1.5 text-left text-xs text-gray-400 hover:bg-gray-700 rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      {/* Scratch confirmation dropdown */}
                      {showScratch === entry.id && (
                        <div
                          className="absolute left-full top-0 ml-2 z-50 bg-gray-800 border border-red-600/50 rounded-lg shadow-xl p-3 min-w-56"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="text-xs text-red-400 font-semibold mb-2">Scratch/Withdraw Routine</div>
                          <div className="text-xs text-gray-400 mb-2">
                            Entry #{entry.entryNumber} - {entry.title}
                          </div>
                          <input
                            type="text"
                            placeholder="Reason (optional)"
                            value={scratchReason}
                            onChange={(e) => setScratchReason(e.target.value)}
                            className="w-full px-2 py-1.5 text-sm bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 mb-2"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleScratchRoutine}
                              disabled={scratchRoutineMutation.isPending}
                              className="flex-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 text-white rounded disabled:opacity-50"
                            >
                              {scratchRoutineMutation.isPending ? 'Scratching...' : 'Scratch'}
                            </button>
                            <button
                              onClick={() => {
                                setShowScratch(null);
                                setScratchReason('');
                              }}
                              className="px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-700 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* CENTER PANEL - Current Routine */}
        <div className="flex-1 flex flex-col items-center pt-8 px-8 bg-gradient-to-b from-gray-900 via-slate-900/50 to-gray-900">
          {liveState?.currentEntry ? (
            <>
              <div className="px-4 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-full mb-4">
                <span className="text-blue-300 text-sm font-bold tracking-widest uppercase flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                  Now Performing
                </span>
              </div>
              <div className="text-gray-400 text-2xl font-light mb-1">
                Entry #{liveState.currentEntry.entryNumber}
              </div>
              <div className="text-white text-5xl font-bold text-center mb-4 max-w-2xl bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text">
                {liveState.currentEntry.title}
              </div>
              <div className="text-gray-300 text-xl font-medium mb-1">
                {liveState.currentEntry.studioName}
              </div>
              <div className="text-gray-500 mb-8">
                {liveState.currentEntry.category}
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-xl">
                <div className="h-4 bg-gray-700/50 rounded-full overflow-hidden mb-3 shadow-inner">
                  <div
                    className={`h-full transition-all duration-100 rounded-full ${
                      isLowTime
                        ? 'bg-gradient-to-r from-red-600 to-rose-500 shadow-lg shadow-red-500/30'
                        : 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="text-center">
                  <div className={`text-7xl font-mono font-bold tabular-nums ${
                    isLowTime ? 'text-red-400 animate-pulse' : 'text-white'
                  }`}>
                    {formatTime(timeRemaining)}
                  </div>
                  <div className="text-gray-500 text-sm mt-2 tracking-wider uppercase">Time Remaining</div>
                </div>
              </div>

              {/* Next Up Preview */}
              {nextEntry && (
                <div className="mt-10 p-5 bg-gradient-to-br from-yellow-900/20 to-orange-900/20 rounded-2xl border border-yellow-500/20 shadow-lg">
                  <div className="text-yellow-400 text-xs font-bold tracking-widest uppercase mb-2">Up Next</div>
                  <div className="text-white font-semibold text-lg">
                    #{nextEntry.entryNumber} - {nextEntry.title}
                  </div>
                  <div className="text-gray-400 text-sm mt-1">{nextEntry.studioName}</div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gray-800/50 flex items-center justify-center mx-auto mb-6">
                <Play className="w-10 h-10 text-gray-600" />
              </div>
              <div className="text-gray-400 text-2xl font-light mb-3">No routine currently performing</div>
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
                    const hasScore = score?.score !== null && score?.score !== undefined;
                    return (
                      <div key={letter} className="flex items-center justify-between group">
                        <span className="text-gray-400">Judge {letter}</span>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-xl ${
                            hasScore ? 'text-white' : 'text-gray-600'
                          }`}>
                            {hasScore ? score.score.toFixed(2) : '--.-'}
                          </span>
                          {hasScore && score?.scoreId && (
                            <button
                              onClick={() => openScoreEditModal(score.scoreId, score.score || 0)}
                              className="p-1 text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Edit score"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
      <div className="bg-gradient-to-r from-gray-800 via-slate-800 to-gray-800 border-t border-gray-700/50 px-4 py-3">
        {/* Row 1: Tabulation Controls */}
        <div className="flex items-center justify-between mb-3">
          {/* Navigation Controls */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mr-2">TAB</span>
            <button
              onClick={handleBack}
              disabled={!competitionId || currentIndex <= 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-gray-700/80 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl"
            >
              <ChevronLeft className="w-5 h-5" />
              BACK
            </button>

            {liveState?.competitionState === 'active' ? (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 rounded-xl font-bold transition-all shadow-lg hover:shadow-red-500/25 hover:scale-[1.02]"
              >
                <Square className="w-5 h-5" />
                STOP
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={!competitionId}
                className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold transition-all shadow-lg hover:shadow-green-500/25 hover:scale-[1.02]"
              >
                <Play className="w-5 h-5" />
                START
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={!competitionId || currentIndex >= schedule.length - 1}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02]"
            >
              NEXT
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="w-px h-8 bg-gray-600/50 mx-2" />

            <button
              onClick={() => setShowBreakModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/30 rounded-xl font-semibold transition-all hover:border-orange-400/50"
            >
              <Coffee className="w-5 h-5" />
              + BREAK
            </button>

            {/* Score Visibility Toggle */}
            <button
              onClick={handleToggleScoreVisibility}
              disabled={setScoreVisibilityMutation.isPending}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all border ${
                scoreVisibility?.visible
                  ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border-green-500/30 hover:border-green-400/50'
                  : 'bg-gray-600/20 hover:bg-gray-600/30 text-gray-400 border-gray-500/30'
              }`}
              title={scoreVisibility?.visible ? 'Judges CAN see other scores' : 'Judges CANNOT see other scores'}
            >
              {scoreVisibility?.visible ? (
                <Eye className="w-5 h-5" />
              ) : (
                <EyeOff className="w-5 h-5" />
              )}
              Scores
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
            {(() => {
              const delay = liveState?.scheduleDelayMinutes || 0;
              const getDelayStyle = () => {
                if (delay <= 0) return 'bg-green-500/20 text-green-400 border-green-500/30';
                if (delay <= 5) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
                if (delay <= 10) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
                return 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse';
              };
              return (
                <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getDelayStyle()}`}>
                  {delay <= 0 ? 'On Schedule' : `+${delay} min behind`}
                </div>
              );
            })()}
          </div>
        </div>

        {/* Row 2: Audio Controls + Link/Backstage Toggles (PRD Phase 2) */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
          {/* Audio Controls Section */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-purple-400 uppercase tracking-wider mr-2">
              <Music className="w-3.5 h-3.5 inline mr-1" />
              AUDIO
            </span>

            {!audioEnabled ? (
              <button
                onClick={handleEnableAudio}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 rounded-lg font-semibold transition-all hover:border-purple-400/50"
              >
                <Volume2 className="w-4 h-4" />
                Enable Audio
              </button>
            ) : !liveState?.currentEntry?.musicFileUrl ? (
              /* No Music File Message (PRD 10.1) */
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-700/40 rounded-lg border border-gray-600/50">
                <VolumeX className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400 text-sm">No music file uploaded</span>
              </div>
            ) : (
              <>
                {/* Audio Playback Controls */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleAudioStop}
                    disabled={liveState?.audioState === 'stopped'}
                    className="p-2 bg-gray-700/60 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-all"
                    title="Stop"
                  >
                    <Square className="w-4 h-4" />
                  </button>
                  {liveState?.audioState === 'playing' ? (
                    <button
                      onClick={handleAudioPause}
                      className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 rounded-lg transition-all"
                      title="Pause"
                    >
                      <Pause className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleAudioPlay}
                      className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-all"
                      title="Play"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Clickable Progress Bar with Color Coding (PRD 5.5) */}
                <div className="flex items-center gap-2 ml-2">
                  <span className={`text-xs font-mono w-10 ${
                    /* Timer color coding: green >30s, yellow 10-30s, red <10s */
                    audioDuration - localAudioPosition > 30000 ? 'text-green-400' :
                    audioDuration - localAudioPosition > 10000 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {formatAudioTime(localAudioPosition)}
                  </span>
                  <div
                    className="w-32 h-3 bg-gray-700/50 rounded-full overflow-hidden cursor-pointer relative group"
                    onClick={(e) => {
                      if (audioDuration > 0) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const percent = x / rect.width;
                        const newPosition = percent * audioDuration;
                        handleAudioSeek(newPosition);
                      }
                    }}
                    title="Click to seek"
                  >
                    <div
                      className={`h-full transition-all ${
                        /* Progress bar color coding */
                        audioDuration - localAudioPosition < 10000 ? 'bg-red-500 animate-pulse' :
                        audioDuration - localAudioPosition < 30000 ? 'bg-yellow-500' :
                        liveState?.audioState === 'playing' ? 'bg-green-500' : 'bg-purple-500'
                      }`}
                      style={{
                        width: `${audioDuration > 0 ? (localAudioPosition / audioDuration) * 100 : 0}%`,
                      }}
                    />
                    {/* Scrubber handle */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{
                        left: `calc(${audioDuration > 0 ? (localAudioPosition / audioDuration) * 100 : 0}% - 6px)`,
                      }}
                    />
                  </div>
                  <span className={`text-xs font-mono w-10 ${
                    audioDuration - localAudioPosition > 30000 ? 'text-green-400' :
                    audioDuration - localAudioPosition > 10000 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {formatAudioTime(audioDuration - localAudioPosition)}
                  </span>
                </div>

                {/* Audio Status Badge */}
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  liveState?.audioState === 'playing'
                    ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                    : liveState?.audioState === 'paused'
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                    : 'bg-gray-600/20 text-gray-400 border border-gray-500/30'
                }`}>
                  {liveState?.audioState === 'playing' ? 'Playing' : liveState?.audioState === 'paused' ? 'Paused' : 'Stopped'}
                </div>
              </>
            )}
          </div>

          {/* Link Mode, Backstage Control & Auto-Next Toggles */}
          <div className="flex items-center gap-3">
            {/* Auto-Next Toggle (PRD 5.1) */}
            <button
              onClick={() => setAutoNextEnabled(!autoNextEnabled)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all border text-sm ${
                autoNextEnabled
                  ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/30 hover:border-blue-400/50'
                  : 'bg-gray-600/20 hover:bg-gray-600/30 text-gray-400 border-gray-500/30'
              }`}
              title={autoNextEnabled ? 'Auto-advance to next routine when timer reaches 0' : 'Manual advancement only'}
            >
              <SkipForward className="w-4 h-4" />
              Auto-Next: {autoNextEnabled ? 'ON' : 'OFF'}
            </button>

            {/* Link Mode Toggle */}
            <button
              onClick={handleToggleLinkedMode}
              disabled={setLinkedModeMutation.isPending}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all border text-sm ${
                liveState?.linkedMode
                  ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/30 hover:border-cyan-400/50'
                  : 'bg-gray-600/20 hover:bg-gray-600/30 text-gray-400 border-gray-500/30'
              }`}
              title={liveState?.linkedMode ? 'Audio linked to tabulation - START/STOP controls audio' : 'Audio NOT linked - control independently'}
            >
              {liveState?.linkedMode ? (
                <LinkIcon className="w-4 h-4" />
              ) : (
                <Unlink className="w-4 h-4" />
              )}
              {liveState?.linkedMode ? 'Linked' : 'Unlinked'}
            </button>

            {/* Backstage Control Toggle */}
            <button
              onClick={handleToggleBackstageControl}
              disabled={setBackstageControlMutation.isPending}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all border text-sm ${
                liveState?.backstageControlEnabled
                  ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border-green-500/30 hover:border-green-400/50'
                  : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border-red-500/30 hover:border-red-400/50'
              }`}
              title={liveState?.backstageControlEnabled ? 'Backstage CAN control audio' : 'Backstage CANNOT control audio'}
            >
              <Radio className="w-4 h-4" />
              Backstage: {liveState?.backstageControlEnabled ? 'ON' : 'OFF'}
            </button>
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

      {/* Emergency Break Modal */}
      {showBreakModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Coffee className="w-5 h-5 text-orange-400" />
                Add Emergency Break
              </h2>
              <button
                onClick={() => setShowBreakModal(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Duration Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Duration</label>
                <div className="flex gap-2">
                  {[5, 10, 15, 20].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setBreakDuration(mins)}
                      className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                        breakDuration === mins
                          ? 'bg-orange-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Position Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Insert Position</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBreakPosition('before')}
                    className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                      breakPosition === 'before'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Before Current
                  </button>
                  <button
                    onClick={() => setBreakPosition('after')}
                    className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
                      breakPosition === 'after'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    After Current
                  </button>
                </div>
              </div>

              {/* Current Routine Info */}
              {liveState?.currentEntry && (
                <div className="p-3 bg-gray-700/50 rounded-lg">
                  <div className="text-xs text-gray-400 mb-1">Current Routine</div>
                  <div className="text-white font-medium">
                    #{liveState.currentEntry.entryNumber} - {liveState.currentEntry.title}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBreakModal(false)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddBreak}
                  disabled={addEmergencyBreakMutation.isPending}
                  className="flex-1 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {addEmergencyBreakMutation.isPending ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Break
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Score Edit Modal */}
      {showScoreEdit && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-blue-400" />
                Edit Score
              </h2>
              <button
                onClick={() => setShowScoreEdit(null)}
                className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Score Input */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">New Score (60-100)</label>
                <input
                  type="number"
                  min={60}
                  max={100}
                  step={0.5}
                  value={editScoreValue}
                  onChange={(e) => setEditScoreValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white text-xl font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Reason (Required) */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Reason <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={editScoreReason}
                  onChange={(e) => setEditScoreReason(e.target.value)}
                  placeholder="Explain why this score is being changed..."
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                />
                <div className="text-xs text-gray-500 mt-1">
                  This will be logged in the audit trail.
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowScoreEdit(null)}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditScore}
                  disabled={editScoreMutation.isPending || !editScoreReason.trim()}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors"
                >
                  {editScoreMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
