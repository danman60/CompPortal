'use client';

/**
 * MP3 Download Manager Component
 *
 * UI for bulk downloading and managing offline MP3 storage for Game Day.
 *
 * Features:
 * - Progress bar for bulk downloads
 * - Storage quota display
 * - File list with download status
 * - Last-minute loader for day-of submissions
 * - Offline indicator
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Download,
  HardDrive,
  Wifi,
  WifiOff,
  RefreshCw,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Music,
  FolderDown,
} from 'lucide-react';
import { mp3Storage, StorageStats } from '@/lib/mp3-storage';
import { createClient } from '@/lib/supabase';

interface MP3FileInfo {
  entryId: string;
  entryNumber: number;
  title: string;
  studioName: string;
  filePath: string;
  competitionId: string;
  studioId?: string;
}

interface DownloadManagerProps {
  competitionId: string;
  files: MP3FileInfo[];
  bucketName?: string;
  onDownloadComplete?: () => void;
  className?: string;
}

type DownloadStatus = 'pending' | 'downloading' | 'complete' | 'error';

interface FileDownloadState {
  entryId: string;
  status: DownloadStatus;
  error?: string;
}

export default function MP3DownloadManager({
  competitionId,
  files,
  bucketName = 'music',
  onDownloadComplete,
  className = '',
}: DownloadManagerProps) {
  // State
  const [isOnline, setIsOnline] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ completed: 0, total: 0 });
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [downloadedFiles, setDownloadedFiles] = useState<Set<string>>(new Set());
  const [fileStates, setFileStates] = useState<Map<string, FileDownloadState>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Initialize storage and check existing files
  const initializeStorage = useCallback(async () => {
    try {
      await mp3Storage.init();

      // Set up Supabase client
      const supabase = createClient();
      mp3Storage.setSupabaseClient(supabase);

      // Check which files are already downloaded
      const existingFiles = await mp3Storage.getCompetitionFiles(competitionId);
      const existingEntryIds = new Set(existingFiles.map((f) => f.entryId));
      setDownloadedFiles(existingEntryIds);

      // Initialize file states
      const states = new Map<string, FileDownloadState>();
      files.forEach((file) => {
        states.set(file.entryId, {
          entryId: file.entryId,
          status: existingEntryIds.has(file.entryId) ? 'complete' : 'pending',
        });
      });
      setFileStates(states);

      // Get storage stats
      const stats = await mp3Storage.getStorageStats();
      setStorageStats(stats);

      setIsInitialized(true);
    } catch (err) {
      console.error('Failed to initialize MP3 storage:', err);
      setError('Failed to initialize offline storage');
    }
  }, [competitionId, files]);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize on mount
  useEffect(() => {
    initializeStorage();
  }, [initializeStorage]);

  // Start bulk download
  const startBulkDownload = async () => {
    if (!isOnline) {
      setError('Cannot download while offline');
      return;
    }

    setIsDownloading(true);
    setError(null);

    // Get files that need downloading
    const filesToDownload = files.filter(
      (f) => fileStates.get(f.entryId)?.status !== 'complete'
    );

    if (filesToDownload.length === 0) {
      setIsDownloading(false);
      return;
    }

    setDownloadProgress({ completed: 0, total: filesToDownload.length });

    // Update states to downloading
    setFileStates((prev) => {
      const next = new Map(prev);
      filesToDownload.forEach((f) => {
        next.set(f.entryId, { entryId: f.entryId, status: 'downloading' });
      });
      return next;
    });

    try {
      const result = await mp3Storage.bulkDownload(
        bucketName,
        filesToDownload.map((f) => ({
          filePath: f.filePath,
          entryId: f.entryId,
          competitionId,
          studioId: f.studioId,
        })),
        (completed, total, currentFileName, errorMsg) => {
          setDownloadProgress({ completed, total });
          setCurrentFile(currentFileName);

          // Update file state
          const fileInfo = filesToDownload.find((f) => f.filePath === currentFileName);
          if (fileInfo) {
            setFileStates((prev) => {
              const next = new Map(prev);
              next.set(fileInfo.entryId, {
                entryId: fileInfo.entryId,
                status: errorMsg ? 'error' : 'complete',
                error: errorMsg,
              });
              return next;
            });

            if (!errorMsg) {
              setDownloadedFiles((prev) => new Set([...prev, fileInfo.entryId]));
            }
          }
        },
        3 // Concurrency
      );

      // Update storage stats
      const stats = await mp3Storage.getStorageStats();
      setStorageStats(stats);

      if (result.failed.length > 0) {
        setError(`${result.failed.length} file(s) failed to download`);
      }

      onDownloadComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setIsDownloading(false);
      setCurrentFile(null);
    }
  };

  // Download single file (for last-minute uploads)
  const downloadSingleFile = async (file: MP3FileInfo) => {
    if (!isOnline) {
      setError('Cannot download while offline');
      return;
    }

    setFileStates((prev) => {
      const next = new Map(prev);
      next.set(file.entryId, { entryId: file.entryId, status: 'downloading' });
      return next;
    });

    try {
      const success = await mp3Storage.downloadFile(
        bucketName,
        file.filePath,
        file.entryId,
        competitionId,
        file.studioId
      );

      setFileStates((prev) => {
        const next = new Map(prev);
        next.set(file.entryId, {
          entryId: file.entryId,
          status: success ? 'complete' : 'error',
          error: success ? undefined : 'Download failed',
        });
        return next;
      });

      if (success) {
        setDownloadedFiles((prev) => new Set([...prev, file.entryId]));
        const stats = await mp3Storage.getStorageStats();
        setStorageStats(stats);
      }
    } catch (err) {
      setFileStates((prev) => {
        const next = new Map(prev);
        next.set(file.entryId, {
          entryId: file.entryId,
          status: 'error',
          error: err instanceof Error ? err.message : 'Download failed',
        });
        return next;
      });
    }
  };

  // Clear all downloaded files
  const clearAllFiles = async () => {
    if (isDownloading) return;

    try {
      await mp3Storage.deleteCompetitionFiles(competitionId);
      setDownloadedFiles(new Set());
      setFileStates((prev) => {
        const next = new Map(prev);
        prev.forEach((_, key) => {
          next.set(key, { entryId: key, status: 'pending' });
        });
        return next;
      });
      const stats = await mp3Storage.getStorageStats();
      setStorageStats(stats);
    } catch (err) {
      setError('Failed to clear files');
    }
  };

  // Calculate progress percentage
  const progressPercent =
    downloadProgress.total > 0
      ? (downloadProgress.completed / downloadProgress.total) * 100
      : 0;

  // Count files by status
  const downloadedCount = downloadedFiles.size;
  const pendingCount = files.length - downloadedCount;

  // Status icon for file
  const getStatusIcon = (status: DownloadStatus) => {
    switch (status) {
      case 'complete':
        return <Check className="w-4 h-4 text-green-400" />;
      case 'downloading':
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Download className="w-4 h-4 text-gray-500" />;
    }
  };

  if (!isInitialized) {
    return (
      <div className={`p-6 bg-gray-800 rounded-xl ${className}`}>
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Initializing offline storage...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-gray-800 rounded-xl border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderDown className="w-6 h-6 text-purple-400" />
            <h2 className="text-lg font-semibold text-white">MP3 Download Manager</h2>
          </div>

          {/* Online Status */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
              isOnline
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            }`}
          >
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Storage Stats */}
      {storageStats && (
        <div className="p-4 border-b border-gray-700 bg-gray-750">
          <div className="flex items-center gap-4">
            <HardDrive className="w-5 h-5 text-gray-400" />
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">
                  {storageStats.totalFiles} files ({formatBytes(storageStats.totalBytes)})
                </span>
                <span className="text-gray-500">
                  {formatBytes(storageStats.availableBytes)} available
                </span>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500"
                  style={{
                    width: `${Math.min(
                      (storageStats.usedBytes /
                        (storageStats.usedBytes + storageStats.availableBytes)) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress (when downloading) */}
      {isDownloading && (
        <div className="p-4 border-b border-gray-700 bg-blue-500/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-blue-300">
              Downloading {downloadProgress.completed}/{downloadProgress.total}...
            </span>
            <span className="text-sm text-blue-400">{Math.round(progressPercent)}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {currentFile && (
            <p className="text-xs text-gray-400 truncate">
              <Music className="w-3 h-3 inline mr-1" />
              {currentFile}
            </p>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-500/10 border-b border-red-500/20">
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={startBulkDownload}
            disabled={isDownloading || !isOnline || pendingCount === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Download All ({pendingCount})
              </>
            )}
          </button>

          <button
            onClick={initializeStorage}
            disabled={isDownloading}
            className="p-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={clearAllFiles}
            disabled={isDownloading || downloadedCount === 0}
            className="p-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
            title="Clear All"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Summary */}
        <div className="flex justify-center gap-6 mt-3 text-sm">
          <span className="text-green-400">
            <Check className="w-3 h-3 inline mr-1" />
            {downloadedCount} downloaded
          </span>
          <span className="text-gray-400">
            <Download className="w-3 h-3 inline mr-1" />
            {pendingCount} pending
          </span>
        </div>
      </div>

      {/* File List */}
      <div className="max-h-64 overflow-y-auto">
        {files.map((file) => {
          const state = fileStates.get(file.entryId);
          const status = state?.status || 'pending';

          return (
            <div
              key={file.entryId}
              className={`flex items-center justify-between px-4 py-2.5 border-b border-gray-700/50 hover:bg-gray-750 ${
                status === 'error' ? 'bg-red-500/5' : ''
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getStatusIcon(status)}
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">
                    #{file.entryNumber} - {file.title}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{file.studioName}</div>
                </div>
              </div>

              {/* Last-minute download button */}
              {status === 'pending' && isOnline && (
                <button
                  onClick={() => downloadSingleFile(file)}
                  className="p-1.5 text-gray-400 hover:text-purple-400 transition-colors"
                  title="Download now"
                >
                  <Download className="w-4 h-4" />
                </button>
              )}

              {/* Error message */}
              {status === 'error' && state?.error && (
                <span className="text-xs text-red-400 truncate max-w-[100px]" title={state.error}>
                  {state.error}
                </span>
              )}
            </div>
          );
        })}

        {files.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Music className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No MP3 files to download</p>
          </div>
        )}
      </div>
    </div>
  );
}
