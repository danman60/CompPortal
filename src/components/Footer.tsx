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
          © {currentYear} <span className="font-semibold text-white">EMPWR</span> for {tenantName}
        </p>
        <p className="text-gray-400 text-xs mt-2">
          <a
            href="/status"
            className="hover:text-white transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            System Status
          </a>
        </p>
      </div>
    </footer>
  );
}
