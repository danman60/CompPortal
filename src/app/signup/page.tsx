'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function SignupPage() {
  const [formData, setFormData] = useState<SignupFormData>({
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailLocked, setEmailLocked] = useState(false);
  const [studioCode, setStudioCode] = useState<string | null>(null);
  const checkEmailMutation = trpc.user.checkEmailExists.useMutation();
  const { tenant, isLoading: tenantLoading, primaryColor, secondaryColor } = useTenantTheme();
  const searchParams = useSearchParams();

  // Extract studio code from returnUrl
  useEffect(() => {
    const returnUrl = searchParams.get('returnUrl');
    if (!returnUrl) return;

    const match = returnUrl.match(/code=([A-Z0-9]+)/i);
    if (match) {
      setStudioCode(match[1]);
    }
  }, [searchParams]);

  // Lookup studio by code using tRPC (avoids RLS issues)
  const { data: studioData } = trpc.studio.lookupByCode.useQuery(
    { code: studioCode! },
    { enabled: !!studioCode && studioCode.length === 5 }
  );

  // Pre-populate email when studio data loads
  useEffect(() => {
    if (studioData?.email) {
      console.log('[Claim] Pre-filling email:', studioData.email);
      setFormData(prev => ({ ...prev, email: studioData.email || '' }));
      setEmailLocked(true);
    }
  }, [studioData]);

  // Resolve tenant id reliably to avoid 500s from email system
  const resolveTenantId = async (): Promise<string | null> => {
    // 1) Context already has tenant
    if (tenant?.id) return tenant.id;

    // 2) Try public tenant endpoint
    try {
      const res = await fetch('/api/tenant', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.id) return data.id as string;
      }
    } catch (_) {
      // ignore and try next fallback
    }

    // 3) Env-based fallback for single-tenant deployments
    if (process.env.NEXT_PUBLIC_TENANT_ID) {
      return process.env.NEXT_PUBLIC_TENANT_ID as string;
    }

    // 4) As a last resort, try to infer from hostname via slug convention
    try {
      const host = typeof window !== 'undefined' ? window.location.hostname : '';
      const slug = host.split('.')[0];
      // If running on a naked domain or localhost, we cannot infer safely
      if (!slug || slug === 'localhost' || /:\\d+$/.test(slug)) return null;
      // Defer to server to resolve slug; if endpoint missing, return null
      const res2 = await fetch(`/api/tenant?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' });
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2?.id) return data2.id as string;
      }
    } catch (_) {
      // swallow
    }

    return null;
  };

  const updateFormData = (field: keyof SignupFormData, value: string) => {
    if (field === 'email') setError(null);
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.email) {
      setError('Email is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setError(null);

    try {
      // Ensure tenant is resolved before signup
      const tenantId = await resolveTenantId();
      if (!tenantId) {
        setError('Unable to determine tenant. Please refresh and try again.');
        setLoading(false);
        return;
      }

      // Check if email already exists before attempting signup
      const emailCheck = await checkEmailMutation.mutateAsync({ email: formData.email });

      if (emailCheck.exists) {
        setError('This email is already registered. Please sign in or reset your password.');
        setLoading(false);
        return;
      }

      // Create auth account via edge function (handles tenant_id, user_profiles, and email)
      const response = await fetch('/api/signup-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          tenant_id: tenantId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const msg = result.error || '';
        if (/already/i.test(msg) || /exists/i.test(msg) || /registered/i.test(msg) || /duplicate/i.test(msg)) {
          setError('This email is already registered. Please sign in or reset your password.');
        } else {
          setError(msg);
        }
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 min-h-[420px] text-center flex flex-col justify-center">
            <div className="mb-4 flex justify-center">
              <div className="h-16 w-16 bg-green-500/20 border border-green-400/30 rounded-full flex items-center justify-center">
                <span className="text-3xl">✓</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Check your email!</h2>
            <p className="text-gray-300">
              We've sent you a confirmation email. Please check your inbox and verify your account.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-block text-purple-400 hover:text-purple-300"
            >
              Go to login →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="mb-8 flex justify-center">
          <div
            className="h-16 w-16 rounded-2xl flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${primaryColor || '#FF1493'}, ${secondaryColor || '#EC4899'})`
            }}
          >
            <span className="text-3xl">✨</span>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 min-h-[420px]">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-1">Create Account</h1>
            <p className="text-gray-300 text-sm">Join {tenant?.name || 'us'} today</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-400/30 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                required
                disabled={emailLocked}
                className={`w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 ${emailLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                placeholder="you@example.com"
                autoFocus={!emailLocked}
              />
              {emailLocked && (
                <p className="text-xs text-gray-400 mt-1">Email pre-filled from your studio invitation</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-400 mt-1">Must be at least 6 characters</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading || tenantLoading}
              className="w-full text-white py-3 px-4 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-semibold"
              style={{
                background: `linear-gradient(90deg, ${primaryColor || '#FF1493'}, ${secondaryColor || '#EC4899'})`
              }}
            >
              {loading || tenantLoading ? 'Creating account...' : 'Create Account'}
            </button>

            <p className="text-xs text-gray-400 text-center">
              Complete your studio profile after confirming your email
            </p>
          </form>

          <div className="mt-6 text-center text-gray-300 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-400 hover:text-purple-300">
              Sign in
            </Link>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link href="/" className="text-gray-400 hover:text-gray-300 text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
