'use client';

/**
 * Studio Schedule View Page
 *
 * Shows the schedule for a specific competition filtered to only show
 * the studio's routines. Allows Studio Directors to add scheduling requests.
 */

import { useState, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { ArrowLeft, Calendar, Clock, MessageSquare, AlertCircle, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StudioNoteModal } from '@/components/scheduling/StudioNoteModal';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import toast from 'react-hot-toast';

// TEST studio ID (will be replaced with real studio context)
// Using Apex Dance Company from tester tenant for testing
const TEST_STUDIO_ID = '2bc476db-62a0-49b3-a264-4bca9437f6a5';

interface ScheduledRoutine {
  id: string;
  entryNumber: number;
  title: string;
  scheduledDay: Date;
  performanceTime: string;
  classification: string;
  category: string;
  ageGroup: string;
  entrySize: string;
  duration: number;
  hasNote: boolean;
  noteText?: string | null;
  dancers?: string[];
}

interface ScheduleBlock {
  type: 'award' | 'break' | 'event';
  scheduledDay: Date | null;
  startTime: string;
  duration: number;
  title?: string;
}

type ScheduleItem =
  | { itemType: 'routine'; data: ScheduledRoutine }
  | { itemType: 'block'; data: ScheduleBlock };

export default function StudioScheduleView() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Tenant branding
  const { tenant, primaryColor, logo } = useTenantTheme();

  const competitionId = params.competitionId as string;
  const tenantId = searchParams.get('tenantId') || '';
  const studioId = searchParams.get('studioId') || TEST_STUDIO_ID;

  const [selectedRoutine, setSelectedRoutine] = useState<ScheduledRoutine | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch studio schedule
  const { data: schedule, isLoading, refetch } = trpc.scheduling.getStudioSchedule.useQuery({
    tenantId,
    competitionId,
    studioId,
  });

  // Get current version to check if review is open
  const { data: currentVersion } = trpc.scheduling.getCurrentVersion.useQuery({
    tenantId,
    competitionId,
  });

  const canAddNotes = currentVersion?.feedbackAllowed ?? false;

  // Group routines AND blocks by day (P0-5: Studios see all blocks)
  const scheduleItemsByDay = useMemo(() => {
    if (!schedule?.routines) return {};

    const grouped: Record<string, ScheduleItem[]> = {};

    // Add studio's routines
    schedule.routines.forEach((entry) => {
      if (!entry.scheduledDay) return; // Skip unscheduled routines

      const dayKey = new Date(entry.scheduledDay).toISOString().split('T')[0];
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push({
        itemType: 'routine',
        data: {
          id: entry.id,
          entryNumber: entry.entryNumber || 0,
          title: entry.title,
          scheduledDay: new Date(entry.scheduledDay),
          performanceTime: entry.performanceTime || '',
          classification: entry.classification,
          category: entry.category,
          ageGroup: entry.ageGroup,
          entrySize: entry.entrySize,
          duration: entry.duration,
          hasNote: entry.hasNote,
          noteText: entry.noteText,
          dancers: [],
        },
      });
    });

    // Add ALL blocks (adjudications, breaks, events) - studios see all blocks
    schedule.blocks?.forEach((block) => {
      if (!block.scheduledDay) return;

      const dayKey = new Date(block.scheduledDay).toISOString().split('T')[0];
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }

      // Generate block title based on type
      let blockTitle = '';
      if (block.type === 'award') {
        blockTitle = 'Adjudication Ceremony';
      } else if (block.type === 'break') {
        blockTitle = `${block.duration} Minute Break`;
      } else if (block.type === 'event') {
        blockTitle = 'Special Event';
      }

      grouped[dayKey].push({
        itemType: 'block',
        data: {
          type: block.type,
          scheduledDay: new Date(block.scheduledDay),
          startTime: block.startTime,
          duration: block.duration,
          title: blockTitle,
        },
      });
    });

    // Sort items within each day by time
    Object.keys(grouped).forEach((day) => {
      grouped[day].sort((a, b) => {
        const timeA = a.itemType === 'routine' ? a.data.performanceTime : a.data.startTime;
        const timeB = b.itemType === 'routine' ? b.data.performanceTime : b.data.startTime;

        const [hoursA, minutesA] = timeA.split(':').map(Number);
        const [hoursB, minutesB] = timeB.split(':').map(Number);
        return (hoursA * 60 + minutesA) - (hoursB * 60 + minutesB);
      });
    });

    return grouped;
  }, [schedule]);

  // Filter items based on search and selected day
  const filteredItems = useMemo(() => {
    let items: ScheduleItem[] = [];

    if (selectedDay) {
      items = scheduleItemsByDay[selectedDay] || [];
    } else {
      // Show all days
      items = Object.values(scheduleItemsByDay).flat();
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      items = items.filter((item) => {
        if (item.itemType === 'routine') {
          return (
            item.data.title.toLowerCase().includes(search) ||
            item.data.dancers?.some(d => d.toLowerCase().includes(search))
          );
        }
        // Blocks are always shown (not affected by search)
        return true;
      });
    }

    return items;
  }, [scheduleItemsByDay, selectedDay, searchTerm]);

  const handleAddNote = (routine: ScheduledRoutine) => {
    setSelectedRoutine(routine);
    setShowNoteModal(true);
  };

  // PDF Export function
  const handleExportPDF = () => {
    const routineItems = filteredItems.filter(item => item.itemType === 'routine');
    if (routineItems.length === 0) {
      toast.error('No routines to export');
      return;
    }

    try {
      // Create PDF
      const doc = new jsPDF();

      // Convert hex color to RGB for jsPDF
      const hexToRgb = (hex: string): [number, number, number] => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
          ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
          : [99, 102, 241]; // Fallback indigo
      };

      // App color palette: purple/indigo gradients
      const primaryBrand = hexToRgb(primaryColor);
      const purpleDark: [number, number, number] = [88, 28, 135];   // purple-900
      const purpleLight: [number, number, number] = [147, 51, 234]; // purple-600

      // Elegant header with gradient-style coloring
      doc.setFillColor(...purpleDark);
      doc.rect(0, 0, 210, 55, 'F');

      // Add accent bar
      doc.setFillColor(...purpleLight);
      doc.rect(0, 0, 210, 3, 'F');

      // Header text
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text(tenant?.name || 'Competition Schedule', 14, 22);

      doc.setFontSize(16);
      doc.setFont('helvetica', 'normal');
      doc.text('Studio Schedule', 14, 33);

      doc.setFontSize(10);
      doc.setTextColor(200, 200, 220);
      const dayText = selectedDay
        ? new Date(selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        : 'All Days';
      const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      doc.text(`${dayText} • Generated ${dateStr}`, 14, 44);
      doc.text(`${routineItems.length} Routines Scheduled`, 14, 50);

      // Reset text color for body
      doc.setTextColor(0, 0, 0);

      // Prepare table data
      const tableData = routineItems.map(item => {
        const routine = item.data as ScheduledRoutine;
        return [
          `#${routine.entryNumber}`,
          routine.scheduledDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          routine.performanceTime,
          routine.title,
          `${routine.entrySize} • ${routine.classification}`,
          routine.category,
          routine.hasNote ? '✓ Note' : '',
        ];
      });

      // Add table with polished styling matching CD schedule
      autoTable(doc, {
        startY: 65,
        head: [['Entry', 'Day', 'Time', 'Routine Title', 'Details', 'Category', 'Notes']],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 9,
          cellPadding: 4,
          lineColor: [220, 220, 230],
          lineWidth: 0.1,
          textColor: [40, 40, 60],
        },
        headStyles: {
          fillColor: primaryBrand,
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold',
          halign: 'left',
          cellPadding: 5,
        },
        columnStyles: {
          0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 55, fontStyle: 'bold' },
          4: { cellWidth: 40 },
          5: { cellWidth: 28 },
          6: { cellWidth: 18, halign: 'center' },
        },
        alternateRowStyles: {
          fillColor: [248, 248, 252],
        },
      });

      // Elegant footer on all pages
      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        // Footer line
        doc.setDrawColor(200, 200, 220);
        doc.setLineWidth(0.5);
        doc.line(14, 280, 196, 280);

        // Footer text
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 140);
        doc.text('Studio Schedule', 14, 287);
        doc.text(`Page ${i} of ${pageCount}`, 196, 287, { align: 'right' });
      }

      // Save PDF
      const tenantSlug = tenant?.slug || 'schedule';
      const daySlug = selectedDay ? new Date(selectedDay).toISOString().split('T')[0] : 'all-days';
      const filename = `${tenantSlug}-studio-schedule-${daySlug}.pdf`;
      doc.save(filename);
      toast.success(`📄 PDF exported: ${filename}`);
    } catch (error) {
      console.error('[PDF Export] Error:', error);
      toast.error(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex items-center justify-center">
        <div className="text-purple-300">
          <span className="animate-spin h-6 w-6 border-2 border-cyan-400 border-t-transparent rounded-full inline-block mr-2" />
          Loading schedule...
        </div>
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-purple-800/30 backdrop-blur-sm rounded-xl shadow-xl border border-purple-600/30 p-12 text-center">
            <AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-white mb-2">Schedule Not Found</h2>
            <p className="text-purple-300 mb-4">
              Unable to load the schedule for this competition.
            </p>
            <Button
              variant="secondary"
              onClick={() => router.push('/dashboard/schedules')}
              className="inline-flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Schedules
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const competitionDays = Object.keys(scheduleItemsByDay).sort();
  const totalNotes = schedule.routines.filter(e => e.hasNote).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900">
      {/* Header */}
      <div className="bg-purple-900/50 backdrop-blur-sm border-b border-purple-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard/schedules')}
                className="text-purple-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-white">Competition Schedule</h1>
                <p className="text-sm text-purple-300">
                  Version {schedule.version?.number || 1} • {schedule.routines.length} routines scheduled
                </p>
              </div>
            </div>

            {/* Actions and Status */}
            <div className="flex items-center gap-4">
              {/* PDF Export Button */}
              <button
                onClick={handleExportPDF}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600/30 text-purple-200 rounded-md text-sm font-medium hover:bg-purple-600/50 border border-purple-500/50 transition-all"
              >
                <Download className="h-4 w-4" />
                Export PDF
              </button>

              {totalNotes > 0 && (
                <span className="text-sm text-cyan-300 flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {totalNotes} note{totalNotes !== 1 ? 's' : ''} submitted
                </span>
              )}
              {canAddNotes ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-300 border border-green-500/50 shadow-lg shadow-green-500/20">
                  <Clock className="h-4 w-4" />
                  Review Open
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-500/20 text-gray-300 border border-gray-500/50">
                  Review Closed
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Filters */}
        <div className="bg-purple-800/30 backdrop-blur-sm rounded-xl shadow-xl border border-purple-600/30 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Day Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-purple-300" />
              <select
                value={selectedDay || ''}
                onChange={(e) => setSelectedDay(e.target.value || null)}
                className="px-3 py-1.5 bg-purple-900/50 border border-purple-600/50 rounded-md text-white text-sm focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              >
                <option value="">All Days</option>
                {competitionDays.map((day) => {
                  const date = new Date(day);
                  return (
                    <option key={day} value={day}>
                      {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by routine title or dancer name..."
                className="w-full px-3 py-1.5 bg-purple-900/50 border border-purple-600/50 rounded-md text-white text-sm placeholder-purple-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>

            {/* Results Count */}
            <div className="text-sm text-purple-300">
              {filteredItems.filter(item => item.itemType === 'routine').length} routine{filteredItems.filter(item => item.itemType === 'routine').length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="bg-purple-800/30 backdrop-blur-sm rounded-xl shadow-xl border border-purple-600/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-purple-900/50 border-b border-purple-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                    Entry #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                    Day
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                    Routine
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                    Dancers
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-purple-300 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-700/30">
                {filteredItems.map((item, index) => {
                  if (item.itemType === 'block') {
                    // Render block as separator row
                    const block = item.data;
                    const blockIcon = block.type === 'award' ? '🏆' : block.type === 'break' ? '☕' : '🎉';
                    return (
                      <tr key={`block-${index}`} className="bg-purple-700/30">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2 text-sm font-medium text-cyan-300">
                            <span>{blockIcon}</span>
                            <span>{block.startTime}</span>
                            <span>|</span>
                            <span>{block.title}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  } else {
                    // Render routine row
                    const routine = item.data;
                    return (
                      <tr key={routine.id} className="hover:bg-purple-700/20 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-white">
                          #{routine.entryNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-purple-200">
                          {routine.scheduledDay.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-sm text-cyan-300 font-medium">
                          {routine.performanceTime}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-white">{routine.title}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-purple-200">
                          {routine.entrySize} • {routine.classification} • {routine.category}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-purple-200 max-w-xs">
                            {routine.dancers && routine.dancers.length > 0 ? (
                              <span className="line-clamp-2" title={routine.dancers.join(', ')}>
                                {routine.dancers.join(', ')}
                              </span>
                            ) : (
                              <span className="text-purple-500">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {routine.hasNote ? (
                            <button
                              onClick={() => handleAddNote(routine)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded-md text-xs font-medium hover:bg-cyan-500/30 border border-cyan-500/50 shadow-lg shadow-cyan-500/20 transition-all"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              {canAddNotes ? 'Edit Note' : 'View Note'}
                            </button>
                          ) : canAddNotes ? (
                            <button
                              onClick={() => handleAddNote(routine)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600/30 text-purple-200 rounded-md text-xs font-medium hover:bg-purple-600/50 border border-purple-500/50 transition-all"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                              Add Note
                            </button>
                          ) : (
                            <span className="text-xs text-purple-500">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Instructions */}
        {canAddNotes && (
          <div className="mt-6 bg-cyan-500/10 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-4 shadow-xl shadow-cyan-500/10">
            <h3 className="font-medium text-cyan-300 mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              How to Submit Scheduling Requests
            </h3>
            <ul className="space-y-1 text-sm text-cyan-200">
              <li>• Click "Add Note" next to any routine to submit a scheduling request</li>
              <li>• Explain your specific needs (e.g., "Please schedule after 10 AM - dancers arrive from school")</li>
              <li>• Requests are not guaranteed but will be considered by the Competition Director</li>
              <li>• You can edit or remove notes until the feedback deadline</li>
            </ul>
          </div>
        )}
      </div>

      {/* Studio Note Modal */}
      <StudioNoteModal
        open={showNoteModal}
        onClose={() => {
          setShowNoteModal(false);
          setSelectedRoutine(null);
        }}
        routine={selectedRoutine}
        canEdit={canAddNotes}
        tenantId={tenantId}
        studioId={studioId}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}