'use client';

/**
 * Failure Notification Banner
 *
 * Displays a notification banner when there are pending failure logs.
 * Allows admins to navigate to the failures admin page.
 *
 * Usage: Add to dashboard layout for Competition Directors and Super Admins.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';

export default function FailureNotificationBanner() {
  const [show, setShow] = useState(true);

  // Query for pending failures count
  const { data: failureCounts, isLoading } = trpc.failure.getCountByStatus.useQuery(
    undefined,
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  );

  const pendingCount = (failureCounts?.pending || 0) + (failureCounts?.retrying || 0);

  // Don't show banner if no pending failures or dismissed
  if (!show || isLoading || pendingCount === 0) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              {pendingCount} Failed Operation{pendingCount > 1 ? 's' : ''}
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>
                {pendingCount === 1
                  ? 'An operation failed and requires attention.'
                  : `${pendingCount} operations failed and require attention.`}
              </p>
              <p className="mt-1">
                This may include failed emails, file uploads, or API calls.
              </p>
            </div>
            <div className="mt-3">
              <Link
                href="/dashboard/admin/failures"
                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
              >
                View Failures & Retry
              </Link>
            </div>
          </div>
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={() => setShow(false)}
            className="inline-flex text-yellow-400 hover:text-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
            aria-label="Dismiss"
          >
            <span className="text-xl">×</span>
          </button>
        </div>
      </div>
    </div>
  );
}
