'use client';

import { useState, useRef } from 'react';
import { uploadMusicFile, deleteMusicFile, formatFileSize, formatDuration, getMusicFileInfo } from '@/lib/storage';

interface MusicUploaderProps {
  entryId?: string;
  currentMusicUrl?: string;
  onUploadComplete: (url: string) => void;
  onRemove?: () => void;
  disabled?: boolean;
}

export default function MusicUploader({
  entryId,
  currentMusicUrl,
  onUploadComplete,
  onRemove,
  disabled = false,
}: MusicUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [audioInfo, setAudioInfo] = useState<{ duration: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentFile = currentMusicUrl ? getMusicFileInfo(currentMusicUrl) : null;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setSelectedFile(file);

    // Get audio duration
    const audio = new Audio();
    audio.onloadedmetadata = () => {
      setAudioInfo({ duration: audio.duration });
    };
    audio.src = URL.createObjectURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    if (!entryId) {
      setError('Entry ID is required. Please save the entry first.');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    const result = await uploadMusicFile({
      file: selectedFile,
      entryId,
      onProgress: (p) => setProgress(p),
    });

    setUploading(false);

    if (result.success && result.publicUrl) {
      setSelectedFile(null);
      setAudioInfo(null);
      onUploadComplete(result.publicUrl);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      setError(result.error || 'Upload failed');
    }
  };

  const handleRemove = async () => {
    if (!currentMusicUrl || !currentFile) return;

    const filePath = currentMusicUrl.split('/').slice(-3).join('/');
    const result = await deleteMusicFile(filePath);

    if (result.success) {
      onRemove?.();
    } else {
      setError(result.error || 'Failed to remove file');
    }
  };

  return (
    <div className="space-y-4">
      {/* Current File Display */}
      {currentFile && !selectedFile && (
        <div className="bg-green-500/20 border border-green-400/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-white">
                <span className="text-2xl">🎵</span>
                <div>
                  <p className="font-semibold">{currentFile.fileName}</p>
                  <p className="text-sm text-green-300">Music file uploaded</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleRemove}
              disabled={disabled}
              className="text-red-400 hover:text-red-300 px-3 py-1 rounded transition-colors disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* File Selection */}
      {!currentFile && (
        <div className="border-2 border-dashed border-white/30 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.wav,.m4a,.aac"
            onChange={handleFileSelect}
            disabled={disabled || uploading}
            className="hidden"
          />

          {!selectedFile ? (
            <div>
              <div className="text-6xl mb-4">🎵</div>
              <p className="text-white mb-2">Upload Music File</p>
              <p className="text-sm text-gray-400 mb-4">
                MP3, WAV, M4A, or AAC (max 50MB)
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              >
                Choose File
              </button>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-4">🎵</div>
              <p className="text-white font-semibold mb-1">{selectedFile.name}</p>
              <p className="text-sm text-gray-400 mb-2">
                {formatFileSize(selectedFile.size)}
                {audioInfo && ` • ${formatDuration(audioInfo.duration)}`}
              </p>
              <div className="flex gap-2 justify-center mt-4">
                <button
                  onClick={handleUpload}
                  disabled={uploading || disabled}
                  className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setAudioInfo(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  disabled={uploading || disabled}
                  className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload Progress */}
      {uploading && (
        <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <div className="animate-spin text-2xl">⚙️</div>
            <div className="flex-1">
              <p className="text-white mb-2">Uploading... {progress}%</p>
              <div className="bg-white/20 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-300">
            <span className="text-2xl">❌</span>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-4">
        <p className="text-sm text-blue-200">
          <strong>💡 Tip:</strong> Upload the final edited version of your music. Ensure the music matches your routine duration and includes any necessary cuts or transitions.
        </p>
      </div>
    </div>
  );
}
