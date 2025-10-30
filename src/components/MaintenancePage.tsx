'use client';

/**
 * Maintenance Page
 * Shown to all users (except Super Admin) when site is paused
 */
export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="h-24 w-24 rounded-full bg-yellow-500/20 border-2 border-yellow-500/50 flex items-center justify-center">
            <span className="text-5xl">🔧</span>
          </div>
        </div>

        {/* Message */}
        <h1 className="text-4xl font-bold text-white mb-4">
          We'll Be Right Back!
        </h1>

        <p className="text-gray-300 text-lg mb-8">
          We're making some quick updates to improve your experience.
          <br />
          This should only take a few moments.
        </p>

        {/* Visual indicator */}
        <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/20 p-6">
          <div className="flex items-center justify-center space-x-3">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
          <p className="text-gray-400 text-sm mt-4">
            Updates in progress...
          </p>
        </div>

        {/* Footer */}
        <p className="text-gray-500 text-sm mt-8">
          If this takes longer than expected, please contact support.
        </p>
      </div>
    </div>
  );
}
