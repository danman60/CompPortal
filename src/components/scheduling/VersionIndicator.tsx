'use client';

import { Clock, CheckCircle, AlertCircle, Calendar, Users } from 'lucide-react';

interface VersionIndicatorProps {
  versionNumber: number;
  status: 'draft' | 'under_review' | 'review_closed';
  deadline?: Date;
  daysRemaining?: number;
  respondingStudios?: number;
  totalStudios?: number;
  notesCount?: number;
}

export function VersionIndicator({
  versionNumber,
  status,
  deadline,
  daysRemaining = 0,
  respondingStudios = 0,
  totalStudios = 0,
  notesCount = 0,
}: VersionIndicatorProps) {
  const getStatusBadge = () => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-900/30 text-purple-200 border border-purple-500/30">
            <AlertCircle className="h-3 w-3" />
            Draft
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300">
            <Clock className="h-3 w-3" />
            Under Review
          </span>
        );
      case 'review_closed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-300">
            <CheckCircle className="h-3 w-3" />
            Review Closed
          </span>
        );
    }
  };

  const getDaysRemainingDisplay = () => {
    if (status !== 'under_review' || !daysRemaining) return null;

    const color = daysRemaining <= 1 ? 'text-red-400' : daysRemaining <= 3 ? 'text-yellow-400' : 'text-purple-300';

    return (
      <span className={`inline-flex items-center gap-1 ${color} text-sm font-medium`}>
        <Calendar className="h-3.5 w-3.5" />
        {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
      </span>
    );
  };

  const getStudioResponseDisplay = () => {
    if (status === 'draft') return null;

    return (
      <div className="flex items-center gap-4 text-sm text-purple-300">
        <span className="inline-flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {respondingStudios}/{totalStudios} studios responded
        </span>
        {notesCount > 0 && (
          <span className="inline-flex items-center gap-1">
            <span className="text-blue-600">📋</span>
            {notesCount} note{notesCount !== 1 ? 's' : ''} submitted
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-purple-100">
              Version {versionNumber}
            </h3>
            {getStatusBadge()}
            {getDaysRemainingDisplay()}
          </div>

          {deadline && status === 'under_review' && (
            <p className="text-sm text-purple-300">
              Feedback deadline: {deadline.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          )}

          {getStudioResponseDisplay()}
        </div>

        {status === 'under_review' && daysRemaining <= 3 && daysRemaining > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-2">
            <p className="text-xs text-yellow-800 font-medium">
              Deadline approaching
            </p>
          </div>
        )}
      </div>
    </div>
  );
}