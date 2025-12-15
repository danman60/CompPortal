'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MP3DownloadPanel } from '@/components/audio/MP3DownloadPanel';
import { trpc } from '@/lib/trpc';
import { HardDrive, Maximize, Minimize, Play, Pause, Square, Volume2, VolumeX, Radio, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

// Default test competition for tester environment
const DEFAULT_TEST_COMPETITION_ID = '1b786221-8f8e-413f-b532-06fa20a2ff63';

interface RoutineInfo {
  id: string;
  entryNumber: string;
  routineName: string;
  studioName: string;
  category: string;
  ageGroup: string;
  durationMs: number;
  startedAt?: string | null;
  state?: string | null;
  mp3Url?: string | null;
}

interface UpcomingRoutine {
  id: string;
  entryNumber: string;
  routineName: string;
  studioName: string;
  category: string;
  ageGroup: string;
  durationMs: number;
  isBreak?: boolean;
}

interface BackstageData {
  currentRoutine: RoutineInfo | null;
  nextRoutine: Omit<RoutineInfo, 'startedAt' | 'state'> | null;
  upcomingRoutines?: UpcomingRoutine[];
  competitionId?: string;
  competitionName: string | null;
  competitionDay?: string;
  isActive: boolean;
  serverTime?: string;
}

// Types for Game Day Audio Control sync
interface LiveState {
  currentEntryId: string | null;
  competitionState: 'idle' | 'active' | 'paused';
  audioState: 'stopped' | 'playing' | 'paused';
  audioPositionMs: number;
  audioStartedAt: string | null;
  linkedMode: boolean;
  backstageControlEnabled: boolean;
}

export default function BackstagePage() {
  const searchParams = useSearchParams();
  const competitionIdParam = searchParams.get('competitionId');
  const competitionId = competitionIdParam || DEFAULT_TEST_COMPETITION_ID;

  const [data, setData] = useState<BackstageData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showAudioPanel, setShowAudioPanel] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'error'>('syncing');
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const escPressTimesRef = useRef<number[]>([]);

  // Track synced start time to prevent timer glitch on re-fetch
  const syncedStartTimeRef = useRef<{ routineId: string | null; startedAt: string | null; localOffset: number }>({
    routineId: null,
    startedAt: null,
    localOffset: 0,
  });

  // Audio playback state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [currentAudioRoutineId, setCurrentAudioRoutineId] = useState<string | null>(null);

  // Network connection status (PRD 10.2)
  const [isOnline, setIsOnline] = useState(true);

  // Track audio state changes for conflict detection (PRD 10.3)
  const lastAudioStateRef = useRef<string | null>(null);

  // Game Day Audio Control - tRPC sync with tabulator
  const { data: liveState, refetch: refetchLiveState } = trpc.liveCompetition.getLiveState.useQuery(
    { competitionId },
    {
      refetchInterval: 1000, // Real-time sync every second
      enabled: !!competitionId,
    }
  );

  // Audio control mutations for syncing with tabulator
  const setAudioStateMutation = trpc.liveCompetition.setAudioState.useMutation({
    onSuccess: () => refetchLiveState(),
  });
  const updateAudioPositionMutation = trpc.liveCompetition.updateAudioPosition.useMutation();

  // Cast to typed live state
  const audioSyncState = liveState as LiveState | undefined;
  const backstageControlEnabled = audioSyncState?.backstageControlEnabled ?? true;

  const fetchData = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const response = await fetch(`/api/backstage?competitionId=${DEFAULT_TEST_COMPETITION_ID}`);
      if (response.ok) {
        const newData = await response.json();
        setData(newData);
        setLastSyncTime(new Date());
        setSyncStatus('connected');

        // Only recalculate time when routine or startedAt CHANGES to prevent timer glitch
        const currentRoutineId = newData.currentRoutine?.id ?? null;
        const currentStartedAt = newData.currentRoutine?.startedAt ?? null;
        const synced = syncedStartTimeRef.current;

        if (currentRoutineId !== synced.routineId || currentStartedAt !== synced.startedAt) {
          // New routine or new start time - calculate offset from server time
          if (newData.currentRoutine?.startedAt) {
            const startTime = new Date(newData.currentRoutine.startedAt).getTime();
            const serverTime = newData.serverTime ? new Date(newData.serverTime).getTime() : Date.now();
            const elapsed = serverTime - startTime;
            const remaining = Math.max(0, newData.currentRoutine.durationMs - elapsed);
            setTimeRemaining(remaining);

            // Store the local offset so timer can continue smoothly
            syncedStartTimeRef.current = {
              routineId: currentRoutineId,
              startedAt: currentStartedAt,
              localOffset: Date.now() - serverTime,
            };
          } else {
            setTimeRemaining(0);
            syncedStartTimeRef.current = { routineId: null, startedAt: null, localOffset: 0 };
          }
        }
        // If same routine, don't recalculate - let local timer handle it smoothly
      } else {
        setSyncStatus('error');
      }
    } catch (error) {
      console.error('Failed to fetch backstage data:', error);
      setSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (!data?.currentRoutine?.startedAt) return;
    const startTime = new Date(data.currentRoutine.startedAt).getTime();
    const duration = data.currentRoutine.durationMs;
    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setTimeRemaining(remaining);
    }, 100);
    return () => clearInterval(timer);
  }, [data?.currentRoutine?.startedAt, data?.currentRoutine?.durationMs]);

  // Kiosk mode: ESC key handler (3 rapid presses to exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isKioskMode) {
        const now = Date.now();
        escPressTimesRef.current.push(now);

        // Keep only presses within last 1.5 seconds
        escPressTimesRef.current = escPressTimesRef.current.filter(
          time => now - time < 1500
        );

        // Exit kiosk mode if 3 rapid presses
        if (escPressTimesRef.current.length >= 3) {
          setIsKioskMode(false);
          if (document.fullscreenElement) {
            document.exitFullscreen();
          }
          escPressTimesRef.current = [];
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isKioskMode]);

  // Track fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Network connection status monitoring (PRD 10.2)
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

    // Check initial state
    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Detect audio state changes from tabulator (PRD 10.3 - Concurrent Control Conflicts)
  useEffect(() => {
    if (!audioSyncState?.audioState) return;

    const currentState = audioSyncState.audioState;
    const previousState = lastAudioStateRef.current;

    // Skip if no previous state or state hasn't changed
    if (previousState === null || previousState === currentState) {
      lastAudioStateRef.current = currentState;
      return;
    }

    // Check if local state differs from server state (tabulator made a change)
    if (audioRef.current) {
      const localPlaying = !audioRef.current.paused;
      const serverPlaying = currentState === 'playing';

      // If they differ, it means tabulator changed the state
      if (localPlaying !== serverPlaying) {
        toast('Audio state changed by Tabulator', {
          icon: '🎵',
          duration: 3000,
        });
      }
    }

    lastAudioStateRef.current = currentState;
  }, [audioSyncState?.audioState]);

  // Audio playback controls - with database sync
  const playAudio = useCallback(() => {
    if (audioRef.current && data?.currentRoutine?.mp3Url) {
      // Check if backstage control is enabled
      if (!backstageControlEnabled) {
        console.log('Backstage control disabled by tabulator');
        return;
      }

      // Load new audio if routine changed
      if (currentAudioRoutineId !== data.currentRoutine.id) {
        audioRef.current.src = data.currentRoutine.mp3Url;
        audioRef.current.load();
        setCurrentAudioRoutineId(data.currentRoutine.id);
      }
      audioRef.current.play();
      setIsPlaying(true);

      // Sync to database
      setAudioStateMutation.mutate({
        competitionId,
        audioState: 'playing',
      });
    }
  }, [data?.currentRoutine?.mp3Url, data?.currentRoutine?.id, currentAudioRoutineId, backstageControlEnabled, competitionId, setAudioStateMutation]);

  const pauseAudio = useCallback(() => {
    if (!backstageControlEnabled) return;

    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);

      // Sync to database
      setAudioStateMutation.mutate({
        competitionId,
        audioState: 'paused',
        positionMs: Math.floor(audioRef.current.currentTime * 1000),
      });
    }
  }, [backstageControlEnabled, competitionId, setAudioStateMutation]);

  const stopAudio = useCallback(() => {
    if (!backstageControlEnabled) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setAudioCurrentTime(0);

      // Sync to database
      setAudioStateMutation.mutate({
        competitionId,
        audioState: 'stopped',
        positionMs: 0,
      });
    }
  }, [backstageControlEnabled, competitionId, setAudioStateMutation]);

  const toggleMute = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setAudioCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  }, []);

  // Update audio time tracking
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setAudioCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  // Stop audio when routine changes
  useEffect(() => {
    if (data?.currentRoutine?.id && currentAudioRoutineId && data.currentRoutine.id !== currentAudioRoutineId) {
      stopAudio();
    }
  }, [data?.currentRoutine?.id, currentAudioRoutineId, stopAudio]);

  // Game Day Audio Control - sync playback state with tabulator
  useEffect(() => {
    if (!audioRef.current || !audioSyncState || !data?.currentRoutine?.mp3Url) return;

    const audio = audioRef.current;
    const dbAudioState = audioSyncState.audioState;

    // Sync playing state from database (tabulator controls)
    if (dbAudioState === 'playing' && audio.paused) {
      // Load audio if needed
      if (currentAudioRoutineId !== data.currentRoutine.id) {
        audio.src = data.currentRoutine.mp3Url;
        audio.load();
        setCurrentAudioRoutineId(data.currentRoutine.id);
      }
      // Calculate current position based on server time
      if (audioSyncState.audioStartedAt) {
        const serverStartTime = new Date(audioSyncState.audioStartedAt).getTime();
        const elapsed = Date.now() - serverStartTime;
        const newPosition = ((audioSyncState.audioPositionMs || 0) + elapsed) / 1000;
        audio.currentTime = newPosition;
      }
      audio.play().catch(console.error);
      setIsPlaying(true);
    } else if (dbAudioState === 'paused' && !audio.paused) {
      audio.pause();
      if (typeof audioSyncState.audioPositionMs === 'number') {
        audio.currentTime = audioSyncState.audioPositionMs / 1000;
      }
      setIsPlaying(false);
    } else if (dbAudioState === 'stopped' && (!audio.paused || audio.currentTime > 0)) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      setAudioCurrentTime(0);
    }
  }, [audioSyncState?.audioState, audioSyncState?.audioPositionMs, audioSyncState?.audioStartedAt, data?.currentRoutine?.mp3Url, data?.currentRoutine?.id, currentAudioRoutineId]);

  const formatAudioTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + secs.toString().padStart(2, '0');
  };

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsKioskMode(true);
      } else {
        await document.exitFullscreen();
        setIsKioskMode(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + ':' + seconds.toString().padStart(2, '0');
  };

  const formatDuration = (ms: number) => {
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes + ':' + seconds.toString().padStart(2, '0');
  };

  const formatSyncTime = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSeconds < 5) return 'Just now';
    if (diffSeconds < 60) return diffSeconds + 's ago';
    return Math.floor(diffSeconds / 60) + 'm ago';
  };

  const getSyncStatusColor = () => {
    switch (syncStatus) {
      case 'connected': return 'bg-green-500';
      case 'syncing': return 'bg-yellow-500 animate-pulse';
      case 'error': return 'bg-red-500';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <div className="text-gray-300 text-2xl font-light">Loading Backstage...</div>
        </div>
      </div>
    );
  }

  if (!data?.isActive) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-black flex flex-col items-center justify-center p-8">
        {/* Audio Panel Toggle - available even when not active */}
        <button
          onClick={() => setShowAudioPanel(!showAudioPanel)}
          className="fixed top-2 right-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-lg text-xs text-white z-50 flex items-center gap-1.5 shadow-lg transition-all"
        >
          <HardDrive className="w-3.5 h-3.5" />
          {showAudioPanel ? 'Hide Audio' : 'Audio Files'}
        </button>

        {/* Collapsible Audio Download Panel */}
        {showAudioPanel && (
          <div className="fixed top-12 right-2 z-40 w-96 max-h-[80vh] overflow-y-auto">
            <MP3DownloadPanel compact={false} />
          </div>
        )}

        <div className="w-24 h-24 rounded-full bg-gray-800/50 flex items-center justify-center mx-auto mb-8">
          <div className="w-16 h-16 rounded-full bg-gray-700/50 animate-pulse" />
        </div>
        <div className="text-gray-300 text-4xl font-light mb-4">Competition Not Active</div>
        {data?.competitionName && (
          <div className="text-gray-500 text-2xl">{data.competitionName}</div>
        )}
        <div className="mt-8 text-gray-600 text-xl flex items-center gap-3">
          <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse" />
          Waiting for competition to start...
        </div>
      </div>
    );
  }

  const progressPercent = data.currentRoutine
    ? Math.min(100, ((data.currentRoutine.durationMs - timeRemaining) / data.currentRoutine.durationMs) * 100)
    : 0;

  // Timer color coding (PRD 5.5): Green >30s, Yellow 10-30s, Red <10s (flashing)
  const timeRemainingSeconds = Math.ceil(timeRemaining / 1000);
  const timerColorClass = timeRemainingSeconds > 30
    ? 'text-green-400' // Green: >30 seconds
    : timeRemainingSeconds > 10
      ? 'text-yellow-400' // Yellow: 10-30 seconds
      : 'text-red-400 animate-pulse'; // Red (flashing): <10 seconds
  const progressColorClass = timeRemainingSeconds > 30
    ? 'bg-gradient-to-r from-green-600 to-emerald-500 shadow-lg shadow-green-500/30'
    : timeRemainingSeconds > 10
      ? 'bg-gradient-to-r from-yellow-600 to-amber-500 shadow-lg shadow-yellow-500/30'
      : 'bg-gradient-to-r from-red-600 to-rose-500 shadow-lg shadow-red-500/30';
  const isLowTime = timeRemaining > 0 && timeRemaining < 30000;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-black text-white flex flex-col">
      {/* Toast notifications for conflict alerts */}
      <Toaster position="top-center" />

      {/* Hidden audio element for playback */}
      <audio ref={audioRef} preload="metadata" />

      {/* Network disconnection banner (PRD 10.2) */}
      {!isOnline && (
        <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-2 animate-pulse fixed top-0 left-0 right-0 z-50">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold">Disconnected</span>
          <span className="text-red-100">- Connection lost. Some features may not work until connection is restored.</span>
        </div>
      )}

      {/* Back to Test Page link - hidden in kiosk mode */}
      {!isKioskMode && (
        <Link
          href="/game-day-test"
          className="fixed top-2 left-2 px-2.5 py-1.5 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-xs text-white z-50 shadow-lg transition-all"
        >
          Test Page
        </Link>
      )}

      {/* Fullscreen/Kiosk Mode Toggle - hidden in kiosk mode (use ESC x3 to exit) */}
      {!isKioskMode && (
        <button
          onClick={toggleFullscreen}
          className="fixed top-2 left-24 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg text-xs text-white z-50 flex items-center gap-1.5 shadow-lg transition-all"
          title="Enter fullscreen kiosk mode (ESC x3 to exit)"
        >
          {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          {isFullscreen ? 'Exit Fullscreen' : 'Kiosk Mode'}
        </button>
      )}

      {/* Audio Panel Toggle - hidden in kiosk mode */}
      {!isKioskMode && (
        <button
          onClick={() => setShowAudioPanel(!showAudioPanel)}
          className="fixed top-2 right-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-lg text-xs text-white z-50 flex items-center gap-1.5 shadow-lg transition-all"
        >
          <HardDrive className="w-3.5 h-3.5" />
          {showAudioPanel ? 'Hide Audio' : 'Audio Files'}
        </button>
      )}

      {/* Collapsible Audio Download Panel */}
      {showAudioPanel && (
        <div className="fixed top-12 right-2 z-40 w-96 max-h-[80vh] overflow-y-auto">
          <MP3DownloadPanel
            competitionId={data?.competitionId}
            day={data?.competitionDay}
            compact={false}
          />
        </div>
      )}

      <div className="bg-gradient-to-r from-gray-800/80 via-slate-800/80 to-gray-800/80 p-4 border-b border-gray-700/50 shadow-lg">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className={'w-3 h-3 rounded-full shadow-lg ' + getSyncStatusColor()} title={syncStatus} />
            <span className="text-gray-500 text-xs">{formatSyncTime(lastSyncTime)}</span>
          </div>
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-200 via-white to-gray-200 bg-clip-text text-transparent">{data.competitionName || 'Competition'}</h1>
            <div className="text-gray-500 text-sm tracking-wider uppercase">Backstage Monitor</div>
          </div>
          {/* Game Day Audio Control Status Badge */}
          <div className={`px-3 py-1.5 rounded-full flex items-center gap-2 text-xs font-medium ${
            backstageControlEnabled
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            <Radio className="w-3.5 h-3.5" />
            <div className={`w-1.5 h-1.5 rounded-full ${backstageControlEnabled ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            {backstageControlEnabled ? 'Controls Active' : 'Disabled by Tabulator'}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {data.currentRoutine ? (
          <>
            <div className="px-6 py-2 bg-blue-500/20 border border-blue-500/30 rounded-full mb-6">
              <span className="text-blue-300 text-xl font-bold tracking-widest uppercase flex items-center gap-3">
                <span className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
                Now Performing
              </span>
            </div>
            <div className="text-white text-7xl md:text-9xl font-bold mb-4 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">
              #{data.currentRoutine.entryNumber}
            </div>
            <div className="text-gray-300 text-3xl md:text-4xl font-medium text-center mb-2 max-w-full px-4">
              {data.currentRoutine.routineName}
            </div>
            <div className="text-gray-400 text-2xl md:text-3xl font-light mb-8">{data.currentRoutine.studioName}</div>
            <div className="text-gray-500 text-xl mb-12">
              {data.currentRoutine.category} | {data.currentRoutine.ageGroup}
            </div>
            <div className="relative w-full max-w-2xl mb-8">
              <div className="h-5 bg-gray-700/50 rounded-full overflow-hidden mb-4 shadow-inner">
                <div
                  className={"h-full transition-all duration-100 rounded-full " + progressColorClass}
                  style={{ width: progressPercent + '%' }}
                />
              </div>
              <div className="text-center">
                <div className="text-gray-500 text-lg mb-3 tracking-wider uppercase">Time Remaining</div>
                <div className={"text-9xl md:text-[12rem] font-mono font-bold tabular-nums " + timerColorClass}>
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-gray-500 text-lg mt-3">of {formatDuration(data.currentRoutine.durationMs)}</div>
              </div>
            </div>

            {/* Audio Player Controls */}
            {data.currentRoutine.mp3Url && (
              <div className="w-full max-w-2xl bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl p-5 border border-gray-700/50 shadow-xl">
                <div className="flex items-center gap-4">
                  {/* Play/Pause/Stop buttons */}
                  <div className="flex items-center gap-2">
                    {isPlaying ? (
                      <button
                        onClick={pauseAudio}
                        className="p-3.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-full transition-all shadow-lg hover:shadow-blue-500/25 hover:scale-105"
                        title="Pause"
                      >
                        <Pause className="w-6 h-6 text-white" />
                      </button>
                    ) : (
                      <button
                        onClick={playAudio}
                        className="p-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 rounded-full transition-all shadow-lg hover:shadow-green-500/25 hover:scale-105"
                        title="Play"
                      >
                        <Play className="w-6 h-6 text-white" />
                      </button>
                    )}
                    <button
                      onClick={stopAudio}
                      className="p-2.5 bg-gray-700/50 hover:bg-gray-600 rounded-full transition-all"
                      title="Stop"
                    >
                      <Square className="w-5 h-5 text-gray-300" />
                    </button>
                  </div>

                  {/* Seek bar */}
                  <div className="flex-1 flex items-center gap-3">
                    <span className="text-gray-400 text-sm font-mono w-12 tabular-nums">
                      {formatAudioTime(audioCurrentTime)}
                    </span>
                    <input
                      type="range"
                      min="0"
                      max={audioDuration || 0}
                      value={audioCurrentTime}
                      onChange={handleSeek}
                      className="flex-1 h-2 bg-gray-700/50 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <span className="text-gray-400 text-sm font-mono w-12 tabular-nums">
                      {formatAudioTime(audioDuration)}
                    </span>
                  </div>

                  {/* Volume control */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleMute}
                      className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                      title={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? (
                        <VolumeX className="w-5 h-5 text-gray-500" />
                      ) : (
                        <Volume2 className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      className="w-20 h-2 bg-gray-700/50 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-400 text-4xl">No routine currently performing</div>
        )}
      </div>

      {(data.upcomingRoutines?.length ?? 0) > 0 && (
        <div className="bg-gradient-to-r from-gray-800/80 via-slate-800/80 to-gray-800/80 border-t border-gray-700/50 p-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-yellow-400 text-lg font-bold tracking-widest uppercase mb-5">Coming Up</div>
            <div className="space-y-3">
              {data.upcomingRoutines?.map((routine, index) => (
                routine.isBreak ? (
                  // Break block styling - orange theme
                  <div
                    key={routine.id}
                    className="flex items-center justify-center p-4 rounded-xl bg-gradient-to-r from-orange-600/20 to-amber-600/20 border border-orange-500/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-orange-400 text-2xl font-bold">---</div>
                      <div className="text-orange-300 text-lg font-bold tracking-widest">BREAK</div>
                      <div className="text-orange-400 text-2xl font-bold">---</div>
                    </div>
                    <div className="text-orange-400/70 text-sm ml-4 font-mono">{formatDuration(routine.durationMs)}</div>
                  </div>
                ) : (
                  // Regular routine styling
                  <div
                    key={routine.id}
                    className={'flex items-center justify-between p-4 rounded-xl transition-all ' + (index === 0 ? 'bg-gradient-to-r from-yellow-900/30 to-amber-900/30 border border-yellow-500/20' : 'bg-gray-700/30 hover:bg-gray-700/50')}
                  >
                    <div className="flex items-center gap-4">
                      <div className={'text-2xl font-bold ' + (index === 0 ? 'text-yellow-400' : 'text-gray-500')}>
                        {index === 0 ? 'NEXT' : index + 1}
                      </div>
                      <div>
                        <div className={'font-semibold ' + (index === 0 ? 'text-white text-xl' : 'text-gray-300 text-lg')}>
                          #{routine.entryNumber} - {routine.routineName}
                        </div>
                        <div className="text-gray-400 text-sm">{routine.studioName}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-500 text-sm">{routine.category} | {routine.ageGroup}</div>
                      <div className="text-gray-600 text-xs font-mono">{formatDuration(routine.durationMs)}</div>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-900/80 p-3 text-center text-gray-600 text-sm border-t border-gray-800/50 flex items-center justify-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        Auto-refreshing | {data.competitionDay}
      </div>
    </div>
  );
}
