import Link from 'next/link';

interface DraftInvoicesBannerProps {
  draftCount: number;
}

/**
 * Draft Invoices Warning Banner
 * Shows when there are unsent draft invoices
 * Redesigned with gradient, icon, and action button
 */
export function DraftInvoicesBanner({ draftCount }: DraftInvoicesBannerProps) {
  if (draftCount === 0) return null;

  return (
    <div className="mb-6 relative overflow-hidden rounded-xl border border-yellow-500/30 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-yellow-500/10 p-5 shadow-lg backdrop-blur-sm">
      {/* Animated shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent animate-shimmer"></div>

      <div className="relative flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/20 border border-yellow-500/30">
            <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-yellow-300 mb-1">
            Unsent Draft Invoices
          </h3>
          <p className="text-sm text-gray-300 mb-3">
            You have <span className="font-bold text-yellow-400">{draftCount}</span> invoice{draftCount === 1 ? '' : 's'} that {draftCount === 1 ? 'has' : 'have'} been created but not yet sent to studios.
            Studios cannot see or pay {draftCount === 1 ? 'this invoice' : 'these invoices'} until you send {draftCount === 1 ? 'it' : 'them'}.
          </p>

          <div className="flex flex-wrap gap-3">
            {/* View drafts button */}
            <Link
              href="/dashboard/invoices/all?filter=draft"
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 rounded-lg text-sm font-medium text-yellow-300 transition-all hover:shadow-md"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View All Drafts
            </Link>

            {/* Quick action hint */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Tip: Click "Review & Send" in the table below to send drafts
            </div>
          </div>
        </div>

        {/* Optional dismiss button (future enhancement) */}
        {/* <button className="flex-shrink-0 text-gray-400 hover:text-gray-300">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button> */}
      </div>
    </div>
  );
}
