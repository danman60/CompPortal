import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { TRPCProvider } from '@/providers/trpc-provider';
import ToastProvider from '@/components/ToastProvider';
import { TenantThemeProvider } from '@/contexts/TenantThemeProvider';
import { getTenantData } from '@/lib/tenant-context';
import Script from 'next/script';
import Footer from '@/components/Footer';

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
      <body className={`${inter.className} flex flex-col min-h-screen`}>
        <TenantThemeProvider initialTenant={tenantData}>
          <TRPCProvider>
            <ToastProvider />
            <div className="flex-1">{children}</div>
            <Footer />
          </TRPCProvider>
        </TenantThemeProvider>
      </body>
    </html>
  );
}
