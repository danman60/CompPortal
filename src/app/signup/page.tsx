'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { trpc } from '@/lib/trpc';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  const router = useRouter();
  const supabase = createClient();
  const checkEmailMutation = trpc.user.checkEmailExists.useMutation();

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
      // Check if email already exists before attempting signup
      const emailCheck = await checkEmailMutation.mutateAsync({ email: formData.email });

      if (emailCheck.exists) {
        setError('This email is already registered. Please sign in or reset your password.');
        setLoading(false);
        return;
      }

      // Create auth account - user will complete profile in onboarding after email confirmation
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL || 'https://comp-portal-one.vercel.app'}/onboarding`,
          data: {
            // Prevent auto-login before email confirmation
            // This reduces console errors from unconfirmed session
          },
        },
      });

      // Sign out immediately to prevent unconfirmed session errors
      if (data.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut();
      }

      if (signUpError) {
        const msg = signUpError.message || '';
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
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 text-center">
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
          <div className="h-16 w-16 bg-gradient-to-br from-pink-500 via-purple-500 to-yellow-500 rounded-2xl flex items-center justify-center">
            <span className="text-3xl">✨</span>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-white mb-1">Create Account</h1>
            <p className="text-gray-300 text-sm">Join CompPortal today</p>
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
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="you@example.com"
                autoFocus
              />
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
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white py-3 px-4 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none font-semibold"
            >
              {loading ? 'Creating account...' : 'Create Account'}
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
