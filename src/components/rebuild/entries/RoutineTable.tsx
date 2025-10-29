import Link from 'next/link';
import { Table, TableHeader, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/rebuild/ui/Table';
import { Badge } from '@/components/rebuild/ui/Badge';
import { Button } from '@/components/rebuild/ui/Button';

interface Entry {
  id: string;
  title?: string;
  entry_number?: number;
  status?: string;
  total_fee?: number;
  is_title_upgrade?: boolean;
  dance_categories?: { name: string };
  entry_size_categories?: { name: string };
  age_groups?: { name: string };
  [key: string]: any;
}

interface RoutineTableProps {
  entries: Entry[];
  onDelete: (id: string) => Promise<void>;
}

/**
 * Table view for routines
 * Sortable columns with compact display
 */
export function RoutineTable({ entries, onDelete }: RoutineTableProps) {
  const handleDelete = async (id: string, title: string) => {
    if (confirm(`Delete routine "${title}"?`)) {
      await onDelete(id);
    }
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHeaderCell>#</TableHeaderCell>
          <TableHeaderCell>Title</TableHeaderCell>
          <TableHeaderCell>Category</TableHeaderCell>
          <TableHeaderCell>Size</TableHeaderCell>
          <TableHeaderCell>Age</TableHeaderCell>
          <TableHeaderCell>Title Status</TableHeaderCell>
          <TableHeaderCell align="right">Fee</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell align="right">Actions</TableHeaderCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>
              <span className="text-white/60">{entry.entry_number || '—'}</span>
            </TableCell>
            <TableCell>
              <Link
                href={`/dashboard/entries/${entry.id}`}
                className="text-white hover:text-purple-300 transition-colors font-medium"
              >
                {entry.title || 'Untitled'}
              </Link>
            </TableCell>
            <TableCell>
              <span className="text-white/80">{entry.dance_categories?.name || '—'}</span>
            </TableCell>
            <TableCell>
              <span className="text-white/80">{entry.entry_size_categories?.name || '—'}</span>
            </TableCell>
            <TableCell>
              <span className="text-white/80">{entry.age_groups?.name || '—'}</span>
            </TableCell>
            <TableCell>
              {entry.is_title_upgrade ? (
                <span className="inline-flex items-center px-2 py-1 bg-yellow-500/20 border border-yellow-400/50 rounded-full text-yellow-200 text-xs font-semibold">
                  +$30 Upgrade
                </span>
              ) : (
                <span className="text-white/40">—</span>
              )}
            </TableCell>
            <TableCell align="right">
              <span className="text-white font-medium">
                ${entry.total_fee ? (typeof entry.total_fee === 'number' ? entry.total_fee.toFixed(2) : Number(entry.total_fee).toFixed(2)) : '0.00'}
              </span>
            </TableCell>
            <TableCell>
              <Badge status={entry.status || 'draft' as any} />
            </TableCell>
            <TableCell align="right">
              <div className="flex gap-2 justify-end">
                <Button
                  href={`/dashboard/entries/${entry.id}`}
                  variant="secondary"
                  className="text-sm px-3 py-1"
                >
                  View
                </Button>
                <Button
                  onClick={() => handleDelete(entry.id, entry.title || 'Untitled')}
                  variant="danger"
                  className="text-sm px-3 py-1"
                >
                  Delete
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
