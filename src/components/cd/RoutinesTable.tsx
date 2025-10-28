import Link from 'next/link';

interface RoutinesTableProps {
  entries: any[];
  isLoading: boolean;
}

/**
 * Read-only table view of all routines for Competition Director
 * Click row to view routine detail
 */
export function RoutinesTable({ entries, isLoading }: RoutinesTableProps) {
  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
        <div className="text-white/60">Loading routines...</div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
        <div className="text-white/60">No routines found matching the selected filters.</div>
      </div>
    );
  }

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-white/5 border-b border-white/20">
              <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                Title
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                Studio
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                Dancers
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                Category
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                Dance Category
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                Age Division
              </th>
              <th className="px-6 py-4 text-left text-sm font-semibold text-white/80">
                Status
              </th>
              <th className="px-6 py-4 text-right text-sm font-semibold text-white/80">
                Fee
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const dancerCount = entry.entry_participants?.length || 0;
              const isDraft = entry.reservations?.status !== 'summarized';
              const statusColor = isDraft ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300';
              const statusLabel = isDraft ? 'Draft' : 'Summarized';

              return (
                <tr
                  key={entry.id}
                  className="border-b border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={() => {
                    // Navigate to routine detail (read-only for CD)
                    window.location.href = `/dashboard/entries/${entry.id}`;
                  }}
                >
                  <td className="px-6 py-4 text-white font-medium">{entry.title}</td>
                  <td className="px-6 py-4 text-white/70">{entry.studios?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-white/70">{dancerCount}</td>
                  <td className="px-6 py-4 text-white/70">{entry.dance_categories?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-white/70">{entry.classifications?.name || 'N/A'}</td>
                  <td className="px-6 py-4 text-white/70">{entry.age_groups?.name || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-white/70">
                    ${Number(entry.total_fee || 0).toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
