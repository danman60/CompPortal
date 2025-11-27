'use client';

/**
 * Studio Director Schedules Dashboard
 *
 * Lists all competitions where this studio has entries and schedules are available for review.
 * Part of Schedule Review Workflow implementation.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Calendar, Clock, MessageSquare, ChevronRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

// TEST IDs (will be replaced with real context)
const TEST_STUDIO_ID = '00000000-0000-0000-0000-000000000002';
const TEST_TENANT_ID = '00000000-0000-0000-0000-000000000003';

export default function SchedulesDashboard() {
  const router = useRouter();
  const [selectedTenant, setSelectedTenant] = useState<string>('');

  // Fetch available schedules for this studio
  const { data: schedules, isLoading } = trpc.scheduling.getAvailableSchedules.useQuery({
    studioId: TEST_STUDIO_ID,
    tenantId: TEST_TENANT_ID,
  });

  const handleViewSchedule = (competitionId: string, tenantId: string) => {
    // Navigate to the schedule view page
    router.push(`/dashboard/schedules/${competitionId}?tenantId=${tenantId}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">
          <span className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full inline-block mr-2" />
          Loading available schedules...
        </div>
      </div>
    );
  }

  if (!schedules || schedules.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Competition Schedules</h1>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-700 mb-2">No Schedules Available</h2>
            <p className="text-gray-500">
              Competition schedules will appear here when they are sent for review.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Competition Schedules</h1>
          <p className="text-gray-600">
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
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-gray-900 mb-1">
                        {schedule.competitionName}
                      </h2>
                      <p className="text-gray-600 text-sm mb-2">
                        {schedule.competitionDates?.start && schedule.competitionDates?.end && (
                          <>
                            {new Date(schedule.competitionDates.start).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                            {' - '}
                            {new Date(schedule.competitionDates.end).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </>
                        )}
                      </p>
                      <p className="text-gray-500 text-sm">
                        Version {schedule.version?.number || 1} • {schedule.routineCount} of your entries scheduled
                      </p>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-end gap-2">
                      {isReviewOpen ? (
                        <>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300">
                            <Clock className="h-3 w-3" />
                            Review Open
                          </span>
                          <span className={`text-sm ${
                            daysRemaining <= 1 ? 'text-red-600 font-medium' : 'text-gray-600'
                          }`}>
                            {daysRemaining === 0 ? 'Closes today' : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left`}
                          </span>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-300">
                          Review Closed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex gap-6 mb-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{schedule.routineCount} entries</span>
                    </div>
                    {schedule.notesCount > 0 && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <MessageSquare className="h-4 w-4" />
                        <span>{schedule.notesCount} note{schedule.notesCount !== 1 ? 's' : ''} submitted</span>
                      </div>
                    )}
                  </div>

                  {/* Feedback Deadline Warning */}
                  {isReviewOpen && schedule.version?.deadline && (
                    <div className={`p-3 rounded-md mb-4 ${
                      daysRemaining <= 1
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-amber-50 border border-amber-200'
                    }`}>
                      <p className={`text-sm flex items-start gap-2 ${
                        daysRemaining <= 1 ? 'text-red-800' : 'text-amber-800'
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
                    className="w-full flex items-center justify-center gap-2"
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
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-medium text-blue-900 mb-2">How Schedule Review Works</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">1.</span>
              <span>When the Competition Director sends a schedule for review, it will appear here</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">2.</span>
              <span>Click "View Schedule" to see your routines and their scheduled times</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">3.</span>
              <span>Submit scheduling requests for specific routines if needed</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">4.</span>
              <span>Requests must be submitted before the feedback deadline</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}