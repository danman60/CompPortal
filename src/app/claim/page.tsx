'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';

export default function ClaimPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenant } = useTenantTheme();
  const code = searchParams.get('code');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [studio, setStudio] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    async function init() {
      if (!code) {
        setError('No studio code provided');
        setLoading(false);
        return;
      }

      // Wait for tenant to load
      if (!tenant?.id) {
        return; // Keep loading while tenant loads
      }

      const supabase = createClient();

      // Check authentication
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        // Not authenticated → redirect to signup with return URL
        router.push(`/signup?returnUrl=${encodeURIComponent(`/claim?code=${code}`)}`);
        return;
      }

      setUser(authUser);

      // Validate studio code
      const { data: studioData, error: studioError } = await supabase
        .from('studios')
        .select('id, name, public_code, owner_id, tenant_id')
        .eq('public_code', code.toUpperCase())
        .eq('tenant_id', tenant.id) // Must be on current tenant
        .single();

      if (studioError || !studioData) {
        setError('Invalid or expired studio code. Please check the code and try again.');
        setLoading(false);
        return;
      }

      if (studioData.owner_id !== null) {
        setError('This studio has already been claimed by another user.');
        setLoading(false);
        return;
      }

      setStudio(studioData);
      setLoading(false);
    }

    init();
  }, [code, router, tenant?.id]);

  const handleClaim = async () => {
    if (!studio || !user) return;

    setClaiming(true);
    setError('');

    const supabase = createClient();

    // Update studio ownership
    const { error: updateError } = await supabase
      .from('studios')
      .update({ owner_id: user.id })
      .eq('id', studio.id)
      .eq('owner_id', null); // Double-check still unclaimed

    if (updateError) {
      setError(`Failed to claim studio: ${updateError.message}`);
      setClaiming(false);
      return;
    }

    // Check if onboarding complete
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single();

    if (!profile?.first_name || !profile?.last_name) {
      // Need to complete onboarding
      router.push('/onboarding');
    } else {
      // Go straight to dashboard
      router.push('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
          <p className="text-white text-lg">Loading studio information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-2xl font-bold text-white mb-2">Unable to Claim Studio</h1>
          </div>

          <div className="bg-red-500/20 border border-red-400/50 rounded-lg p-4 mb-6">
            <p className="text-red-200 text-sm">{error}</p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 rounded-lg transition-all duration-200 border border-white/20"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => window.location.href = '/api/auth/signout'}
              className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-semibold py-2 rounded-lg transition-all duration-200 text-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-white/20">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-white mb-2">Claim Your Studio</h1>
          <p className="text-gray-300 text-sm">You're one step away from accessing your dashboard</p>
        </div>

        <div className="bg-white/5 rounded-xl p-5 mb-4 border border-white/10">
          <p className="text-gray-300 text-xs uppercase tracking-wider mb-2">You're about to claim</p>
          <p className="text-2xl font-bold text-white">{studio.name}</p>
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-gray-400 text-xs">Studio Code</p>
            <p className="text-purple-300 font-mono font-bold text-lg">{studio.public_code}</p>
          </div>
        </div>

        <div className="bg-white/5 rounded-xl p-5 mb-6 border border-white/10">
          <p className="text-gray-300 text-xs uppercase tracking-wider mb-2">Your account</p>
          <p className="text-white font-semibold">{user?.email}</p>
        </div>

        <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-6">
          <p className="text-blue-200 text-sm leading-relaxed">
            By claiming this studio, you'll gain access to your competition dashboard where you can manage dancers, create routine entries, and submit summaries.
          </p>
        </div>

        <button
          onClick={handleClaim}
          disabled={claiming}
          className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {claiming ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Claiming Studio...</span>
            </>
          ) : (
            <>
              <span>🎯</span>
              <span>Claim Studio</span>
            </>
          )}
        </button>

        <p className="text-gray-400 text-xs text-center mt-4">
          Wrong account?{' '}
          <a href="/api/auth/signout" className="text-purple-300 hover:text-purple-200 underline">
            Sign out
          </a>{' '}
          and try again.
        </p>
      </div>
    </div>
  );
}
