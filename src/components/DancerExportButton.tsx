'use client';

import { trpc } from '@/lib/trpc';

export default function DancerExportButton() {
  const { data: existingDancers } = trpc.dancer.getAll.useQuery({ limit: 1000 });

  const exportDancers = () => {
    if (!existingDancers?.dancers || existingDancers.dancers.length === 0) {
      alert('No dancers to export');
      return;
    }

    // Create CSV headers
    const headers = ['First Name', 'Last Name', 'Date of Birth', 'Gender', 'Email', 'Phone'];

    // Create CSV rows
    const rows = existingDancers.dancers.map((dancer) => [
      dancer.first_name,
      dancer.last_name,
      dancer.date_of_birth || '',
      dancer.gender || '',
      dancer.email || '',
      dancer.phone || '',
    ]);

    // Combine headers and rows
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');

    // Create and download file
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dancers_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      onClick={exportDancers}
      className="bg-white/10 text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-all"
    >
      Export to CSV
    </button>
  );
}
