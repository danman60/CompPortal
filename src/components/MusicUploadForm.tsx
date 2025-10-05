'use client';

import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';
import MusicUploader from './MusicUploader';

interface MusicUploadFormProps {
  entryId: string;
}

export default function MusicUploadForm({ entryId }: MusicUploadFormProps) {
  const router = useRouter();

  const { data: entry, isLoading } = trpc.entry.getById.useQuery({ id: entryId });

  const updateMusicMutation = trpc.entry.updateMusic.useMutation({
    onSuccess: () => {
      router.push('/dashboard/entries');
    },
  });

  const handleUploadComplete = async (url: string) => {
    await updateMusicMutation.mutateAsync({
      entryId,
      musicFileUrl: url,
    });
  };

  const handleRemove = async () => {
    await updateMusicMutation.mutateAsync({
      entryId,
      musicFileUrl: null,
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
        <div className="animate-spin text-6xl mb-4">⚙️</div>
        <p className="text-white">Loading routine...</p>
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
        <div className="text-6xl mb-4">❌</div>
        <h3 className="text-xl font-semibold text-white mb-2">Routine Not Found</h3>
        <p className="text-gray-400">Unable to find the specified routine.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Entry Info */}
      <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-xl border border-purple-400/30 p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="text-4xl">🎭</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white mb-2">{entry.title}</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Competition:</span>{' '}
                <span className="text-white">{entry.competitions.name}</span>
              </div>
              <div>
                <span className="text-gray-400">Category:</span>{' '}
                <span className="text-white">{entry.dance_categories?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400">Size:</span>{' '}
                <span className="text-white">{entry.entry_size_categories?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400">Dancers:</span>{' '}
                <span className="text-white">{entry.entry_participants.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Music Uploader */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
        <h3 className="text-xl font-semibold text-white mb-6">Music File</h3>

        <MusicUploader
          entryId={entryId}
          currentMusicUrl={entry.music_file_url || undefined}
          onUploadComplete={handleUploadComplete}
          onRemove={handleRemove}
          disabled={updateMusicMutation.isPending}
        />

        {/* Music Info Fields */}
        {entry.music_title && (
          <div className="mt-6 pt-6 border-t border-white/20">
            <h4 className="text-white font-semibold mb-3">Music Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-400">Title:</span>{' '}
                <span className="text-white">{entry.music_title}</span>
              </div>
              {entry.music_artist && (
                <div>
                  <span className="text-gray-400">Artist:</span>{' '}
                  <span className="text-white">{entry.music_artist}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={() => router.push('/dashboard/entries')}
          className="flex-1 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-lg transition-all"
        >
          Done
        </button>
      </div>
    </div>
  );
}
