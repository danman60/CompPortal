'use client';

import { useState, useRef } from 'react';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface CSVRow {
  title: string;
  category: string;
  choreographer?: string;
  props?: string;
}

export default function CSVImport() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [selectedReservationId, setSelectedReservationId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch user and studio data
  const { data: currentUser } = trpc.user.getCurrentUser.useQuery();
  const studioId = currentUser?.role === 'studio_director' ? currentUser.studio?.id : '';

  // Fetch approved reservations for the studio
  const { data: reservationsData } = trpc.reservation.getAll.useQuery(
    { studioId: studioId || '', status: 'approved' },
    { enabled: !!studioId }
  );

  // Fetch lookup data for categories and classifications
  const { data: lookupData } = trpc.lookup.getAllForEntry.useQuery();

  const createMutation = trpc.entry.create.useMutation({
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    parseCSV(selectedFile);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        toast.error('CSV file is empty');
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const titleIndex = headers.findIndex(h => h === 'title' || h === 'routine' || h === 'name');
      const categoryIndex = headers.findIndex(h => h === 'category' || h === 'dance_category');
      const choreographerIndex = headers.findIndex(h => h === 'choreographer');
      const propsIndex = headers.findIndex(h => h === 'props' || h === 'special_requirements');

      if (titleIndex === -1 || categoryIndex === -1) {
        toast.error('CSV must have "title" and "category" columns');
        return;
      }

      // Parse data rows
      const rows: CSVRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length > titleIndex && values[titleIndex]) {
          rows.push({
            title: values[titleIndex],
            category: values[categoryIndex] || '',
            choreographer: choreographerIndex >= 0 ? values[choreographerIndex] : undefined,
            props: propsIndex >= 0 ? values[propsIndex] : undefined,
          });
        }
      }

      if (rows.length === 0) {
        toast.error('No valid data rows found in CSV');
        return;
      }

      setCsvData(rows);
      toast.success(`Loaded ${rows.length} routines from CSV`);
    };

    reader.onerror = () => {
      toast.error('Error reading CSV file');
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!selectedReservationId) {
      toast.error('Please select a reservation');
      return;
    }

    if (!studioId) {
      toast.error('Studio not found');
      return;
    }

    const reservation = reservationsData?.reservations?.find(r => r.id === selectedReservationId);
    if (!reservation) {
      toast.error('Reservation not found');
      return;
    }

    const competitionId = reservation.competition_id;
    const categories = lookupData?.categories || [];
    const defaultClassification = lookupData?.classifications?.[0]?.id;

    if (!defaultClassification) {
      toast.error('No classifications found');
      return;
    }

    setIsProcessing(true);

    let successCount = 0;
    let errorCount = 0;

    for (const row of csvData) {
      try {
        // Find matching category by name
        const category = categories.find(
          c => c.name.toLowerCase() === row.category.toLowerCase()
        );

        if (!category) {
          console.warn(`Category not found for: ${row.category}`);
          errorCount++;
          continue;
        }

        await createMutation.mutateAsync({
          competition_id: competitionId,
          studio_id: studioId,
          title: row.title,
          category_id: category.id,
          classification_id: defaultClassification,
          choreographer: row.choreographer,
          special_requirements: row.props,
          entry_fee: 0,
          total_fee: 0,
          status: 'draft',
          participants: [],
        } as any);

        successCount++;
      } catch (error) {
        console.error(`Error importing ${row.title}:`, error);
        errorCount++;
      }
    }

    setIsProcessing(false);

    if (successCount > 0) {
      toast.success(`Imported ${successCount} routines successfully!`);
      if (errorCount > 0) {
        toast.error(`${errorCount} routines failed to import`);
      }
      router.push('/dashboard/entries');
    } else {
      toast.error('No routines were imported');
    }
  };

  const reservation = reservationsData?.reservations?.find(r => r.id === selectedReservationId);
  const usedSpaces = reservation?._count?.competition_entries || 0;
  const confirmedSpaces = reservation?.spaces_confirmed || 0;
  const remainingSpaces = confirmedSpaces - usedSpaces;
  const canImport = remainingSpaces >= csvData.length;

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/dashboard/entries"
        className="text-purple-400 hover:text-purple-300 text-sm mb-4 inline-block"
      >
        ← Back to Entries
      </Link>

      <h1 className="text-4xl font-bold text-white mb-2">Import Routines from CSV</h1>
      <p className="text-gray-400 mb-8">
        Upload a CSV file to bulk import routines
      </p>

      {/* CSV Format Helper */}
      <div className="bg-blue-500/10 border border-blue-400/30 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <div className="text-sm font-semibold text-blue-300 mb-1">CSV Format</div>
            <div className="text-xs text-blue-200">
              Required columns: <code className="bg-black/30 px-1 rounded">title</code>, <code className="bg-black/30 px-1 rounded">category</code>
              <br />
              Optional columns: <code className="bg-black/30 px-1 rounded">choreographer</code>, <code className="bg-black/30 px-1 rounded">props</code>
              <br />
              <br />
              Example:
              <pre className="bg-black/30 p-2 rounded mt-1 text-xs">
{`title,category,choreographer,props
My First Routine,Jazz,John Smith,Chairs
Second Dance,Contemporary,Jane Doe,None`}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: Upload CSV */}
      <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6">
        <h2 className="text-2xl font-bold text-white mb-4">Step 1: Upload CSV File</h2>
        <div className="flex gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all"
          >
            Choose CSV File
          </button>
          {file && (
            <div className="flex items-center gap-2 text-white">
              <span>📄</span>
              <span>{file.name}</span>
              <span className="text-gray-400">({csvData.length} routines)</span>
            </div>
          )}
        </div>
      </div>

      {/* Step 2: Select Reservation */}
      {csvData.length > 0 && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Step 2: Select Reservation</h2>
          <select
            value={selectedReservationId}
            onChange={(e) => setSelectedReservationId(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white"
          >
            <option value="" className="bg-gray-900">Select approved reservation</option>
            {reservationsData?.reservations?.map((res: any) => (
              <option key={res.id} value={res.id} className="bg-gray-900">
                {res.competitions?.name} ({res.competitions?.year}) - {res.spaces_confirmed} spaces
              </option>
            ))}
          </select>

          {selectedReservationId && reservation && (
            <div className="mt-4 p-4 bg-white/5 rounded-lg">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-gray-400">Space Available</div>
                  <div className="text-2xl font-bold text-white">
                    {remainingSpaces} / {confirmedSpaces}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400">Routines to Import</div>
                  <div className={`text-2xl font-bold ${canImport ? 'text-green-400' : 'text-red-400'}`}>
                    {csvData.length}
                  </div>
                </div>
              </div>
              {!canImport && (
                <div className="mt-3 text-xs text-red-300">
                  ⚠️ Not enough space available. Remove some routines or select a different reservation.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Preview */}
      {csvData.length > 0 && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Step 3: Preview Routines</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left text-sm text-gray-300 pb-2">#</th>
                  <th className="text-left text-sm text-gray-300 pb-2">Title</th>
                  <th className="text-left text-sm text-gray-300 pb-2">Category</th>
                  <th className="text-left text-sm text-gray-300 pb-2">Choreographer</th>
                  <th className="text-left text-sm text-gray-300 pb-2">Props</th>
                </tr>
              </thead>
              <tbody>
                {csvData.map((row, index) => (
                  <tr key={index} className="border-b border-white/10">
                    <td className="py-2 text-gray-400 text-sm">{index + 1}</td>
                    <td className="py-2 text-white text-sm">{row.title}</td>
                    <td className="py-2 text-gray-300 text-sm">{row.category}</td>
                    <td className="py-2 text-gray-300 text-sm">{row.choreographer || '-'}</td>
                    <td className="py-2 text-gray-300 text-sm">{row.props || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import Button */}
      {csvData.length > 0 && selectedReservationId && (
        <div className="flex justify-end gap-3">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!canImport || isProcessing}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? 'Importing...' : `Import ${csvData.length} Routines`}
          </button>
        </div>
      )}
    </div>
  );
}
