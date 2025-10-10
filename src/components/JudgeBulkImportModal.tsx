'use client';
import { useState } from 'react';

interface BulkJudgeImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface JudgeRow {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  certification?: string;
  errors?: string[];
}

export default function JudgeBulkImportModal({ isOpen, onClose, onImportComplete }: BulkJudgeImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [judges, setJudges] = useState<JudgeRow[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFile(file);
    setIsValidating(true);

    // Parse CSV
    const text = await file.text();
    const rows = text.split('\n').slice(1); // Skip header

    const parsed: JudgeRow[] = rows
      .filter(row => row.trim())
      .map(row => {
        const [firstName, lastName, email, phone, certification] = row.split(',').map(s => s.trim());

        const errors: string[] = [];
        if (!firstName) errors.push('First name required');
        if (!lastName) errors.push('Last name required');
        if (!email) errors.push('Email required');
        if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errors.push('Invalid email');

        return { firstName, lastName, email, phone, certification, errors: errors.length > 0 ? errors : undefined };
      });

    setJudges(parsed);
    setIsValidating(false);
  };

  const handleImport = async () => {
    setIsImporting(true);

    try {
      // Filter valid judges only
      const validJudges = judges.filter(j => !j.errors);

      // Call backend mutation
      // await trpc.judge.bulkImport.mutate({ judges: validJudges });

      onImportComplete();
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = judges.filter(j => !j.errors).length;
  const errorCount = judges.filter(j => j.errors).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-white/20 shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/20">
          <h2 className="text-2xl font-bold text-white">Bulk Import Judges</h2>
          <p className="text-sm text-gray-400 mt-1">Upload CSV file with judge information</p>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* File upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-200 mb-2">
              CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white"
            />
            <p className="text-xs text-gray-400 mt-2">
              Format: firstName, lastName, email, phone, certification
            </p>
          </div>

          {/* Preview table */}
          {judges.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left p-2 text-gray-400 text-sm">First Name</th>
                    <th className="text-left p-2 text-gray-400 text-sm">Last Name</th>
                    <th className="text-left p-2 text-gray-400 text-sm">Email</th>
                    <th className="text-left p-2 text-gray-400 text-sm">Phone</th>
                    <th className="text-left p-2 text-gray-400 text-sm">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {judges.map((judge, i) => (
                    <tr key={i} className={`border-b border-white/10 ${judge.errors ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                      <td className="p-2 text-white text-sm">{judge.firstName}</td>
                      <td className="p-2 text-white text-sm">{judge.lastName}</td>
                      <td className="p-2 text-white text-sm">{judge.email}</td>
                      <td className="p-2 text-gray-400 text-sm">{judge.phone || '-'}</td>
                      <td className="p-2 text-sm">
                        {judge.errors ? (
                          <span className="text-red-400">{judge.errors.join(', ')}</span>
                        ) : (
                          <span className="text-green-400">Valid</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Summary */}
          {judges.length > 0 && (
            <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
              <p className="text-sm text-gray-300">
                <span className="text-green-400 font-medium">{validCount} valid</span>
                {' • '}
                <span className="text-red-400 font-medium">{errorCount} errors</span>
                {' • '}
                <span className="text-gray-400">{judges.length} total</span>
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 border-t border-white/20 bg-white/5">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={validCount === 0 || isImporting}
            className="px-6 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting ? 'Importing...' : `Import ${validCount} Judges`}
          </button>
        </div>
      </div>
    </div>
  );
}
