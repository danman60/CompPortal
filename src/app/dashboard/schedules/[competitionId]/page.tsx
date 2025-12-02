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
import { ArrowLeft, Calendar, Clock, MessageSquare, AlertCircle, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { StudioNoteModal } from '@/components/scheduling/StudioNoteModal';

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

export default function StudioScheduleView() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

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

  const canAddNotes = currentVersion?.status === 'under_review';

  // Group routines by day
  const routinesByDay = useMemo(() => {
    if (!schedule?.routines) return {};

    const grouped: Record<string, ScheduledRoutine[]> = {};

    schedule.routines.forEach((entry) => {
      if (!entry.scheduledDay) return; // Skip unscheduled routines

      const dayKey = new Date(entry.scheduledDay).toISOString().split('T')[0];
      if (!grouped[dayKey]) {
        grouped[dayKey] = [];
      }
      grouped[dayKey].push({
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
      });
    });

    // Sort routines within each day by performance time
    Object.keys(grouped).forEach((day) => {
      grouped[day].sort((a, b) => {
        const timeA = a.performanceTime.split(':').map(Number);
        const timeB = b.performanceTime.split(':').map(Number);
        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
      });
    });

    return grouped;
  }, [schedule]);

  // Filter routines based on search and selected day
  const filteredRoutines = useMemo(() => {
    let routines: ScheduledRoutine[] = [];

    if (selectedDay) {
      routines = routinesByDay[selectedDay] || [];
    } else {
      // Show all days
      routines = Object.values(routinesByDay).flat();
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      routines = routines.filter((r) =>
        r.title.toLowerCase().includes(search) ||
        r.dancers?.some(d => d.toLowerCase().includes(search))
      );
    }

    return routines;
  }, [routinesByDay, selectedDay, searchTerm]);

  const handleAddNote = (routine: ScheduledRoutine) => {
    setSelectedRoutine(routine);
    setShowNoteModal(true);
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

  const competitionDays = Object.keys(routinesByDay).sort();
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

            {/* Status Badge */}
            <div className="flex items-center gap-4">
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
              {filteredRoutines.length} routine{filteredRoutines.length !== 1 ? 's' : ''}
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
                {filteredRoutines.map((routine) => (
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
                ))}
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
        studioId={TEST_STUDIO_ID}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}