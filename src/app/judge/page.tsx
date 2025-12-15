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
 * - Real-time tRPC sync for live updates
 */

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
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
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Tablet,
  Smartphone,
  UserCircle,
  LogOut,
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

interface TitleBreakdown {
  technique: number;
  category2: number;
  category3: number;
  category4: number;
  category5: number;
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
  // Title Division breakdown
  titleBreakdown: TitleBreakdown;
  isTitleBreakdownSubmitted: boolean;
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

// Default test competition for tester environment
const DEFAULT_TEST_COMPETITION_ID = '1b786221-8f8e-413f-b532-06fa20a2ff63';

// Test judge IDs for 1-click auth (testing only)
// Using valid UUIDs so Prisma can store them in the scores table
const TEST_JUDGES = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Judge 1', position: 'A', color: '#6366F1' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Judge 2', position: 'B', color: '#8B5CF6' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Judge 3', position: 'C', color: '#EC4899' },
];

function JudgePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const judgeIdParam = searchParams.get('judgeId') || '';
  const competitionIdParam = searchParams.get('competitionId') || '';

  // Test judge state - allows 1-click auth without URL manipulation
  const [activeTestJudge, setActiveTestJudge] = useState<typeof TEST_JUDGES[0] | null>(null);

  // Use activeTestJudge if selected, otherwise fall back to URL param
  const judgeId = activeTestJudge?.id || judgeIdParam;

  // State - default to test competition if no param provided
  const [competitionId, setCompetitionId] = useState<string>(competitionIdParam || DEFAULT_TEST_COMPETITION_ID);
  const [state, setState] = useState<JudgeState>({
    currentRoutine: null,
    score: '',
    comments: '',
    specialAwards: '',
    isSubmitted: false,
    isSubmitting: false,
    isConnected: false,
    judgePosition: 'A',
    judgeName: 'Judge',
    breakRequestStatus: 'none',
    breakRequestDuration: null,
    titleBreakdown: {
      technique: 0,
      category2: 0,
      category3: 0,
      category4: 0,
      category5: 0,
    },
    isTitleBreakdownSubmitted: false,
  });

  const [adjudicationLevels, setAdjudicationLevels] = useState<AdjudicationLevel[]>(DEFAULT_LEVELS);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const scoreInputRef = useRef<HTMLInputElement>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [showOtherScores, setShowOtherScores] = useState(false);
  const [deviceMode, setDeviceMode] = useState<'tablet' | 'phone'>('tablet');

  // tRPC queries
  const { data: competitions } = trpc.liveCompetition.getActiveCompetitions.useQuery(
    undefined,
    { enabled: !competitionId, refetchInterval: 30000 }
  );

  // Auto-select first competition if none specified
  useEffect(() => {
    if (!competitionId && competitions && competitions.length > 0) {
      setCompetitionId(competitions[0].id);
    }
  }, [competitions, competitionId]);

  // Load scoring tiers from competition settings
  useEffect(() => {
    if (competitionId && competitions) {
      const selectedComp = competitions.find(c => c.id === competitionId);
      if (selectedComp?.scoring_system_settings) {
        const settings = selectedComp.scoring_system_settings as Record<string, unknown>;
        const awardTiers = settings.award_tiers as Array<{ name: string; minScore: number; maxScore: number; color: string }> | undefined;
        if (awardTiers && Array.isArray(awardTiers) && awardTiers.length > 0) {
          // Convert DB format (minScore/maxScore) to UI format (min/max)
          const levels: AdjudicationLevel[] = awardTiers.map(tier => ({
            name: tier.name,
            min: tier.minScore,
            max: tier.maxScore,
            color: tier.color,
          }));
          // Sort by min score descending (highest first)
          levels.sort((a, b) => b.min - a.min);
          setAdjudicationLevels(levels);
        }
      }
    }
  }, [competitionId, competitions]);
  // Get live state (current routine)
  const { data: liveState, isSuccess: liveStateSuccess } = trpc.liveCompetition.getLiveState.useQuery(
    { competitionId: competitionId || '' },
    { enabled: !!competitionId, refetchInterval: 1000 }
  );

  // Get existing scores for current routine (to check if already submitted)
  const { data: existingScores, refetch: refetchScores } = trpc.liveCompetition.getRoutineScores.useQuery(
    { routineId: liveState?.currentEntry?.id || '' },
    { enabled: !!liveState?.currentEntry?.id, refetchInterval: 2000 }
  );

  // Mutations
  const submitScoreMutation = trpc.liveCompetition.submitScore.useMutation({
    onSuccess: () => {
      toast.success('Score submitted successfully!');
      setState(prev => ({ ...prev, isSubmitting: false, isSubmitted: true }));
      refetchScores();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to submit score');
      setState(prev => ({ ...prev, isSubmitting: false }));
      setError(err.message || 'Failed to submit score');
    },
  });

  const requestBreakMutation = trpc.liveCompetition.requestBreak.useMutation({
    onSuccess: () => {
      toast.success('Break request sent to CD');
      // Status will be updated via polling
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to request break');
      setState(prev => ({
        ...prev,
        breakRequestStatus: 'none',
        breakRequestDuration: null,
      }));
    },
  });

  // Title Division breakdown mutation
  const submitTitleBreakdownMutation = trpc.liveCompetition.submitTitleBreakdown.useMutation({
    onSuccess: () => {
      toast.success('Title Division breakdown submitted!');
      setState(prev => ({ ...prev, isTitleBreakdownSubmitted: true }));
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to submit breakdown');
    },
  });

  // Helper function to detect if routine is Title Division
  const isTitleDivision = (category: string | undefined): boolean => {
    if (!category) return false;
    const lowerCategory = category.toLowerCase();
    return lowerCategory.includes('title') || lowerCategory.includes('division');
  };

  // Get break requests status (poll for updates)
  const { data: breakRequests } = trpc.liveCompetition.getBreakRequests.useQuery(
    { competitionId: competitionId || '', status: 'pending' },
    { enabled: !!competitionId && !!judgeId, refetchInterval: 3000 }
  );

  // Update current routine from live state
  useEffect(() => {
    if (liveState?.currentEntry) {
      const entry = liveState.currentEntry;
      // Map API response to our CurrentRoutine type
      // Note: API only returns id, title, entryNumber, runningOrder, studioName, category
      // We use sensible defaults for fields not in API
      const routine: CurrentRoutine = {
        id: entry.id,
        entryNumber: entry.entryNumber || 0,
        title: entry.title || 'Untitled',
        studioName: entry.studioName || 'Unknown Studio',
        category: entry.category || 'Unknown',
        ageGroup: 'N/A', // Not in API response
        size: 'N/A', // Not in API response
        dancers: [], // Not in API response
        durationMs: 180000, // Default 3 minutes
      };

      setState(prev => ({
        ...prev,
        currentRoutine: routine,
        isConnected: true,
        // Reset score and title breakdown when routine changes
        ...(prev.currentRoutine?.id !== routine.id ? {
          score: '',
          comments: '',
          specialAwards: '',
          isSubmitted: false,
          titleBreakdown: { technique: 0, category2: 0, category3: 0, category4: 0, category5: 0 },
          isTitleBreakdownSubmitted: false,
        } : {}),
      }));
    } else {
      setState(prev => ({
        ...prev,
        currentRoutine: null,
        isConnected: liveStateSuccess,
      }));
    }
  }, [liveState, liveStateSuccess]);

  // Check if this judge already submitted for current routine
  useEffect(() => {
    if (existingScores?.scores && judgeId && state.currentRoutine) {
      const myScore = existingScores.scores.find((s) => s.judgeId === judgeId);
      if (myScore) {
        setState(prev => ({
          ...prev,
          score: myScore.score?.toFixed(2) || '',
          comments: myScore.comments || '',
          isSubmitted: true,
        }));
      }
    }
  }, [existingScores, judgeId, state.currentRoutine?.id]);

  // Update break request status from server
  useEffect(() => {
    if (breakRequests && judgeId) {
      const myRequest = breakRequests.find((r: { judgeId: string }) => r.judgeId === judgeId);
      if (myRequest) {
        setState(prev => ({
          ...prev,
          breakRequestStatus: myRequest.status as 'pending' | 'approved' | 'denied',
          breakRequestDuration: myRequest.requestedDurationMinutes,
        }));
      }
    }
  }, [breakRequests, judgeId]);

  // Timer for current routine - time remaining display
  useEffect(() => {
    if (!liveState?.currentEntryStartedAt || liveState.currentEntryState !== 'performing') {
      setTimeRemaining(0);
      return;
    }

    const startTime = new Date(liveState.currentEntryStartedAt).getTime();
    const duration = state.currentRoutine?.durationMs || 180000; // Default 3 minutes

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setTimeRemaining(remaining);
    }, 100);

    return () => clearInterval(timer);
  }, [liveState?.currentEntryStartedAt, liveState?.currentEntryState, state.currentRoutine?.durationMs]);

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
  // For sum-based scoring (tiers > 100, like Glow), multiply individual score by 3
  const getAwardLevel = (scoreStr: string): AdjudicationLevel | null => {
    const score = parseScore(scoreStr);
    if (score === null) return null;

    // Detect if tiers are sum-based (max > 100) vs per-judge average (max <= 100)
    const maxTierScore = Math.max(...adjudicationLevels.map(l => l.max));
    const isSumBased = maxTierScore > 100;

    // For sum-based scoring, multiply individual score by 3 to approximate total
    const compareScore = isSumBased ? score * 3 : score;

    for (const level of adjudicationLevels) {
      if (compareScore >= level.min && compareScore <= level.max) {
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

    if (!judgeId) {
      setError('No judge ID provided. Please use the link provided by the Competition Director.');
      return;
    }

    if (!competitionId || !state.currentRoutine?.id) {
      setError('No active routine to score');
      return;
    }

    if (state.isSubmitting || state.isSubmitted) return;

    setState((prev) => ({ ...prev, isSubmitting: true }));
    setError(null);

    submitScoreMutation.mutate({
      competitionId,
      routineId: state.currentRoutine.id,
      judgeId,
      score,
      notes: state.comments || undefined,
    });
  }, [state.score, state.comments, state.currentRoutine, state.isSubmitting, state.isSubmitted, competitionId, judgeId, submitScoreMutation]);

  

  // Handle break request (Task #8)
  const handleBreakRequest = useCallback((durationMinutes: number) => {
    if (state.breakRequestStatus === 'pending') return;

    if (!judgeId) {
      setError('No judge ID provided');
      return;
    }

    if (!competitionId) {
      setError('No active competition');
      return;
    }

    setState(prev => ({
      ...prev,
      breakRequestStatus: 'pending',
      breakRequestDuration: durationMinutes,
    }));

    requestBreakMutation.mutate({
      competitionId,
      judgeId,
      requestedDurationMinutes: durationMinutes,
      reason: 'Judge break request',
    });
  }, [state.breakRequestStatus, competitionId, judgeId, requestBreakMutation]);

  // Handle title breakdown score change
  const handleTitleBreakdownChange = (field: keyof TitleBreakdown, value: number) => {
    const clampedValue = Math.max(0, Math.min(20, value));
    setState(prev => ({
      ...prev,
      titleBreakdown: { ...prev.titleBreakdown, [field]: clampedValue },
    }));
  };

  // Submit title breakdown
  const handleSubmitTitleBreakdown = useCallback(() => {
    if (!judgeId || !state.currentRoutine?.id) {
      setError('Missing judge ID or routine');
      return;
    }

    // Note: scoreId is required by the API, but we may not have it yet
    // For now, we'll use the routine ID - the API should handle this
    submitTitleBreakdownMutation.mutate({
      scoreId: state.currentRoutine.id, // Using entryId as fallback
      entryId: state.currentRoutine.id,
      judgeId,
      techniqueScore: state.titleBreakdown.technique,
      category2Score: state.titleBreakdown.category2,
      category3Score: state.titleBreakdown.category3,
      category4Score: state.titleBreakdown.category4,
      category5Score: state.titleBreakdown.category5,
    });
  }, [judgeId, state.currentRoutine?.id, state.titleBreakdown, submitTitleBreakdownMutation]);

  // Get current award level
  const currentAwardLevel = getAwardLevel(state.score);
  // Slider value defaults to 85, and clamps to min 60 for the slider
  const rawSliderValue = parseScore(state.score) ?? 85;
  const sliderValue = Math.max(60, Math.min(100, rawSliderValue));

  // Check if current routine is Title Division
  const isCurrentRoutineTitleDivision = isTitleDivision(state.currentRoutine?.category);

  // Calculate title breakdown total
  const titleBreakdownTotal = state.titleBreakdown.technique +
    state.titleBreakdown.category2 +
    state.titleBreakdown.category3 +
    state.titleBreakdown.category4 +
    state.titleBreakdown.category5;

  // Format time for display (mm:ss)
  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percent for time remaining bar
  const routineDuration = state.currentRoutine?.durationMs || 180000;
  const progressPercent = routineDuration > 0
    ? Math.min(100, ((routineDuration - timeRemaining) / routineDuration) * 100)
    : 0;
  const isLowTime = timeRemaining > 0 && timeRemaining < 30000; // Under 30 seconds

  // Check if judges can see other scores (from live state)
  const judgesCanSeeScores = liveState?.judgesCanSeeScores || false;

  // Get other judges' scores from existingScores
  const otherJudgesScores = existingScores?.scores?.filter(
    (s) => s.judgeId !== judgeId
  ) || [];

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

      {/* 1-Click Test Judge Authentication Panel */}
      {!judgeId && (
        <div className="bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-b border-indigo-500/30 px-4 py-6">
          <div className="max-w-md mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <UserCircle className="w-8 h-8 text-indigo-400" />
              <div>
                <h2 className="text-lg font-semibold text-white">Test Judge Login</h2>
                <p className="text-sm text-indigo-300">Select a judge to start scoring</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {TEST_JUDGES.map((judge) => (
                <button
                  key={judge.id}
                  onClick={() => {
                    setActiveTestJudge(judge);
                    toast.success(`Logged in as ${judge.name}`);
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-white/20 bg-white/5 hover:bg-white/10 hover:border-indigo-400 transition-all"
                  style={{ borderColor: `${judge.color}40` }}
                >
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
                    style={{ backgroundColor: judge.color }}
                  >
                    {judge.position}
                  </div>
                  <span className="text-white font-medium">{judge.name}</span>
                </button>
              ))}
            </div>

            <p className="text-xs text-center text-gray-500 mt-4">
              Testing mode - judges will sign in via TENANT.compsync.net in production
            </p>
          </div>
        </div>
      )}

      {/* Active Test Judge Indicator */}
      {activeTestJudge && (
        <div className="bg-green-500/10 border-b border-green-500/30 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Logged in as <strong>{activeTestJudge.name}</strong> (Test Mode)</span>
          </div>
          <button
            onClick={() => {
              setActiveTestJudge(null);
              toast('Logged out', { icon: '👋' });
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded text-gray-300 transition-colors"
          >
            <LogOut className="w-3 h-3" />
            Switch Judge
          </button>
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-gray-900/50">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold"
            style={{ backgroundColor: activeTestJudge?.color || '#6366F1' }}
          >
            {activeTestJudge?.position || state.judgePosition}
          </div>
          <div>
            <div className="font-semibold text-white">
              {activeTestJudge?.name || (judgeId ? `Judge ${judgeId.slice(0, 8)}...` : state.judgeName)}
            </div>
            <div className="text-xs text-gray-400">{competitionId ? 'Connected to Live Competition' : 'No Competition Selected'}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Device Mode Toggle */}
          <div className="flex items-center bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setDeviceMode('tablet')}
              className={`p-2 rounded-md transition-colors ${
                deviceMode === 'tablet'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Tablet View"
            >
              <Tablet className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDeviceMode('phone')}
              className={`p-2 rounded-md transition-colors ${
                deviceMode === 'phone'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              title="Phone View"
            >
              <Smartphone className="w-4 h-4" />
            </button>
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
        </div>
      </header>

      {/* Main Content - Adapts to device mode */}
      <main className={`mx-auto ${
        deviceMode === 'phone'
          ? 'p-2 max-w-sm'
          : 'p-4 max-w-2xl'
      }`}>
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

            {/* Time Remaining Display */}
            {liveState?.currentEntryState === 'performing' && timeRemaining > 0 && (
              <div className="mt-4 pt-4 border-t border-indigo-500/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm text-indigo-300">
                    <Clock className="w-4 h-4" />
                    <span>Time Remaining</span>
                  </div>
                  <span className={`font-mono text-lg font-bold tabular-nums ${
                    isLowTime ? 'text-red-400 animate-pulse' : 'text-white'
                  }`}>
                    {formatTime(timeRemaining)}
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-100 ${
                      isLowTime ? 'bg-red-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${100 - progressPercent}%` }}
                  />
                </div>
              </div>
            )}
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

            {/* Slider - Range 60-100 for practical scoring */}
            <div className="px-2">
              <input
                type="range"
                min="60"
                max="100"
                step="0.01"
                value={sliderValue}
                onChange={handleSliderChange}
                disabled={state.isSubmitted}
                className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 disabled:opacity-50"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>60.00</span>
                <span>80.00</span>
                <span>100.00</span>
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

        {/* Other Judges' Scores Section */}
        {state.currentRoutine && (
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700 mb-6 overflow-hidden">
            <button
              onClick={() => setShowOtherScores(!showOtherScores)}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-700/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                {judgesCanSeeScores ? (
                  <Eye className="w-5 h-5 text-green-400" />
                ) : (
                  <EyeOff className="w-5 h-5 text-gray-500" />
                )}
                <span className="font-medium text-white">Other Judges' Scores</span>
                {!judgesCanSeeScores && (
                  <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded">
                    Hidden by CD
                  </span>
                )}
              </div>
              {showOtherScores ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {showOtherScores && (
              <div className="px-4 pb-4 border-t border-gray-700">
                {judgesCanSeeScores ? (
                  <div className="pt-4 space-y-3">
                    {existingScores?.scores && existingScores.scores.length > 0 ? (
                      <>
                        {/* All Judges Scores Display */}
                        <div className="grid grid-cols-3 gap-3">
                          {['A', 'B', 'C'].map((letter, idx) => {
                            const score = existingScores.scores?.[idx];
                            const hasScore = score?.score !== null && score?.score !== undefined;
                            const isMyScore = score?.judgeId === judgeId;
                            return (
                              <div
                                key={letter}
                                className={`text-center p-3 rounded-lg border ${
                                  isMyScore
                                    ? 'bg-indigo-500/20 border-indigo-500/50'
                                    : 'bg-gray-700/30 border-gray-600'
                                }`}
                              >
                                <div className="text-xs text-gray-400 mb-1">
                                  Judge {letter}
                                  {isMyScore && <span className="text-indigo-400 ml-1">(You)</span>}
                                </div>
                                <div className={`text-xl font-bold font-mono ${
                                  hasScore ? 'text-white' : 'text-gray-600'
                                }`}>
                                  {hasScore ? score.score.toFixed(2) : '--.-'}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Average Display */}
                        {existingScores.scores.filter(s => s.score !== null).length > 0 && (
                          <div className="text-center p-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg border border-indigo-500/30">
                            <div className="text-xs text-gray-400 mb-1">AVERAGE</div>
                            <div className="text-2xl font-bold font-mono text-white">
                              {(existingScores.scores.reduce((sum, s) => sum + (s.score || 0), 0) / existingScores.scores.filter(s => s.score !== null).length).toFixed(2)}
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        No scores submitted yet
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="pt-4 text-center">
                    <EyeOff className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      Score visibility is disabled by the Competition Director
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Title Division Breakdown Section */}
        {isCurrentRoutineTitleDivision && (
          <div
            className={`bg-gray-800/50 rounded-2xl border p-6 mb-6 ${
              state.isTitleBreakdownSubmitted ? 'border-green-500/50' : 'border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-white">Title Division Breakdown</h3>
              </div>
              {state.isTitleBreakdownSubmitted ? (
                <div className="flex items-center gap-1 text-green-400 text-sm">
                  <Lock className="w-4 h-4" />
                  <span>Submitted</span>
                </div>
              ) : (
                <div className="text-amber-400 text-sm">5 categories × 20 pts each</div>
              )}
            </div>

            <div className="space-y-4">
              {/* Technique */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Technique</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={state.titleBreakdown.technique}
                    onChange={(e) => handleTitleBreakdownChange('technique', parseInt(e.target.value) || 0)}
                    disabled={state.isTitleBreakdownSubmitted}
                    className="w-20 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-center text-lg font-semibold focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={state.titleBreakdown.technique}
                    onChange={(e) => handleTitleBreakdownChange('technique', parseInt(e.target.value))}
                    disabled={state.isTitleBreakdownSubmitted}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-50"
                  />
                  <span className="text-gray-400 text-sm w-12 text-right">/ 20</span>
                </div>
              </div>

              {/* Category 2 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Performance</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={state.titleBreakdown.category2}
                    onChange={(e) => handleTitleBreakdownChange('category2', parseInt(e.target.value) || 0)}
                    disabled={state.isTitleBreakdownSubmitted}
                    className="w-20 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-center text-lg font-semibold focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={state.titleBreakdown.category2}
                    onChange={(e) => handleTitleBreakdownChange('category2', parseInt(e.target.value))}
                    disabled={state.isTitleBreakdownSubmitted}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-50"
                  />
                  <span className="text-gray-400 text-sm w-12 text-right">/ 20</span>
                </div>
              </div>

              {/* Category 3 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Choreography</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={state.titleBreakdown.category3}
                    onChange={(e) => handleTitleBreakdownChange('category3', parseInt(e.target.value) || 0)}
                    disabled={state.isTitleBreakdownSubmitted}
                    className="w-20 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-center text-lg font-semibold focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={state.titleBreakdown.category3}
                    onChange={(e) => handleTitleBreakdownChange('category3', parseInt(e.target.value))}
                    disabled={state.isTitleBreakdownSubmitted}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-50"
                  />
                  <span className="text-gray-400 text-sm w-12 text-right">/ 20</span>
                </div>
              </div>

              {/* Category 4 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Musicality</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={state.titleBreakdown.category4}
                    onChange={(e) => handleTitleBreakdownChange('category4', parseInt(e.target.value) || 0)}
                    disabled={state.isTitleBreakdownSubmitted}
                    className="w-20 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-center text-lg font-semibold focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={state.titleBreakdown.category4}
                    onChange={(e) => handleTitleBreakdownChange('category4', parseInt(e.target.value))}
                    disabled={state.isTitleBreakdownSubmitted}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-50"
                  />
                  <span className="text-gray-400 text-sm w-12 text-right">/ 20</span>
                </div>
              </div>

              {/* Category 5 */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Showmanship</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={state.titleBreakdown.category5}
                    onChange={(e) => handleTitleBreakdownChange('category5', parseInt(e.target.value) || 0)}
                    disabled={state.isTitleBreakdownSubmitted}
                    className="w-20 px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-center text-lg font-semibold focus:outline-none focus:border-amber-500 disabled:opacity-50"
                  />
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={state.titleBreakdown.category5}
                    onChange={(e) => handleTitleBreakdownChange('category5', parseInt(e.target.value))}
                    disabled={state.isTitleBreakdownSubmitted}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500 disabled:opacity-50"
                  />
                  <span className="text-gray-400 text-sm w-12 text-right">/ 20</span>
                </div>
              </div>
            </div>

            {/* Total Display */}
            <div className="mt-6 p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
              <div className="flex items-center justify-between">
                <span className="text-amber-300 font-medium">Total Score</span>
                <span className="text-3xl font-bold text-amber-400">
                  {titleBreakdownTotal} <span className="text-lg text-amber-300/70">/ 100</span>
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmitTitleBreakdown}
              disabled={state.isTitleBreakdownSubmitted || titleBreakdownTotal === 0 || submitTitleBreakdownMutation.isPending}
              className={`w-full mt-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                state.isTitleBreakdownSubmitted
                  ? 'bg-green-600 text-white cursor-not-allowed'
                  : submitTitleBreakdownMutation.isPending
                  ? 'bg-amber-600 text-white cursor-wait'
                  : 'bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {state.isTitleBreakdownSubmitted ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Breakdown Submitted
                </>
              ) : submitTitleBreakdownMutation.isPending ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Submit Title Breakdown
                </>
              )}
            </button>
          </div>
        )}

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

// Wrapper with Suspense for useSearchParams
export default function JudgePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-slate-900 via-gray-900 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-gray-400">Loading Judge Interface...</div>
        </div>
      </div>
    }>
      <JudgePageContent />
    </Suspense>
  );
}
