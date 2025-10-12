'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

interface RoutineCSVRow {
  routine_title: string;
  choreographer?: string;
  dance_category: string;
  classification: string;
  props?: string;
  rowNumber?: number;
  errors?: string[];
}

export default function RoutineCSVImport({ onParsed }: { onParsed?: (rows: RoutineCSVRow[]) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<RoutineCSVRow[]>([]);
  const [hasErrors, setHasErrors] = useState(false);

  const parseCSV = (text: string): RoutineCSVRow[] => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const result: RoutineCSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim());
      const row: any = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] ?? '';
      });
      result.push({
        routine_title: row['routine_title'] || '',
        choreographer: row['choreographer'] || '',
        dance_category: row['dance_category'] || '',
        classification: row['classification'] || '',
        props: row['props'] || '',
        rowNumber: i + 1,
      });
    }
    return result;
  };

  const validate = (rows: RoutineCSVRow[]): RoutineCSVRow[] => {
    const validCats = ['Ballet', 'Contemporary', 'Jazz', 'Tap', 'Hip Hop', 'Lyrical', 'Musical Theatre', 'Acro', 'Open'];
    const validClass = ['Solo', 'Duo/Trio', 'Small Group', 'Large Group', 'Production'];
    return rows.map((r) => {
      const errs: string[] = [];
      if (!r.routine_title) errs.push('Routine title is required');
      if (!r.dance_category || !validCats.includes(r.dance_category)) errs.push(`Invalid dance_category`);
      if (!r.classification || !validClass.includes(r.classification)) errs.push(`Invalid classification`);
      return { ...r, errors: errs.length ? errs : undefined };
    });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    const text = await f.text();
    const parsed = parseCSV(text);
    const validated = validate(parsed);
    setRows(validated);
    setHasErrors(validated.some((r) => r.errors && r.errors.length > 0));
    onParsed?.(validated);
    toast.success(`Parsed ${validated.length} rows`, { position: 'top-right' });
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
      <h3 className="text-xl font-semibold text-white mb-4">Routine CSV Import</h3>
      <input type="file" accept=".csv" onChange={handleFile} className="text-white" />
      {rows.length > 0 && (
        <div className="mt-4">
          <div className="text-sm text-gray-300 mb-2">Preview ({rows.length} rows)</div>
          <div className="overflow-auto max-h-64 border border-white/10 rounded">
            <table className="min-w-full text-sm text-gray-200">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-left">Category</th>
                  <th className="px-3 py-2 text-left">Classification</th>
                  <th className="px-3 py-2 text-left">Choreographer</th>
                  <th className="px-3 py-2 text-left">Errors</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((r, idx) => (
                  <tr key={idx} className={r.errors?.length ? 'bg-red-500/10' : ''}>
                    <td className="px-3 py-2">{r.routine_title}</td>
                    <td className="px-3 py-2">{r.dance_category}</td>
                    <td className="px-3 py-2">{r.classification}</td>
                    <td className="px-3 py-2">{r.choreographer || '-'}</td>
                    <td className="px-3 py-2 text-red-300">{r.errors?.join('; ') || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {hasErrors && <div className="text-yellow-400 mt-2">Some rows have validation errors.</div>}
        </div>
      )}
    </div>
  );
}

