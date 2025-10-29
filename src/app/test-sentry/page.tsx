'use client';

export default function TestSentryPage() {
  const testClientError = () => {
    throw new Error('🧪 Test: Client-side error from test page');
  };

  const testServerError = async () => {
    try {
      await fetch('/api/test-sentry');
    } catch (error) {
      console.error('Server error test triggered:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4">Sentry Error Testing</h1>
        <p className="text-gray-600 mb-6">
          Click the buttons below to test error tracking. Check your Sentry dashboard
          at https://sentry.io after clicking.
        </p>

        <div className="space-y-4">
          <button
            onClick={testClientError}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            🔴 Test Client-Side Error
          </button>

          <button
            onClick={testServerError}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            🔵 Test Server-Side Error
          </button>

          <div className="mt-6 p-4 bg-gray-100 rounded">
            <p className="text-sm text-gray-700">
              <strong>Expected behavior:</strong>
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
              <li>Client error: Page will crash, then recover</li>
              <li>Server error: Will trigger in background</li>
              <li>Both errors appear in Sentry within 10 seconds</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
