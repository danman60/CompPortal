'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { MP3DownloadPanel } from '@/components/audio/MP3DownloadPanel';
import { HardDrive, X } from 'lucide-react';

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

export default function BackstagePage() {
  const [data, setData] = useState<BackstageData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showAudioPanel, setShowAudioPanel] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'syncing' | 'error'>('syncing');

  const fetchData = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const response = await fetch('/api/backstage');
      if (response.ok) {
        const newData = await response.json();
        setData(newData);
        setLastSyncTime(new Date());
        setSyncStatus('connected');
        if (newData.currentRoutine?.startedAt) {
          const startTime = new Date(newData.currentRoutine.startedAt).getTime();
          const serverTime = newData.serverTime ? new Date(newData.serverTime).getTime() : Date.now();
          const elapsed = serverTime - startTime;
          const remaining = Math.max(0, newData.currentRoutine.durationMs - elapsed);
          setTimeRemaining(remaining);
        } else {
          setTimeRemaining(0);
        }
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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-4xl">Loading...</div>
      </div>
    );
  }

  if (!data?.isActive) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-8">
        {/* Audio Panel Toggle - available even when not active */}
        <button
          onClick={() => setShowAudioPanel(!showAudioPanel)}
          className="fixed top-2 right-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white z-50 flex items-center gap-1.5"
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

        <div className="text-gray-400 text-4xl mb-4">Competition Not Active</div>
        {data?.competitionName && (
          <div className="text-gray-500 text-2xl">{data.competitionName}</div>
        )}
        <div className="mt-8 text-gray-600 text-xl">Waiting for competition to start...</div>
      </div>
    );
  }

  const progressPercent = data.currentRoutine
    ? Math.min(100, ((data.currentRoutine.durationMs - timeRemaining) / data.currentRoutine.durationMs) * 100)
    : 0;
  const isLowTime = timeRemaining > 0 && timeRemaining < 30000;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Back to Test Page link */}
      <Link
        href="/game-day-test"
        className="fixed top-2 left-2 px-2 py-1 bg-yellow-600 hover:bg-yellow-500 rounded text-xs text-white z-50"
      >
        Test Page
      </Link>

      {/* Audio Panel Toggle */}
      <button
        onClick={() => setShowAudioPanel(!showAudioPanel)}
        className="fixed top-2 right-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs text-white z-50 flex items-center gap-1.5"
      >
        <HardDrive className="w-3.5 h-3.5" />
        {showAudioPanel ? 'Hide Audio' : 'Audio Files'}
      </button>

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

      <div className="bg-gray-800 p-4 border-b border-gray-700">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className={'w-3 h-3 rounded-full ' + getSyncStatusColor()} title={syncStatus} />
            <span className="text-gray-500 text-xs">{formatSyncTime(lastSyncTime)}</span>
          </div>
          <div className="text-center flex-1">
            <h1 className="text-2xl font-bold text-gray-300">{data.competitionName || 'Competition'}</h1>
            <div className="text-gray-500 text-sm">Backstage Monitor</div>
          </div>
          <div className="w-24" />
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {data.currentRoutine ? (
          <>
            <div className="text-blue-400 text-2xl font-semibold mb-4 tracking-wider">NOW PERFORMING</div>
            <div className="text-gray-400 text-4xl mb-2">Entry #{data.currentRoutine.entryNumber}</div>
            <div className="text-white text-6xl md:text-8xl font-bold text-center mb-4 max-w-full px-4">
              {data.currentRoutine.routineName}
            </div>
            <div className="text-gray-300 text-3xl md:text-4xl mb-8">{data.currentRoutine.studioName}</div>
            <div className="text-gray-500 text-xl mb-12">
              {data.currentRoutine.category} | {data.currentRoutine.ageGroup}
            </div>
            <div className="relative w-full max-w-2xl mb-8">
              <div className="h-4 bg-gray-700 rounded-full overflow-hidden mb-4">
                <div
                  className={"h-full transition-all duration-100 " + (isLowTime ? 'bg-red-500' : 'bg-blue-500')}
                  style={{ width: progressPercent + '%' }}
                />
              </div>
              <div className="text-center">
                <div className="text-gray-400 text-xl mb-2">TIME REMAINING</div>
                <div className={"text-9xl md:text-[12rem] font-mono font-bold tabular-nums " + (isLowTime ? 'text-red-400 animate-pulse' : 'text-white')}>
                  {formatTime(timeRemaining)}
                </div>
                <div className="text-gray-500 text-lg mt-2">of {formatDuration(data.currentRoutine.durationMs)}</div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-gray-400 text-4xl">No routine currently performing</div>
        )}
      </div>

      {(data.upcomingRoutines?.length ?? 0) > 0 && (
        <div className="bg-gray-800 border-t border-gray-700 p-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-yellow-400 text-lg font-semibold tracking-wider mb-4">COMING UP</div>
            <div className="space-y-3">
              {data.upcomingRoutines?.map((routine, index) => (
                <div
                  key={routine.id}
                  className={'flex items-center justify-between p-4 rounded-lg ' + (index === 0 ? 'bg-gray-700' : 'bg-gray-750 bg-opacity-50')}
                >
                  <div className="flex items-center gap-4">
                    <div className={'text-2xl font-bold ' + (index === 0 ? 'text-yellow-400' : 'text-gray-500')}>
                      {index === 0 ? 'NEXT' : index + 1}
                    </div>
                    <div>
                      <div className={'font-bold ' + (index === 0 ? 'text-white text-xl' : 'text-gray-300 text-lg')}>
                        #{routine.entryNumber} - {routine.routineName}
                      </div>
                      <div className="text-gray-400 text-sm">{routine.studioName}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-gray-500 text-sm">{routine.category} | {routine.ageGroup}</div>
                    <div className="text-gray-600 text-xs">{formatDuration(routine.durationMs)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-900 p-2 text-center text-gray-600 text-sm border-t border-gray-800">
        Auto-refreshing | {data.competitionDay}
      </div>
    </div>
  );
}
