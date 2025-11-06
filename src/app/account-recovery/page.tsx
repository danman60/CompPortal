'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { createClient } from '@/lib/supabase';

export default function AccountRecoveryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: validation, isLoading: validating } = trpc.accountRecovery.validateToken.useQuery(
    { token: token || '' },
    { enabled: !!token }
  );

  const completeRecoveryMutation = trpc.accountRecovery.completeRecovery.useMutation();

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid recovery token');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const result = await completeRecoveryMutation.mutateAsync({
        token,
        password,
      });

      if (result.success && result.email) {
        // Sign in with new password
        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: result.email,
          password,
        });

        if (signInError) {
          setError('Password updated but login failed. Please try logging in manually.');
          setTimeout(() => router.push('/login'), 3000);
        } else {
          // Success - redirect to dashboard
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete recovery');
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Validating recovery token...</p>
        </div>
      </div>
    );
  }

  if (!validation?.valid) {
    const getMessage = () => {
      switch (validation?.reason) {
        case 'used':
          return 'This recovery link has already been used. Please try logging in normally.';
        case 'expired':
          return 'This recovery link has expired. Please contact support for assistance.';
        default:
          return 'Invalid recovery link. Please contact support for assistance.';
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-md p-8 border border-gray-700">
          <div className="text-center">
            <div className="text-red-400 text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Invalid Recovery Link</h1>
            <p className="text-gray-300 mb-6">{getMessage()}</p>
            <button
              onClick={() => router.push('/login')}
              className="text-purple-400 hover:text-purple-300 font-medium"
            >
              Return to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <div className="max-w-md w-full bg-gray-800 rounded-lg shadow-md p-8 border border-gray-700">
        <div className="text-center mb-8">
          <div className="text-blue-400 text-5xl mb-4">🔐</div>
          <h1 className="text-2xl font-bold text-gray-100 mb-2">Welcome Back!</h1>
          <p className="text-gray-300">
            Hi <span className="font-semibold text-purple-400">{validation.studio?.name}</span>
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Create your password to access your account and all your data.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-200 mb-2">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
              placeholder="Enter your password"
              required
              minLength={6}
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">
              You can use your old password if you remember it
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-200 mb-2">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-gray-100 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-400"
              placeholder="Confirm your password"
              required
              minLength={6}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white font-semibold py-3 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Setting Password...
              </span>
            ) : (
              'Set Password & Login'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-400">
          <p>Need help? Contact support</p>
        </div>
      </div>
    </div>
  );
}
