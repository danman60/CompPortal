import { headers } from 'next/headers';
import { getTenantData } from '@/lib/tenant-context';

/**
 * Debug endpoint to inspect tenant detection
 * Visit: https://empwr.compsync.net/api/tenant-debug
 * Or: https://www.compsync.net/api/tenant-debug
 */
export async function GET() {
  const headersList = await headers();
  const hostname = headersList.get('host') || '';

  // Extract subdomain manually for debugging
  const host = hostname.split(':')[0];
  const parts = host.split('.');
  const extractedSubdomain = parts.length >= 3 ? parts[0] : null;

  // Get tenant data from the function
  const tenantData = await getTenantData();

  // Collect all headers for inspection
  const allHeaders: Record<string, string> = {};
  headersList.forEach((value, key) => {
    allHeaders[key] = value;
  });

  return Response.json({
    timestamp: new Date().toISOString(),
    hostname,
    hostParts: parts,
    extractedSubdomain,
    tenantData: tenantData ? {
      id: tenantData.id,
      name: tenantData.name,
      subdomain: tenantData.subdomain,
      slug: tenantData.slug,
      branding: tenantData.branding
    } : null,
    allHeaders,
    debugInfo: {
      partsCount: parts.length,
      expectedSubdomain: extractedSubdomain,
      tenantFound: !!tenantData,
      usedFallback: tenantData?.slug === 'demo'
    }
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
}
