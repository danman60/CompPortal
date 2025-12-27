'use client';

export default function GenericLandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      {/* Top Banner - Portal Access Info */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 text-center">
        <p className="text-sm md:text-base">
          Trying to use CompSync? Access your competition&apos;s branded portal @ <span className="font-semibold">yourcomp.compsync.net</span>
        </p>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Logo & Hero */}
          <div className="text-center mb-16">
            <div className="mb-8 flex justify-center">
              <div className="h-20 w-20 bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500 rounded-2xl flex items-center justify-center shadow-2xl">
                <span className="text-4xl">&#x2728;</span>
              </div>
            </div>

            <h1 className="text-5xl font-bold text-white mb-4">
              CompSync
            </h1>

            <p className="text-xl text-gray-300 mb-4">
              Competition Management Made Seamless
            </p>
            <p className="text-lg text-gray-400 mb-8">
              Less admin, more artistry. From registration to results.
            </p>

            {/* 4-Phase System Overview */}
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {[
                { phase: '1', name: 'Registration' },
                { phase: '2', name: 'Scheduling' },
                { phase: '3', name: 'Game Day' },
                { phase: '4', name: 'Media & Results' },
              ].map((item) => (
                <div key={item.phase} className="flex items-center gap-2 bg-white/5 rounded-full px-4 py-2 border border-white/10">
                  <span className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                    {item.phase}
                  </span>
                  <span className="text-gray-300 text-sm font-medium">{item.name}</span>
                </div>
              ))}
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center gap-8 mb-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-white">4,300+</div>
                <div className="text-gray-400 text-sm">Entry Spaces Reserved</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">60+</div>
                <div className="text-gray-400 text-sm">Studios Registered</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-white">2</div>
                <div className="text-gray-400 text-sm">Active Competitions</div>
              </div>
            </div>
          </div>

          {/* For Competition Directors Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">For Competition Directors</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Smart Scheduling */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-purple-400/30 p-6 hover:bg-white/15 transition-all">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-xl">&#x1F4C5;</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3 text-center">Smart Scheduling</h3>
                <p className="text-gray-300 text-sm leading-relaxed text-center">
                  Drag-and-drop interface with conflict detection. Build your competition schedule in minutes, not hours.
                </p>
              </div>

              {/* White Label */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-purple-400/30 p-6 hover:bg-white/15 transition-all">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-xl">&#x1F3A8;</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3 text-center">Your Brand, Your Portal</h3>
                <p className="text-gray-300 text-sm leading-relaxed text-center">
                  Custom colors, logos, age divisions, classifications, and pricing. A portal that looks like you built it.
                </p>
              </div>

              {/* Judge Panel */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-purple-400/30 p-6 hover:bg-white/15 transition-all">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-xl">&#x1F4AF;</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3 text-center">Real-Time Scoring</h3>
                <p className="text-gray-300 text-sm leading-relaxed text-center">
                  Tablet-optimized judge interface with instant tabulation. Keep awards ceremonies running on schedule.
                </p>
              </div>
            </div>
          </div>

          {/* For Studio Directors Section */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-white text-center mb-8">
              <span className="bg-gradient-to-r from-pink-400 to-pink-600 bg-clip-text text-transparent">For Studio Directors</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bulk Import */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-pink-400/30 p-6 hover:bg-white/15 transition-all">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-xl">&#x1F4CA;</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3 text-center">Bulk Import</h3>
                <p className="text-gray-300 text-sm leading-relaxed text-center">
                  Import dancers and routines via CSV in seconds. Step-through validation ensures accuracy.
                </p>
              </div>

              {/* Reservation Management */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-pink-400/30 p-6 hover:bg-white/15 transition-all">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-xl">&#x1F3AB;</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3 text-center">Easy Reservations</h3>
                <p className="text-gray-300 text-sm leading-relaxed text-center">
                  Reserve entry spots with real-time capacity tracking. Submit when ready, pay when invoiced.
                </p>
              </div>

              {/* Media Access */}
              <div className="bg-white/10 backdrop-blur-md rounded-xl border border-pink-400/30 p-6 hover:bg-white/15 transition-all">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-xl">&#x1F4F9;</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3 text-center">Performance Media</h3>
                <p className="text-gray-300 text-sm leading-relaxed text-center">
                  Access photos and videos of your dancers&apos; performances after the event.
                </p>
              </div>
            </div>
          </div>

          {/* Contact CTA */}
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-md rounded-xl border border-purple-400/30 p-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to streamline your competition?</h2>
            <p className="text-gray-300 mb-6 text-lg">
              Contact us to learn more about bringing CompSync to your competition
            </p>
            <a
              href="mailto:techsupport@compsync.net"
              className="inline-block bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-semibold text-lg"
            >
              techsupport@compsync.net
            </a>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-gray-500 text-sm">
            <p>&copy; 2025 CompSync. Professional dance competition management.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
