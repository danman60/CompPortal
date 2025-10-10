import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TRPCProvider } from '@/providers/trpc-provider';
import ToastProvider from '@/components/ToastProvider';
import { TenantThemeProvider } from '@/contexts/TenantThemeProvider';
import { getTenantData } from '@/lib/tenant-context';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Competition Portal',
  description: 'Modern dance competition management platform',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Fetch tenant data server-side for SSR
  const tenantData = await getTenantData();

  return (
    <html lang="en">
      <body className={inter.className}>
        <TenantThemeProvider initialTenant={tenantData}>
          <TRPCProvider>
            <ToastProvider />
            {children}
          </TRPCProvider>
        </TenantThemeProvider>
      </body>
    </html>
  );
}
