'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import DancersList from '@/components/DancersList';
import { trpc } from '@/lib/trpc';
import toast from 'react-hot-toast';

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
    const headers = ['First Name', 'Last Name', 'Date of Birth', 'Gender', 'Email', 'Phone', 'Skill Level', 'Studio'];
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <Link
              href="/dashboard"
              className="text-purple-400 hover:text-purple-300 text-sm mb-2 inline-block"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-4xl font-bold text-white mb-2">Dancers</h1>
            <p className="text-gray-400">Manage dancers and competition routines</p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/dashboard/dancers/add"
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"
            >
              <span>➕</span>
              <span>Add Dancers</span>
            </Link>
            <Link
              href="/dashboard/dancers/import"
              className="bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
            >
              <span>📤</span>
              <span>Import</span>
            </Link>
            <button
              onClick={handleExportCSV}
              className="bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200 flex items-center gap-2"
            >
              <span>📥</span>
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Dancers List */}
        <DancersList />
      </div>
    </main>
  );
}
