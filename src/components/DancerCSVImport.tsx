'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';
import { mapCSVHeaders, DANCER_CSV_FIELDS } from '@/lib/csv-utils';

type ParsedDancer = {
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: string;
  email?: string;
  phone?: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  registration_number?: string;
  skill_level?: string;
};

// Flexible date parsing utility
function parseFlexibleDate(dateStr: string): string | null {
  if (!dateStr) return null;

  const trimmed = dateStr.trim();

  // Already in ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Try MM/DD/YYYY or M/D/YYYY
  const usFormat = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (usFormat) {
    const [, month, day, year] = usFormat;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Try DD.MM.YYYY (European format)
  const euFormat = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (euFormat) {
    const [, day, month, year] = euFormat;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
}

type ValidationError = {
  row: number;
  field: string;
  message: string;
};

export default function DancerCSVImport() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedDancer[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [headerSuggestions, setHeaderSuggestions] = useState<Array<{ header: string; field: string; confidence: number }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'validated' | 'importing' | 'success' | 'error'>('idle');
  const [studioId, setStudioId] = useState<string | null>(null);

  // Get the user's studio information
  const { data: userStudio } = trpc.studio.getAll.useQuery();

  // Extract studio_id when data loads
  useEffect(() => {
    if (userStudio?.studios && userStudio.studios.length > 0) {
      // For Studio Directors, they'll only have access to their own studio
      setStudioId(userStudio.studios[0].id);
    }
  }, [userStudio]);

  const importMutation = trpc.dancer.batchCreate.useMutation({
    onSuccess: (result) => {
      setImportStatus('success');
      setTimeout(() => {
        router.push('/dashboard/dancers');
      }, 2000);
    },
    onError: (error) => {
      setImportStatus('error');
      console.error('Import error:', error);
    },
  });

  const parseCSV = (text: string): ParsedDancer[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const csvHeaders = lines[0].split(',').map((h) => h.trim());

    // Map CSV headers to canonical field names using flexible matching
    const { mapping, unmatched, suggestions } = mapCSVHeaders(csvHeaders, DANCER_CSV_FIELDS, 0.7);

    // Store suggestions for display to user
    setHeaderSuggestions(suggestions);

    // Warn about unmatched headers
    if (unmatched.length > 0) {
      console.warn('Unmatched CSV headers:', unmatched);
    }

    const data: ParsedDancer[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: any = {};

      csvHeaders.forEach((csvHeader, index) => {
        const canonicalField = mapping[csvHeader];
        if (canonicalField && values[index]) {
          // Use flexible date parsing for date_of_birth
          if (canonicalField === 'date_of_birth') {
            const parsedDate = parseFlexibleDate(values[index]);
            if (parsedDate) {
              row[canonicalField] = parsedDate;
            }
          } else {
            row[canonicalField] = values[index];
          }
        }
      });

      data.push(row as ParsedDancer);
    }

    return data;
  };

  const validateData = (data: ParsedDancer[]): ValidationError[] => {
    const errors: ValidationError[] = [];

    data.forEach((dancer, index) => {
      const rowNum = index + 2; // +2 because row 1 is header, and we're 0-indexed

      // Required fields (only first and last name)
      if (!dancer.first_name || dancer.first_name.trim() === '') {
        errors.push({ row: rowNum, field: 'first_name', message: 'First name is required' });
      }
      if (!dancer.last_name || dancer.last_name.trim() === '') {
        errors.push({ row: rowNum, field: 'last_name', message: 'Last name is required' });
      }

      // Date validation (only if provided - already parsed in parseCSV)
      if (dancer.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(dancer.date_of_birth)) {
        errors.push({ row: rowNum, field: 'date_of_birth', message: 'Could not parse date. Try MM/DD/YYYY or YYYY-MM-DD' });
      }

      // Email validation (only if provided and not empty)
      if (dancer.email && dancer.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dancer.email)) {
        errors.push({ row: rowNum, field: 'email', message: 'Invalid email format' });
      }
      if (dancer.parent_email && dancer.parent_email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dancer.parent_email)) {
        errors.push({ row: rowNum, field: 'parent_email', message: 'Invalid parent email format' });
      }
    });

    return errors;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setImportStatus('parsing');
    setIsProcessing(true);

    try {
      const text = await uploadedFile.text();
      const parsed = parseCSV(text);
      setParsedData(parsed);

      const errors = validateData(parsed);
      setValidationErrors(errors);

      if (errors.length === 0) {
        setImportStatus('validated');
      } else {
        setImportStatus('error');
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      setImportStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = () => {
    if (validationErrors.length > 0) return;
    if (!studioId) {
      setImportStatus('error');
      console.error('No studio ID available');
      return;
    }

    setImportStatus('importing');
    importMutation.mutate({
      studio_id: studioId,
      dancers: parsedData,
    });
  };

  const handleReset = () => {
    setFile(null);
    setParsedData([]);
    setValidationErrors([]);
    setImportStatus('idle');
  };

  return (
    <div className="space-y-6">
      {/* File Upload */}
      {importStatus === 'idle' && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
          <div className="flex flex-col items-center justify-center">
            <div className="text-6xl mb-4">📄</div>
            <h3 className="text-xl font-semibold text-white mb-2">Upload CSV File</h3>
            <p className="text-gray-400 mb-6 text-center">
              Select a CSV file containing dancer information to import
            </p>

            <label className="cursor-pointer bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              Choose CSV File
            </label>
          </div>
        </div>
      )}

      {/* Processing */}
      {isProcessing && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <h3 className="text-xl font-semibold text-white mb-2">Processing CSV...</h3>
          <p className="text-gray-400">Parsing and validating data</p>
        </div>
      )}

      {/* Validation Errors */}
      {importStatus === 'error' && validationErrors.length > 0 && (
        <div className="bg-red-500/10 backdrop-blur-md rounded-xl border border-red-400/30 p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">❌</div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-red-400 mb-2">Validation Errors</h3>
              <p className="text-gray-300 mb-4">
                Found {validationErrors.length} error(s) in the CSV file. Please fix these issues and try again.
              </p>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {validationErrors.map((error, index) => (
                  <div key={index} className="bg-black/40 p-3 rounded-lg text-sm">
                    <span className="text-red-400 font-semibold">Row {error.row}</span>
                    <span className="text-gray-400"> - </span>
                    <span className="text-purple-400">{error.field}</span>
                    <span className="text-gray-400">: </span>
                    <span className="text-gray-200">{error.message}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleReset}
                className="mt-4 bg-white/10 text-white px-6 py-2 rounded-lg hover:bg-white/20 transition-all"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validated - Ready to Import */}
      {importStatus === 'validated' && (
        <div className="space-y-6">
          <div className="bg-green-500/10 backdrop-blur-md rounded-xl border border-green-400/30 p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">✅</div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-green-400 mb-2">CSV Validated Successfully</h3>
                <p className="text-gray-300 mb-4">
                  Found {parsedData.length} dancer(s) ready to import. Review the data below and click Import to proceed.
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={handleImport}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
                  >
                    Import {parsedData.length} Dancer(s)
                  </button>
                  <button
                    onClick={handleReset}
                    className="bg-white/10 text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Table */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 overflow-x-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Preview ({parsedData.length} dancers)</h3>
            {userStudio && (
              <p className="text-sm text-gray-400 mb-4">
                Importing to: <span className="text-purple-400 font-semibold">{userStudio.studios[0]?.name}</span>
              </p>
            )}
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase bg-black/40 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">First Name</th>
                    <th className="px-4 py-3">Last Name</th>
                    <th className="px-4 py-3">Date of Birth</th>
                    <th className="px-4 py-3">Gender</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((dancer, index) => (
                    <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                      <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                      <td className="px-4 py-3 text-white">{dancer.first_name}</td>
                      <td className="px-4 py-3 text-white">{dancer.last_name}</td>
                      <td className="px-4 py-3 text-gray-300">{dancer.date_of_birth || '-'}</td>
                      <td className="px-4 py-3 text-gray-300">{dancer.gender || '-'}</td>
                      <td className="px-4 py-3 text-gray-300">{dancer.email || '-'}</td>
                      <td className="px-4 py-3 text-gray-300">{dancer.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Importing */}
      {importStatus === 'importing' && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
          <div className="animate-bounce text-6xl mb-4">⬆️</div>
          <h3 className="text-xl font-semibold text-white mb-2">Importing Dancers...</h3>
          <p className="text-gray-400">Please wait while we add {parsedData.length} dancer(s) to the database</p>
        </div>
      )}

      {/* Success */}
      {importStatus === 'success' && (
        <div className="bg-green-500/10 backdrop-blur-md rounded-xl border border-green-400/30 p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-green-400 mb-2">Import Successful!</h3>
          <p className="text-gray-300">
            Successfully imported {parsedData.length} dancer(s). Redirecting to dancers list...
          </p>
        </div>
      )}
    </div>
  );
}
