import Link from 'next/link';
import { getTenantData } from '@/lib/tenant-context';
import GenericLandingPage from '@/components/GenericLandingPage';

export default async function Home() {
  // Get tenant data from subdomain
  const tenant = await getTenantData();

  // If no tenant (root compsync.net), show generic landing
  if (!tenant || tenant.slug === 'demo') {
    return <GenericLandingPage />;
  }

  // Extract tenant branding
  const branding = tenant?.branding || {};
  const tenantName = tenant?.name || 'Competition Portal';
  const tagline = (typeof branding === 'object' && branding.tagline) || 'Professional dance competition management platform';
  const primaryColor = (typeof branding === 'object' && branding.primaryColor) || '#6366F1';
  const secondaryColor = (typeof branding === 'object' && branding.secondaryColor) || '#8B5CF6';

  // Tenant-specific landing page (e.g., empwr.compsync.net)
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-md mx-auto">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <div
              className="h-20 w-20 rounded-2xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
              }}
            >
              <span className="text-4xl">✨</span>
            </div>
          </div>

          {/* Hero */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              {tenantName}
            </h1>
            <p className="text-gray-300">
              {tagline}
            </p>
          </div>

          {/* Auth Buttons */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-8 min-h-[420px] flex flex-col justify-center">
            <div className="space-y-4">
              <Link
                href="/login"
                className="block w-full text-center text-white px-6 py-3 rounded-lg hover:shadow-lg transition-all duration-200 transform hover:scale-105 font-semibold"
                style={{
                  background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`
                }}
              >
                Sign In
              </Link>
              {/* Signup disabled - studios must use claim links from Competition Directors */}
            </div>

            <div className="mt-6 text-center text-gray-400 text-sm">
              New studios: Contact your competition director for an invitation link<br />
              Competition Directors login with provided credentials
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
