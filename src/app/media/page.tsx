'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';
import Link from 'next/link';

interface DancerMatch {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  studio_name: string;
  studio_id: string;
}

export default function MediaPortalLookupPage() {
  const { tenant, primaryColor, secondaryColor } = useTenantTheme();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For handling multiple matches (same name/DOB at different studios)
  const [matchedDancers, setMatchedDancers] = useState<DancerMatch[]>([]);
  const [showStudioSelector, setShowStudioSelector] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMatchedDancers([]);
    setShowStudioSelector(false);

    try {
      // Call API to find dancer by name + birthdate
      const response = await fetch('/api/media/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          birthDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Dancer not found. Please check your information.');
        return;
      }

      // If multiple dancers found (same name/DOB at different studios)
      if (data.dancers && data.dancers.length > 1) {
        setMatchedDancers(data.dancers);
        setShowStudioSelector(true);
        return;
      }

      // Single dancer found - navigate to their media portal
      if (data.dancers && data.dancers.length === 1) {
        router.push(`/media/${data.dancers[0].id}`);
        return;
      }

      setError('No dancer found matching that information. Please check your entries.');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudio = (dancerId: string) => {
    router.push(`/media/${dancerId}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="mb-8 flex justify-center">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
            }}
          >
            <span className="text-3xl">📸</span>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
          <h1 className="text-3xl font-bold text-white mb-2 text-center">
            Media Portal
          </h1>
          <p className="text-gray-300 text-center mb-8">
            Access photos and videos from {tenant?.name || 'your competition'}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          {!showStudioSelector ? (
            <form onSubmit={handleLookup} className="space-y-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                  Dancer&apos;s First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="off"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Emma"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                  Dancer&apos;s Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="off"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Smith"
                />
              </div>

              <div>
                <label htmlFor="birthDate" className="block text-sm font-medium text-gray-300 mb-2">
                  Date of Birth
                </label>
                <input
                  id="birthDate"
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 [color-scheme:dark]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white py-3 px-4 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-medium"
                style={{
                  background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`
                }}
              >
                {loading ? 'Looking up...' : 'Access My Media'}
              </button>
            </form>
          ) : (
            /* Studio Selector - shown when multiple dancers match */
            <div className="space-y-4">
              <p className="text-gray-300 text-sm text-center mb-4">
                We found dancers at multiple studios. Please select your studio:
              </p>

              {matchedDancers.map((dancer) => (
                <button
                  key={dancer.id}
                  onClick={() => handleSelectStudio(dancer.id)}
                  className="w-full p-4 bg-white/5 border border-white/20 rounded-lg text-left hover:bg-white/10 transition-colors"
                >
                  <div className="text-white font-medium">
                    {dancer.first_name} {dancer.last_name}
                  </div>
                  <div className="text-gray-400 text-sm">
                    {dancer.studio_name}
                  </div>
                </button>
              ))}

              <button
                onClick={() => {
                  setShowStudioSelector(false);
                  setMatchedDancers([]);
                }}
                className="w-full text-gray-400 hover:text-gray-300 text-sm py-2"
              >
                ← Try different information
              </button>
            </div>
          )}
        </div>

        <div className="mt-4 text-center space-y-2">
          <Link href="/" className="block text-gray-400 hover:text-gray-300 text-sm">
            ← Back to home
          </Link>
          <p className="text-gray-400 text-xs">
            Can&apos;t find your media? Contact your studio director.
          </p>
        </div>
      </div>
    </main>
  );
}
