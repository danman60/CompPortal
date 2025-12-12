'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  MP3DownloadManager,
  MP3FileRecord,
  DownloadProgress,
  DownloadResult,
  getAllRecords,
  getDownloadStats,
  clearAllRecords,
} from './mp3-storage';

export interface UseMP3DownloadState {
  // Status
  isInitialized: boolean;
  isDownloading: boolean;
  isVerifying: boolean;

  // Counts
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  pendingFiles: number;

  // Progress
  progress: DownloadProgress | null;
  currentFile: string | null;

  // Data
  files: MP3FileRecord[];
  failedFilesList: MP3FileRecord[];

  // Errors
  lastError: string | null;
}

export interface UseMP3DownloadActions {
  // Initialization
  fetchManifest: (competitionId?: string, day?: string) => Promise<void>;
  clearCache: () => Promise<void>;

  // Download control
  startDownload: () => Promise<{ successful: number; failed: number }>;
  cancelDownload: () => void;
  retryFailed: () => Promise<{ successful: number; failed: number }>;

  // Verification
  verifyFiles: () => Promise<{ verified: number; failed: number; errors: string[] }>;

  // Refresh
  refreshStats: () => Promise<void>;
}

const initialState: UseMP3DownloadState = {
  isInitialized: false,
  isDownloading: false,
  isVerifying: false,
  totalFiles: 0,
  completedFiles: 0,
  failedFiles: 0,
  pendingFiles: 0,
  progress: null,
  currentFile: null,
  files: [],
  failedFilesList: [],
  lastError: null,
};

export function useMP3Download(): UseMP3DownloadState & UseMP3DownloadActions {
  const [state, setState] = useState<UseMP3DownloadState>(initialState);
  const [downloadManager] = useState(() => new MP3DownloadManager());

  // Update state helper
  const updateState = useCallback((updates: Partial<UseMP3DownloadState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Refresh stats from IndexedDB
  const refreshStats = useCallback(async () => {
    try {
      const stats = await getDownloadStats();
      const files = await getAllRecords();
      const failedFilesList = files.filter((f) => f.status === 'failed');

      updateState({
        totalFiles: stats.total,
        completedFiles: stats.complete,
        failedFiles: stats.failed,
        pendingFiles: stats.pending,
        files,
        failedFilesList,
      });
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  }, [updateState]);

  // Fetch manifest from API and initialize download manager
  const fetchManifest = useCallback(
    async (competitionId?: string, day?: string) => {
      try {
        updateState({ lastError: null });

        const params = new URLSearchParams();
        if (competitionId) params.set('competitionId', competitionId);
        if (day) params.set('day', day);

        const url = `/api/audio/manifest${params.toString() ? `?${params}` : ''}`;
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch manifest: ${response.statusText}`);
        }

        const manifest = await response.json();

        // Initialize download manager with manifest
        await downloadManager.initializeFromManifest(manifest);

        // Refresh stats
        await refreshStats();

        updateState({ isInitialized: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        updateState({ lastError: errorMessage });
        console.error('Failed to fetch manifest:', error);
      }
    },
    [downloadManager, refreshStats, updateState]
  );

  // Clear all cached files
  const clearCache = useCallback(async () => {
    try {
      await clearAllRecords();
      await refreshStats();
      updateState({ isInitialized: false });
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }, [refreshStats, updateState]);

  // Start downloading files
  const startDownload = useCallback(async () => {
    if (downloadManager.isInProgress()) {
      return { successful: 0, failed: 0 };
    }

    updateState({ isDownloading: true, lastError: null });

    try {
      const result = await downloadManager.startDownload(
        // Progress callback
        (progress: DownloadProgress) => {
          updateState({
            progress,
            completedFiles: progress.completedFiles,
            failedFiles: progress.failedFiles,
            pendingFiles: progress.pendingFiles,
            currentFile: progress.currentFile,
          });
        },
        // File complete callback
        async (result: DownloadResult) => {
          // Refresh stats after each file
          await refreshStats();
        }
      );

      await refreshStats();
      updateState({ isDownloading: false, progress: null, currentFile: null });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateState({ isDownloading: false, lastError: errorMessage });
      return { successful: 0, failed: 0 };
    }
  }, [downloadManager, refreshStats, updateState]);

  // Cancel ongoing download
  const cancelDownload = useCallback(() => {
    downloadManager.cancelDownload();
    updateState({ isDownloading: false });
  }, [downloadManager, updateState]);

  // Retry failed downloads
  const retryFailed = useCallback(async () => {
    updateState({ isDownloading: true, lastError: null });

    try {
      const result = await downloadManager.retryFailed();
      await refreshStats();
      updateState({ isDownloading: false });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateState({ isDownloading: false, lastError: errorMessage });
      return { successful: 0, failed: 0 };
    }
  }, [downloadManager, refreshStats, updateState]);

  // Verify all downloaded files
  const verifyFiles = useCallback(async () => {
    updateState({ isVerifying: true, lastError: null });

    try {
      const result = await downloadManager.verifyAllFiles();
      await refreshStats();
      updateState({ isVerifying: false });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateState({ isVerifying: false, lastError: errorMessage });
      return { verified: 0, failed: 0, errors: [errorMessage] };
    }
  }, [downloadManager, refreshStats, updateState]);

  // Load initial stats on mount
  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  return {
    ...state,
    fetchManifest,
    clearCache,
    startDownload,
    cancelDownload,
    retryFailed,
    verifyFiles,
    refreshStats,
  };
}
