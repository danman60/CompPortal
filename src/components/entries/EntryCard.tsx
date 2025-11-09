import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface EntryCardProps {
  entry: any;
}

/**
 * Individual entry card component
 * Extracted from EntriesList.tsx (lines 540-684)
 */
export function EntryCard({ entry }: EntryCardProps) {
  const router = useRouter();

  const getMusicStatus = (entry: any) => {
    const hasMusic = !!entry.music_file_url;
    if (hasMusic) {
      return { status: 'uploaded', color: 'green', label: 'Music Uploaded', icon: '✅' };
    } else {
      return { status: 'pending', color: 'yellow', label: 'Music Pending', icon: '🎵' };
    }
  };

  const musicStatus = getMusicStatus(entry);

  return (
    <div
      onClick={() => router.push(`/dashboard/entries/${entry.id}/edit`)}
      className={`bg-white/10 backdrop-blur-md rounded-xl border p-6 hover:bg-white/20 transition-all flex flex-col cursor-pointer ${
        entry.status === 'confirmed'
          ? 'border-green-400/40'
          : entry.status === 'registered'
          ? 'border-yellow-400/40'
          : entry.status === 'withdrawn'
          ? 'border-red-400/40'
          : 'border-gray-400/40'
      }`}
    >
      {/* Routine Number Badge + Registration Status */}
      <div className="flex justify-between items-start mb-3">
        {entry.entry_number ? (
          <div>
            <span className="px-3 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-lg font-bold rounded-lg shadow-md">
              #{entry.entry_number}{entry.entry_suffix || ''}
            </span>
            {entry.is_late_entry && (
              <span className="ml-2 px-2 py-1 bg-orange-500 text-white text-xs font-semibold rounded">
                LATE
              </span>
            )}
          </div>
        ) : (
          <span className="text-gray-500 text-sm">Pending Assignment</span>
        )}

        <StatusBadge status={(entry.status || 'draft') as any} />
      </div>

      {/* Header */}
      <div className="mb-4">
        <h3 className="text-xl font-bold text-white mb-1">{entry.title}</h3>
        <p className="text-sm text-gray-400">
          {entry.competitions?.name} ({entry.competitions?.year})
        </p>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        {entry.entry_number && (
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>🔢</span>
            <span className="text-purple-400">
              Routine #{entry.entry_number}{entry.entry_suffix || ''}
              {entry.is_late_entry && <span className="ml-2 text-xs text-yellow-400">(Late Routine)</span>}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-300">
          <span>🏢</span>
          <span>{entry.studios?.name}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-300">
          <span>🎭</span>
          <span>{entry.dance_categories?.name}</span>
        </div>

        {entry.classifications && (
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span>⭐</span>
            <span className="font-semibold">{entry.classifications.name}</span>
          </div>
        )}

        {entry.age_groups && (
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <span>📅</span>
            <span>{entry.age_groups.name}</span>
          </div>
        )}

        <div className="relative group flex items-center gap-2 text-sm text-gray-300">
          <span>👥</span>
          <span className="font-semibold">{entry.entry_participants?.length || 0} dancer{entry.entry_participants?.length !== 1 ? 's' : ''}</span>

          {/* Hover Tooltip with Dancer Names */}
          {entry.entry_participants && entry.entry_participants.length > 0 && (
            <div className="absolute left-0 top-6 z-50 hidden group-hover:block bg-gray-900 text-white text-sm p-3 rounded-lg shadow-xl min-w-[200px] border border-white/20">
              <p className="font-semibold mb-2">Dancers:</p>
              <ul className="space-y-1">
                {entry.entry_participants.map((p: any, i: number) => (
                  <li key={i}>{p.dancer_name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {entry.total_fee && (
          <div className="flex items-center gap-2 text-sm font-bold text-purple-400">
            <span>💰</span>
            <span>${(entry.total_fee || 0).toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Music Upload Status */}
      <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg border ${
        musicStatus.status === 'uploaded'
          ? 'bg-green-500/20 border-green-400/30'
          : 'bg-yellow-500/20 border-yellow-400/30'
      }`}>
        <span className={musicStatus.status === 'uploaded' ? 'text-green-400' : 'text-yellow-400'}>
          {musicStatus.icon}
        </span>
        <span className={`text-sm ${musicStatus.status === 'uploaded' ? 'text-green-300' : 'text-yellow-300'}`}>
          {musicStatus.label}
        </span>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-4 gap-2 mt-4" onClick={(e) => e.stopPropagation()}>
        <Link
          href={`/dashboard/entries/${entry.id}`}
          className="text-center bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm transition-all"
        >
          View
        </Link>
        <Link
          href={`/dashboard/entries/${entry.id}/edit`}
          className="text-center bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-3 py-2 rounded-lg text-sm transition-all"
        >
          Edit
        </Link>
        <Link
          href={`/dashboard/entries/${entry.id}/music`}
          className="text-center bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 px-3 py-2 rounded-lg text-sm transition-all"
        >
          🎵 Music
        </Link>
      </div>
    </div>
  );
}
