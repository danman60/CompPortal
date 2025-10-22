'use client';

/**
 * Admin Inspector Page
 *
 * Super Admin Only - Quick access to all CD workflows for debugging
 *
 * Provides tabbed interface to jump into any CD workflow:
 * - Invoices, Routine Summaries, Scheduling, Judges, Scoring, Reports, Music Tracking
 */

import { useState } from 'react';
import Link from 'next/link';

interface WorkflowTab {
  id: string;
  label: string;
  icon: string;
  href: string;
  description: string;
}

const CD_WORKFLOWS: WorkflowTab[] = [
  {
    id: 'invoices',
    label: 'Invoices',
    icon: '💰',
    href: '/dashboard/invoices/all',
    description: 'View and debug studio invoices',
  },
  {
    id: 'summaries',
    label: 'Routine Summaries',
    icon: '📋',
    href: '/dashboard/routine-summaries',
    description: 'Review routine summaries for invoice creation',
  },
  {
    id: 'routines',
    label: 'Routines',
    icon: '🎭',
    href: '/dashboard/entries',
    description: 'View all competition entries',
  },
  {
    id: 'scheduling',
    label: 'Scheduling',
    icon: '📅',
    href: '/dashboard/scheduling',
    description: 'Event scheduling and time blocks',
  },
  {
    id: 'judges',
    label: 'Judges',
    icon: '👨‍⚖️',
    href: '/dashboard/judges',
    description: 'Judge management and assignments',
  },
  {
    id: 'scoring',
    label: 'Scoring',
    icon: '💯',
    href: '/dashboard/scoring',
    description: 'Judge tablet scoring interface',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: '📄',
    href: '/dashboard/reports',
    description: 'Generate PDF scorecards and results',
  },
  {
    id: 'music',
    label: 'Music Tracking',
    icon: '🎵',
    href: '/dashboard/music-tracking',
    description: 'Monitor music uploads and send reminders',
  },
];

export default function AdminInspectorPage() {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-white/70 hover:text-white mb-4 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-white mb-2">🔍 Admin Inspector</h1>
          <p className="text-white/70">
            Quick access to all Competition Director workflows for debugging and troubleshooting
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-500/20 border-2 border-blue-500 rounded-xl p-4 mb-8">
          <div className="flex items-center space-x-3">
            <span className="text-3xl">ℹ️</span>
            <div>
              <div className="text-blue-300 font-bold text-lg">Super Admin View</div>
              <div className="text-blue-200 text-sm">
                These are the workflows Competition Directors use daily. Access them here for debugging issues.
              </div>
            </div>
          </div>
        </div>

        {/* Workflow Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CD_WORKFLOWS.map((workflow) => (
            <Link
              key={workflow.id}
              href={workflow.href}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/20 hover:border-white/40 transition-all duration-200 group"
            >
              <div className="flex items-start space-x-4">
                <span className="text-5xl group-hover:scale-110 transition-transform">
                  {workflow.icon}
                </span>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                    {workflow.label}
                  </h3>
                  <p className="text-white/70 text-sm">
                    {workflow.description}
                  </p>
                </div>
              </div>

              {/* Arrow indicator on hover */}
              <div className="mt-4 flex items-center text-blue-300 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-medium">Open workflow</span>
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Tips */}
        <div className="mt-8 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <h3 className="text-xl font-bold text-white mb-3">💡 Quick Tips</h3>
          <div className="text-white/80 text-sm space-y-2">
            <p>
              <strong className="text-white">Debugging invoices:</strong> Check Routine Summaries first to see what data is being sent to invoice creation.
            </p>
            <p>
              <strong className="text-white">Missing routines:</strong> Verify studio has approved reservation and entries are in "submitted" status.
            </p>
            <p>
              <strong className="text-white">Scheduling issues:</strong> Check competition sessions exist and time blocks are configured.
            </p>
            <p>
              <strong className="text-white">Scoring problems:</strong> Verify judges are assigned to sessions and entries are scheduled.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
