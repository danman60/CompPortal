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
  age_group_id?: string; // Auto-detected or manually selected
  classification_id?: string; // Manually selected
  category_id?: string; // Manually selected
  entry_size_id?: string; // Auto-detected or manually selected
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
  const [previewData, setPreviewData] = useState<ParsedRoutine[]>([]);
  const [eventStartDate, setEventStartDate] = useState<Date | null>(null);
  const [selectedRoutines, setSelectedRoutines] = useState<Set<number>>(new Set());

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

  // Fetch existing entries for export
  const { data: existingEntries } = trpc.entry.getAll.useQuery(
    { limit: 10000 },
    { enabled: !!studioId }
  );

  const createMutation = trpc.entry.create.useMutation();

  // Update event date from any available reservation (for age calculation)
  useEffect(() => {
    if (reservationsData?.reservations && reservationsData.reservations.length > 0) {
      // Use the first reservation's event date for age calculations
      const firstReservation = reservationsData.reservations[0];
      if (firstReservation?.competitions?.competition_start_date) {
        setEventStartDate(new Date(firstReservation.competitions.competition_start_date));
      }
    }
  }, [reservationsData]);

  // Auto-select all routines when preview data loads
  useEffect(() => {
    if (previewData.length > 0) {
      setSelectedRoutines(new Set(previewData.map((_, i) => i)));
    }
  }, [previewData.length]);

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

  // Calculate age at event date (from useEntryFormV2 logic lines 116-135)
  const calculateAgeAtEvent = (dateOfBirth: string | null): number | null => {
    if (!dateOfBirth || !eventStartDate) return null;

    const birthDate = new Date(dateOfBirth);
    const ageInMillis = eventStartDate.getTime() - birthDate.getTime();
    const ageInYears = ageInMillis / (1000 * 60 * 60 * 24 * 365.25);

    return Math.floor(ageInYears);
  };

  // Auto-detect age group based on average dancer age (rounded down)
  const autoDetectAgeGroup = (matchedDancerIds: string[]): string | undefined => {
    if (!matchedDancerIds.length || !existingDancers?.dancers || !eventStartDate || !lookupData?.ageGroups) {
      console.log('[Age Detection] Missing prerequisites:', {
        hasDancerIds: matchedDancerIds.length > 0,
        hasDancers: !!existingDancers?.dancers,
        hasEventDate: !!eventStartDate,
        hasAgeGroups: !!lookupData?.ageGroups
      });
      return undefined;
    }

    // Calculate ages at event
    const agesAtEvent = matchedDancerIds
      .map(id => existingDancers.dancers.find(d => d.id === id))
      .filter(d => d && d.date_of_birth)
      .map((d: any) => {
        const dob = d.date_of_birth;
        // Handle both Date objects and strings
        const dobString = dob instanceof Date ? dob.toISOString().split('T')[0] : String(dob);
        return calculateAgeAtEvent(dobString);
      })
      .filter((age): age is number => age !== null);

    if (agesAtEvent.length === 0) {
      console.log('[Age Detection] No valid ages calculated from dancers');
      return undefined;
    }

    // Calculate average age (drop decimal)
    const avgAge = Math.floor(agesAtEvent.reduce((sum, age) => sum + age, 0) / agesAtEvent.length);
    console.log('[Age Detection] Average age:', avgAge, 'Available age groups:', lookupData.ageGroups.map(ag => `${ag.name} (${ag.min_age}-${ag.max_age})`));

    // Match to age divisions
    const match = lookupData.ageGroups.find(
      (ag) => ag.min_age <= avgAge && avgAge <= ag.max_age
    );

    console.log('[Age Detection] Matched age group:', match?.name || 'No match');
    return match?.id;
  };

  // Auto-detect entry size based on TOTAL dancer count (matched + unmatched)
  const autoDetectEntrySize = (matchedDancerIds: string[], totalDancerCount: number): string | undefined => {
    if (totalDancerCount === 0 || !lookupData?.entrySizeCategories) {
      return undefined;
    }

    // Use total count (matched + unmatched) for entry size
    const count = totalDancerCount;

    // Match to size categories
    const match = lookupData.entrySizeCategories.find(
      (sc) => sc.min_participants <= count && count <= sc.max_participants
    );

    return match?.id;
  };

  const parseExcel = (workbook: XLSX.WorkBook, sheetName: string): ParsedRoutine[] => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return [];

    // Convert sheet to array of arrays (includes header row)
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });

    if (data.length < 2) return []; // Need header + at least 1 row

    const headers = data[0].map((h: any) => String(h || '').trim()).filter((h: string) => h !== '');
    const { mapping } = mapCSVHeaders(headers, ROUTINE_CSV_FIELDS, 0.7);

    const parsed: ParsedRoutine[] = [];

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const routineRow: any = {};

      headers.forEach((header, colIndex) => {
        const canonicalField = mapping[header];
        const cellValue = row[colIndex];

        if (canonicalField && cellValue !== undefined && cellValue !== null) {
          const value = String(cellValue).trim();
          if (value !== '') {
            routineRow[canonicalField] = value;
          }
        }
      });

      if (Object.keys(routineRow).length > 0) {
        parsed.push(routineRow as ParsedRoutine);
      }
    }

    return parsed;
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

      // Auto-detect age group and entry size
      // Age group: Only if we have matched dancers (need DOB)
      // Entry size: Based on TOTAL count (matched + unmatched)
      const totalDancerCount = matched.length + unmatched.length;

      if (matched.length > 0) {
        routine.age_group_id = autoDetectAgeGroup(matched);
      }

      if (totalDancerCount > 0) {
        routine.entry_size_id = autoDetectEntrySize(matched, totalDancerCount);
      }
    });

    setDancerMatches(matches);
    setPreviewData([...routines]); // Initialize preview data with auto-detected values
  };

  // Validate only title on upload (show preview)
  const validateUpload = (data: ParsedRoutine[]): ValidationError[] => {
    const errors: ValidationError[] = [];

    data.forEach((routine, index) => {
      const rowNum = index + 2;

      if (!routine.title || routine.title.trim() === '') {
        errors.push({ row: rowNum, field: 'title', message: 'Title is required' });
      }
    });

    return errors;
  };

  // Validate all fields before import
  const validateBeforeImport = (): { valid: boolean; missingCount: number } => {
    let missingCount = 0;

    previewData.forEach((routine) => {
      if (!routine.age_group_id || !routine.classification_id || !routine.category_id || !routine.entry_size_id) {
        missingCount++;
      }
    });

    return { valid: missingCount === 0, missingCount };
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

      if (fileExt === 'csv') {
        // Handle CSV files
        const text = await uploadedFile.text();
        parsed = parseCSV(text);
      } else if (fileExt === 'xlsx' || fileExt === 'xls') {
        // Handle Excel files (both .xlsx and .xls)
        const arrayBuffer = await uploadedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetNames = workbook.SheetNames;

        if (sheetNames.length === 0) {
          throw new Error('The Excel file contains no worksheets.');
        }

        if (sheetNames.length > 1) {
          setAvailableSheets(sheetNames);
          setExcelWorkbook(workbook);
          setSelectedSheet(sheetNames[0]);
          parsed = parseExcel(workbook, sheetNames[0]);
        } else if (sheetNames.length === 1) {
          parsed = parseExcel(workbook, sheetNames[0]);
        }
      } else {
        throw new Error(`Unsupported file type: ${fileExt}. Please upload .csv, .xlsx, or .xls`);
      }

      setParsedData(parsed);

      // Match dancers
      matchDancersInRoutines(parsed);

      const errors = validateUpload(parsed);
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

    // Check available spaces
    const usedSpaces = (reservation as any)._count?.competition_entries || 0;
    const confirmedSpaces = reservation.spaces_confirmed || 0;
    const availableSpaces = confirmedSpaces - usedSpaces;

    // Filter to only selected routines
    const selectedIndices = Array.from(selectedRoutines);
    const routinesToImport = previewData.filter((_, i) => selectedRoutines.has(i));

    if (routinesToImport.length > availableSpaces) {
      setImportErrors([`Cannot import ${routinesToImport.length} routines. Only ${availableSpaces} space(s) available (${confirmedSpaces} confirmed - ${usedSpaces} used).`]);
      setImportStatus('error');
      return;
    }

    const competitionId = reservation.competition_id;

    setImportStatus('importing');
    setIsProcessing(true);
    setImportProgress(0);
    setImportErrors([]);

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (let idx = 0; idx < selectedIndices.length; idx++) {
      const i = selectedIndices[idx];
      const row = previewData[i];
      try {
        await createMutation.mutateAsync({
          competition_id: competitionId,
          studio_id: studioId,
          title: row.title,
          category_id: row.category_id!,
          classification_id: row.classification_id!,
          age_group_id: row.age_group_id,
          entry_size_id: row.entry_size_id,
          choreographer: row.choreographer,
          special_requirements: row.props,
          entry_fee: 0,
          total_fee: 0,
          status: 'draft',
          participants: dancerMatches.filter(m => m.routineIndex === i && m.matched && m.matchedId).map(m => ({ dancer_id: m.matchedId })),
        } as any);

        successCount++;
      } catch (error: any) {
        console.error(`Error importing ${row.title}:`, error);
        errorCount++;
        errors.push(`${row.title}: ${error?.message || 'Unknown error'}`);
      }

      // Update progress
      setImportProgress(Math.round(((idx + 1) / selectedIndices.length) * 100));
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

      const errors = validateUpload(parsed);
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

  const exportRoutines = () => {
    if (!existingEntries?.entries || existingEntries.entries.length === 0) {
      alert('No routines to export');
      return;
    }

    const headers = ['Title', 'Props', 'Dancers', 'Choreographer'];
    const rows = existingEntries.entries.map((entry: any) => {
      const dancerNames = entry.participants
        ?.map((p: any) => {
          const first = p.dancers?.first_name || '';
          const last = p.dancers?.last_name || '';
          return `${first} ${last}`.trim();
        })
        .filter((name: string) => name)
        .join(', ') || '';

      return [
        entry.title || '',
        entry.special_requirements || '',
        dancerNames,
        entry.choreographer || '',
      ];
    });

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `routines_export_${new Date().toISOString().split('T')[0]}.csv`;
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
                onClick={exportRoutines}
                className="bg-green-600/20 text-green-300 border border-green-400/30 px-6 py-3 rounded-lg hover:bg-green-600/30 transition-all"
                disabled={!existingEntries?.entries || existingEntries.entries.length === 0}
              >
                Export to CSV ({existingEntries?.entries?.length || 0})
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

          {/* Sheet Selection */}
          {availableSheets.length > 1 && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 mb-6">
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

          {/* Compact Info Bar - replaces big cards */}
          <div className="bg-gradient-to-br from-white/10 via-white/5 to-transparent backdrop-blur-md rounded-2xl border border-white/20 shadow-lg p-6 mb-5">
            <div className="flex items-center gap-8 flex-wrap">
              {/* Success - routines validated */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <span className="text-xl">✓</span>
                </div>
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide">Validated</div>
                  <div className="text-lg font-bold text-green-400">{previewData.length} routines</div>
                </div>
              </div>

              {/* Unmatched dancers warning */}
              {dancerMatches.filter(m => !m.matched).length > 0 && (
                <>
                  <div className="h-12 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                      <span className="text-xl">⚠️</span>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Unmatched</div>
                      <div className="text-lg font-bold text-orange-400">{dancerMatches.filter(m => !m.matched).length} dancers</div>
                    </div>
                  </div>
                </>
              )}

              {/* Competition selector */}
              <div className="flex-1 min-w-[320px]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🏆</span>
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Competition</div>
                    <select
                      value={selectedReservationId}
                      onChange={(e) => setSelectedReservationId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white/10 border border-white/30 rounded-lg text-white text-sm font-medium focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                    >
                      <option value="" className="bg-gray-900">Select approved reservation</option>
                      {reservationsData?.reservations?.map((res: any) => (
                        <option key={res.id} value={res.id} className="bg-gray-900">
                          {res.competitions?.name} - {res.spaces_confirmed} spaces
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable details for unmatched/fuzzy dancers */}
            {(dancerMatches.filter(m => !m.matched).length > 0 || dancerMatches.filter(m => m.matched && m.confidence && m.confidence < 0.95).length > 0) && (
              <details className="mt-4">
                <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300">
                  View dancer matching details
                </summary>
                <div className="mt-3 space-y-3">
                  {dancerMatches.filter(m => !m.matched).length > 0 && (
                    <div className="bg-orange-500/10 border border-orange-400/30 rounded-lg p-3">
                      <div className="font-semibold text-orange-400 text-sm mb-2">
                        Unmatched Dancers ({dancerMatches.filter(m => !m.matched).length})
                      </div>
                      <div className="max-h-24 overflow-y-auto space-y-1">
                        {dancerMatches.filter(m => !m.matched).slice(0, 5).map((match, index) => (
                          <div key={index} className="text-xs text-gray-300">
                            • {match.dancerName}
                          </div>
                        ))}
                        {dancerMatches.filter(m => !m.matched).length > 5 && (
                          <div className="text-xs text-gray-400">
                            ...and {dancerMatches.filter(m => !m.matched).length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {dancerMatches.filter(m => m.matched && m.confidence && m.confidence < 0.95).length > 0 && (
                    <div className="bg-purple-500/10 border border-purple-400/30 rounded-lg p-3">
                      <div className="font-semibold text-purple-400 text-sm mb-2">
                        Fuzzy Matches ({dancerMatches.filter(m => m.matched && m.confidence && m.confidence < 0.95).length})
                      </div>
                      <div className="max-h-24 overflow-y-auto space-y-1">
                        {dancerMatches.filter(m => m.matched && m.confidence && m.confidence < 0.95).slice(0, 5).map((match, index) => (
                          <div key={index} className="text-xs text-gray-300">
                            • {match.dancerName} <span className="text-purple-400">({Math.round((match.confidence || 0) * 100)}%)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>

          {/* Selection Bar - shows space validation */}
          {selectedReservationId && (() => {
            const reservation = reservationsData?.reservations?.find(r => r.id === selectedReservationId);
            if (!reservation) return null;
            const usedSpaces = (reservation as any)._count?.competition_entries || 0;
            const confirmedSpaces = reservation.spaces_confirmed || 0;
            const availableSpaces = confirmedSpaces - usedSpaces;
            const selectedCount = selectedRoutines.size;
            const exceedsLimit = selectedCount > availableSpaces;

            return (
              <div className={`backdrop-blur-md rounded-xl border p-4 mb-4 ${exceedsLimit ? 'bg-red-500/10 border-red-400/50' : 'bg-white/10 border-white/20'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-300">
                      Selected: <span className={`font-bold ${exceedsLimit ? 'text-red-400' : 'text-white'}`}>{selectedCount}</span> / {availableSpaces} available
                    </span>
                    {exceedsLimit && (
                      <span className="text-sm text-red-400">
                        ⚠️ Uncheck {selectedCount - availableSpaces} routine{selectedCount - availableSpaces > 1 ? 's' : ''} to continue
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedRoutines(new Set())}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all text-sm"
                    >
                      Uncheck All
                    </button>
                    <button
                      onClick={() => setSelectedRoutines(new Set(previewData.map((_, i) => i)))}
                      className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all text-sm"
                    >
                      Check All
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Import/Cancel Buttons */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={handleImport}
              disabled={createMutation.isPending || !selectedReservationId || (() => {
                const reservation = reservationsData?.reservations?.find(r => r.id === selectedReservationId);
                if (!reservation) return true;
                const availableSpaces = (reservation.spaces_confirmed || 0) - ((reservation as any)._count?.competition_entries || 0);
                const selectedCount = selectedRoutines.size;
                const selectedData = previewData.filter((_, i) => selectedRoutines.has(i));
                return selectedCount > availableSpaces || selectedData.some(r => !r.age_group_id || !r.classification_id || !r.category_id || !r.entry_size_id);
              })()}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {createMutation.isPending ? 'Importing...' : `Import (${selectedRoutines.size} selected)`}
            </button>
            <button
              onClick={() => router.push('/dashboard/entries')}
              className="bg-white/10 text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-all"
            >
              Cancel
            </button>
          </div>

          {/* Preview Table */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 overflow-x-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Preview ({previewData.length} routines)</h3>

            {/* Missing Fields Warning */}
            {previewData.some(r => !r.age_group_id || !r.classification_id || !r.category_id || !r.entry_size_id) && (
              <div className="mb-4 bg-orange-500/10 border border-orange-400/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">⚠️</div>
                  <div>
                    <h4 className="text-orange-400 font-semibold mb-1">Missing Required Fields</h4>
                    <p className="text-sm text-gray-300">
                      {previewData.filter(r => !r.age_group_id || !r.classification_id || !r.category_id || !r.entry_size_id).length} routine(s) need all fields before import.
                      Please select Age Group, Classification, Dance Category, and Entry Size for each routine.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase bg-black/40 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 w-12">
                      <input
                        type="checkbox"
                        checked={selectedRoutines.size === previewData.length && previewData.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoutines(new Set(previewData.map((_, i) => i)));
                          } else {
                            setSelectedRoutines(new Set());
                          }
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3 min-w-[150px]">Age Group</th>
                    <th className="px-4 py-3 min-w-[150px]">Classification</th>
                    <th className="px-4 py-3 min-w-[150px]">Dance Category</th>
                    <th className="px-4 py-3 min-w-[150px]">Entry Size</th>
                    <th className="px-4 py-3">Dancers</th>
                    <th className="px-4 py-3">Props</th>
                    <th className="px-4 py-3">Choreographer</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((routine, index) => {
                    // Get matches for this routine
                    const routineMatches = dancerMatches.filter(m => m.routineIndex === index);
                    const matched = routineMatches.filter(m => m.matched);
                    const unmatched = routineMatches.filter(m => !m.matched);
                    const hasAutoAge = parsedData[index]?.age_group_id && routine.age_group_id === parsedData[index].age_group_id;
                    const hasAutoSize = parsedData[index]?.entry_size_id && routine.entry_size_id === parsedData[index].entry_size_id;

                    return (
                      <tr
                        key={index}
                        className={`border-b border-white/10 hover:bg-white/5 ${
                          !routine.age_group_id || !routine.classification_id || !routine.category_id || !routine.entry_size_id
                            ? 'bg-red-500/10'
                            : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRoutines.has(index)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedRoutines);
                              if (e.target.checked) {
                                newSelected.add(index);
                              } else {
                                newSelected.delete(index);
                              }
                              setSelectedRoutines(newSelected);
                            }}
                            className="w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                        <td className="px-4 py-3 text-white">{routine.title}</td>

                        {/* Age Group Dropdown */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={routine.age_group_id || ''}
                              onChange={(e) => {
                                const updated = [...previewData];
                                updated[index] = { ...updated[index], age_group_id: e.target.value };
                                setPreviewData(updated);
                              }}
                              className={`w-full px-2 py-1 text-xs bg-white/5 border ${
                                routine.age_group_id ? 'border-white/20' : 'border-red-400/50'
                              } rounded text-white`}
                            >
                              <option value="" className="bg-gray-900">Select...</option>
                              {lookupData?.ageGroups?.map(ag => (
                                <option key={ag.id} value={ag.id} className="bg-gray-900">{ag.name}</option>
                              ))}
                            </select>
                            {hasAutoAge && <span className="text-xs text-purple-400 whitespace-nowrap">AUTO</span>}
                          </div>
                        </td>

                        {/* Classification Dropdown */}
                        <td className="px-4 py-3">
                          <select
                            value={routine.classification_id || ''}
                            onChange={(e) => {
                              const updated = [...previewData];
                              updated[index] = { ...updated[index], classification_id: e.target.value };
                              setPreviewData(updated);
                            }}
                            className={`w-full px-2 py-1 text-xs bg-white/5 border ${
                              routine.classification_id ? 'border-white/20' : 'border-red-400/50'
                            } rounded text-white`}
                          >
                            <option value="" className="bg-gray-900">Select...</option>
                            {lookupData?.classifications?.map(c => (
                              <option key={c.id} value={c.id} className="bg-gray-900">{c.name}</option>
                            ))}
                          </select>
                        </td>

                        {/* Dance Category Dropdown */}
                        <td className="px-4 py-3">
                          <select
                            value={routine.category_id || ''}
                            onChange={(e) => {
                              const updated = [...previewData];
                              updated[index] = { ...updated[index], category_id: e.target.value };
                              setPreviewData(updated);
                            }}
                            className={`w-full px-2 py-1 text-xs bg-white/5 border ${
                              routine.category_id ? 'border-white/20' : 'border-red-400/50'
                            } rounded text-white`}
                          >
                            <option value="" className="bg-gray-900">Select...</option>
                            {lookupData?.categories?.map(cat => (
                              <option key={cat.id} value={cat.id} className="bg-gray-900">{cat.name}</option>
                            ))}
                          </select>
                        </td>

                        {/* Entry Size Dropdown */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <select
                              value={routine.entry_size_id || ''}
                              onChange={(e) => {
                                const updated = [...previewData];
                                updated[index] = { ...updated[index], entry_size_id: e.target.value };
                                setPreviewData(updated);
                              }}
                              className={`w-full px-2 py-1 text-xs bg-white/5 border ${
                                routine.entry_size_id ? 'border-white/20' : 'border-red-400/50'
                              } rounded text-white`}
                            >
                              <option value="" className="bg-gray-900">Select...</option>
                              {lookupData?.entrySizeCategories?.map(sc => (
                                <option key={sc.id} value={sc.id} className="bg-gray-900">{sc.name}</option>
                              ))}
                            </select>
                            {hasAutoSize && <span className="text-xs text-purple-400 whitespace-nowrap">AUTO</span>}
                          </div>
                        </td>

                        {/* Dancers (Read-only) */}
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

                        <td className="px-4 py-3 text-gray-300">{routine.props || '-'}</td>
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
            <p className="text-gray-400 mb-6">Please wait while we add {previewData.length} routine(s) to the database</p>
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
              Successfully imported {previewData.length - importErrors.length} of {previewData.length} routine(s). Redirecting to entries list...
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
