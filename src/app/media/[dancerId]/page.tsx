'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';
import Link from 'next/link';
import Image from 'next/image';

interface MediaPhoto {
  id: string;
  storage_url: string;
  thumbnail_url?: string;
  filename: string;
}

interface MediaPackage {
  id: string;
  entry_number: number;
  routine_title: string;
  competition_name: string;
  competition_date: string;
  status: 'pending' | 'processing' | 'partial' | 'complete';
  performance_video_url?: string;
  judge1_video_url?: string;
  judge2_video_url?: string;
  judge3_video_url?: string;
  photo_count: number;
  photos: MediaPhoto[];
}

interface DancerMedia {
  dancer: {
    id: string;
    first_name: string;
    last_name: string;
  };
  routines: MediaPackage[];
}

export default function MediaPortalDashboard() {
  const params = useParams();
  const dancerId = params.dancerId as string;
  const { tenant, primaryColor, secondaryColor } = useTenantTheme();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dancerMedia, setDancerMedia] = useState<DancerMedia | null>(null);
  const [selectedRoutine, setSelectedRoutine] = useState<MediaPackage | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<MediaPhoto | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const fetchMedia = async () => {
      try {
        const response = await fetch(`/api/media/dancer/${dancerId}`);
        if (!response.ok) {
          throw new Error('Failed to load media');
        }
        const data = await response.json();
        setDancerMedia(data);

        // Auto-select first routine if available
        if (data.routines && data.routines.length > 0) {
          setSelectedRoutine(data.routines[0]);
        }
      } catch (err) {
        setError('Unable to load media. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (dancerId) {
      fetchMedia();
    }
  }, [dancerId]);

  const handleDownloadPhoto = async (photo: MediaPhoto) => {
    window.open(photo.storage_url, '_blank');
  };

  const handleDownloadVideo = async (url: string, filename: string) => {
    window.open(url, '_blank');
  };

  const handleDownloadAll = async (routine: MediaPackage) => {
    setDownloading(true);
    try {
      // Fetch download manifest
      const response = await fetch(`/api/media/download/${routine.id}?type=all`);
      if (!response.ok) throw new Error('Failed to get download links');

      const data = await response.json();

      // Download each file with a small delay to avoid browser blocking
      for (const item of data.downloads) {
        const link = document.createElement('a');
        link.href = item.url;
        link.download = item.filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download files. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your media...</p>
        </div>
      </main>
    );
  }

  if (error || !dancerMedia) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 max-w-md text-center">
          <div className="text-red-400 text-4xl mb-4">😔</div>
          <h1 className="text-xl font-bold text-white mb-2">Unable to Load Media</h1>
          <p className="text-gray-400 mb-4">{error}</p>
          <Link
            href="/media"
            className="text-purple-400 hover:text-purple-300"
          >
            ← Try again
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      {/* Header */}
      <header className="bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
              }}
            >
              <span className="text-xl">📸</span>
            </div>
            <div>
              <h1 className="text-white font-bold">
                {dancerMedia.dancer.first_name}&apos;s Media
              </h1>
              <p className="text-gray-400 text-sm">{tenant?.name}</p>
            </div>
          </div>
          <Link
            href="/media"
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Back to lookup
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {dancerMedia.routines.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
            <div className="text-4xl mb-4">📭</div>
            <h2 className="text-xl font-bold text-white mb-2">No Media Available Yet</h2>
            <p className="text-gray-400">
              Media will appear here after your competition performances are processed.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Routine List Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
                <h2 className="text-white font-semibold mb-4">Your Routines</h2>
                <div className="space-y-2">
                  {dancerMedia.routines.map((routine) => (
                    <button
                      key={routine.id}
                      onClick={() => setSelectedRoutine(routine)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedRoutine?.id === routine.id
                          ? 'bg-purple-600/30 border border-purple-500/50'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-white font-medium text-sm">
                        #{routine.entry_number} - {routine.routine_title}
                      </div>
                      <div className="text-gray-400 text-xs mt-1">
                        {routine.competition_name}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          📷 {routine.photo_count} photos
                        </span>
                        {routine.performance_video_url && (
                          <span className="text-xs text-gray-500">🎬 Video</span>
                        )}
                      </div>
                      {routine.status !== 'complete' && (
                        <span className="inline-block mt-2 text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded">
                          {routine.status === 'pending' ? 'Processing...' :
                           routine.status === 'partial' ? 'More coming' : 'Uploading...'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              {selectedRoutine ? (
                <div className="space-y-6">
                  {/* Routine Header */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          #{selectedRoutine.entry_number} - {selectedRoutine.routine_title}
                        </h2>
                        <p className="text-gray-400 mt-1">
                          {selectedRoutine.competition_name} • {selectedRoutine.competition_date}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownloadAll(selectedRoutine)}
                        disabled={downloading}
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`
                        }}
                      >
                        {downloading ? 'Downloading...' : 'Download All ↓'}
                      </button>
                    </div>
                  </div>

                  {/* Videos Section */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Videos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Performance Video */}
                      {selectedRoutine.performance_video_url ? (
                        <div className="bg-black/30 rounded-lg p-4">
                          <div className="aspect-video bg-black rounded-lg mb-3 flex items-center justify-center">
                            <video
                              src={selectedRoutine.performance_video_url}
                              controls
                              className="w-full h-full rounded-lg"
                              poster="/video-placeholder.png"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-white text-sm font-medium">Performance Video</span>
                            <button
                              onClick={() => handleDownloadVideo(selectedRoutine.performance_video_url!, 'performance.mp4')}
                              className="text-purple-400 hover:text-purple-300 text-sm"
                            >
                              Download ↓
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-black/30 rounded-lg p-4 flex items-center justify-center min-h-[200px]">
                          <span className="text-gray-500">Performance video not available yet</span>
                        </div>
                      )}

                      {/* Judge Videos */}
                      <div className="bg-black/30 rounded-lg p-4">
                        <h4 className="text-white text-sm font-medium mb-3">Judge Commentary</h4>
                        <div className="space-y-2">
                          {[1, 2, 3].map((num) => {
                            const videoUrl = num === 1 ? selectedRoutine.judge1_video_url :
                                            num === 2 ? selectedRoutine.judge2_video_url :
                                            selectedRoutine.judge3_video_url;
                            return (
                              <div key={num} className="flex items-center justify-between py-2 border-b border-white/10 last:border-0">
                                <span className="text-gray-400 text-sm">Judge {num}</span>
                                {videoUrl ? (
                                  <button
                                    onClick={() => handleDownloadVideo(videoUrl, `judge${num}.mp4`)}
                                    className="text-purple-400 hover:text-purple-300 text-sm"
                                  >
                                    Download ↓
                                  </button>
                                ) : (
                                  <span className="text-gray-600 text-sm">Not available</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Photos Section */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-white">
                        Photos ({selectedRoutine.photo_count})
                      </h3>
                    </div>

                    {selectedRoutine.photos.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {selectedRoutine.photos.map((photo) => (
                          <div
                            key={photo.id}
                            className="group relative aspect-square bg-black/30 rounded-lg overflow-hidden cursor-pointer"
                            onClick={() => setLightboxPhoto(photo)}
                          >
                            <Image
                              src={photo.thumbnail_url || photo.storage_url}
                              alt={photo.filename}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform"
                              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                🔍
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        No photos available yet
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
                  <p className="text-gray-400">Select a routine to view media</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <Image
              src={lightboxPhoto.storage_url}
              alt={lightboxPhoto.filename}
              width={1200}
              height={800}
              className="max-h-[85vh] w-auto object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadPhoto(lightboxPhoto);
                }}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm backdrop-blur-sm"
              >
                Download Photo ↓
              </button>
              <button
                onClick={() => setLightboxPhoto(null)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm backdrop-blur-sm"
              >
                Close ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
