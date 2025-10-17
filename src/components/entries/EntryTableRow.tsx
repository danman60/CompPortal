import Link from 'next/link';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface EntryTableRowProps {
  entry: any;
  index: number;
  selectedEntries: Set<string>;
  onSelectEntry: (entryId: string) => void;
  onDetailClick: (entry: any) => void;
}

/**
 * Individual entry table row component
 * Extracted from EntriesList.tsx (lines 719-821)
 */
export function EntryTableRow({
  entry,
  index,
  selectedEntries,
  onSelectEntry,
  onDetailClick,
}: EntryTableRowProps) {
  const getMusicStatus = (entry: any) => {
    const hasMusic = !!entry.music_file_url;
    if (hasMusic) {
      return { status: 'uploaded', icon: '✅' };
    } else {
      return { status: 'pending', icon: '🎵' };
    }
  };

  const musicStatus = getMusicStatus(entry);

  return (
    <tr
      onClick={() => onDetailClick(entry)}
      className={`border-b border-white/10 hover:bg-gray-700/50 transition-colors cursor-pointer ${
        index % 2 === 0 ? 'bg-gray-800/40' : 'bg-gray-900/20'
      }`}
    >
      <td className="px-6 py-4" style={{ width: '60px' }}>
        <input
          type="checkbox"
          checked={selectedEntries.has(entry.id)}
          onChange={(e) => {
            e.stopPropagation();
            onSelectEntry(entry.id);
          }}
          className="w-4 h-4 cursor-pointer"
        />
      </td>
      <td className="px-6 py-4" style={{ width: '120px' }}>
        {entry.entry_number ? (
          <div>
            <span className="text-white font-bold">
              #{entry.entry_number}{entry.entry_suffix || ''}
            </span>
            {entry.is_late_entry && (
              <div className="text-xs text-orange-400 mt-1">LATE</div>
            )}
          </div>
        ) : (
          <span className="text-gray-500">Pending</span>
        )}
      </td>
      <td className="px-6 py-4" style={{ width: '250px' }}>
        <div className="text-white font-medium">{entry.title}</div>
        <div className="text-xs text-gray-400 mt-1">
          {entry.competitions?.name} ({entry.competitions?.year})
        </div>
      </td>
      <td className="px-6 py-4 text-gray-300" style={{ width: '150px' }}>
        {entry.dance_categories?.name || 'N/A'}
      </td>
      <td className="px-6 py-4 text-gray-300" style={{ width: '150px' }}>
        {entry.age_groups?.name || 'N/A'}
      </td>
      <td className="px-6 py-4" style={{ width: '200px' }}>
        <div className="text-white">
          {entry.entry_participants?.length || 0} dancer{entry.entry_participants?.length !== 1 ? 's' : ''}
        </div>
        {entry.entry_participants && entry.entry_participants.length > 0 && (
          <div className="text-xs text-gray-400 mt-1">
            {entry.entry_participants.slice(0, 2).map((p: any, i: number) => (
              <div key={p.id}>
                {p.dancer_name}
              </div>
            ))}
            {entry.entry_participants.length > 2 && (
              <div>+{entry.entry_participants.length - 2} more</div>
            )}
          </div>
        )}
      </td>
      <td className="px-6 py-4" style={{ width: '120px' }}>
        <span className={`px-2 py-1 rounded text-xs inline-flex items-center gap-1 ${
          musicStatus.status === 'uploaded'
            ? 'bg-green-500/20 text-green-400 border border-green-400/30'
            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30'
        }`}>
          <span>{musicStatus.icon}</span>
          <span>{musicStatus.status === 'uploaded' ? 'Uploaded' : 'Pending'}</span>
        </span>
      </td>
      <td className="px-6 py-4" style={{ width: '120px' }}>
        <StatusBadge status={(entry.status || 'draft') as any} />
      </td>
      <td className="px-6 py-4" style={{ width: '200px' }}>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/dashboard/entries/${entry.id}`}
            className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-xs transition-all"
          >
            View
          </Link>
          <Link
            href={`/dashboard/entries/${entry.id}/edit`}
            className="px-3 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded text-xs transition-all"
          >
            Edit
          </Link>
          <Link
            href={`/dashboard/entries/${entry.id}/music`}
            className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-xs transition-all"
          >
            🎵
          </Link>
        </div>
      </td>
    </tr>
  );
}
