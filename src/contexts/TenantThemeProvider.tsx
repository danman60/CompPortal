'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { TenantData } from '@/lib/tenant-context';

interface TenantThemeContextValue {
  tenant: TenantData | null;
  primaryColor: string;
  secondaryColor: string;
  logo: string | null;
  tagline: string;
  isLoading: boolean;
}

const TenantThemeContext = createContext<TenantThemeContextValue | undefined>(undefined);

interface TenantThemeProviderProps {
  children: ReactNode;
  initialTenant?: TenantData | null;
}

/**
 * Tenant Theme Provider
 *
 * Provides tenant branding context and applies CSS variables dynamically
 * based on tenant branding configuration.
 */
export function TenantThemeProvider({ children, initialTenant }: TenantThemeProviderProps) {
  const [tenant, setTenant] = useState<TenantData | null>(initialTenant || null);
  const [isLoading, setIsLoading] = useState(!initialTenant);

  // Fetch tenant data if not provided (client-side navigation)
  useEffect(() => {
    if (!initialTenant) {
      fetch('/api/tenant')
        .then((res) => res.json())
        .then((data) => {
          setTenant(data);
          setIsLoading(false);
        })
        .catch((err) => {
          console.error('Failed to fetch tenant data:', err);
          setIsLoading(false);
        });
    }
  }, [initialTenant]);

  // Apply CSS variables when tenant data changes
  useEffect(() => {
    if (tenant?.branding) {
      const root = document.documentElement;

      // Apply primary color
      if (tenant.branding.primaryColor) {
        root.style.setProperty('--tenant-primary', tenant.branding.primaryColor);
      }

      // Apply secondary color
      if (tenant.branding.secondaryColor) {
        root.style.setProperty('--tenant-secondary', tenant.branding.secondaryColor);
      }

      // Store tenant name for meta tags
      if (tenant.name) {
        document.title = `${tenant.name} | Competition Portal`;
      }
    }
  }, [tenant]);

  const value: TenantThemeContextValue = {
    tenant,
    primaryColor: tenant?.branding?.primaryColor || '#6366F1',
    secondaryColor: tenant?.branding?.secondaryColor || '#8B5CF6',
    logo: tenant?.branding?.logo || null,
    tagline: tenant?.branding?.tagline || 'Dance Competition Management',
    isLoading,
  };

  return (
    <TenantThemeContext.Provider value={value}>
      {children}
    </TenantThemeContext.Provider>
  );
}

/**
 * Hook to access tenant theme context
 *
 * @example
 * const { tenant, primaryColor, secondaryColor } = useTenantTheme();
 */
export function useTenantTheme() {
  const context = useContext(TenantThemeContext);

  if (context === undefined) {
    throw new Error('useTenantTheme must be used within a TenantThemeProvider');
  }

  return context;
}
