'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';
import { trpc } from '@/lib/trpc';

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
  dancer_names: string;
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

export default function MediaPage() {
  const { primaryColor, secondaryColor } = useTenantTheme();
  const [loading, setLoading] = useState(true);
  const [media, setMedia] = useState<MediaPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<MediaPackage | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<MediaPhoto | null>(null);

  // Get studio info
  const { data: userStudio } = trpc.studio.getAll.useQuery();
  const studioId = userStudio?.studios?.[0]?.id;

  useEffect(() => {
    const fetchMedia = async () => {
      if (!studioId) return;

      try {
        const response = await fetch(`/api/media/studio/${studioId}`);
        if (response.ok) {
          const data = await response.json();
          setMedia(data.packages || []);
          if (data.packages?.length > 0) {
            setSelectedPackage(data.packages[0]);
          }
        }
      } catch (err) {
        console.error('Failed to fetch media:', err);
      } finally {
        setLoading(false);
      }
    };

    if (studioId) {
      fetchMedia();
    } else if (userStudio !== undefined) {
      setLoading(false);
    }
  }, [studioId, userStudio]);

  const handleDownloadAll = async (pkg: MediaPackage) => {
    try {
      const response = await fetch(`/api/media/download/${pkg.id}?type=all`);
      if (!response.ok) throw new Error('Failed to get download links');

      const data = await response.json();

      for (const item of data.downloads) {
        const link = document.createElement('a');
        link.href = item.url;
        link.download = item.filename;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download files. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Media & Photos</h1>
            <p className="text-gray-400 mt-1">Access photos and videos from your routines</p>
          </div>
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-white text-sm"
          >
            Back to Dashboard
          </Link>
        </div>

        {media.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
            <div className="text-6xl mb-4">📸</div>
            <h2 className="text-2xl font-bold text-white mb-2">No Media Available Yet</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              Media will appear here after your competition performances are recorded and processed.
              Check back after your next competition!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Routine List Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
                <h2 className="text-white font-semibold mb-4">Routines ({media.length})</h2>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {media.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedPackage(pkg)}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedPackage?.id === pkg.id
                          ? 'bg-purple-600/30 border border-purple-500/50'
                          : 'bg-white/5 border border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-white font-medium text-sm">
                        #{pkg.entry_number} - {pkg.routine_title}
                      </div>
                      <div className="text-gray-400 text-xs mt-1 truncate">
                        {pkg.dancer_names}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {pkg.photo_count} photos
                        </span>
                        {pkg.performance_video_url && (
                          <span className="text-xs text-gray-500">Video</span>
                        )}
                      </div>
                      {pkg.status !== 'complete' && (
                        <span className="inline-block mt-2 text-xs px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded">
                          {pkg.status === 'pending' ? 'Processing...' :
                           pkg.status === 'partial' ? 'More coming' : 'Uploading...'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3">
              {selectedPackage ? (
                <div className="space-y-6">
                  {/* Routine Header */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-white">
                          #{selectedPackage.entry_number} - {selectedPackage.routine_title}
                        </h2>
                        <p className="text-gray-400 mt-1">{selectedPackage.dancer_names}</p>
                        <p className="text-gray-500 text-sm mt-1">
                          {selectedPackage.competition_name} - {selectedPackage.competition_date}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDownloadAll(selectedPackage)}
                        className="px-4 py-2 rounded-lg text-white text-sm font-medium"
                        style={{
                          background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`
                        }}
                      >
                        Download All
                      </button>
                    </div>
                  </div>

                  {/* Videos Section */}
                  {(selectedPackage.performance_video_url || selectedPackage.judge1_video_url) && (
                    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                      <h3 className="text-lg font-semibold text-white mb-4">Videos</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedPackage.performance_video_url && (
                          <div className="bg-black/30 rounded-lg p-4">
                            <video
                              src={selectedPackage.performance_video_url}
                              controls
                              className="w-full rounded-lg mb-3"
                            />
                            <span className="text-white text-sm font-medium">Performance Video</span>
                          </div>
                        )}

                        {(selectedPackage.judge1_video_url || selectedPackage.judge2_video_url || selectedPackage.judge3_video_url) && (
                          <div className="bg-black/30 rounded-lg p-4">
                            <h4 className="text-white text-sm font-medium mb-3">Judge Commentary</h4>
                            <div className="space-y-2">
                              {[1, 2, 3].map((num) => {
                                const videoUrl = num === 1 ? selectedPackage.judge1_video_url :
                                                num === 2 ? selectedPackage.judge2_video_url :
                                                selectedPackage.judge3_video_url;
                                return videoUrl ? (
                                  <a
                                    key={num}
                                    href={videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between py-2 border-b border-white/10 last:border-0 text-purple-400 hover:text-purple-300"
                                  >
                                    <span className="text-gray-400 text-sm">Judge {num}</span>
                                    <span className="text-sm">Download</span>
                                  </a>
                                ) : null;
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Photos Section */}
                  <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Photos ({selectedPackage.photo_count})
                    </h3>

                    {selectedPackage.photos.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {selectedPackage.photos.map((photo) => (
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
                              sizes="(max-width: 640px) 50vw, 20vw"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                              <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-2xl">
                                +
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
      </main>

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
              <a
                href={lightboxPhoto.storage_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm backdrop-blur-sm"
              >
                Download Photo
              </a>
              <button
                onClick={() => setLightboxPhoto(null)}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm backdrop-blur-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
