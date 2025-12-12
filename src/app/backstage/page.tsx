'use client';

import { useEffect, useState, useCallback } from 'react';

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

interface BackstageData {
  currentRoutine: RoutineInfo | null;
  nextRoutine: Omit<RoutineInfo, 'startedAt' | 'state'> | null;
  competitionName: string | null;
  competitionDay?: string;
  isActive: boolean;
  serverTime?: string;
}

export default function BackstagePage() {
  const [data, setData] = useState<BackstageData | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/backstage');
      if (response.ok) {
        const newData = await response.json();
        setData(newData);
        if (newData.currentRoutine?.startedAt) {
          const startTime = new Date(newData.currentRoutine.startedAt).getTime();
          const serverTime = newData.serverTime ? new Date(newData.serverTime).getTime() : Date.now();
          const elapsed = serverTime - startTime;
          const remaining = Math.max(0, newData.currentRoutine.durationMs - elapsed);
          setTimeRemaining(remaining);
        } else {
          setTimeRemaining(0);
        }
      }
    } catch (error) {
      console.error('Failed to fetch backstage data:', error);
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
      <div className="bg-gray-800 p-4 text-center border-b border-gray-700">
        <h1 className="text-2xl font-bold text-gray-300">{data.competitionName || 'Competition'}</h1>
        <div className="text-gray-500 text-sm">Backstage Monitor</div>
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

      {data.nextRoutine && (
        <div className="bg-gray-800 border-t border-gray-700 p-8">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div>
              <div className="text-yellow-400 text-xl font-semibold tracking-wider mb-2">UP NEXT</div>
              <div className="text-white text-3xl md:text-4xl font-bold">
                #{data.nextRoutine.entryNumber} - {data.nextRoutine.routineName}
              </div>
              <div className="text-gray-400 text-xl mt-1">{data.nextRoutine.studioName}</div>
            </div>
            <div className="text-right">
              <div className="text-gray-500 text-lg">{data.nextRoutine.category}</div>
              <div className="text-gray-500 text-lg">{data.nextRoutine.ageGroup}</div>
              <div className="text-gray-600 text-sm mt-1">Duration: {formatDuration(data.nextRoutine.durationMs)}</div>
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
