'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';
import { mapCSVHeaders, DANCER_CSV_FIELDS } from '@/lib/csv-utils';
import ExcelJS from 'exceljs';

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

  // Try YYYY/MM/DD or YYYY/M/D
  const isoSlashFormat = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoSlashFormat) {
    const [, year, month, day] = isoSlashFormat;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [excelWorkbook, setExcelWorkbook] = useState<ExcelJS.Workbook | null>(null);
  const [duplicates, setDuplicates] = useState<Array<{ row: number; name: string }>>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importError, setImportError] = useState<string | null>(null);

  // Get the current user's studio information
  const { data: currentUser } = trpc.user.getCurrentUser.useQuery();

  // Get existing dancers for duplicate detection
  const { data: existingDancers } = trpc.dancer.getAll.useQuery(
    { limit: 1000 },
    { enabled: !!studioId }
  );

  // Extract studio_id when user data loads
  useEffect(() => {
    if (currentUser?.studio?.id) {
      // Use the studio from the current user's profile
      setStudioId(currentUser.studio.id);
    }
  }, [currentUser]);

  // Bug Fix: Remove onSuccess/onError to avoid race condition
  // Handle success/error logic in handleImport function instead
  const importMutation = trpc.dancer.batchCreate.useMutation();

  const parseExcel = (workbook: ExcelJS.Workbook, sheetName: string): ParsedDancer[] => {
    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) return [];

    // Get rows as array (ExcelJS returns rows including header)
    const rows = worksheet.getSheetValues();
    if (!rows || rows.length < 2) return []; // Need at least header + 1 data row

    // First row is header (rows[1] in ExcelJS, it's 1-indexed)
    const headerRow = rows[1];
    if (!Array.isArray(headerRow)) return [];

    // Convert header row to strings and filter out empty headers
    const excelHeaders = headerRow
      .map((cell: any) => (cell !== null && cell !== undefined ? String(cell).trim() : ''))
      .filter((h: string) => h !== '');

    // Map Excel headers to canonical field names using flexible matching
    const { mapping, unmatched, suggestions } = mapCSVHeaders(excelHeaders, DANCER_CSV_FIELDS, 0.7);

    // Store suggestions for display to user
    setHeaderSuggestions(suggestions);

    // Warn about unmatched headers
    if (unmatched.length > 0) {
      console.warn('Unmatched Excel headers:', unmatched);
    }

    const data: ParsedDancer[] = [];

    // Process data rows (skip row 1 which is header)
    for (let i = 2; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row)) continue;

      const dancerRow: any = {};

      excelHeaders.forEach((excelHeader, colIndex) => {
        const canonicalField = mapping[excelHeader];
        const cellValue = row[colIndex + 1]; // ExcelJS columns are 1-indexed

        if (canonicalField && cellValue !== undefined && cellValue !== null) {
          // Handle Date objects from Excel
          if (cellValue instanceof Date) {
            if (canonicalField === 'date_of_birth') {
              const year = cellValue.getFullYear();
              const month = String(cellValue.getMonth() + 1).padStart(2, '0');
              const day = String(cellValue.getDate()).padStart(2, '0');
              dancerRow[canonicalField] = `${year}-${month}-${day}`;
            } else {
              dancerRow[canonicalField] = cellValue.toISOString().split('T')[0];
            }
          } else {
            const value = String(cellValue).trim();

            // Skip completely empty values
            if (value === '') return;

            // Use flexible date parsing for date_of_birth if string
            if (canonicalField === 'date_of_birth') {
              const parsedDate = parseFlexibleDate(value);
              if (parsedDate) {
                dancerRow[canonicalField] = parsedDate;
              }
            } else {
              dancerRow[canonicalField] = value;
            }
          }
        }
      });

      // Skip completely empty rows
      if (Object.keys(dancerRow).length > 0) {
        data.push(dancerRow as ParsedDancer);
      }
    }

    return data;
  };

  // Proper CSV parsing that handles quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current.trim());
    return result;
  };

  const parseCSV = (text: string): ParsedDancer[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const csvHeaders = parseCSVLine(lines[0]);

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
      // Skip empty lines
      if (!lines[i].trim()) continue;

      const values = parseCSVLine(lines[i]);
      const row: any = {};

      csvHeaders.forEach((csvHeader, index) => {
        const canonicalField = mapping[csvHeader];
        if (canonicalField && values[index] !== undefined && values[index] !== null) {
          const value = values[index].trim();

          // Skip completely empty values
          if (value === '') return;

          // Use flexible date parsing for date_of_birth
          if (canonicalField === 'date_of_birth') {
            const parsedDate = parseFlexibleDate(value);
            if (parsedDate) {
              row[canonicalField] = parsedDate;
            }
          } else {
            row[canonicalField] = value;
          }
        }
      });

      // Skip completely empty rows
      if (Object.keys(row).length > 0) {
        data.push(row as ParsedDancer);
      }
    }

    return data;
  };

  const validateData = (data: ParsedDancer[]): ValidationError[] => {
    const errors: ValidationError[] = [];
    const foundDuplicates: Array<{ row: number; name: string }> = [];

    data.forEach((dancer, index) => {
      const rowNum = index + 2; // +2 because row 1 is header, and we're 0-indexed

      // Required fields (only first and last name)
      if (!dancer.first_name || dancer.first_name.trim() === '') {
        errors.push({ row: rowNum, field: 'first_name', message: 'First name is required' });
      }
      if (!dancer.last_name || dancer.last_name.trim() === '') {
        errors.push({ row: rowNum, field: 'last_name', message: 'Last name is required' });
      }

      // Check for duplicates in existing dancers
      if (dancer.first_name && dancer.last_name && existingDancers?.dancers) {
        const isDuplicate = existingDancers.dancers.some(
          (existing) =>
            existing.first_name.toLowerCase() === dancer.first_name.toLowerCase() &&
            existing.last_name.toLowerCase() === dancer.last_name.toLowerCase()
        );

        if (isDuplicate) {
          foundDuplicates.push({
            row: rowNum,
            name: `${dancer.first_name} ${dancer.last_name}`,
          });
        }
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

    // Store duplicates for warning display
    setDuplicates(foundDuplicates);

    return errors;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setImportStatus('parsing');
    setIsProcessing(true);
    setValidationErrors([]);
    setDuplicates([]);

    try {
      const fileExt = uploadedFile.name.split('.').pop()?.toLowerCase();
      let parsed: ParsedDancer[] = [];

      if (fileExt === 'xlsx' || fileExt === 'xls') {
        // Handle Excel files
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const workbook = new ExcelJS.Workbook();

        try {
          await workbook.xlsx.load(arrayBuffer);
        } catch (excelError: any) {
          // ExcelJS only supports .xlsx format, not legacy .xls
          throw new Error(
            'This file appears to be in an old Excel format (.xls) or is corrupted.\n\n' +
            'Try these solutions:\n' +
            '1. Open the file in Excel and Save As → .xlsx format\n' +
            '2. Save as CSV instead\n' +
            '3. Upload your file to ChatGPT and ask: "Please reformat this as a clean CSV file"\n\n' +
            'If the file is corrupted, ChatGPT can often extract and reformat the data.'
          );
        }

        // Get worksheet names
        const sheetNames = workbook.worksheets.map(ws => ws.name);

        // Check if multiple sheets
        if (sheetNames.length > 1) {
          setAvailableSheets(sheetNames);
          setExcelWorkbook(workbook);
          setSelectedSheet(sheetNames[0]);
          // Parse first sheet by default
          parsed = parseExcel(workbook, sheetNames[0]);
        } else if (sheetNames.length === 1) {
          parsed = parseExcel(workbook, sheetNames[0]);
        }
      } else {
        // Handle CSV files
        const text = await uploadedFile.text();
        parsed = parseCSV(text);
      }

      setParsedData(parsed);

      const errors = validateData(parsed);
      setValidationErrors(errors);

      if (errors.length === 0) {
        setImportStatus('validated');
      } else {
        setImportStatus('error');
      }
    } catch (error) {
      console.error('Error parsing file:', error);
      setImportStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (!excelWorkbook) return;

    setSelectedSheet(sheetName);
    setIsProcessing(true);

    try {
      const parsed = parseExcel(excelWorkbook, sheetName);
      setParsedData(parsed);

      const errors = validateData(parsed);
      setValidationErrors(errors);

      if (errors.length === 0) {
        setImportStatus('validated');
      } else {
        setImportStatus('error');
      }
    } catch (error) {
      console.error('Error parsing sheet:', error);
      setImportStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['First Name', 'Last Name', 'Date of Birth', 'Gender', 'Email', 'Phone'],
      ['John', 'Doe', '01/15/2010', 'Male', 'john@example.com', '555-1234'],
      ['Jane', 'Smith', '03/22/2008', 'Female', 'jane@example.com', '555-5678'],
    ];

    const csv = template.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dancer_import_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

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

  const handleImport = async () => {
    if (validationErrors.length > 0) return;
    if (!studioId) {
      setImportStatus('error');
      setImportError('No studio ID available. Please try logging out and back in.');
      return;
    }

    setImportStatus('importing');
    setImportProgress(50);
    setImportError(null);

    try {
      const result = await importMutation.mutateAsync({
        studio_id: studioId,
        dancers: parsedData,
      });

      setImportProgress(100);

      if (result.failed > 0) {
        const errorMsg = `Import completed with ${result.failed} errors and ${result.successful} successes. Errors: ${result.errors?.join(', ') || 'Unknown'}`;
        setImportError(errorMsg);
        setImportStatus('error');
        return;
      }

      setImportStatus('success');
      setTimeout(() => {
        router.push('/dashboard/dancers');
      }, 2000);
    } catch (error) {
      setImportStatus('error');
      setImportError(error instanceof Error ? error.message : 'An unknown error occurred during import');
    }
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
            <h3 className="text-xl font-semibold text-white mb-2">Upload CSV or Excel File</h3>
            <p className="text-gray-400 mb-6 text-center">
              Select a CSV, XLS, or XLSX file containing dancer information
            </p>

            <div className="flex gap-4 flex-wrap justify-center">
              <label className="cursor-pointer bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105">
                <input
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                Choose File
              </label>
              <button
                onClick={downloadTemplate}
                className="bg-white/10 text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-all"
              >
                Download Template
              </button>
              <button
                onClick={exportDancers}
                className="bg-green-600/20 text-green-300 border border-green-400/30 px-6 py-3 rounded-lg hover:bg-green-600/30 transition-all"
                disabled={!existingDancers?.dancers || existingDancers.dancers.length === 0}
              >
                Export to CSV ({existingDancers?.dancers?.length || 0})
              </button>
            </div>
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

      {/* Import Errors (non-validation errors) */}
      {importStatus === 'error' && importError && validationErrors.length === 0 && (
        <div className="bg-red-500/10 backdrop-blur-md rounded-xl border border-red-400/30 p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">❌</div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-red-400 mb-2">Import Failed</h3>
              <p className="text-gray-300 mb-4">{importError}</p>

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
          {/* Sheet Selection */}
          {availableSheets.length > 1 && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-3">📊 Multiple Sheets Detected</h3>
              <p className="text-sm text-gray-400 mb-4">Select which sheet to import:</p>
              <div className="flex gap-2 flex-wrap">
                {availableSheets.map((sheetName) => (
                  <button
                    key={sheetName}
                    onClick={() => handleSheetChange(sheetName)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      selectedSheet === sheetName
                        ? 'bg-purple-500 text-white'
                        : 'bg-white/10 text-gray-300 hover:bg-white/20'
                    }`}
                  >
                    {sheetName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Duplicate Warnings */}
          {duplicates.length > 0 && (
            <div className="bg-yellow-500/10 backdrop-blur-md rounded-xl border border-yellow-400/30 p-6">
              <div className="flex items-start gap-4">
                <div className="text-4xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-yellow-400 mb-2">Potential Duplicates Found</h3>
                  <p className="text-gray-300 mb-3">
                    {duplicates.length} dancer(s) already exist in your studio. They will still be imported.
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {duplicates.map((dup, index) => (
                      <div key={index} className="bg-black/40 p-2 rounded text-sm">
                        <span className="text-yellow-400">Row {dup.row}</span>: {dup.name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-green-500/10 backdrop-blur-md rounded-xl border border-green-400/30 p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">✅</div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-green-400 mb-2">File Validated Successfully</h3>
                <p className="text-gray-300 mb-4">
                  Found {parsedData.length} dancer(s) ready to import. Review the data below and click Import to proceed.
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={handleImport}
                    disabled={importMutation.isPending}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {importMutation.isPending ? 'Importing...' : 'Import'}
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/dancers')}
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
            {currentUser?.studio && (
              <p className="text-sm text-gray-400 mb-4">
                Importing to: <span className="text-purple-400 font-semibold">{currentUser.studio.name}</span>
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
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
          <div className="text-center mb-6">
            <div className="animate-bounce text-6xl mb-4">⬆️</div>
            <h3 className="text-xl font-semibold text-white mb-2">Importing Dancers...</h3>
            <p className="text-gray-400">Please wait while we add {parsedData.length} dancer(s) to the database</p>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-8 bg-black/40 rounded-lg overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-300 ease-out"
              style={{ width: `${importProgress}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-white font-semibold text-sm">
              {importProgress}%
            </div>
          </div>
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
