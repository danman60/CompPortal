'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import DancersList from '@/components/DancersList';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui';
import { Plus, Upload, Download } from '@/lib/icons';

export default function DancersPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const { data: dancersData } = trpc.dancer.getAll.useQuery();

  const handleExportCSV = () => {
    if (!dancersData?.dancers || dancersData.dancers.length === 0) {
      toast.error('No dancers to export');
      return;
    }

    // Generate CSV content
    const headers = ['First Name', 'Last Name', 'Date of Birth', 'Gender', 'Email', 'Phone', 'Classification', 'Studio'];
    const rows = dancersData.dancers.map(dancer => [
      dancer.first_name || '',
      dancer.last_name || '',
      dancer.date_of_birth || '',
      dancer.gender || '',
      dancer.email || '',
      dancer.phone || '',
      dancer.skill_level || '',
      dancer.studios?.name || ''
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dancers-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${dancersData.dancers.length} dancers to CSV`);
  };

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();

      if (error || !user) {
        router.push('/login');
      } else {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router]);

  if (isChecking) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
          <div>
            <Link
              href="/dashboard"
              className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Dancers</h1>
            <p className="text-gray-400 text-sm md:text-base">Manage dancers and competition routines</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Link href="/dashboard/dancers/add">
              <Button variant="primary" size="lg" className="w-full sm:w-auto">
                <Plus size={20} strokeWidth={2} />
                <span>Add Dancers</span>
              </Button>
            </Link>
            <Link href="/dashboard/dancers/import">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                <Upload size={20} strokeWidth={2} />
                <span>Import</span>
              </Button>
            </Link>
            <Button variant="secondary" size="lg" onClick={handleExportCSV} className="w-full sm:w-auto">
              <Download size={20} strokeWidth={2} />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Dancers List */}
        <DancersList />
      </div>
    </main>
  );
}
