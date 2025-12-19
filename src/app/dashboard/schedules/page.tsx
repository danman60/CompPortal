'use client';

/**
 * Studio Director Schedules Dashboard
 *
 * Lists all competitions where this studio has entries and schedules are available for review.
 * Part of Schedule Review Workflow implementation.
 */

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Calendar, Clock, MessageSquare, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// TEST IDs (will be replaced with real context)
// Using Apex Dance Company from tester tenant for testing
const TEST_STUDIO_ID = '2bc476db-62a0-49b3-a264-4bca9437f6a5';
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000003';

export default function SchedulesDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedTenant, setSelectedTenant] = useState<string>('');

  // Get studioId from URL parameter, fallback to TEST_STUDIO_ID
  const studioId = searchParams.get('studioId') || TEST_STUDIO_ID;
  const tenantId = searchParams.get('tenantId') || TEST_TENANT_ID;

  // Fetch available schedules for this studio
  const { data: schedules, isLoading } = trpc.scheduling.getAvailableSchedules.useQuery({
    studioId,
    tenantId,
  });

  const handleViewSchedule = (competitionId: string, tenantIdParam: string) => {
    // Navigate to the schedule view page, passing studioId for isolation testing
    router.push(`/dashboard/schedules/${competitionId}?tenantId=${tenantIdParam}&studioId=${studioId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white/80 flex items-center gap-3">
          <span className="animate-spin h-6 w-6 border-2 border-purple-400 border-t-transparent rounded-full" />
          Loading available schedules...
        </div>
      </div>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8">Competition Schedules</h1>
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
            <Calendar className="h-16 w-16 text-purple-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-white mb-2">No Schedules Available</h2>
            <p className="text-white/60">
              Competition schedules will appear here when they are sent for review.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Competition Schedules</h1>
          <p className="text-white/60">
            Review schedules and submit scheduling requests for your routines
          </p>
        </div>

        {/* Schedules Grid */}
        <div className="grid gap-6">
          {schedules.map((schedule) => {
            const daysRemaining = schedule.version?.daysRemaining || 0;
            const isReviewOpen = schedule.version?.status === 'under_review' && daysRemaining > 0;

            return (
              <div
                key={schedule.competitionId}
                className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden hover:bg-white/15 transition-colors"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-white mb-1">
                        {schedule.competitionName}
                      </h2>
                      <p className="text-white/60 text-sm mb-2">
                        {schedule.competitionDates?.start && schedule.competitionDates?.end && (
                          <>
                            {new Date(schedule.competitionDates.start).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                            {' - '}
                            {new Date(schedule.competitionDates.end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </>
                        )}
                      </p>
                      <p className="text-white/50 text-sm">
                        Version {schedule.version?.number || 1} • {schedule.routineCount} of your entries scheduled
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-end gap-2">
                      {isReviewOpen ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-400/40">
                            <Clock className="h-3 w-3" />
                            Review Open
                          </span>
                          <span className={`text-sm ${
                            daysRemaining <= 1 ? 'text-red-400 font-medium' : 'text-white/60'
                          }`}>
                            {daysRemaining === 0 ? 'Closes today' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`}
                          </span>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white/60 border border-white/20">
                          Review Closed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-6 mb-4 text-sm">
                    <div className="flex items-center gap-1 text-white/60">
                      <Calendar className="h-4 w-4" />
                      <span>{schedule.routineCount} entries</span>
                    </div>
                    {schedule.notesCount > 0 && (
                      <div className="flex items-center gap-1 text-blue-400">
                        <MessageSquare className="h-4 w-4" />
                        <span>{schedule.notesCount} note{schedule.notesCount !== 1 ? 's' : ''} submitted</span>
                      </div>
                    )}
                  </div>

                  {/* Feedback Deadline Warning */}
                  {isReviewOpen && schedule.version?.deadline && (
                    <div className={`p-3 rounded-lg mb-4 ${
                      daysRemaining <= 1
                        ? 'bg-red-500/20 border border-red-400/40'
                        : 'bg-amber-500/20 border border-amber-400/40'
                    }`}>
                      <p className={`text-sm flex items-start gap-2 ${
                        daysRemaining <= 1 ? 'text-red-300' : 'text-amber-300'
                      }`}>
                        <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>
                          Feedback deadline: {new Date(schedule.version.deadline).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </span>
                      </p>
                    </div>
                  )}

                  {/* Action Button */}
                  <Button
                    variant="primary"
                    onClick={() => handleViewSchedule(schedule.competitionId, TEST_TENANT_ID)}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500"
                  >
                    View Schedule
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-purple-500/10 border border-purple-400/30 rounded-xl p-6">
          <h3 className="font-medium text-purple-300 mb-2">How Schedule Review Works</h3>
          <ul className="space-y-1 text-sm text-purple-200/80">
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">1.</span>
              <span>When the Competition Director sends a schedule for review, it will appear here</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">2.</span>
              <span>Click "View Schedule" to see your routines and their scheduled times</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">3.</span>
              <span>Submit scheduling requests for specific routines if needed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-400 mt-0.5">4.</span>
              <span>Requests must be submitted before the feedback deadline</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
