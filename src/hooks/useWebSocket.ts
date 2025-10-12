/**
 * React Hook for WebSocket Connection
 * Easy integration of real-time updates in components
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { WSEvent, WSPayload } from '@/lib/websocket-types';
import { logger } from '@/lib/logger';

export interface UseWebSocketOptions {
  competitionId: string;
  userId: string;
  role: 'director' | 'judge' | 'viewer';
  token?: string;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

export interface UseWebSocketReturn {
  socket: Socket | null;
  connected: boolean;
  error: string | null;
  emit: (event: WSEvent, payload: any) => void;
  on: (event: WSEvent, handler: (payload: any) => void) => void;
  off: (event: WSEvent, handler: (payload: any) => void) => void;
}

/**
 * Hook to connect to WebSocket server
 */
export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Don't connect if already connected
    if (socketRef.current) {
      return;
    }

    // Determine socket URL
    const socketUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create socket connection
    const newSocket = io(socketUrl, {
      path: '/api/socket',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected');
      setConnected(true);
      setError(null);

      // Authenticate
      newSocket.emit('authenticate', {
        userId: options.userId,
        competitionId: options.competitionId,
        role: options.role,
        token: options.token || 'dev-token', // TODO: Use real JWT
      });

      options.onConnect?.();
    });

    newSocket.on('authenticated', (data: { success: boolean; competitionId: string; role: string }) => {
      console.log('✅ WebSocket authenticated', data);
    });

    newSocket.on('disconnect', (reason: string) => {
      console.log('🔌 WebSocket disconnected:', reason);
      setConnected(false);

      options.onDisconnect?.();
    });

    newSocket.on('connect_error', (err: Error) => {
      logger.error('WebSocket connection error', { error: err });
      setError(err.message);
      setConnected(false);

      options.onError?.(err);
    });

    newSocket.on('error', (err: any) => {
      logger.error('WebSocket error', { error: err instanceof Error ? err : new Error(String(err)) });
      setError(err.message || 'WebSocket error');

      options.onError?.(err);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        console.log('🔌 Closing WebSocket connection');
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setConnected(false);
      }
    };
  }, [options.competitionId, options.userId, options.role]); // Reconnect if these change

  /**
   * Emit event to server
   */
  const emit = useCallback((event: WSEvent, payload: any) => {
    if (!socketRef.current || !connected) {
      console.warn('Cannot emit - WebSocket not connected');
      return;
    }

    socketRef.current.emit(event, payload);
  }, [connected]);

  /**
   * Subscribe to event
   */
  const on = useCallback((event: WSEvent, handler: (payload: any) => void) => {
    if (!socketRef.current) {
      console.warn('Cannot subscribe - WebSocket not initialized');
      return;
    }

    socketRef.current.on(event, handler);
  }, []);

  /**
   * Unsubscribe from event
   */
  const off = useCallback((event: WSEvent, handler: (payload: any) => void) => {
    if (!socketRef.current) {
      return;
    }

    socketRef.current.off(event, handler);
  }, []);

  return {
    socket,
    connected,
    error,
    emit,
    on,
    off,
  };
}

/**
 * Hook for judge scoring interface
 */
export function useJudgeSocket(competitionId: string, judgeId: string, judgeName?: string) {
  const ws = useWebSocket({
    competitionId,
    userId: judgeId,
    role: 'judge',
  });

  const displayName = judgeName || 'Judge';

  const submitScore = useCallback((routineId: string, score: number, notes?: string) => {
    ws.emit(WSEvent.SCORE_SUBMITTED, {
      routineId,
      judgeId,
      judgeName: displayName,
      score,
      notes,
    });
  }, [ws, judgeId, displayName]);

  const setReady = useCallback((ready: boolean) => {
    ws.emit(ready ? WSEvent.JUDGE_READY : WSEvent.JUDGE_NOT_READY, {
      judgeId,
      judgeName: displayName,
      ready,
      connected: ws.connected,
    });
  }, [ws, judgeId, displayName]);

  return {
    ...ws,
    submitScore,
    setReady,
  };
}

/**
 * Hook for competition director control panel
 */
export function useDirectorSocket(competitionId: string, directorId: string) {
  const ws = useWebSocket({
    competitionId,
    userId: directorId,
    role: 'director',
  });

  const sendCommand = useCallback((command: 'next' | 'previous' | 'pause' | 'resume' | 'skip', routineId?: string) => {
    ws.emit(WSEvent.DIRECTOR_COMMAND, {
      command,
      routineId,
    });
  }, [ws]);

  const setCurrentRoutine = useCallback((routine: any) => {
    ws.emit(WSEvent.ROUTINE_CURRENT, {
      routineId: routine.id,
      title: routine.title,
      studioName: routine.studio?.name || 'Unknown',
      dancers: routine.dancers || [],
      category: routine.category,
      duration: routine.duration || 180,
      state: 'current',
      order: routine.order || 0,
    });
  }, [ws]);

  const markRoutineCompleted = useCallback((routine: any) => {
    ws.emit(WSEvent.ROUTINE_COMPLETED, {
      routineId: routine.id,
      title: routine.title,
      studioName: routine.studio?.name || 'Unknown',
      dancers: routine.dancers || [],
      category: routine.category,
      duration: routine.duration || 180,
      state: 'completed',
      order: routine.order || 0,
    });
  }, [ws]);

  const startBreak = useCallback((duration: number, reason: string) => {
    ws.emit(WSEvent.BREAK_START, {
      duration,
      reason,
    });
  }, [ws]);

  const endBreak = useCallback(() => {
    ws.emit(WSEvent.BREAK_END, {});
  }, [ws]);

  return {
    ...ws,
    sendCommand,
    setCurrentRoutine,
    markRoutineCompleted,
    startBreak,
    endBreak,
  };
}
