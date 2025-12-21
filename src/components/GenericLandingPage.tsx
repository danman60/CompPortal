'use client';

export default function GenericLandingPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      {/* Top Banner - Portal Access Info */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 text-center">
        <p className="text-sm md:text-base">
          ✨ Trying to use CompSync? Access your competition's branded portal @ <span className="font-semibold">yourcomp.compsync.net</span>
        </p>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          {/* Logo & Hero */}
          <div className="text-center mb-16">
            <div className="mb-8 flex justify-center">
              <div className="h-20 w-20 bg-gradient-to-br from-purple-500 via-pink-500 to-yellow-500 rounded-2xl flex items-center justify-center">
                <span className="text-4xl">✨</span>
              </div>
            </div>

            <h1 className="text-5xl font-bold text-white mb-4">
              CompSync
            </h1>

            <p className="text-xl text-gray-300 mb-8">
              Professional dance competition management platform
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {/* Smart Scheduling */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all">
              <div className="text-4xl mb-4">🧠</div>
              <h3 className="text-xl font-semibold text-white mb-3">Smart AI or Manual Scheduling</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Save hours with intelligent auto-scheduling or take full manual control. Drag-and-drop interface with conflict detection keeps your competition running smoothly.
              </p>
            </div>

            {/* Bulk Import */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-white mb-3">Bulk Create or Import</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Import hundreds of routines and dancers in seconds with CSV upload. Step-through validation ensures data accuracy while saving massive time.
              </p>
            </div>

            {/* White Label */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="text-xl font-semibold text-white mb-3">Custom White Label Settings</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Fully branded portals for your competition. Custom colors, logos, age divisions, classifications, and pricing rules.
              </p>
            </div>

            {/* Studio & Event Management */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all">
              <div className="text-4xl mb-4">🏢</div>
              <h3 className="text-xl font-semibold text-white mb-3">Studio & Event Management</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Complete dancer registry, routine creation, reservation management, capacity tracking, and real-time status updates.
              </p>
            </div>

            {/* Competition Media */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all">
              <div className="text-4xl mb-4">📹</div>
              <h3 className="text-xl font-semibold text-white mb-3">Competition Media</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Integrated video and photo management with livestream support for real-time viewing and archival.
              </p>
            </div>

            {/* Judge Panel */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6 hover:bg-white/15 transition-all">
              <div className="text-4xl mb-4">💯</div>
              <h3 className="text-xl font-semibold text-white mb-3">Judge Panel</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Tablet-optimized scoring interface with instant tabulation. Real-time results and rankings keep awards ceremonies running on schedule.
              </p>
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
              📧 techsupport@compsync.net
            </a>
          </div>

          {/* Footer */}
          <div className="mt-12 text-center text-gray-500 text-sm">
            <p>© 2025 CompSync. Professional dance competition management.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
