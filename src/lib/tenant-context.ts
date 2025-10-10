import { headers } from 'next/headers';

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
 * Get tenant ID from request headers (server-side only)
 * Injected by middleware
 */
export async function getTenantId(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get('x-tenant-id');
}

/**
 * Get full tenant data from request headers (server-side only)
 * Injected by middleware
 */
export async function getTenantData(): Promise<TenantData | null> {
  const headersList = await headers();
  const tenantDataStr = headersList.get('x-tenant-data');

  if (!tenantDataStr) {
    return null;
  }

  try {
    return JSON.parse(tenantDataStr) as TenantData;
  } catch {
    return null;
  }
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
