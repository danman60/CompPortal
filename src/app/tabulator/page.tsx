'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Printer, RefreshCw, CheckSquare, Square, Search } from 'lucide-react';

interface JudgeScore {
  judgeName: string;
  judgeNumber: number | null;
  score: number;
}

interface ScoredRoutine {
  id: string;
  entryNumber: number;
  routineName: string;
  studioName: string;
  category: string;
  ageGroup: string;
  judges: JudgeScore[];
  averageScore: number;
  awardLevel: string;
  scoredAt: string;
}

export default function TabulatorPage() {
  const [routines, setRoutines] = useState<ScoredRoutine[]>([]);
  const [selectedRoutines, setSelectedRoutines] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const printRef = useRef<HTMLDivElement>(null);

  // Fetch scored routines
  const fetchRoutines = useCallback(async () => {
    try {
      const response = await fetch('/api/tabulator/scored-routines');
      if (response.ok) {
        const data = await response.json();
        setRoutines(data.routines || []);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch routines:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoutines();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchRoutines, 10000);
    return () => clearInterval(interval);
  }, [fetchRoutines]);

  const toggleRoutineSelection = (id: string) => {
    setSelectedRoutines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    const filtered = filteredRoutines;
    const allSelected = filtered.every(r => selectedRoutines.has(r.id));
    if (allSelected) {
      setSelectedRoutines(new Set());
    } else {
      setSelectedRoutines(new Set(filtered.map(r => r.id)));
    }
  };

  const filteredRoutines = routines.filter(r => {
    const query = searchQuery.toLowerCase();
    return (
      r.routineName.toLowerCase().includes(query) ||
      r.studioName.toLowerCase().includes(query) ||
      r.entryNumber.toString().includes(query) ||
      r.category.toLowerCase().includes(query)
    );
  });

  const handlePrintLabels = () => {
    const toPrint = routines.filter(r => selectedRoutines.has(r.id));
    if (toPrint.length === 0) return;

    // Open print window with labels
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const labelHTML = generateLabelHTML(toPrint);
    printWindow.document.write(labelHTML);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handlePrintSingle = (routine: ScoredRoutine) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const labelHTML = generateLabelHTML([routine]);
    printWindow.document.write(labelHTML);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const generateLabelHTML = (routines: ScoredRoutine[]) => {
    const labels = routines.map(r => `
      <div class="label">
        <div class="label-header">
          <span class="entry-number">#${r.entryNumber}</span>
          <span class="award-level ${r.awardLevel.toLowerCase().replace(' ', '-')}">${r.awardLevel}</span>
        </div>
        <div class="routine-name">${r.routineName}</div>
        <div class="studio-name">${r.studioName}</div>
        <div class="scores-section">
          ${r.judges.map((j, i) => `
            <div class="judge-score">
              <span class="judge-label">Judge ${j.judgeNumber || String.fromCharCode(65 + i)}</span>
              <span class="score">${j.score.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        <div class="average-section">
          <span class="avg-label">Average:</span>
          <span class="avg-score">${r.averageScore.toFixed(2)}</span>
        </div>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Score Labels</title>
        <style>
          @page {
            size: 4in 2in;
            margin: 0.125in;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: Arial, sans-serif;
            font-size: 10pt;
          }
          .label {
            width: 3.75in;
            height: 1.75in;
            padding: 0.125in;
            border: 1px solid #000;
            page-break-inside: avoid;
            page-break-after: always;
            display: flex;
            flex-direction: column;
          }
          .label:last-child {
            page-break-after: auto;
          }
          .label-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
          }
          .entry-number {
            font-size: 14pt;
            font-weight: bold;
          }
          .award-level {
            font-size: 10pt;
            font-weight: bold;
            padding: 2px 8px;
            border-radius: 10px;
            background: #e5e5e5;
          }
          .award-level.platinum { background: #e2e8f0; color: #334155; }
          .award-level.high-gold { background: #fef08a; color: #854d0e; }
          .award-level.gold { background: #fde68a; color: #92400e; }
          .award-level.high-silver { background: #e5e7eb; color: #374151; }
          .award-level.silver { background: #f3f4f6; color: #4b5563; }
          .award-level.bronze { background: #fed7aa; color: #9a3412; }
          .routine-name {
            font-size: 12pt;
            font-weight: bold;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .studio-name {
            font-size: 9pt;
            color: #666;
            margin-bottom: 6px;
          }
          .scores-section {
            display: flex;
            gap: 8px;
            margin-bottom: 4px;
          }
          .judge-score {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            padding: 4px;
            background: #f5f5f5;
            border-radius: 4px;
          }
          .judge-label {
            font-size: 8pt;
            color: #666;
          }
          .score {
            font-size: 11pt;
            font-weight: bold;
          }
          .average-section {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 8px;
            margin-top: auto;
            padding: 4px;
            background: #1f2937;
            color: white;
            border-radius: 4px;
          }
          .avg-label {
            font-size: 10pt;
          }
          .avg-score {
            font-size: 14pt;
            font-weight: bold;
          }
          @media print {
            .label {
              border: none;
            }
          }
        </style>
      </head>
      <body>
        ${labels}
      </body>
      </html>
    `;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600 text-xl">Loading Tabulator...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tabulator</h1>
            <p className="text-gray-600">Score Label Printing</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <RefreshCw className="w-4 h-4" />
              <span>Last: {formatTime(lastUpdate)}</span>
            </div>
            <button
              onClick={fetchRoutines}
              className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search routines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={selectAll}
                className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {filteredRoutines.every(r => selectedRoutines.has(r.id)) ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                <span>Select All</span>
              </button>

              <button
                onClick={handlePrintLabels}
                disabled={selectedRoutines.size === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedRoutines.size > 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>Print Selected ({selectedRoutines.size})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Routines Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-3 px-4 text-left w-12"></th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">#</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600">Routine</th>
                <th className="py-3 px-4 text-left text-sm font-semibold text-gray-600 hidden md:table-cell">Studio</th>
                <th className="py-3 px-4 text-center text-sm font-semibold text-gray-600">Judges</th>
                <th className="py-3 px-4 text-center text-sm font-semibold text-gray-600">Avg</th>
                <th className="py-3 px-4 text-center text-sm font-semibold text-gray-600">Award</th>
                <th className="py-3 px-4 text-center text-sm font-semibold text-gray-600 w-20">Print</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoutines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    No scored routines found
                  </td>
                </tr>
              ) : (
                filteredRoutines.map((routine) => (
                  <tr
                    key={routine.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      selectedRoutines.has(routine.id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleRoutineSelection(routine.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {selectedRoutines.has(routine.id) ? (
                          <CheckSquare className="w-5 h-5 text-blue-600" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono text-gray-900 font-semibold">
                      {routine.entryNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900">{routine.routineName}</div>
                      <div className="text-sm text-gray-500 md:hidden">{routine.studioName}</div>
                    </td>
                    <td className="py-3 px-4 text-gray-600 hidden md:table-cell">
                      {routine.studioName}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-center gap-2">
                        {routine.judges.map((judge, i) => (
                          <div key={i} className="text-center">
                            <div className="text-xs text-gray-400">{judge.judgeNumber || String.fromCharCode(65 + i)}</div>
                            <div className="font-mono text-sm text-gray-900">{judge.score.toFixed(1)}</div>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="font-bold text-lg text-gray-900">
                        {routine.averageScore.toFixed(2)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        routine.awardLevel === 'Platinum' ? 'bg-slate-200 text-slate-800' :
                        routine.awardLevel === 'High Gold' ? 'bg-yellow-200 text-yellow-800' :
                        routine.awardLevel === 'Gold' ? 'bg-yellow-100 text-yellow-700' :
                        routine.awardLevel === 'High Silver' ? 'bg-gray-200 text-gray-700' :
                        routine.awardLevel === 'Silver' ? 'bg-gray-100 text-gray-600' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {routine.awardLevel}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handlePrintSingle(routine)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Print label"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Stats Footer */}
        <div className="mt-4 text-center text-sm text-gray-500">
          Showing {filteredRoutines.length} of {routines.length} scored routines
        </div>
      </div>
    </div>
  );
}
