'use client';

/**
 * Backstage Tech Interface
 *
 * Kiosk-mode interface for backstage technicians to control MP3 playback
 * and see the current/upcoming routines.
 *
 * Features:
 * - Kiosk mode (fullscreen, no browser navigation)
 * - Current routine display (entry #, title, studio)
 * - Up Next list (next 3 routines)
 * - Play/Pause/Stop controls
 * - MP3 download status
 * - WebSocket sync indicator
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, Square, SkipForward, Maximize2, Minimize2, Wifi, WifiOff, Music, Volume2, VolumeX } from 'lucide-react';

// Types for competition entries
interface RoutineEntry {
  id: string;
  entryNumber: number;
  title: string;
  studioName: string;
  category: string;
  ageGroup: string;
  durationMs: number;
  mp3Url?: string;
  mp3Downloaded: boolean;
}

interface BackstageState {
  currentRoutine: RoutineEntry | null;
  upNextRoutines: RoutineEntry[];
  isPlaying: boolean;
  isPaused: boolean;
  playbackPosition: number;
  playbackDuration: number;
  isConnected: boolean;
  mp3DownloadProgress: { downloaded: number; total: number };
}

export default function BackstagePage() {
  // State
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [state, setState] = useState<BackstageState>({
    currentRoutine: null,
    upNextRoutines: [],
    isPlaying: false,
    isPaused: false,
    playbackPosition: 0,
    playbackDuration: 0,
    isConnected: false,
    mp3DownloadProgress: { downloaded: 0, total: 0 },
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Demo data for testing (will be replaced with WebSocket data)
  useEffect(() => {
    // Simulated demo data
    const demoRoutines: RoutineEntry[] = [
      {
        id: '1',
        entryNumber: 101,
        title: 'Rise Up',
        studioName: 'Elite Dance Academy',
        category: 'Contemporary',
        ageGroup: 'Teen',
        durationMs: 180000,
        mp3Downloaded: true,
      },
      {
        id: '2',
        entryNumber: 102,
        title: 'Fire & Ice',
        studioName: 'Starlight Studios',
        category: 'Jazz',
        ageGroup: 'Senior',
        durationMs: 195000,
        mp3Downloaded: true,
      },
      {
        id: '3',
        entryNumber: 103,
        title: 'Dream Catcher',
        studioName: 'Motion Dance Co',
        category: 'Lyrical',
        ageGroup: 'Teen',
        durationMs: 210000,
        mp3Downloaded: false,
      },
      {
        id: '4',
        entryNumber: 104,
        title: 'City Lights',
        studioName: 'Urban Beat Dance',
        category: 'Hip Hop',
        ageGroup: 'Junior',
        durationMs: 165000,
        mp3Downloaded: false,
      },
    ];

    setState((prev) => ({
      ...prev,
      currentRoutine: demoRoutines[0],
      upNextRoutines: demoRoutines.slice(1, 4),
      isConnected: true,
      mp3DownloadProgress: { downloaded: 2, total: 4 },
    }));
  }, []);

  // Kiosk mode toggle
  const toggleKioskMode = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsKioskMode(true);
    } else {
      document.exitFullscreen();
      setIsKioskMode(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsKioskMode(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Keyboard shortcut for kiosk mode (F11)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F11') {
        e.preventDefault();
        toggleKioskMode();
      }
      // Spacebar to play/pause
      if (e.code === 'Space' && !e.target?.toString().includes('input')) {
        e.preventDefault();
        handlePlayPause();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggleKioskMode]);

  // Playback controls
  const handlePlay = () => {
    setState((prev) => ({ ...prev, isPlaying: true, isPaused: false }));
    // TODO: WebSocket broadcast playback:started
  };

  const handlePause = () => {
    setState((prev) => ({ ...prev, isPlaying: false, isPaused: true }));
    // TODO: WebSocket broadcast playback:paused
  };

  const handleStop = () => {
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      playbackPosition: 0,
    }));
    // TODO: WebSocket broadcast playback:ended
  };

  const handlePlayPause = () => {
    if (state.isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const handleSkipToNext = () => {
    // Move current to completed, first up-next becomes current
    if (state.upNextRoutines.length > 0) {
      const [nextRoutine, ...remaining] = state.upNextRoutines;
      setState((prev) => ({
        ...prev,
        currentRoutine: nextRoutine,
        upNextRoutines: remaining,
        isPlaying: false,
        isPaused: false,
        playbackPosition: 0,
      }));
    }
  };

  // Simulated playback progress
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state.isPlaying && state.currentRoutine) {
      interval = setInterval(() => {
        setState((prev) => {
          const newPosition = prev.playbackPosition + 100;
          if (newPosition >= (prev.currentRoutine?.durationMs || 0)) {
            // Auto-advance to next routine
            if (prev.upNextRoutines.length > 0) {
              const [nextRoutine, ...remaining] = prev.upNextRoutines;
              return {
                ...prev,
                currentRoutine: nextRoutine,
                upNextRoutines: remaining,
                playbackPosition: 0,
                isPlaying: false,
              };
            }
            return { ...prev, isPlaying: false, playbackPosition: prev.currentRoutine?.durationMs || 0 };
          }
          return { ...prev, playbackPosition: newPosition };
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [state.isPlaying, state.currentRoutine]);

  // Format duration as MM:SS
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercent = state.currentRoutine
    ? (state.playbackPosition / state.currentRoutine.durationMs) * 100
    : 0;

  return (
    <div className={`min-h-screen bg-gradient-to-b from-gray-900 via-slate-900 to-black text-white ${isKioskMode ? 'cursor-none' : ''}`}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
        <div className="flex items-center gap-4">
          <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Backstage Tech
          </div>
          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${state.isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {state.isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {state.isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* MP3 Download Status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-400 text-sm">
            <Music className="w-4 h-4" />
            {state.mp3DownloadProgress.downloaded}/{state.mp3DownloadProgress.total} MP3s
          </div>

          {/* Kiosk Mode Toggle */}
          <button
            onClick={toggleKioskMode}
            className="p-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
            title={isKioskMode ? 'Exit Fullscreen (F11)' : 'Enter Fullscreen (F11)'}
          >
            {isKioskMode ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-col lg:flex-row gap-6 p-6 h-[calc(100vh-80px)]">
        {/* Current Routine - Left Panel */}
        <div className="flex-1 flex flex-col">
          {/* Now Playing */}
          <div className="bg-gradient-to-br from-purple-900/40 to-pink-900/40 rounded-2xl border border-purple-500/30 p-8 flex-1">
            <div className="text-sm font-medium text-purple-300 mb-2">NOW PERFORMING</div>

            {state.currentRoutine ? (
              <>
                {/* Entry Number */}
                <div className="text-8xl font-bold text-white mb-4">
                  #{state.currentRoutine.entryNumber}
                </div>

                {/* Routine Title */}
                <h1 className="text-4xl font-bold text-white mb-2">
                  {state.currentRoutine.title}
                </h1>

                {/* Studio Name */}
                <div className="text-2xl text-gray-300 mb-4">
                  {state.currentRoutine.studioName}
                </div>

                {/* Category / Age Group */}
                <div className="flex gap-3 mb-8">
                  <span className="px-4 py-2 bg-purple-500/30 rounded-full text-purple-200 text-lg">
                    {state.currentRoutine.category}
                  </span>
                  <span className="px-4 py-2 bg-pink-500/30 rounded-full text-pink-200 text-lg">
                    {state.currentRoutine.ageGroup}
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-sm text-gray-400 mt-2">
                    <span>{formatDuration(state.playbackPosition)}</span>
                    <span>{formatDuration(state.currentRoutine.durationMs)}</span>
                  </div>
                </div>

                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-4">
                  {/* Play/Pause */}
                  <button
                    onClick={handlePlayPause}
                    className={`p-6 rounded-full transition-all duration-200 ${
                      state.isPlaying
                        ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                        : 'bg-green-500 hover:bg-green-400 text-white'
                    }`}
                    title={state.isPlaying ? 'Pause' : 'Play'}
                  >
                    {state.isPlaying ? (
                      <Pause className="w-12 h-12" />
                    ) : (
                      <Play className="w-12 h-12" />
                    )}
                  </button>

                  {/* Stop */}
                  <button
                    onClick={handleStop}
                    className="p-4 rounded-full bg-red-500 hover:bg-red-400 text-white transition-colors"
                    title="Stop"
                  >
                    <Square className="w-8 h-8" />
                  </button>

                  {/* Skip to Next */}
                  <button
                    onClick={handleSkipToNext}
                    className="p-4 rounded-full bg-gray-600 hover:bg-gray-500 text-white transition-colors"
                    title="Skip to Next"
                    disabled={state.upNextRoutines.length === 0}
                  >
                    <SkipForward className="w-8 h-8" />
                  </button>

                  {/* Mute Toggle */}
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className={`p-4 rounded-full transition-colors ${isMuted ? 'bg-gray-600 text-gray-400' : 'bg-gray-700 text-white'}`}
                    title={isMuted ? 'Unmute' : 'Mute'}
                  >
                    {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-2xl">
                No routine loaded
              </div>
            )}
          </div>
        </div>

        {/* Up Next - Right Panel */}
        <div className="lg:w-96">
          <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 h-full">
            <h2 className="text-lg font-semibold text-gray-300 mb-4">UP NEXT</h2>

            {state.upNextRoutines.length > 0 ? (
              <div className="space-y-4">
                {state.upNextRoutines.map((routine, index) => (
                  <div
                    key={routine.id}
                    className={`p-4 rounded-xl border transition-all ${
                      index === 0
                        ? 'bg-purple-900/30 border-purple-500/40'
                        : 'bg-gray-700/30 border-gray-600/30'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-2xl font-bold text-white">
                          #{routine.entryNumber}
                        </div>
                        <div className="text-lg font-medium text-gray-200 mt-1">
                          {routine.title}
                        </div>
                        <div className="text-sm text-gray-400">
                          {routine.studioName}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <span className="px-2 py-0.5 bg-gray-600/50 rounded text-xs text-gray-300">
                            {routine.category}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-600/50 rounded text-xs text-gray-300">
                            {formatDuration(routine.durationMs)}
                          </span>
                        </div>
                      </div>

                      {/* MP3 Status */}
                      <div className={`px-2 py-1 rounded text-xs ${routine.mp3Downloaded ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {routine.mp3Downloaded ? 'Ready' : 'Downloading...'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-gray-500">
                No upcoming routines
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Hidden audio element for future use */}
      <audio ref={audioRef} />
    </div>
  );
}
