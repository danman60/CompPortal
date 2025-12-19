'use client';

import { useState, useRef, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, Calendar, Users, ChevronDown } from 'lucide-react';

interface VersionHistory {
  versionNumber: number;
  createdAt: string | Date;
  status: 'draft' | 'under_review' | 'review_closed';
}

interface VersionIndicatorProps {
  versionNumber: number;
  status: 'draft' | 'under_review' | 'review_closed';
  deadline?: Date;
  daysRemaining?: number;
  respondingStudios?: number;
  totalStudios?: number;
  notesCount?: number;
  versions?: VersionHistory[]; // All versions for dropdown
  onVersionSelect?: (versionNumber: number) => void; // Callback when version selected
}

export function VersionIndicator({
  versionNumber,
  status,
  deadline,
  daysRemaining = 0,
  respondingStudios = 0,
  totalStudios = 0,
  notesCount = 0,
  versions = [],
  onVersionSelect,
}: VersionIndicatorProps) {
  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowVersionDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
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
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => versions.length > 0 && setShowVersionDropdown(!showVersionDropdown)}
                className={`flex items-center gap-2 text-lg font-semibold text-purple-100 ${
                  versions.length > 0 ? 'hover:text-purple-200 cursor-pointer' : ''
                }`}
                disabled={versions.length === 0}
              >
                Version {versionNumber}
                {versions.length > 0 && (
                  <ChevronDown className={`h-4 w-4 transition-transform ${showVersionDropdown ? 'rotate-180' : ''}`} />
                )}
              </button>

              {/* Version Dropdown */}
              {showVersionDropdown && versions.length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-purple-500/30 rounded-lg shadow-xl z-50 overflow-hidden">
                  <div className="p-2 border-b border-purple-500/30 bg-purple-900/30">
                    <p className="text-xs font-medium text-purple-200">Version History</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {versions.map((v) => {
                      const date = new Date(v.createdAt);
                      const isCurrent = v.versionNumber === versionNumber;

                      return (
                        <button
                          key={v.versionNumber}
                          onClick={() => {
                            onVersionSelect?.(v.versionNumber);
                            setShowVersionDropdown(false);
                          }}
                          className={`w-full text-left px-3 py-2 hover:bg-purple-900/30 transition-colors ${
                            isCurrent ? 'bg-purple-900/50 border-l-2 border-purple-400' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-sm font-medium ${isCurrent ? 'text-purple-200' : 'text-gray-300'}`}>
                              Version {v.versionNumber}
                              {isCurrent && <span className="ml-2 text-xs text-purple-400">(current)</span>}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {' at '}
                            {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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