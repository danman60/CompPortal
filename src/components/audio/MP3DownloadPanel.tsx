'use client';

import { useState } from 'react';
import {
  Download,
  CheckCircle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Play,
  Pause,
  Loader2,
  HardDrive,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useMP3Download } from '@/lib/audio/use-mp3-download';

interface MP3DownloadPanelProps {
  competitionId?: string;
  day?: string;
  compact?: boolean;
}

export function MP3DownloadPanel({
  competitionId,
  day,
  compact = false,
}: MP3DownloadPanelProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showFailedList, setShowFailedList] = useState(false);

  const {
    isInitialized,
    isDownloading,
    isVerifying,
    totalFiles,
    completedFiles,
    failedFiles,
    pendingFiles,
    progress,
    failedFilesList,
    lastError,
    fetchManifest,
    clearCache,
    startDownload,
    cancelDownload,
    retryFailed,
    verifyFiles,
    refreshStats,
  } = useMP3Download();

  // Calculate progress percentage
  const progressPercent = totalFiles > 0
    ? Math.round((completedFiles / totalFiles) * 100)
    : 0;

  // Determine status
  const getStatus = () => {
    if (isDownloading) return 'downloading';
    if (isVerifying) return 'verifying';
    if (failedFiles > 0) return 'has-failures';
    if (completedFiles === totalFiles && totalFiles > 0) return 'complete';
    if (!isInitialized) return 'not-initialized';
    return 'ready';
  };

  const status = getStatus();

  // Format bytes to human readable
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  // Format time
  const formatTime = (seconds: number | null) => {
    if (seconds === null || seconds <= 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle prepare button click
  const handlePrepare = async () => {
    await fetchManifest(competitionId, day);
  };

  // Status badge component
  const StatusBadge = () => {
    switch (status) {
      case 'downloading':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            Downloading
          </span>
        );
      case 'verifying':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
            <Loader2 className="w-3 h-3 animate-spin" />
            Verifying
          </span>
        );
      case 'has-failures':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
            <AlertCircle className="w-3 h-3" />
            {failedFiles} Failed
          </span>
        );
      case 'complete':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
            <CheckCircle className="w-3 h-3" />
            Ready
          </span>
        );
      case 'not-initialized':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs">
            <HardDrive className="w-3 h-3" />
            Not Loaded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-500/20 text-gray-400 text-xs">
            <Download className="w-3 h-3" />
            {pendingFiles} Pending
          </span>
        );
    }
  };

  // Compact view
  if (compact && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors"
      >
        <HardDrive className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-300">
          {completedFiles}/{totalFiles} MP3s
        </span>
        <StatusBadge />
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <HardDrive className="w-5 h-5 text-blue-400" />
          <span className="font-medium text-white">Audio Files</span>
          <StatusBadge />
        </div>
        {compact && (
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 hover:bg-gray-700 rounded"
          >
            <ChevronUp className="w-4 h-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gray-900 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-white">{totalFiles}</div>
            <div className="text-xs text-gray-400">Total</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{completedFiles}</div>
            <div className="text-xs text-gray-400">Downloaded</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{pendingFiles}</div>
            <div className="text-xs text-gray-400">Pending</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-400">{failedFiles}</div>
            <div className="text-xs text-gray-400">Failed</div>
          </div>
        </div>

        {/* Progress Bar */}
        {(isDownloading || isVerifying || progressPercent > 0) && (
          <div className="space-y-2">
            <div className="h-3 bg-gray-900 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  status === 'complete'
                    ? 'bg-green-500'
                    : status === 'has-failures'
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400">
              <span>{progressPercent}% complete</span>
              {progress && (
                <span>
                  {formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Download Progress Details */}
        {isDownloading && progress && (
          <div className="bg-gray-900 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Speed:</span>
              <span className="text-white">{formatBytes(progress.speed || 0)}/s</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">ETA:</span>
              <span className="text-white">{formatTime(progress.estimatedTimeRemaining)}</span>
            </div>
            {progress.currentFile && (
              <div className="text-xs text-gray-500 truncate">
                Downloading: {progress.currentFile}
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {lastError && (
          <div className="flex items-start gap-2 p-3 bg-red-500/10 rounded-lg">
            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span className="text-sm text-red-400">{lastError}</span>
          </div>
        )}

        {/* Failed Files List */}
        {failedFiles > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setShowFailedList(!showFailedList)}
              className="flex items-center gap-2 text-sm text-yellow-400 hover:text-yellow-300"
            >
              {showFailedList ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
              View {failedFiles} failed file(s)
            </button>
            {showFailedList && (
              <div className="bg-gray-900 rounded-lg p-2 max-h-32 overflow-y-auto space-y-1">
                {failedFilesList.map((file) => (
                  <div
                    key={file.entryId}
                    className="flex items-center justify-between text-xs p-2 bg-gray-800 rounded"
                  >
                    <span className="text-gray-300 truncate">
                      #{file.entryNumber} - {file.routineName}
                    </span>
                    <span className="text-red-400 truncate ml-2">
                      {file.lastError || 'Unknown error'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          {!isInitialized ? (
            <button
              onClick={handlePrepare}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Prepare Audio Files
            </button>
          ) : isDownloading ? (
            <button
              onClick={cancelDownload}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors"
            >
              <Pause className="w-4 h-4" />
              Cancel Download
            </button>
          ) : (
            <>
              {pendingFiles > 0 && (
                <button
                  onClick={startDownload}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start Download
                </button>
              )}
              {failedFiles > 0 && (
                <button
                  onClick={retryFailed}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retry Failed
                </button>
              )}
              {completedFiles > 0 && (
                <button
                  onClick={verifyFiles}
                  disabled={isVerifying}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isVerifying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  Verify Files
                </button>
              )}
            </>
          )}

          {/* Secondary Actions */}
          <button
            onClick={refreshStats}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
            title="Refresh stats"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {totalFiles > 0 && (
            <button
              onClick={clearCache}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
              title="Clear all downloaded files"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status Footer */}
        {status === 'complete' && (
          <div className="flex items-center gap-2 text-sm text-green-400">
            <CheckCircle className="w-4 h-4" />
            All {totalFiles} audio files ready for offline playback
          </div>
        )}
      </div>
    </div>
  );
}
