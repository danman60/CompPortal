'use client';

/**
 * CD Media Upload Dashboard
 * Allows Competition Directors to upload and manage media for entries
 *
 * Features:
 * - Competition selection
 * - View all media packages for entries
 * - Bulk photo upload with drag-and-drop
 * - Video URL management
 * - Package status management
 */

import { useState, useCallback, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

interface UploadingFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

export default function CDMediaDashboardPage() {
  const { primaryColor, secondaryColor } = useTenantTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [selectedCompetitionId, setSelectedCompetitionId] = useState<string>('');
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadingFile>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [videoUrls, setVideoUrls] = useState<{
    performance: string;
    judge1: string;
    judge2: string;
    judge3: string;
  }>({
    performance: '',
    judge1: '',
    judge2: '',
    judge3: '',
  });

  // Queries
  const { data: competitions, isLoading: competitionsLoading } = trpc.competition.getAll.useQuery();

  const { data: entries, isLoading: entriesLoading, refetch: refetchEntries } =
    trpc.media.getEntriesWithMedia.useQuery(
      { competitionId: selectedCompetitionId },
      { enabled: !!selectedCompetitionId }
    );

  const { data: selectedPackage, refetch: refetchSelectedPackage } =
    trpc.media.getPackageByEntry.useQuery(
      { entryId: selectedEntryId! },
      { enabled: !!selectedEntryId }
    );

  // Mutations
  const getUploadUrlMutation = trpc.media.getPhotoUploadUrl.useMutation();
  const confirmUploadMutation = trpc.media.confirmPhotoUpload.useMutation();
  const deletePhotoMutation = trpc.media.deletePhoto.useMutation();
  const updateVideoUrlMutation = trpc.media.updateVideoUrl.useMutation();
  const updateStatusMutation = trpc.media.updatePackageStatus.useMutation();

  // Select entry and load its video URLs
  const handleSelectEntry = useCallback((entryId: string) => {
    setSelectedEntryId(entryId);
    // Find the entry and load video URLs from its media package
    const entry = entries?.find(e => e.id === entryId);
    if (entry?.mediaPackage) {
      setVideoUrls({
        performance: entry.mediaPackage.performance_video_url || '',
        judge1: entry.mediaPackage.judge1_video_url || '',
        judge2: entry.mediaPackage.judge2_video_url || '',
        judge3: entry.mediaPackage.judge3_video_url || '',
      });
    } else {
      setVideoUrls({
        performance: '',
        judge1: '',
        judge2: '',
        judge3: '',
      });
    }
  }, [entries]);

  // Upload single file
  const uploadFile = useCallback(async (file: File, entryId: string) => {
    const fileId = `${file.name}-${Date.now()}`;

    setUploadingFiles(prev => new Map(prev).set(fileId, {
      file,
      progress: 0,
      status: 'pending',
    }));

    try {
      // Get signed upload URL
      setUploadingFiles(prev => {
        const newMap = new Map(prev);
        const item = newMap.get(fileId);
        if (item) newMap.set(fileId, { ...item, status: 'uploading', progress: 10 });
        return newMap;
      });

      const { signedUrl, path } = await getUploadUrlMutation.mutateAsync({
        entryId,
        filename: file.name,
        contentType: file.type,
      });

      // Upload to Supabase Storage
      setUploadingFiles(prev => {
        const newMap = new Map(prev);
        const item = newMap.get(fileId);
        if (item) newMap.set(fileId, { ...item, progress: 30 });
        return newMap;
      });

      const uploadResponse = await fetch(signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      setUploadingFiles(prev => {
        const newMap = new Map(prev);
        const item = newMap.get(fileId);
        if (item) newMap.set(fileId, { ...item, progress: 80 });
        return newMap;
      });

      // Confirm upload in database
      await confirmUploadMutation.mutateAsync({
        entryId,
        storagePath: path,
        filename: file.name,
        fileSize: file.size,
      });

      setUploadingFiles(prev => {
        const newMap = new Map(prev);
        const item = newMap.get(fileId);
        if (item) newMap.set(fileId, { ...item, status: 'done', progress: 100 });
        return newMap;
      });

      // Clear after 2 seconds
      setTimeout(() => {
        setUploadingFiles(prev => {
          const newMap = new Map(prev);
          newMap.delete(fileId);
          return newMap;
        });
      }, 2000);

      return true;
    } catch (error) {
      setUploadingFiles(prev => {
        const newMap = new Map(prev);
        const item = newMap.get(fileId);
        if (item) newMap.set(fileId, {
          ...item,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        });
        return newMap;
      });
      return false;
    }
  }, [getUploadUrlMutation, confirmUploadMutation]);

  // Handle file selection
  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || !selectedEntryId) return;

    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));

    if (imageFiles.length === 0) {
      toast.error('Please select image files only');
      return;
    }

    toast.loading(`Uploading ${imageFiles.length} file(s)...`, { id: 'upload' });

    let successCount = 0;
    for (const file of imageFiles) {
      const success = await uploadFile(file, selectedEntryId);
      if (success) successCount++;
    }

    toast.dismiss('upload');

    if (successCount === imageFiles.length) {
      toast.success(`Uploaded ${successCount} file(s) successfully`);
    } else {
      toast.error(`Uploaded ${successCount}/${imageFiles.length} files`);
    }

    refetchSelectedPackage();
    refetchEntries();
  }, [selectedEntryId, uploadFile, refetchSelectedPackage, refetchEntries]);

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
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Delete photo
  const handleDeletePhoto = useCallback(async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    try {
      await deletePhotoMutation.mutateAsync({ photoId });
      toast.success('Photo deleted');
      refetchSelectedPackage();
      refetchEntries();
    } catch {
      toast.error('Failed to delete photo');
    }
  }, [deletePhotoMutation, refetchSelectedPackage, refetchEntries]);

  // Update video URL
  const handleUpdateVideoUrl = useCallback(async (
    videoType: 'performance' | 'judge1' | 'judge2' | 'judge3',
    url: string
  ) => {
    if (!selectedPackage?.id) return;

    try {
      await updateVideoUrlMutation.mutateAsync({
        packageId: selectedPackage.id,
        videoType,
        videoUrl: url || null,
      });
      toast.success('Video URL updated');
      refetchEntries();
    } catch {
      toast.error('Failed to update video URL');
    }
  }, [selectedPackage?.id, updateVideoUrlMutation, refetchEntries]);

  // Update package status
  const handleUpdateStatus = useCallback(async (
    status: 'pending' | 'processing' | 'ready' | 'published'
  ) => {
    if (!selectedPackage?.id) return;

    try {
      await updateStatusMutation.mutateAsync({
        packageId: selectedPackage.id,
        status,
      });
      toast.success(`Status updated to ${status}`);
      refetchEntries();
      refetchSelectedPackage();
    } catch {
      toast.error('Failed to update status');
    }
  }, [selectedPackage?.id, updateStatusMutation, refetchEntries, refetchSelectedPackage]);

  const competitionsList = competitions?.competitions || [];
  const selectedCompetition = competitionsList.find(c => c.id === selectedCompetitionId);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Media Management</h1>
            <p className="text-gray-600 mt-1">Upload and manage photos & videos for entries</p>
          </div>
          <Link
            href="/dashboard/director-panel"
            className="text-gray-600 hover:text-gray-900 text-sm"
          >
            Back to Director Panel
          </Link>
        </div>

        {/* Competition Selector */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Competition
          </label>
          <select
            value={selectedCompetitionId}
            onChange={(e) => {
              setSelectedCompetitionId(e.target.value);
              setSelectedEntryId(null);
            }}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none text-gray-900"
            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
          >
            <option value="">Select a competition...</option>
            {competitionsList.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name}
              </option>
            ))}
          </select>
        </div>

        {selectedCompetitionId && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Entry List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Entries ({entries?.length || 0})
                </h2>

                {entriesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div
                      className="animate-spin rounded-full h-8 w-8 border-4 border-t-transparent"
                      style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
                    ></div>
                  </div>
                ) : entries && entries.length > 0 ? (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {entries.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => handleSelectEntry(entry.id)}
                        className={`w-full p-3 rounded-lg text-left transition-colors ${
                          selectedEntryId === entry.id
                            ? 'border-2'
                            : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                        }`}
                        style={selectedEntryId === entry.id ? {
                          backgroundColor: `${primaryColor}15`,
                          borderColor: primaryColor
                        } : undefined}
                      >
                        <div className="text-gray-900 font-medium text-sm">
                          #{entry.entry_number} - {entry.title || 'Untitled'}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">
                            {entry.mediaPackage?.photo_count || 0} photos
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            entry.mediaPackage?.status === 'published' ? 'bg-green-100 text-green-700' :
                            entry.mediaPackage?.status === 'ready' ? 'bg-blue-100 text-blue-700' :
                            entry.mediaPackage?.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {entry.mediaPackage?.status || 'no media'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No entries found for this competition
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Media Management */}
            <div className="lg:col-span-2">
              {selectedPackage ? (
                <div className="space-y-6">
                  {/* Entry Header */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">
                          #{selectedPackage.entry_number} - {selectedPackage.competition_entries?.title}
                        </h2>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={`text-sm px-3 py-1 rounded-full ${
                            selectedPackage.status === 'published' ? 'bg-green-100 text-green-700' :
                            selectedPackage.status === 'ready' ? 'bg-blue-100 text-blue-700' :
                            selectedPackage.status === 'processing' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {selectedPackage.status}
                          </span>
                          <span className="text-gray-500 text-sm">
                            {selectedPackage.photo_count} photos
                          </span>
                        </div>
                      </div>
                      {/* Status Buttons */}
                      <div className="flex gap-2">
                        {(['pending', 'processing', 'ready', 'published'] as const).map((status) => (
                          <button
                            key={status}
                            onClick={() => handleUpdateStatus(status)}
                            disabled={selectedPackage.status === status}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                              selectedPackage.status === status
                                ? 'text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            style={selectedPackage.status === status ? { backgroundColor: primaryColor } : undefined}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Photo Upload Area */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Photos</h3>

                    {/* Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                        isDragging
                          ? ''
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                      style={isDragging ? {
                        borderColor: primaryColor,
                        backgroundColor: `${primaryColor}15`
                      } : undefined}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={(e) => handleFileSelect(e.target.files)}
                        className="hidden"
                      />
                      <div className="text-4xl mb-3">📸</div>
                      <p className="text-gray-700 font-medium">
                        Drop photos here or click to upload
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        Supports JPG, PNG, WEBP
                      </p>
                    </div>

                    {/* Upload Progress */}
                    {uploadingFiles.size > 0 && (
                      <div className="mt-4 space-y-2">
                        {Array.from(uploadingFiles.entries()).map(([id, item]) => (
                          <div key={id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-700 truncate">
                                {item.file.name}
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    item.status === 'error' ? 'bg-red-500' :
                                    item.status === 'done' ? 'bg-green-500' : ''
                                  }`}
                                  style={{
                                    width: `${item.progress}%`,
                                    ...(item.status !== 'error' && item.status !== 'done' ? { backgroundColor: primaryColor } : {})
                                  }}
                                />
                              </div>
                            </div>
                            <span className={`text-sm ${
                              item.status === 'error' ? 'text-red-600' :
                              item.status === 'done' ? 'text-green-600' :
                              'text-gray-500'
                            }`}>
                              {item.status === 'done' ? '✓' :
                               item.status === 'error' ? '✗' :
                               `${item.progress}%`}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Existing Photos */}
                    {selectedPackage.photos && selectedPackage.photos.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-6">
                        {selectedPackage.photos.map((photo: any) => (
                          <div
                            key={photo.id}
                            className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden"
                          >
                            <img
                              src={photo.thumbnail_url || photo.storage_url}
                              alt={photo.filename}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <button
                                onClick={() => handleDeletePhoto(photo.id)}
                                className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 mt-4">
                        No photos uploaded yet
                      </div>
                    )}
                  </div>

                  {/* Video URLs */}
                  <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Video URLs</h3>
                    <div className="space-y-4">
                      {/* Performance Video */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Performance Video URL
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            value={videoUrls.performance}
                            onChange={(e) => setVideoUrls(prev => ({ ...prev, performance: e.target.value }))}
                            placeholder="https://..."
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none text-gray-900"
                            style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                          />
                          <button
                            onClick={() => handleUpdateVideoUrl('performance', videoUrls.performance)}
                            className="px-4 py-2 text-white rounded-lg text-sm"
                            style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }}
                          >
                            Save
                          </button>
                        </div>
                      </div>

                      {/* Judge Videos */}
                      {(['judge1', 'judge2', 'judge3'] as const).map((judgeKey, idx) => (
                        <div key={judgeKey}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Judge {idx + 1} Commentary URL
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={videoUrls[judgeKey]}
                              onChange={(e) => setVideoUrls(prev => ({ ...prev, [judgeKey]: e.target.value }))}
                              placeholder="https://..."
                              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:outline-none text-gray-900"
                              style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                            />
                            <button
                              onClick={() => handleUpdateVideoUrl(judgeKey, videoUrls[judgeKey])}
                              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <div className="text-6xl mb-4">👈</div>
                  <h3 className="text-xl font-medium text-gray-900">Select an Entry</h3>
                  <p className="text-gray-500 mt-2">
                    Choose an entry from the list to manage its media
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Initial State */}
        {!selectedCompetitionId && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📷</div>
            <h3 className="text-xl font-medium text-gray-900">Select a Competition</h3>
            <p className="text-gray-500 mt-2">
              Choose a competition above to manage media for its entries
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
