'use client';

import { useTenantTheme } from '@/contexts/TenantThemeProvider';
import packageJson from '../../package.json';

export default function Footer() {
  const { tenant } = useTenantTheme();
  const tenantName = tenant?.name || 'EMPWR Dance Experience';
  const currentYear = new Date().getFullYear();

  // Get commit hash from Vercel env var or fallback
  const commitHash = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev';
  const version = packageJson.version;

  return (
    <footer className="bg-gradient-to-r from-slate-900 via-gray-900 to-black border-t border-white/10 py-6 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-gray-400 text-sm">
          © {currentYear} <span className="font-semibold text-white">{tenantName}</span> · Powered by <span className="font-semibold text-purple-400">CompSync</span>
        </p>
        <p className="text-gray-500 text-xs mt-2">
          <a
            href="/status"
            className="hover:text-purple-400 transition-colors"
            target="_blank"
            rel="noopener noreferrer"
          >
            System Status
          </a>
          <span className="mx-2">·</span>
          <span className="font-mono">v{version} ({commitHash})</span>
        </p>
      </div>
    </footer>
  );
}
