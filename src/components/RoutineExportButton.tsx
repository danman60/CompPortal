'use client';

import { trpc } from '@/lib/trpc';

export default function RoutineExportButton() {
  const { data: entriesData } = trpc.entry.getAll.useQuery({ limit: 1000 });

  const exportRoutines = () => {
    if (!entriesData?.entries || entriesData.entries.length === 0) {
      alert('No routines to export');
      return;
    }

    // Create CSV headers
    const headers = ['Title', 'Props', 'Dancers', 'Choreographer'];

    // Create CSV rows
    const rows = entriesData.entries.map((entry: any) => {
      // Get dancer names from participants
      const dancerNames = entry.participants
        ?.map((p: any) => `${p.dancers?.first_name || ''} ${p.dancers?.last_name || ''}`.trim())
        .filter((name: string) => name)
        .join(', ') || '';

      return [
        entry.title || '',
        entry.special_requirements || '',
        dancerNames,
        entry.choreographer || '',
      ];
    });

    // Combine headers and rows
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `routines_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportRoutines}
      className="bg-white/10 text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-all"
    >
      Export to CSV
    </button>
  );
}
