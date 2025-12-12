'use client';

/**
 * MP3 Player Component
 *
 * Web Audio API-based MP3 player for Game Day backstage playback.
 *
 * Features:
 * - Web Audio API for high-quality playback
 * - Duration extraction from audio metadata
 * - Real-time progress bar with countdown
 * - Event callbacks (onPlay, onPause, onStop, onEnd)
 * - Position sync for WebSocket broadcast
 */

import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, Square, Volume2, VolumeX, RotateCcw } from 'lucide-react';

export interface MP3PlayerProps {
  /** URL of the MP3 file to play */
  src?: string;
  /** Auto-play when src changes */
  autoPlay?: boolean;
  /** Initial volume (0-1) */
  initialVolume?: number;
  /** Show controls */
  showControls?: boolean;
  /** Show progress bar */
  showProgress?: boolean;
  /** Show time display */
  showTime?: boolean;
  /** Custom class for container */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';

  // Event callbacks
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onEnd?: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onDurationChange?: (duration: number) => void;
  onError?: (error: Error) => void;
  onLoadStart?: () => void;
  onLoaded?: () => void;
}

export interface MP3PlayerHandle {
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  isPlaying: () => boolean;
}

interface AudioState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isLoading: boolean;
  isLoaded: boolean;
  error: string | null;
}

const MP3Player = forwardRef<MP3PlayerHandle, MP3PlayerProps>(
  (
    {
      src,
      autoPlay = false,
      initialVolume = 1,
      showControls = true,
      showProgress = true,
      showTime = true,
      className = '',
      size = 'md',
      onPlay,
      onPause,
      onStop,
      onEnd,
      onTimeUpdate,
      onDurationChange,
      onError,
      onLoadStart,
      onLoaded,
    },
    ref
  ) => {
    // Audio context and nodes
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioElementRef = useRef<HTMLAudioElement | null>(null);
    const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    // State
    const [state, setState] = useState<AudioState>({
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      duration: 0,
      volume: initialVolume,
      isMuted: false,
      isLoading: false,
      isLoaded: false,
      error: null,
    });

    // Initialize Web Audio API context
    const initAudioContext = useCallback(() => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      return audioContextRef.current;
    }, []);

    // Connect audio element to Web Audio API
    const connectAudioNodes = useCallback(() => {
      const audioContext = initAudioContext();
      const audioElement = audioElementRef.current;

      if (!audioElement || sourceNodeRef.current) return;

      // Create nodes
      sourceNodeRef.current = audioContext.createMediaElementSource(audioElement);
      gainNodeRef.current = audioContext.createGain();

      // Connect: source -> gain -> destination
      sourceNodeRef.current.connect(gainNodeRef.current);
      gainNodeRef.current.connect(audioContext.destination);

      // Set initial volume
      gainNodeRef.current.gain.value = state.volume;
    }, [initAudioContext, state.volume]);

    // Update time display with animation frame
    const updateTime = useCallback(() => {
      const audioElement = audioElementRef.current;
      if (!audioElement) return;

      const currentTime = audioElement.currentTime;
      const duration = audioElement.duration || 0;

      setState((prev) => ({
        ...prev,
        currentTime,
        duration,
      }));

      onTimeUpdate?.(currentTime, duration);

      if (state.isPlaying) {
        animationFrameRef.current = requestAnimationFrame(updateTime);
      }
    }, [state.isPlaying, onTimeUpdate]);

    // Start animation frame loop when playing
    useEffect(() => {
      if (state.isPlaying) {
        animationFrameRef.current = requestAnimationFrame(updateTime);
      } else if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }, [state.isPlaying, updateTime]);

    // Load audio when src changes
    useEffect(() => {
      if (!src) {
        setState((prev) => ({
          ...prev,
          isLoaded: false,
          duration: 0,
          currentTime: 0,
          error: null,
        }));
        return;
      }

      const audioElement = audioElementRef.current;
      if (!audioElement) return;

      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      onLoadStart?.();

      audioElement.src = src;
      audioElement.load();
    }, [src, onLoadStart]);

    // Set up audio element event listeners
    useEffect(() => {
      const audioElement = audioElementRef.current;
      if (!audioElement) return;

      const handleLoadedMetadata = () => {
        const duration = audioElement.duration;
        setState((prev) => ({
          ...prev,
          duration,
          isLoading: false,
          isLoaded: true,
        }));
        onDurationChange?.(duration);
        onLoaded?.();

        // Connect to Web Audio API after metadata is loaded
        connectAudioNodes();

        if (autoPlay) {
          play();
        }
      };

      const handleEnded = () => {
        setState((prev) => ({
          ...prev,
          isPlaying: false,
          isPaused: false,
          currentTime: 0,
        }));
        onEnd?.();
      };

      const handleError = (e: Event) => {
        const error = new Error('Failed to load audio file');
        setState((prev) => ({
          ...prev,
          isLoading: false,
          isLoaded: false,
          error: error.message,
        }));
        onError?.(error);
      };

      audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.addEventListener('ended', handleEnded);
      audioElement.addEventListener('error', handleError);

      return () => {
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioElement.removeEventListener('ended', handleEnded);
        audioElement.removeEventListener('error', handleError);
      };
    }, [autoPlay, connectAudioNodes, onDurationChange, onEnd, onError, onLoaded]);

    // Playback controls
    const play = useCallback(async () => {
      const audioContext = audioContextRef.current;
      const audioElement = audioElementRef.current;

      if (!audioElement) return;

      // Resume audio context if suspended (browser autoplay policy)
      if (audioContext?.state === 'suspended') {
        await audioContext.resume();
      }

      try {
        await audioElement.play();
        setState((prev) => ({ ...prev, isPlaying: true, isPaused: false }));
        onPlay?.();
      } catch (error) {
        console.error('Playback failed:', error);
        onError?.(error instanceof Error ? error : new Error('Playback failed'));
      }
    }, [onPlay, onError]);

    const pause = useCallback(() => {
      const audioElement = audioElementRef.current;
      if (!audioElement) return;

      audioElement.pause();
      setState((prev) => ({ ...prev, isPlaying: false, isPaused: true }));
      onPause?.();
    }, [onPause]);

    const stop = useCallback(() => {
      const audioElement = audioElementRef.current;
      if (!audioElement) return;

      audioElement.pause();
      audioElement.currentTime = 0;
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
      }));
      onStop?.();
    }, [onStop]);

    const seek = useCallback((time: number) => {
      const audioElement = audioElementRef.current;
      if (!audioElement) return;

      audioElement.currentTime = Math.max(0, Math.min(time, audioElement.duration || 0));
      setState((prev) => ({ ...prev, currentTime: audioElement.currentTime }));
    }, []);

    const setVolume = useCallback((volume: number) => {
      const clampedVolume = Math.max(0, Math.min(1, volume));
      const audioElement = audioElementRef.current;
      const gainNode = gainNodeRef.current;

      if (audioElement) {
        audioElement.volume = clampedVolume;
      }
      if (gainNode) {
        gainNode.gain.value = clampedVolume;
      }

      setState((prev) => ({
        ...prev,
        volume: clampedVolume,
        isMuted: clampedVolume === 0,
      }));
    }, []);

    const toggleMute = useCallback(() => {
      if (state.isMuted) {
        setVolume(state.volume || 0.5);
      } else {
        setVolume(0);
      }
    }, [state.isMuted, state.volume, setVolume]);

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        play,
        pause,
        stop,
        seek,
        setVolume,
        getCurrentTime: () => audioElementRef.current?.currentTime || 0,
        getDuration: () => audioElementRef.current?.duration || 0,
        isPlaying: () => state.isPlaying,
      }),
      [play, pause, stop, seek, setVolume, state.isPlaying]
    );

    // Format time as MM:SS
    const formatTime = (seconds: number): string => {
      if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate remaining time
    const remainingTime = state.duration - state.currentTime;
    const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

    // Size-based classes
    const sizeClasses = {
      sm: {
        container: 'p-2',
        button: 'p-1.5',
        icon: 'w-4 h-4',
        text: 'text-xs',
        progress: 'h-1.5',
      },
      md: {
        container: 'p-4',
        button: 'p-2',
        icon: 'w-5 h-5',
        text: 'text-sm',
        progress: 'h-2',
      },
      lg: {
        container: 'p-6',
        button: 'p-3',
        icon: 'w-6 h-6',
        text: 'text-base',
        progress: 'h-3',
      },
    };

    const sizes = sizeClasses[size];

    return (
      <div className={`${sizes.container} ${className}`}>
        {/* Hidden audio element */}
        <audio ref={audioElementRef} preload="metadata" crossOrigin="anonymous" />

        {/* Error display */}
        {state.error && (
          <div className="text-red-500 text-sm mb-2 p-2 bg-red-500/10 rounded">
            {state.error}
          </div>
        )}

        {/* Loading indicator */}
        {state.isLoading && (
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <div className="animate-spin w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full" />
            <span className={sizes.text}>Loading...</span>
          </div>
        )}

        {/* Progress bar */}
        {showProgress && state.isLoaded && (
          <div className="mb-3">
            <div
              className={`bg-gray-700 rounded-full overflow-hidden cursor-pointer ${sizes.progress}`}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                seek(percent * state.duration);
              }}
            >
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-100"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Time display */}
            {showTime && (
              <div className={`flex justify-between mt-1 text-gray-400 ${sizes.text}`}>
                <span>{formatTime(state.currentTime)}</span>
                <span className="text-gray-500">-{formatTime(remainingTime)}</span>
                <span>{formatTime(state.duration)}</span>
              </div>
            )}
          </div>
        )}

        {/* Controls */}
        {showControls && (
          <div className="flex items-center justify-center gap-2">
            {/* Play/Pause */}
            <button
              onClick={state.isPlaying ? pause : play}
              disabled={!state.isLoaded}
              className={`rounded-full transition-all duration-200 ${sizes.button} ${
                state.isPlaying
                  ? 'bg-yellow-500 hover:bg-yellow-400 text-black'
                  : 'bg-green-500 hover:bg-green-400 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={state.isPlaying ? 'Pause' : 'Play'}
            >
              {state.isPlaying ? (
                <Pause className={sizes.icon} />
              ) : (
                <Play className={sizes.icon} />
              )}
            </button>

            {/* Stop */}
            <button
              onClick={stop}
              disabled={!state.isLoaded}
              className={`rounded-full bg-red-500 hover:bg-red-400 text-white transition-colors ${sizes.button} disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Stop"
            >
              <Square className={sizes.icon} />
            </button>

            {/* Restart */}
            <button
              onClick={() => {
                seek(0);
                play();
              }}
              disabled={!state.isLoaded}
              className={`rounded-full bg-gray-600 hover:bg-gray-500 text-white transition-colors ${sizes.button} disabled:opacity-50 disabled:cursor-not-allowed`}
              title="Restart"
            >
              <RotateCcw className={sizes.icon} />
            </button>

            {/* Volume */}
            <button
              onClick={toggleMute}
              className={`rounded-full transition-colors ${sizes.button} ${
                state.isMuted ? 'bg-gray-600 text-gray-400' : 'bg-gray-700 text-white'
              }`}
              title={state.isMuted ? 'Unmute' : 'Mute'}
            >
              {state.isMuted ? (
                <VolumeX className={sizes.icon} />
              ) : (
                <Volume2 className={sizes.icon} />
              )}
            </button>

            {/* Volume slider */}
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={state.isMuted ? 0 : state.volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              title={`Volume: ${Math.round(state.volume * 100)}%`}
            />
          </div>
        )}
      </div>
    );
  }
);

MP3Player.displayName = 'MP3Player';

export default MP3Player;
