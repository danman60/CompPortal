'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { useTenantTheme } from '@/contexts/TenantThemeProvider';

/**
 * Email confirmation page
 * Handles email verification for new signups
 * Tenant-branded confirmation experience
 */
export default function ConfirmEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { tenant } = useTenantTheme();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const supabase = createClient();

        // Get token from URL parameters
        const token_hash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        if (!token_hash || type !== 'email') {
          setStatus('error');
          setErrorMessage('Invalid confirmation link. Please check your email and try again.');
          return;
        }

        // Verify the email with Supabase
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: 'email',
        });

        if (error) {
          console.error('Email verification error:', error);
          setStatus('error');
          setErrorMessage(error.message || 'Failed to verify email. The link may have expired.');
          return;
        }

        if (data.user) {
          setStatus('success');

          // Check if user has a claim code in metadata
          const claimCode = data.user.user_metadata?.claim_code;

          // Redirect after 2 seconds
          setTimeout(() => {
            if (claimCode) {
              // Return to claim flow with the code
              router.push(`/claim?code=${claimCode}`);
            } else {
              // Normal signup flow - go to dashboard
              router.push('/dashboard');
            }
          }, 2000);
        } else {
          setStatus('error');
          setErrorMessage('Verification failed. Please try again or contact support.');
        }
      } catch (err) {
        console.error('Unexpected error during email verification:', err);
        setStatus('error');
        setErrorMessage('An unexpected error occurred. Please try again.');
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-8">
        {/* Tenant Logo/Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {tenant?.name || 'CompPortal'}
          </h1>
          <p className="text-white/70 text-sm">Email Confirmation</p>
        </div>

        {/* Status Display */}
        <div className="text-center">
          {status === 'verifying' && (
            <div>
              <div className="mb-4">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto"></div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Verifying your email...
              </h2>
              <p className="text-white/70">
                Please wait while we confirm your email address.
              </p>
            </div>
          )}

          {status === 'success' && (
            <div>
              <div className="mb-4">
                <div className="bg-green-500/20 rounded-full h-16 w-16 flex items-center justify-center mx-auto">
                  <svg className="h-10 w-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Email confirmed!
              </h2>
              <p className="text-white/70 mb-4">
                Your email has been successfully verified.
              </p>
              <p className="text-white/60 text-sm">
                Redirecting to dashboard...
              </p>
            </div>
          )}

          {status === 'error' && (
            <div>
              <div className="mb-4">
                <div className="bg-red-500/20 rounded-full h-16 w-16 flex items-center justify-center mx-auto">
                  <svg className="h-10 w-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Verification failed
              </h2>
              <p className="text-red-300 mb-6">
                {errorMessage}
              </p>
              <div className="space-y-3">
                <button
                  onClick={() => router.push('/login')}
                  className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  Go to login
                </button>
                <a
                  href="mailto:techsupport@compsync.net"
                  className="block w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-center"
                >
                  Contact support
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-white/50 text-sm" suppressHydrationWarning>
            {tenant?.name || 'CompPortal'} &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
