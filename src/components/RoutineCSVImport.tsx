'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';
import { mapCSVHeaders, ROUTINE_CSV_FIELDS } from '@/lib/csv-utils';
import * as XLSX from 'xlsx';
import levenshtein from 'fast-levenshtein';

type ParsedRoutine = {
  title: string;
  props?: string;
  dancers?: string;
  choreographer?: string;
  matchedDancers?: string[]; // IDs of matched dancers
  unmatchedDancers?: string[]; // Names that couldn't be matched
};

type ValidationError = {
  row: number;
  field: string;
  message: string;
};

type DancerMatch = {
  routineIndex: number;
  dancerName: string;
  matched: boolean;
  matchedId?: string;
  confidence?: number;
};

export default function RoutineCSVImport() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRoutine[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [headerSuggestions, setHeaderSuggestions] = useState<Array<{ header: string; field: string; confidence: number }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'validated' | 'importing' | 'success' | 'error'>('idle');
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [excelWorkbook, setExcelWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string>('');
  const [dancerMatches, setDancerMatches] = useState<DancerMatch[]>([]);
  const [noDancersWarning, setNoDancersWarning] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Get user and studio data
  const { data: currentUser } = trpc.user.getCurrentUser.useQuery();
  const studioId = currentUser?.role === 'studio_director' ? currentUser.studio?.id : '';

  // Fetch approved reservations for the studio
  const { data: reservationsData } = trpc.reservation.getAll.useQuery(
    { studioId: studioId || '', status: 'approved' },
    { enabled: !!studioId }
  );

  // Fetch lookup data for categories and classifications
  const { data: lookupData } = trpc.lookup.getAllForEntry.useQuery();

  // Fetch existing dancers for matching
  const { data: existingDancers, isLoading: dancersLoading } = trpc.dancer.getAll.useQuery(
    { limit: 1000 },
    { enabled: !!studioId }
  );

  const createMutation = trpc.entry.create.useMutation();

  // Fuzzy match dancer name against existing dancers
  const matchDancerName = (name: string): { id: string; confidence: number } | null => {
    if (!existingDancers?.dancers) return null;

    const normalized = name.toLowerCase().trim();
    let bestMatch: { id: string; confidence: number } | null = null;

    for (const dancer of existingDancers.dancers) {
      const dancerFullName = `${dancer.first_name} ${dancer.last_name}`.toLowerCase();

      // Exact match
      if (dancerFullName === normalized) {
        return { id: dancer.id, confidence: 1.0 };
      }

      // Fuzzy match with Levenshtein distance
      const distance = levenshtein.get(normalized, dancerFullName);
      const maxLength = Math.max(normalized.length, dancerFullName.length);
      const confidence = 1 - (distance / maxLength);

      if (confidence >= 0.8 && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = { id: dancer.id, confidence };
      }
    }

    return bestMatch;
  };

  const parseExcel = (workbook: XLSX.WorkBook, sheetName: string): ParsedRoutine[] => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return [];

    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    if (jsonData.length === 0) return [];

    const excelHeaders = Object.keys(jsonData[0]);
    const { mapping, unmatched, suggestions } = mapCSVHeaders(excelHeaders, ROUTINE_CSV_FIELDS, 0.7);

    setHeaderSuggestions(suggestions);

    if (unmatched.length > 0) {
      console.warn('Unmatched Excel headers:', unmatched);
    }

    const data: ParsedRoutine[] = [];

    jsonData.forEach((row) => {
      const routineRow: any = {};

      excelHeaders.forEach((excelHeader) => {
        const canonicalField = mapping[excelHeader];
        if (canonicalField && row[excelHeader]) {
          const value = String(row[excelHeader]).trim();
          routineRow[canonicalField] = value;
        }
      });

      if (Object.keys(routineRow).length > 0) {
        data.push(routineRow as ParsedRoutine);
      }
    });

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

  const parseCSV = (text: string): ParsedRoutine[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const csvHeaders = parseCSVLine(lines[0]);
    const { mapping, unmatched, suggestions } = mapCSVHeaders(csvHeaders, ROUTINE_CSV_FIELDS, 0.7);

    setHeaderSuggestions(suggestions);

    if (unmatched.length > 0) {
      console.warn('Unmatched CSV headers:', unmatched);
    }

    const data: ParsedRoutine[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = parseCSVLine(lines[i]);
      const row: any = {};

      csvHeaders.forEach((csvHeader, index) => {
        const canonicalField = mapping[csvHeader];
        if (canonicalField && values[index]) {
          row[canonicalField] = values[index];
        }
      });

      if (Object.keys(row).length > 0) {
        data.push(row as ParsedRoutine);
      }
    }

    return data;
  };

  // Match dancers for all routines
  const matchDancersInRoutines = (routines: ParsedRoutine[]): void => {
    const matches: DancerMatch[] = [];
    let hasNoDancers = !dancersLoading && (!existingDancers?.dancers || existingDancers.dancers.length === 0);

    setNoDancersWarning(hasNoDancers);

    routines.forEach((routine, index) => {
      if (!routine.dancers) return;

      // Split dancer names by comma
      const dancerNames = routine.dancers.split(',').map(n => n.trim()).filter(n => n.length > 0);

      const matched: string[] = [];
      const unmatched: string[] = [];

      dancerNames.forEach(name => {
        const match = matchDancerName(name);
        if (match) {
          matched.push(match.id);
          matches.push({
            routineIndex: index,
            dancerName: name,
            matched: true,
            matchedId: match.id,
            confidence: match.confidence
          });
        } else {
          unmatched.push(name);
          matches.push({
            routineIndex: index,
            dancerName: name,
            matched: false
          });
        }
      });

      routine.matchedDancers = matched;
      routine.unmatchedDancers = unmatched;
    });

    setDancerMatches(matches);
  };

  const validateData = (data: ParsedRoutine[]): ValidationError[] => {
    const errors: ValidationError[] = [];

    data.forEach((routine, index) => {
      const rowNum = index + 2;

      if (!routine.title || routine.title.trim() === '') {
        errors.push({ row: rowNum, field: 'title', message: 'Title is required' });
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
    setValidationErrors([]);

    try {
      const fileExt = uploadedFile.name.split('.').pop()?.toLowerCase();
      let parsed: ParsedRoutine[] = [];

      if (fileExt === 'xlsx' || fileExt === 'xls') {
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });

        if (workbook.SheetNames.length > 1) {
          setAvailableSheets(workbook.SheetNames);
          setExcelWorkbook(workbook);
          setSelectedSheet(workbook.SheetNames[0]);
          parsed = parseExcel(workbook, workbook.SheetNames[0]);
        } else if (workbook.SheetNames.length === 1) {
          parsed = parseExcel(workbook, workbook.SheetNames[0]);
        }
      } else {
        const text = await uploadedFile.text();
        parsed = parseCSV(text);
      }

      setParsedData(parsed);

      // Match dancers
      matchDancersInRoutines(parsed);

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

  const handleImport = async () => {
    if (!selectedReservationId) {
      setImportStatus('error');
      return;
    }

    if (!studioId) {
      setImportStatus('error');
      return;
    }

    const reservation = reservationsData?.reservations?.find(r => r.id === selectedReservationId);
    if (!reservation) {
      setImportStatus('error');
      return;
    }

    const competitionId = reservation.competition_id;
    const defaultClassification = lookupData?.classifications?.[0]?.id;

    if (!defaultClassification) {
      setImportStatus('error');
      return;
    }

    setImportStatus('importing');
    setIsProcessing(true);
    setImportProgress(0);
    setImportErrors([]);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      try {
        await createMutation.mutateAsync({
          competition_id: competitionId,
          studio_id: studioId,
          title: row.title,
          classification_id: defaultClassification,
          choreographer: row.choreographer,
          special_requirements: row.props,
          entry_fee: 0,
          total_fee: 0,
          status: 'draft',
          participants: [],
        } as any);

        successCount++;
      } catch (error: any) {
        console.error(`Error importing ${row.title}:`, error);
        errorCount++;
        errors.push(`${row.title}: ${error?.message || 'Unknown error'}`);
      }

      // Update progress
      setImportProgress(Math.round(((i + 1) / parsedData.length) * 100));
    }

    setIsProcessing(false);
    setImportErrors(errors);

    if (successCount > 0) {
      // Show success even if some failed
      setImportStatus('success');
      setTimeout(() => {
        router.push('/dashboard/entries');
      }, 2000);
    } else {
      // All failed
      setImportStatus('error');
    }
  };

  const handleSheetChange = (sheetName: string) => {
    if (!excelWorkbook) return;

    setSelectedSheet(sheetName);
    setIsProcessing(true);

    try {
      const parsed = parseExcel(excelWorkbook, sheetName);
      setParsedData(parsed);

      // Match dancers
      matchDancersInRoutines(parsed);

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
      ['Title', 'Props', 'Dancers', 'Choreographer'],
      ['My Amazing Routine', 'Hat, Cane', 'John Doe, Jane Smith', 'Sarah Johnson'],
      ['Solo Performance', 'None', 'Emily Brown', 'Michael Davis'],
    ];

    const csv = template.map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'routine_import_template.csv';
    link.click();
    URL.revokeObjectURL(url);
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
              Select a CSV, XLS, or XLSX file containing routine information
            </p>

            <div className="flex gap-4">
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
                📥 Download Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Processing */}
      {isProcessing && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <h3 className="text-xl font-semibold text-white mb-2">Processing File...</h3>
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
                Found {validationErrors.length} error(s). Please fix these issues and try again.
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

      {/* Import Errors (all failed) */}
      {importStatus === 'error' && importErrors.length > 0 && validationErrors.length === 0 && (
        <div className="bg-red-500/10 backdrop-blur-md rounded-xl border border-red-400/30 p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">❌</div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-red-400 mb-2">Import Failed</h3>
              <p className="text-gray-300 mb-4">
                All {importErrors.length} routine(s) failed to import. See errors below:
              </p>

              <div className="max-h-64 overflow-y-auto space-y-2">
                {importErrors.map((error, index) => (
                  <div key={index} className="bg-black/40 p-3 rounded-lg text-sm text-gray-200">
                    {error}
                  </div>
                ))}
              </div>

              <button
                onClick={() => router.push('/dashboard/entries')}
                className="mt-4 bg-white/10 text-white px-6 py-2 rounded-lg hover:bg-white/20 transition-all"
              >
                Back to Entries
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validated - Ready to Import */}
      {importStatus === 'validated' && (
        <div className="space-y-6">
          {/* No Dancers Warning */}
          {noDancersWarning && (
            <div className="bg-yellow-500/10 backdrop-blur-md rounded-xl border border-yellow-400/30 p-6">
              <div className="flex items-start gap-4">
                <div className="text-4xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-yellow-400 mb-2">No Dancers Found</h3>
                  <p className="text-gray-300 mb-3">
                    You haven't added any dancers yet. Import dancers first to enable automatic dancer matching for routines.
                  </p>
                  <a
                    href="/dashboard/dancers/import"
                    className="inline-block bg-yellow-500 text-black px-6 py-2 rounded-lg hover:bg-yellow-400 transition-all font-semibold"
                  >
                    Import Dancers First
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Few Dancers Warning */}
          {!noDancersWarning && existingDancers?.dancers && existingDancers.dancers.length < 5 && (
            <div className="bg-blue-500/10 backdrop-blur-md rounded-xl border border-blue-400/30 p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">ℹ️</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-400 mb-2">Limited Dancer Pool</h3>
                  <p className="text-gray-300 text-sm">
                    You only have {existingDancers.dancers.length} dancer(s) in your system. Dancer matching may be limited.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Unmatched Dancers Warning */}
          {dancerMatches.filter(m => !m.matched).length > 0 && (
            <div className="bg-orange-500/10 backdrop-blur-md rounded-xl border border-orange-400/30 p-6">
              <div className="flex items-start gap-4">
                <div className="text-4xl">🔍</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-orange-400 mb-2">
                    {dancerMatches.filter(m => !m.matched).length} Unmatched Dancer(s)
                  </h3>
                  <p className="text-gray-300 mb-3">
                    These dancers in your CSV don't match any existing dancers. They may need to be added first, or check for typos.
                  </p>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {dancerMatches.filter(m => !m.matched).map((match, index) => (
                      <div key={index} className="bg-black/40 p-2 rounded text-sm text-gray-200">
                        • {match.dancerName} <span className="text-gray-400">(Routine {match.routineIndex + 1})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Low Confidence Matches Warning */}
          {dancerMatches.filter(m => m.matched && m.confidence && m.confidence < 0.95).length > 0 && (
            <div className="bg-purple-500/10 backdrop-blur-md rounded-xl border border-purple-400/30 p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🤔</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-purple-400 mb-2">Fuzzy Matches Detected</h3>
                  <p className="text-gray-300 text-sm mb-2">
                    Some dancers were matched with less than 95% confidence. Please verify these are correct:
                  </p>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {dancerMatches
                      .filter(m => m.matched && m.confidence && m.confidence < 0.95)
                      .map((match, index) => (
                        <div key={index} className="bg-black/40 p-2 rounded text-xs text-gray-200">
                          • {match.dancerName} <span className="text-purple-400">({Math.round((match.confidence || 0) * 100)}% match)</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

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

          {/* Select Reservation */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <h3 className="text-lg font-semibold text-white mb-3">🎫 Select Competition</h3>
            <p className="text-sm text-gray-400 mb-4">Choose which competition to import these routines to:</p>
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

            {selectedReservationId && reservationsData?.reservations?.find(r => r.id === selectedReservationId) && (
              <div className="mt-4 p-4 bg-white/5 rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm text-gray-400">Spaces Available</div>
                    <div className="text-2xl font-bold text-white">
                      {(() => {
                        const reservation = reservationsData.reservations.find(r => r.id === selectedReservationId);
                        const usedSpaces = reservation?._count?.competition_entries || 0;
                        const confirmedSpaces = reservation?.spaces_confirmed || 0;
                        return `${confirmedSpaces - usedSpaces} / ${confirmedSpaces}`;
                      })()}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Routines to Import</div>
                    <div className="text-2xl font-bold text-green-400">
                      {parsedData.length}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-green-500/10 backdrop-blur-md rounded-xl border border-green-400/30 p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">✅</div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-green-400 mb-2">File Validated Successfully</h3>
                <p className="text-gray-300 mb-4">
                  Found {parsedData.length} routine(s) ready to import. Review the data below.
                </p>

                <div className="flex gap-4">
                  <button
                    onClick={handleImport}
                    disabled={!selectedReservationId}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import
                  </button>
                  <button
                    onClick={() => router.push('/dashboard/entries')}
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
            <h3 className="text-lg font-semibold text-white mb-4">Preview ({parsedData.length} routines)</h3>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase bg-black/40 sticky top-0">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Props</th>
                    <th className="px-4 py-3">Dancers</th>
                    <th className="px-4 py-3">Choreographer</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((routine, index) => {
                    // Get matches for this routine
                    const routineMatches = dancerMatches.filter(m => m.routineIndex === index);
                    const matched = routineMatches.filter(m => m.matched);
                    const unmatched = routineMatches.filter(m => !m.matched);

                    return (
                      <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                        <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                        <td className="px-4 py-3 text-white">{routine.title}</td>
                        <td className="px-4 py-3 text-gray-300">{routine.props || '-'}</td>
                        <td className="px-4 py-3">
                          {routineMatches.length > 0 ? (
                            <div className="space-y-1">
                              {matched.map((m, i) => (
                                <div key={i} className="text-green-400 text-xs">
                                  ✓ {m.dancerName}
                                </div>
                              ))}
                              {unmatched.map((m, i) => (
                                <div key={i} className="text-orange-400 text-xs">
                                  ? {m.dancerName}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-300">{routine.choreographer || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Importing */}
      {importStatus === 'importing' && (
        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
          <div className="text-center">
            <div className="animate-bounce text-6xl mb-4">⬆️</div>
            <h3 className="text-xl font-semibold text-white mb-2">Importing Routines...</h3>
            <p className="text-gray-400 mb-6">Please wait while we add {parsedData.length} routine(s) to the database</p>
          </div>

          {/* Progress Bar */}
          <div className="relative w-full h-8 bg-black/40 rounded-lg overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300 ease-out"
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
        <div className="space-y-6">
          <div className="bg-green-500/10 backdrop-blur-md rounded-xl border border-green-400/30 p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-green-400 mb-2">Import Successful!</h3>
            <p className="text-gray-300">
              Successfully imported {parsedData.length - importErrors.length} of {parsedData.length} routine(s). Redirecting to entries list...
            </p>
          </div>

          {/* Partial Failure Warning */}
          {importErrors.length > 0 && (
            <div className="bg-yellow-500/10 backdrop-blur-md rounded-xl border border-yellow-400/30 p-6">
              <div className="flex items-start gap-4">
                <div className="text-4xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-yellow-400 mb-2">Partial Import</h3>
                  <p className="text-gray-300 mb-4">
                    {importErrors.length} routine(s) failed to import:
                  </p>

                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {importErrors.map((error, index) => (
                      <div key={index} className="bg-black/40 p-3 rounded-lg text-sm text-gray-200">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
