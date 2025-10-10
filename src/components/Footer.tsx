'use client';

import { useTenantTheme } from '@/contexts/TenantThemeProvider';

export default function Footer() {
  const { tenant } = useTenantTheme();
  const tenantName = tenant?.name || 'EMPWR Dance Experience';
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-blue-900/40 backdrop-blur-md border-t border-white/10 py-6 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-gray-300 text-sm">
          © {currentYear} <span className="font-semibold text-white">CompSync</span> for {tenantName}
        </p>
      </div>
    </footer>
  );
}
