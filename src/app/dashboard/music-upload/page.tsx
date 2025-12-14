'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { uploadMusicFile } from '@/lib/storage';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  Upload,
  Check,
  AlertTriangle,
  X,
  Music,
  FileAudio,
  ArrowLeft,
  ArrowRight,
  Search,
  Trash2,
  RefreshCw,
} from 'lucide-react';

// Types
interface FileWithMatch {
  file: File;
  id: string;
  matchedEntryId: string | null;
  matchedEntry: Entry | null;
  confidence: 'high' | 'low' | 'none';
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

interface Entry {
  id: string;
  entryNumber: number | null;
  title: string;
  category: string | null;
  ageGroup: string | null;
  hasMusicFile: boolean;
  studioName: string | null;
}

// Filename parsing utilities from PRD
const entryNumberPatterns = [
  /^#?(\d+)/,                    // #123 or 123 at start
  /entry[_\s-]*(\d+)/i,          // Entry 123, Entry_123
  /^(\d+)\s*[-_]\s*/,            // 123 - Title
];

function extractEntryNumber(filename: string): number | null {
  for (const pattern of entryNumberPatterns) {
    const match = filename.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  return null;
}

function extractTitle(filename: string): string {
  return filename
    .replace(/\.(mp3|wav|m4a)$/i, '')  // Remove extension
    .replace(/^#?\d+\s*[-_]?\s*/, '')   // Remove entry number
    .replace(/[-_]/g, ' ')              // Normalize separators
    .trim()
    .toLowerCase();
}

function normalizeForMatch(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchFileToEntry(file: File, entries: Entry[]): { entry: Entry | null; confidence: 'high' | 'low' | 'none' } {
  const filename = file.name;

  // Try entry number match first (highest confidence)
  const entryNumber = extractEntryNumber(filename);
  if (entryNumber) {
    const match = entries.find(e => e.entryNumber === entryNumber);
    if (match) {
      return { entry: match, confidence: 'high' };
    }
  }

  // Try exact title match
  const fileTitle = extractTitle(filename);
  const normalizedFileTitle = normalizeForMatch(fileTitle);

  if (normalizedFileTitle.length >= 3) {
    // Exact match
    const exactMatch = entries.find(e => normalizeForMatch(e.title) === normalizedFileTitle);
    if (exactMatch) {
      return { entry: exactMatch, confidence: 'high' };
    }

    // Fuzzy match - check if file title contains entry title or vice versa
    const fuzzyMatch = entries.find(e => {
      const normalizedEntryTitle = normalizeForMatch(e.title);
      return normalizedFileTitle.includes(normalizedEntryTitle) ||
             normalizedEntryTitle.includes(normalizedFileTitle);
    });
    if (fuzzyMatch) {
      return { entry: fuzzyMatch, confidence: 'low' };
    }
  }

  return { entry: null, confidence: 'none' };
}

export default function BulkMusicUploadPage() {
  // State
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [files, setFiles] = useState<FileWithMatch[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get entries for the SD's studio
  const { data: entriesData, isLoading: entriesLoading } = trpc.entry.getAll.useQuery({
    limit: 1000,
  });

  const utils = trpc.useUtils();
  const updateEntryMutation = trpc.entry.update.useMutation();

  // Transform entries data
  const entries: Entry[] = (entriesData?.entries || []).map((e: any) => ({
    id: e.id,
    entryNumber: e.entry_number,
    title: e.title,
    category: e.dance_categories?.name || null,
    ageGroup: e.age_groups?.name || null,
    hasMusicFile: !!e.music_file_url,
    studioName: e.studios?.name || null,
  }));

  // Stats
  const matchedCount = files.filter(f => f.matchedEntryId).length;
  const needsReviewCount = files.filter(f => f.confidence === 'low').length;
  const unmatchedCount = files.filter(f => !f.matchedEntryId).length;
  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substring(2, 15);

  // Handle file selection
  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;

    const mp3Files = Array.from(fileList).filter(f =>
      f.type === 'audio/mpeg' || f.name.toLowerCase().endsWith('.mp3')
    );

    if (mp3Files.length === 0) {
      toast.error('Please select MP3 files only');
      return;
    }

    const newFiles: FileWithMatch[] = mp3Files.map(file => {
      const { entry, confidence } = matchFileToEntry(file, entries);
      return {
        file,
        id: generateId(),
        matchedEntryId: entry?.id || null,
        matchedEntry: entry,
        confidence,
        status: 'pending' as const,
        progress: 0,
      };
    });

    setFiles(prev => [...prev, ...newFiles]);
    toast.success(`${mp3Files.length} file(s) added`);
  }, [entries]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  // Remove file
  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  // Clear all files
  const clearAllFiles = () => {
    setFiles([]);
    setStep(1);
  };

  // Pair file to entry
  const pairFileToEntry = (fileId: string, entry: Entry) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId
        ? { ...f, matchedEntryId: entry.id, matchedEntry: entry, confidence: 'high' as const }
        : f
    ));
    setSelectedFileId(null);
    toast.success(`Paired to #${entry.entryNumber} ${entry.title}`);
  };

  // Unpair file
  const unpairFile = (fileId: string) => {
    setFiles(prev => prev.map(f =>
      f.id === fileId
        ? { ...f, matchedEntryId: null, matchedEntry: null, confidence: 'none' as const }
        : f
    ));
  };

  // Upload files
  const uploadFiles = async () => {
    const filesToUpload = files.filter(f => f.matchedEntryId && f.status === 'pending');

    if (filesToUpload.length === 0) {
      toast.error('No files to upload');
      return;
    }

    setIsUploading(true);
    setStep(3);

    // Upload in batches of 3
    const batchSize = 3;
    for (let i = 0; i < filesToUpload.length; i += batchSize) {
      const batch = filesToUpload.slice(i, i + batchSize);

      await Promise.all(batch.map(async (fileWithMatch) => {
        // Mark as uploading
        setFiles(prev => prev.map(f =>
          f.id === fileWithMatch.id ? { ...f, status: 'uploading' as const, progress: 10 } : f
        ));

        try {
          // Upload to storage
          const result = await uploadMusicFile({
            file: fileWithMatch.file,
            entryId: fileWithMatch.matchedEntryId!,
            onProgress: (progress) => {
              setFiles(prev => prev.map(f =>
                f.id === fileWithMatch.id ? { ...f, progress } : f
              ));
            },
          });

          if (!result.success) {
            throw new Error(result.error || 'Upload failed');
          }

          // Update entry with music URL
          await updateEntryMutation.mutateAsync({
            id: fileWithMatch.matchedEntryId!,
            data: {
              music_file_url: result.publicUrl,
            },
          });

          // Mark as success
          setFiles(prev => prev.map(f =>
            f.id === fileWithMatch.id ? { ...f, status: 'success' as const, progress: 100 } : f
          ));
        } catch (error) {
          // Mark as error
          setFiles(prev => prev.map(f =>
            f.id === fileWithMatch.id
              ? { ...f, status: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
              : f
          ));
        }
      }));
    }

    setIsUploading(false);
    utils.entry.getAll.invalidate();

    const finalSuccess = files.filter(f => f.status === 'success').length;
    const finalErrors = files.filter(f => f.status === 'error').length;

    if (finalErrors === 0) {
      toast.success(`All ${finalSuccess} files uploaded successfully!`);
    } else {
      toast(`${finalSuccess} uploaded, ${finalErrors} failed`, { icon: '⚠️' });
    }
  };

  // Filter entries for manual pairing
  const filteredEntries = entries.filter(e => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(query) ||
      (e.entryNumber && e.entryNumber.toString().includes(query)) ||
      (e.category && e.category.toLowerCase().includes(query))
    );
  });

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Total file size
  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0);

  if (entriesLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <Link
            href="/dashboard"
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Bulk Music Upload</h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 ml-11">
          Upload music files for multiple entries at once
        </p>
      </div>

      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm
                ${step >= s
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}
              `}>
                {s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 mx-2 rounded ${
                  step > s ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
          <span className={step === 1 ? 'text-purple-600 font-medium' : ''}>Select Files</span>
          <span className="w-16" />
          <span className={step === 2 ? 'text-purple-600 font-medium' : ''}>Review Matches</span>
          <span className="w-16" />
          <span className={step === 3 ? 'text-purple-600 font-medium' : ''}>Upload</span>
        </div>
      </div>

      {/* Step 1: File Selection */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'}
            `}
          >
            <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-300">Drag & drop MP3 files here</p>
            <p className="text-sm text-gray-400 mt-1">or</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,audio/mpeg"
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
            >
              Browse Files
            </button>
          </div>

          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {files.length} file(s) selected
                  </span>
                  <span className="text-sm text-gray-500 ml-2">
                    ({formatFileSize(totalSize)} total)
                  </span>
                </div>
                <button
                  onClick={clearAllFiles}
                  className="px-3 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors text-sm"
                >
                  Clear All
                </button>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-64 overflow-y-auto">
                {files.map((f) => (
                  <div key={f.id} className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-3">
                      <FileAudio className="h-5 w-5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {f.file.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatFileSize(f.file.size)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(f.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Continue Button */}
          {files.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
              >
                Continue to Matching
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Review Matches */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="text-2xl font-bold text-green-600">{matchedCount}</div>
              <div className="text-sm text-green-700 dark:text-green-400">Matched</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
              <div className="text-2xl font-bold text-amber-600">{needsReviewCount}</div>
              <div className="text-sm text-amber-700 dark:text-amber-400">Needs Review</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-600">{unmatchedCount}</div>
              <div className="text-sm text-gray-700 dark:text-gray-400">Unmatched</div>
            </div>
          </div>

          {/* File Matching Table */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matched Entry
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {files.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileAudio className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {f.file.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {f.confidence === 'high' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <Check className="h-3 w-3" /> Matched
                        </span>
                      )}
                      {f.confidence === 'low' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          <AlertTriangle className="h-3 w-3" /> Review
                        </span>
                      )}
                      {f.confidence === 'none' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          <X className="h-3 w-3" /> Unmatched
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {f.matchedEntry ? (
                        <div className="text-sm">
                          <span className="font-medium text-purple-600">#{f.matchedEntry.entryNumber}</span>
                          {' '}
                          <span className="text-gray-900 dark:text-gray-100">{f.matchedEntry.title}</span>
                          {f.matchedEntry.category && (
                            <span className="text-gray-500 ml-2">({f.matchedEntry.category})</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No match found</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {f.matchedEntry ? (
                          <button
                            onClick={() => unpairFile(f.id)}
                            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                          >
                            Unpair
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedFileId(f.id)}
                            className="px-2 py-1 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors"
                          >
                            Select Entry
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Manual Pairing Modal */}
          {selectedFileId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      Select Entry for: {files.find(f => f.id === selectedFileId)?.file.name}
                    </h3>
                    <button
                      onClick={() => setSelectedFileId(null)}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-3 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by title, entry number, or category..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100"
                    />
                  </div>
                </div>
                <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredEntries.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => pairFileToEntry(selectedFileId, entry)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-purple-600">#{entry.entryNumber}</span>
                          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{entry.title}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {entry.category} {entry.ageGroup && `- ${entry.ageGroup}`}
                        </div>
                      </div>
                      {entry.hasMusicFile && (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                          Has music (will replace)
                        </span>
                      )}
                    </button>
                  ))}
                  {filteredEntries.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      No entries found matching your search
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              onClick={uploadFiles}
              disabled={matchedCount === 0}
              className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              Upload {matchedCount} File(s)
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Upload Progress */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Overall Progress</span>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {successCount + errorCount} / {files.filter(f => f.matchedEntryId).length}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(successCount + errorCount) / files.filter(f => f.matchedEntryId).length * 100}%`
                }}
              />
            </div>
            <div className="flex gap-4 mt-4 text-sm">
              <span className="text-green-600">{successCount} uploaded</span>
              <span className="text-red-600">{errorCount} failed</span>
              <span className="text-gray-500">
                {files.filter(f => f.status === 'uploading').length} in progress
              </span>
            </div>
          </div>

          {/* File Status List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {files.filter(f => f.matchedEntryId).map((f) => (
                <div key={f.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3 flex-1">
                    <FileAudio className="h-5 w-5 text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {f.file.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        → #{f.matchedEntry?.entryNumber} {f.matchedEntry?.title}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {f.status === 'pending' && (
                      <span className="text-sm text-gray-500">Queued</span>
                    )}
                    {f.status === 'uploading' && (
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-purple-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${f.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-purple-600">{f.progress}%</span>
                      </div>
                    )}
                    {f.status === 'success' && (
                      <span className="flex items-center gap-1 text-sm text-green-600">
                        <Check className="h-4 w-4" /> Uploaded
                      </span>
                    )}
                    {f.status === 'error' && (
                      <span className="flex items-center gap-1 text-sm text-red-600">
                        <X className="h-4 w-4" /> {f.error || 'Failed'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          {!isUploading && (
            <div className="flex justify-between">
              <button
                onClick={clearAllFiles}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
                Upload More
              </button>
              <Link
                href="/dashboard/entries"
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors"
              >
                View Entries
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
