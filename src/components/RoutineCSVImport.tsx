'use client';

import { useState } from 'react';
import { mapCSVHeaders, ROUTINE_CSV_FIELDS } from '@/lib/csv-utils';
import * as XLSX from 'xlsx';

type ParsedRoutine = {
  title: string;
  props?: string;
  dancers?: string;
  choreographer?: string;
};

type ValidationError = {
  row: number;
  field: string;
  message: string;
};

export default function RoutineCSVImport({ onParsed }: { onParsed?: (rows: ParsedRoutine[]) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRoutine[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [headerSuggestions, setHeaderSuggestions] = useState<Array<{ header: string; field: string; confidence: number }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'parsing' | 'validated' | 'error'>('idle');
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [excelWorkbook, setExcelWorkbook] = useState<XLSX.WorkBook | null>(null);

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

  const parseCSV = (text: string): ParsedRoutine[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const csvHeaders = lines[0].split(',').map((h) => h.trim());
    const { mapping, unmatched, suggestions } = mapCSVHeaders(csvHeaders, ROUTINE_CSV_FIELDS, 0.7);

    setHeaderSuggestions(suggestions);

    if (unmatched.length > 0) {
      console.warn('Unmatched CSV headers:', unmatched);
    }

    const data: ParsedRoutine[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = lines[i].split(',').map((v) => v.trim());
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

      const errors = validateData(parsed);
      setValidationErrors(errors);

      if (errors.length === 0) {
        setImportStatus('validated');
        onParsed?.(parsed);
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
        onParsed?.(parsed);
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

      {/* Validated - Ready to Use */}
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

          <div className="bg-green-500/10 backdrop-blur-md rounded-xl border border-green-400/30 p-6">
            <div className="flex items-start gap-4">
              <div className="text-4xl">✅</div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-green-400 mb-2">File Validated Successfully</h3>
                <p className="text-gray-300 mb-4">
                  Found {parsedData.length} routine(s) ready to use. Review the data below.
                </p>

                <button
                  onClick={handleReset}
                  className="bg-white/10 text-white px-6 py-3 rounded-lg hover:bg-white/20 transition-all"
                >
                  Upload Different File
                </button>
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
                  {parsedData.map((routine, index) => (
                    <tr key={index} className="border-b border-white/10 hover:bg-white/5">
                      <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                      <td className="px-4 py-3 text-white">{routine.title}</td>
                      <td className="px-4 py-3 text-gray-300">{routine.props || '-'}</td>
                      <td className="px-4 py-3 text-gray-300">{routine.dancers || '-'}</td>
                      <td className="px-4 py-3 text-gray-300">{routine.choreographer || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
