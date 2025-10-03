import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8 flex justify-center">
            <div className="h-20 w-20 bg-gradient-to-br from-pink-500 via-purple-500 to-yellow-500 rounded-2xl flex items-center justify-center">
              <span className="text-4xl">✨</span>
            </div>
          </div>

          <h1 className="text-5xl font-bold text-white mb-4">
            GlowDance Competition Portal
          </h1>

          <p className="text-xl text-gray-300 mb-8">
            Next.js Backend is Live! 🎉
          </p>

          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 mb-8">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Backend Status
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              <div className="bg-green-500/20 rounded-lg p-4 border border-green-400/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-400 text-xl">✅</span>
                  <span className="text-white font-medium">Next.js 15</span>
                </div>
                <p className="text-gray-300 text-sm">App Router configured</p>
              </div>

              <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-400/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-400 text-xl">🔧</span>
                  <span className="text-white font-medium">TypeScript</span>
                </div>
                <p className="text-gray-300 text-sm">Type safety enabled</p>
              </div>

              <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-400/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-purple-400 text-xl">⚡</span>
                  <span className="text-white font-medium">tRPC</span>
                </div>
                <p className="text-gray-300 text-sm">Setting up...</p>
              </div>

              <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-400/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-yellow-400 text-xl">🗄️</span>
                  <span className="text-white font-medium">Prisma + Supabase</span>
                </div>
                <p className="text-gray-300 text-sm">Setting up...</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="bg-white/10 backdrop-blur-md text-white px-6 py-3 rounded-lg border border-white/20 hover:bg-white/20 transition-all duration-200"
            >
              Create Account
            </Link>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/sample-dashboard.html"
              className="text-purple-400 hover:text-purple-300 text-sm"
            >
              View Demo Dashboard →
            </Link>
            <Link
              href="/api/trpc"
              className="text-purple-400 hover:text-purple-300 text-sm"
            >
              API Documentation →
            </Link>
          </div>

          <div className="mt-12 text-gray-400 text-sm">
            <p>
              Static demo pages are still accessible at their original URLs
            </p>
            <p className="mt-2">
              Backend development in progress...
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
