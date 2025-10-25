import Link from 'next/link';

/**
 * Pipeline Page Header
 * Back link + title + description
 */
export function PipelineHeader() {
  return (
    <>
      <Link
        href="/dashboard"
        className="text-purple-400 hover:text-purple-300 text-sm mb-4 inline-block"
      >
        ← Back to Dashboard
      </Link>

      <header className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">🎯 Reservation Pipeline</h1>
        <p className="text-gray-400">
          Manage all studio reservations from request to payment in one unified dashboard
        </p>
      </header>
    </>
  );
}
