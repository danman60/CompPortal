'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Tenant {
  id: string;
  slug: string;
  subdomain: string;
  name: string;
}

export default function SelectTenantPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch available tenants from API
    fetch('/api/tenants')
      .then((res) => res.json())
      .then((data) => {
        setTenants(data.tenants || []);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to load tenants:', error);
        setLoading(false);
      });
  }, []);

  const handleSelectTenant = (subdomain: string) => {
    // Redirect to tenant subdomain
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;

    // Build the subdomain URL
    let targetUrl: string;

    if (hostname === 'localhost') {
      // For local development, redirect to same localhost with subdomain parameter
      targetUrl = `${protocol}//localhost:3000?tenant=${subdomain}`;
    } else {
      // For production, redirect to actual subdomain
      const domainParts = hostname.split('.');
      if (domainParts.length >= 2) {
        const baseDomain = domainParts.slice(-2).join('.');
        targetUrl = `${protocol}//${subdomain}.${baseDomain}`;
      } else {
        targetUrl = `${protocol}//${subdomain}.${hostname}`;
      }
    }

    window.location.href = targetUrl;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Select Your Competition</h1>
          <p className="text-gray-300 mb-8">
            Choose which competition portal you'd like to access
          </p>

          {tenants.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No competitions available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => handleSelectTenant(tenant.subdomain)}
                  className="w-full p-6 bg-white/5 border-2 border-white/20 rounded-lg hover:bg-white/10 hover:border-purple-400 transition-all text-left group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-white group-hover:text-purple-300 transition-colors">
                        {tenant.name}
                      </h2>
                      <p className="text-sm text-gray-400 mt-1">
                        {tenant.subdomain}.compsync.net
                      </p>
                    </div>
                    <svg
                      className="w-6 h-6 text-gray-400 group-hover:text-purple-400 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-sm text-gray-400 text-center">
              Need help? Contact support at{' '}
              <a href="mailto:support@compsync.net" className="text-purple-400 hover:text-purple-300">
                support@compsync.net
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
