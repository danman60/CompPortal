'use client';

import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';
import { mapCSVHeaders, ROUTINE_CSV_FIELDS } from '@/lib/csv-utils';
import { parseISODateToUTC } from '@/lib/date-utils';
import * as XLSX from 'xlsx';
import levenshtein from 'fast-levenshtein';

type ParsedRoutine = {
  title: string;
  props?: string;
  dancers?: string;
  choreographer?: string;
  duration_seconds?: number | string;
  // Dance Category - multiple possible column names
  category?: string;
  'dance category'?: string;
  genre?: string;
  style?: string;
  type?: string;
  matched_dancers: Array<{
    dancer_id: string;
    dancer_name: string;
    dancer_age: number | null;
    date_of_birth: string | null;
    classification_id?: string | null;
  }>;
  unmatched_dancers: string[];
};

type ValidationError = {
  row: number;
  field: string;
  message: string;
};

export default function RoutineCSVImport() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRoutine[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'validated' | 'creating' | 'error'>('idle');
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [excelWorkbook, setExcelWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string>('');
  const [selectedRoutines, setSelectedRoutines] = useState<Set<number>>(new Set());

  // Get user and studio data
  const { data: currentUser } = trpc.user.getCurrentUser.useQuery();
  const studioId = (currentUser?.role === 'studio_director' || currentUser?.role === 'super_admin')
    ? currentUser.studio?.id
    : '';

  // DEBUG: Log user data
  console.log('[RoutineCSVImport] currentUser:', JSON.stringify({
    role: currentUser?.role,
    studioId: currentUser?.studio?.id,
    email: currentUser?.email,
  }, null, 2));
  console.log('[RoutineCSVImport] Computed studioId:', studioId);

  // Fetch approved reservations for the studio
  const { data: reservationsData } = trpc.reservation.getAll.useQuery(
    { studioId: studioId || '', status: 'approved' },
    { enabled: !!studioId }
  );

  // DEBUG: Log reservations query result
  console.log('[RoutineCSVImport] Reservations query enabled:', !!studioId);
  console.log('[RoutineCSVImport] Reservations data:', reservationsData);

  // Pre-select first approved reservation if only one exists
  useEffect(() => {
    if (reservationsData?.reservations && reservationsData.reservations.length > 0 && !selectedReservationId) {
      setSelectedReservationId(reservationsData.reservations[0].id);
    }
  }, [reservationsData?.reservations, selectedReservationId]);

  // Fetch existing dancers for matching
  const { data: existingDancers, isLoading: dancersLoading } = trpc.dancer.getByStudio.useQuery(
    { studioId: studioId || '' },
    { enabled: !!studioId }
  );

  // DEBUG: Log dancers query result
  console.log('[RoutineCSVImport] Dancers query enabled:', !!studioId);
  console.log('[RoutineCSVImport] Dancers loading:', dancersLoading);
  console.log('[RoutineCSVImport] Dancers count:', existingDancers?.dancers?.length);

  // Fetch existing entries for export (max limit is 100 per backend validation)
  const { data: existingEntries } = trpc.entry.getAll.useQuery(
    { limit: 100 },
    { enabled: !!studioId }
  );

  const createSessionMutation = trpc.importSession.create.useMutation();

  // Fuzzy match dancer name against existing dancers (merges first + last name columns)
  const matchDancerName = (name: string): { dancer: any; confidence: number } | null => {
    if (!existingDancers?.dancers || existingDancers.dancers.length === 0) return null;

    // Clean name: remove age in parentheses, extra spaces, special chars
    let cleaned = name
      .replace(/\s*\(Age\s+\d+\)/gi, '') // Remove "(Age 15)" or "(age 15)"
      .replace(/\s*\(\d+\)/g, '') // Remove "(15)" alone
      .replace(/[^\w\s-]/g, '') // Remove special chars except hyphens
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' '); // Normalize spaces

    let bestMatch: { dancer: any; confidence: number } | null = null;

    for (const dancer of existingDancers.dancers) {
      const dancerFullName = `${dancer.first_name} ${dancer.last_name}`.toLowerCase();
      const firstName = dancer.first_name.toLowerCase();
      const lastName = dancer.last_name.toLowerCase();

      // Exact match on full name
      if (dancerFullName === cleaned) {
        return { dancer, confidence: 1.0 };
      }

      // Match first name + last name (handles "First Last" format)
      const nameParts = cleaned.split(' ');
      if (nameParts.length >= 2) {
        const csvFirst = nameParts[0];
        const csvLast = nameParts[nameParts.length - 1];

        if (csvFirst === firstName && csvLast === lastName) {
          return { dancer, confidence: 1.0 };
        }
      }

      // Fuzzy match with Levenshtein distance on full name
      const distance = levenshtein.get(cleaned, dancerFullName);
      const maxLength = Math.max(cleaned.length, dancerFullName.length);
      const confidence = 1 - (distance / maxLength);

      if (confidence >= 0.7 && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = { dancer, confidence };
      }

      // Partial match: first name only (if CSV only has first name)
      if (nameParts.length === 1 && cleaned === firstName) {
        const partialConfidence = 0.75; // Good but not perfect
        if (!bestMatch || partialConfidence > bestMatch.confidence) {
          bestMatch = { dancer, confidence: partialConfidence };
        }
      }

      // Partial match: last name only (if CSV only has last name)
      if (nameParts.length === 1 && cleaned === lastName) {
        const partialConfidence = 0.75;
        if (!bestMatch || partialConfidence > bestMatch.confidence) {
          bestMatch = { dancer, confidence: partialConfidence };
        }
      }
    }

    return bestMatch;
  };

  // Calculate age at actual competition date (not Dec 31st)
  // FIXED: Bug discovered Nov 13, 2025 - December 31st logic caused incorrect ages
  // Uses actual competition start date instead of year-end cutoff
  const calculateAgeAtEvent = (dateOfBirth: string | null, eventDate: Date | null): number | null => {
    if (!dateOfBirth || !eventDate) return null;

    const birthDate = parseISODateToUTC(dateOfBirth);
    if (!birthDate) return null;

    // Use UTC methods to prevent timezone mismatch
    let age = eventDate.getUTCFullYear() - birthDate.getUTCFullYear();
    const monthDiff = eventDate.getUTCMonth() - birthDate.getUTCMonth();

    // Adjust if birthday hasn't occurred yet this year
    if (monthDiff < 0 || (monthDiff === 0 && eventDate.getUTCDate() < birthDate.getUTCDate())) {
      age--;
    }

    return age;
  };

  const parseExcel = (workbook: XLSX.WorkBook, sheetName: string): any[] => {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) return [];

    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });
    if (data.length < 2) return [];

    const headers = data[0].map((h: any) => String(h || '').trim()).filter((h: string) => h !== '');
    const { mapping } = mapCSVHeaders(headers, ROUTINE_CSV_FIELDS, 0.7);

    const parsed: any[] = [];

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
        parsed.push(routineRow);
      }
    }

    return parsed;
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const csvHeaders = parseCSVLine(lines[0]);
    const { mapping } = mapCSVHeaders(csvHeaders, ROUTINE_CSV_FIELDS, 0.7);

    const data: any[] = [];

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
        data.push(row);
      }
    }

    return data;
  };

  // Match dancers for all routines
  const matchDancersInRoutines = (routines: any[], eventDate: Date | null): ParsedRoutine[] => {
    return routines.map(routine => {
      if (!routine.dancers) {
        return {
          ...routine,
          matched_dancers: [],
          unmatched_dancers: [],
        };
      }

      // Split dancer names by comma (handles "First Last" or separate "First,Last" columns)
      const dancerNames = routine.dancers.split(',').map((n: string) => n.trim()).filter((n: string) => n.length > 0);

      const matched: any[] = [];
      const unmatched: string[] = [];

      dancerNames.forEach((name: string) => {
        const match = matchDancerName(name);
        if (match) {
          const age = calculateAgeAtEvent(match.dancer.date_of_birth, eventDate);
          matched.push({
            dancer_id: match.dancer.id,
            dancer_name: name,
            dancer_age: age,
            date_of_birth: match.dancer.date_of_birth
              ? (match.dancer.date_of_birth instanceof Date
                  ? match.dancer.date_of_birth.toISOString().split('T')[0]
                  : match.dancer.date_of_birth)
              : null,
            classification_id: match.dancer.classification_id || null,
          });
        } else {
          unmatched.push(name);
        }
      });

      return {
        ...routine,
        matched_dancers: matched,
        unmatched_dancers: unmatched,
      };
    });
  };

  // Validate only title on upload
  const validateUpload = (data: any[]): ValidationError[] => {
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
      let parsed: any[] = [];

      if (fileExt === 'csv') {
        const text = await uploadedFile.text();
        parsed = parseCSV(text);
      } else if (fileExt === 'xlsx' || fileExt === 'xls') {
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
        } else {
          parsed = parseExcel(workbook, sheetNames[0]);
        }
      } else {
        throw new Error(`Unsupported file type: ${fileExt}. Please upload .csv, .xlsx, or .xls`);
      }

      // Get event date - use Dec 31 of REGISTRATION year
      // Registration year = Competition year - 1 (ALWAYS the fall prior to comp year)
      // E.g., 2026 competition → 2025 registration year → Dec 31, 2025
      const eventDate = reservationsData?.reservations?.[0]?.competitions?.competition_start_date
        ? (() => {
            const competitionYear = new Date(reservationsData.reservations[0].competitions.competition_start_date).getUTCFullYear();
            const registrationYear = competitionYear - 1;
            return new Date(Date.UTC(registrationYear, 11, 31)); // Dec 31 of registration year
          })()
        : (() => {
            const currentYear = new Date().getUTCFullYear();
            return new Date(Date.UTC(currentYear, 11, 31)); // Fallback: Dec 31 of current year
          })();

      const matched = matchDancersInRoutines(parsed, eventDate);
      setParsedData(matched);

      // Auto-select all routines
      setSelectedRoutines(new Set(matched.map((_, i) => i)));

      const errors = validateUpload(matched);
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

  const handleConfirmRoutines = async () => {
    if (!selectedReservationId) {
      alert('Please select a competition');
      return;
    }

    if (selectedRoutines.size === 0) {
      alert('Please select at least one routine');
      return;
    }

    setImportStatus('creating');
    setIsProcessing(true);

    try {
      // Filter to only selected routines
      const routinesToImport = parsedData.filter((_, i) => selectedRoutines.has(i));

      // Create import session
      const session = await createSessionMutation.mutateAsync({
        reservation_id: selectedReservationId,
        routines: routinesToImport,
      });

      // Redirect to EntryCreateFormV2 with import session ID
      router.push(`/dashboard/entries/create?importSession=${session.id}`);
    } catch (error: any) {
      console.error('Error creating import session:', error);
      alert(`Failed to create import session: ${error?.message || 'Unknown error'}`);
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

      // Use Dec 31 of REGISTRATION year
      // Registration year = Competition year - 1 (ALWAYS the fall prior to comp year)
      // E.g., 2026 competition → 2025 registration year → Dec 31, 2025
      const eventDate = reservationsData?.reservations?.[0]?.competitions?.competition_start_date
        ? (() => {
            const competitionYear = new Date(reservationsData.reservations[0].competitions.competition_start_date).getUTCFullYear();
            const registrationYear = competitionYear - 1;
            return new Date(Date.UTC(registrationYear, 11, 31)); // Dec 31 of registration year
          })()
        : (() => {
            const currentYear = new Date().getUTCFullYear();
            return new Date(Date.UTC(currentYear, 11, 31)); // Fallback: Dec 31 of current year
          })();

      const matched = matchDancersInRoutines(parsed, eventDate);
      setParsedData(matched);
      setSelectedRoutines(new Set(matched.map((_, i) => i)));

      const errors = validateUpload(matched);
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
          <p className="text-gray-400">Parsing and matching dancers</p>
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

      {/* Validated - Ready to Confirm */}
      {importStatus === 'validated' && (
        <div className="space-y-6">
          {/* No Dancers Warning */}
          {!dancersLoading && (!existingDancers?.dancers || existingDancers.dancers.length === 0) && (
            <div className="bg-yellow-500/10 backdrop-blur-md rounded-xl border border-yellow-400/30 p-6">
              <div className="flex items-start gap-4">
                <div className="text-4xl">⚠️</div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-yellow-400 mb-2">No Dancers Found</h3>
                  <p className="text-gray-300 mb-3">
                    You haven't added any dancers yet. Import dancers first to enable automatic dancer matching.
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

          {/* Competition Selector */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Select Competition
            </label>
            <select
              value={selectedReservationId}
              onChange={(e) => setSelectedReservationId(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-lg text-white focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
            >
              <option value="" className="bg-gray-900">Select approved reservation</option>
              {reservationsData?.reservations?.map((res: any) => (
                <option key={res.id} value={res.id} className="bg-gray-900">
                  {res.competitions?.name} - {res.spaces_confirmed} spaces
                </option>
              ))}
            </select>
          </div>

          {/* Preview Table */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 overflow-x-auto">
            <h3 className="text-lg font-semibold text-white mb-4">
              Preview - Select Routines to Import ({selectedRoutines.size} selected)
            </h3>

            <div className="max-h-[600px] overflow-y-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase bg-black/40 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 w-12">
                      <input
                        type="checkbox"
                        checked={selectedRoutines.size === parsedData.length && parsedData.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoutines(new Set(parsedData.map((_, i) => i)));
                          } else {
                            setSelectedRoutines(new Set());
                          }
                        }}
                        className="w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Choreographer</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Props</th>
                    <th className="px-4 py-3">Dancers</th>
                    <th className="px-4 py-3">Warnings</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((routine, index) => {
                    const matchedCount = routine.matched_dancers.length;
                    const unmatchedCount = routine.unmatched_dancers.length;
                    const totalCount = matchedCount + unmatchedCount;

                    return (
                      <tr key={index} className="border-b border-white/10 hover:bg-white/5">
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
                        <td className="px-4 py-3 text-white font-medium">{routine.title}</td>
                        <td className="px-4 py-3 text-gray-300">
                          {routine.choreographer || <span className="text-gray-500 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {(routine.category || routine['dance category'] || routine.genre || routine.style || routine.type) || <span className="text-gray-500 italic">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-300">
                          {routine.props || <span className="text-gray-500 italic">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-300">{totalCount} total</span>
                            {matchedCount > 0 && (
                              <span className="text-green-400 text-xs">({matchedCount} matched)</span>
                            )}
                            {unmatchedCount > 0 && (
                              <span className="text-orange-400 text-xs">({unmatchedCount} unmatched)</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {unmatchedCount > 0 && (
                            <div className="text-orange-400 text-xs">
                              ⚠️ {unmatchedCount} dancer{unmatchedCount > 1 ? 's' : ''} not found
                            </div>
                          )}
                          {!routine.choreographer && (
                            <div className="text-gray-400 text-xs">
                              ℹ️ No choreographer (can add later)
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Unmatched Dancers Details */}
            {parsedData.some(r => r.unmatched_dancers.length > 0) && (
              <details className="mt-4">
                <summary className="text-sm text-orange-400 cursor-pointer hover:text-orange-300">
                  View unmatched dancer details
                </summary>
                <div className="mt-3 bg-orange-500/10 border border-orange-400/30 rounded-lg p-4 max-h-48 overflow-y-auto">
                  {parsedData.map((routine, index) => {
                    if (routine.unmatched_dancers.length === 0) return null;
                    return (
                      <div key={index} className="mb-3 last:mb-0">
                        <div className="text-sm font-semibold text-white mb-1">
                          {routine.title}
                        </div>
                        <div className="text-xs text-gray-300 space-y-1">
                          {routine.unmatched_dancers.map((name, i) => (
                            <div key={i}>• {name}</div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </details>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleConfirmRoutines}
              disabled={!selectedReservationId || selectedRoutines.size === 0 || isProcessing}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-8 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isProcessing ? 'Creating Session...' : `Confirm Routines (${selectedRoutines.size})`}
            </button>
            <button
              onClick={() => router.push('/dashboard/entries')}
              className="bg-white/10 text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
