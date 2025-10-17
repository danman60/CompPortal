import SortableHeader from '@/components/SortableHeader';
import { EntryTableRow } from './EntryTableRow';

interface EntriesTableViewProps {
  sortedEntries: any[];
  selectedEntries: Set<string>;
  sortConfig: any;
  onRequestSort: (key: string) => void;
  onSelectAll: () => void;
  onSelectEntry: (entryId: string) => void;
  onDetailClick: (entry: any) => void;
}

/**
 * Table view for entries with sortable headers
 * Extracted from EntriesList.tsx (lines 687-825)
 */
export function EntriesTableView({
  sortedEntries,
  selectedEntries,
  sortConfig,
  onRequestSort,
  onSelectAll,
  onSelectEntry,
  onDetailClick,
}: EntriesTableViewProps) {
  return (
    <div className="bg-gray-900/90 backdrop-blur-md rounded-xl border border-white/20 shadow-2xl overflow-hidden">
      {/* Fixed Header Table */}
      <div className="overflow-x-auto bg-gray-800 border-b border-white/30">
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-gray-800">
              <th className="px-6 py-4 text-left text-sm font-semibold text-white" style={{ width: '60px' }}>
                <input
                  type="checkbox"
                  checked={selectedEntries.size === sortedEntries.length && sortedEntries.length > 0}
                  onChange={onSelectAll}
                  className="w-4 h-4 cursor-pointer"
                />
              </th>
              <SortableHeader label="Routine #" sortKey="entry_number" sortConfig={sortConfig} onSort={onRequestSort} className="bg-gray-800" style={{ width: '120px' }} />
              <SortableHeader label="Title" sortKey="title" sortConfig={sortConfig} onSort={onRequestSort} className="bg-gray-800" style={{ width: '250px' }} />
              <SortableHeader label="Category" sortKey="dance_categories.name" sortConfig={sortConfig} onSort={onRequestSort} className="bg-gray-800" style={{ width: '150px' }} />
              <SortableHeader label="Age Group" sortKey="age_groups.name" sortConfig={sortConfig} onSort={onRequestSort} className="bg-gray-800" style={{ width: '150px' }} />
              <SortableHeader label="Dancers" sortKey="entry_participants" sortConfig={sortConfig} onSort={onRequestSort} className="bg-gray-800" style={{ width: '200px' }} />
              <SortableHeader label="Music" sortKey="music_file_url" sortConfig={sortConfig} onSort={onRequestSort} className="bg-gray-800" style={{ width: '120px' }} />
              <SortableHeader label="Status" sortKey="status" sortConfig={sortConfig} onSort={onRequestSort} className="bg-gray-800" style={{ width: '120px' }} />
              <th className="px-6 py-4 text-left text-sm font-semibold text-white bg-gray-800" style={{ width: '200px' }}>Actions</th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Scrollable Body Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[600px]" style={{ scrollbarGutter: 'stable' }}>
        <table className="w-full table-fixed">
          <tbody>
            {sortedEntries.map((entry, index) => (
              <EntryTableRow
                key={entry.id}
                entry={entry}
                index={index}
                selectedEntries={selectedEntries}
                onSelectEntry={onSelectEntry}
                onDetailClick={onDetailClick}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
