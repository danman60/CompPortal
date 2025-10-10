import { headers } from 'next/headers';
import { createServerSupabaseClient } from './supabase-server-client';

/**
 * Tenant context data structure
 */
export interface TenantData {
  id: string;
  slug: string;
  subdomain: string;
  name: string;
  branding: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string | null;
    tagline?: string;
  };
}

/**
 * Extract subdomain from hostname
 */
function extractSubdomain(hostname: string): string | null {
  const host = hostname.split(':')[0];
  const parts = host.split('.');

  if (parts.length <= 1 || host === 'localhost') return null;
  if (parts.length === 2) return null;
  if (parts.length >= 3) return parts[0];

  return null;
}

/**
 * Get tenant ID from request headers (server-side only)
 * Fetches from database based on subdomain
 */
export async function getTenantId(): Promise<string | null> {
  const tenantData = await getTenantData();
  return tenantData?.id || null;
}

/**
 * Get full tenant data from request headers (server-side only)
 * Fetches from database based on subdomain
 */
export async function getTenantData(): Promise<TenantData | null> {
  const headersList = await headers();
  const hostname = headersList.get('host') || '';
  const subdomain = extractSubdomain(hostname);

  const supabase = await createServerSupabaseClient();

  // Query by subdomain if present
  if (subdomain) {
    const { data } = await supabase
      .from('tenants')
      .select('id, slug, subdomain, name, branding')
      .eq('subdomain', subdomain)
      .single();

    if (data) return data as TenantData;
  }

  // Fallback to demo tenant
  const { data } = await supabase
    .from('tenants')
    .select('id, slug, subdomain, name, branding')
    .eq('slug', 'demo')
    .single();

  return data as TenantData | null;
}

/**
 * Get tenant ID from tRPC context
 * Use this in tRPC procedures
 */
export function getTenantIdFromContext(ctx: any): string | null {
  return ctx.tenantId || null;
}

/**
 * Get tenant data from tRPC context
 * Use this in tRPC procedures
 */
export function getTenantDataFromContext(ctx: any): TenantData | null {
  return ctx.tenantData || null;
}

/**
 * Ensure tenant ID exists, throw error if not
 * Use this for routes that require tenant context
 */
export async function requireTenantId(): Promise<string> {
  const tenantId = await getTenantId();

  if (!tenantId) {
    throw new Error('Tenant context not found. Multi-tenant middleware may not be configured.');
  }

  return tenantId;
}
