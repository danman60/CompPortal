'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';

interface BulkStudioImportModalProps {
  onClose: () => void;
}

interface StudioImportRow {
  studioName: string;
  studioCode: string;
  ownerEmail: string;
  firstName: string;
  lastName: string;
  phone?: string;
  competitionId: string;
  spaces: number;
}

export default function BulkStudioImportModal({ onClose }: BulkStudioImportModalProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<StudioImportRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importResults, setImportResults] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const utils = trpc.useContext();
  const importMutation = trpc.admin.bulkImportStudios.useMutation({
    onSuccess: (result) => {
      setImportResults(result);
      utils.studio.getAll.invalidate();
    },
    onError: (error) => {
      alert(`Import failed: ${error.message}`);
    },
  });

  const { data: competitions } = trpc.competition.getAll.useQuery();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setCsvFile(file);
    parseCSV(file);
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length < 2) {
        setErrors(['CSV file is empty or has no data rows']);
        return;
      }

      // Skip header row
      const dataRows = lines.slice(1);
      const parsed: StudioImportRow[] = [];
      const parseErrors: string[] = [];

      dataRows.forEach((line, index) => {
        const rowNum = index + 2; // +2 because 0-indexed and skipped header
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));

        if (values.length < 7) {
          parseErrors.push(`Row ${rowNum}: Not enough columns (need at least 7)`);
          return;
        }

        const [studioName, studioCode, ownerEmail, firstName, lastName, phone, competitionId, spacesStr] = values;

        // Validation
        if (!studioName) parseErrors.push(`Row ${rowNum}: Missing studio name`);
        if (!studioCode || studioCode.length < 3) parseErrors.push(`Row ${rowNum}: Studio code must be at least 3 characters`);
        if (!ownerEmail || !ownerEmail.includes('@')) parseErrors.push(`Row ${rowNum}: Invalid email`);
        if (!firstName) parseErrors.push(`Row ${rowNum}: Missing first name`);
        if (!lastName) parseErrors.push(`Row ${rowNum}: Missing last name`);
        if (!competitionId) parseErrors.push(`Row ${rowNum}: Missing competition ID`);

        const spaces = parseInt(spacesStr || '0');
        if (isNaN(spaces) || spaces < 1) parseErrors.push(`Row ${rowNum}: Spaces must be a positive number`);

        if (parseErrors.filter(e => e.startsWith(`Row ${rowNum}:`)).length === 0) {
          parsed.push({
            studioName,
            studioCode,
            ownerEmail,
            firstName,
            lastName,
            phone: phone || undefined,
            competitionId,
            spaces,
          });
        }
      });

      setErrors(parseErrors);
      setParsedData(parsed);

      if (parsed.length > 0) {
        setShowPreview(true);
      }
    };

    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedData.length === 0) {
      alert('No valid data to import');
      return;
    }

    if (!confirm(`Import ${parsedData.length} studio(s) with pre-approved reservations?`)) {
      return;
    }

    await importMutation.mutateAsync(parsedData);
  };

  const getCompetitionName = (id: string) => {
    const comp = competitions?.competitions?.find(c => c.id === id);
    return comp ? `${comp.name} (${comp.year})` : id;
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-slate-900 to-gray-900 rounded-xl border border-white/20 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Bulk Studio Import</h2>
              <p className="text-gray-400 text-sm mt-1">Import studios from CSV with pre-approved reservations</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* CSV Format Instructions */}
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4">
            <h3 className="text-blue-400 font-semibold mb-2">📋 CSV Format</h3>
            <p className="text-gray-300 text-sm mb-2">Your CSV file should have these columns (in order):</p>
            <code className="block bg-black/30 p-2 rounded text-xs text-gray-300 overflow-x-auto">
              studioName,studioCode,ownerEmail,firstName,lastName,phone,competitionId,spaces
            </code>
            <p className="text-gray-400 text-xs mt-2">
              Example: "Dance Studio A","STDA","owner@studio.com","Jane","Doe","555-1234","uuid-here",15
            </p>
          </div>

          {/* File Upload */}
          {!importResults && (
            <div>
              <label className="block text-white font-medium mb-2">Upload CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="block w-full text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-purple-500 file:text-white hover:file:bg-purple-600 cursor-pointer"
              />
            </div>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4">
              <h3 className="text-red-400 font-semibold mb-2">⚠️ Validation Errors</h3>
              <ul className="text-sm text-gray-300 space-y-1 max-h-40 overflow-y-auto">
                {errors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          {showPreview && parsedData.length > 0 && !importResults && (
            <div>
              <h3 className="text-white font-semibold mb-3">
                Preview ({parsedData.length} studio{parsedData.length > 1 ? 's' : ''})
              </h3>
              <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/10 sticky top-0">
                      <tr className="border-b border-white/10">
                        <th className="px-3 py-2 text-left text-white font-semibold">Studio</th>
                        <th className="px-3 py-2 text-left text-white font-semibold">Code</th>
                        <th className="px-3 py-2 text-left text-white font-semibold">Owner</th>
                        <th className="px-3 py-2 text-left text-white font-semibold">Competition</th>
                        <th className="px-3 py-2 text-left text-white font-semibold">Spaces</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.map((row, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                          <td className="px-3 py-2 text-gray-300">{row.studioName}</td>
                          <td className="px-3 py-2 text-gray-300">{row.studioCode}</td>
                          <td className="px-3 py-2 text-gray-300">
                            {row.firstName} {row.lastName}
                            <div className="text-xs text-gray-500">{row.ownerEmail}</div>
                          </td>
                          <td className="px-3 py-2 text-gray-300 text-xs">{getCompetitionName(row.competitionId)}</td>
                          <td className="px-3 py-2 text-gray-300">{row.spaces}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-400/30 rounded-lg p-4">
                <h3 className="text-green-400 font-semibold mb-2">✅ Import Complete</h3>
                <p className="text-gray-300">
                  Successfully imported {importResults.success} studio(s).
                  {importResults.failed > 0 && ` ${importResults.failed} failed.`}
                </p>
              </div>

              {importResults.errors && importResults.errors.length > 0 && (
                <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4">
                  <h3 className="text-red-400 font-semibold mb-2">Errors</h3>
                  <ul className="text-sm text-gray-300 space-y-1 max-h-40 overflow-y-auto">
                    {importResults.errors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-white/10 flex gap-3 justify-end">
          {!importResults ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={parsedData.length === 0 || importMutation.isPending}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importMutation.isPending ? 'Importing...' : `Import ${parsedData.length} Studio(s)`}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
