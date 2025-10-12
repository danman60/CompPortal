import { prisma } from './prisma';
import { extractIpAddress } from './activity';

/**
 * IP Whitelist utilities for restricting sensitive admin actions
 * Supports individual IPs and CIDR ranges
 */

export interface IpWhitelistEntry {
  id: string;
  tenant_id: string;
  ip_address: string;
  ip_range_start?: string | null;
  ip_range_end?: string | null;
  description?: string | null;
  is_active: boolean;
  created_at: Date;
}

export interface CheckIpWhitelistOptions {
  tenantId: string;
  headers: Headers | Record<string, string | string[] | undefined>;
  /**
   * If true, allows access when whitelist is empty (default: false for security)
   */
  allowWhenEmpty?: boolean;
}

export interface IpWhitelistResult {
  allowed: boolean;
  clientIp?: string;
  matchedRule?: IpWhitelistEntry;
  reason?: string;
}

/**
 * Check if an IP address is within a range
 */
function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
}

function isIpInRange(ip: string, rangeStart: string, rangeEnd: string): boolean {
  const ipNum = ipToNumber(ip);
  const startNum = ipToNumber(rangeStart);
  const endNum = ipToNumber(rangeEnd);
  return ipNum >= startNum && ipNum <= endNum;
}

/**
 * Parse CIDR notation to IP range
 */
function parseCIDR(cidr: string): { start: string; end: string } | null {
  const parts = cidr.split('/');
  if (parts.length !== 2) return null;

  const [baseIp, prefixStr] = parts;
  const prefix = parseInt(prefixStr);

  if (prefix < 0 || prefix > 32) return null;

  const ipNum = ipToNumber(baseIp);
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  const startNum = (ipNum & mask) >>> 0;
  const endNum = (startNum | ~mask) >>> 0;

  const numberToIp = (num: number): string => {
    return [
      (num >>> 24) & 0xff,
      (num >>> 16) & 0xff,
      (num >>> 8) & 0xff,
      num & 0xff,
    ].join('.');
  };

  return {
    start: numberToIp(startNum),
    end: numberToIp(endNum),
  };
}

/**
 * Check if IP matches a whitelist entry
 */
function matchesWhitelistEntry(ip: string, entry: IpWhitelistEntry): boolean {
  // Exact IP match
  if (entry.ip_address === ip) {
    return true;
  }

  // CIDR notation match
  if (entry.ip_address.includes('/')) {
    const range = parseCIDR(entry.ip_address);
    if (range && isIpInRange(ip, range.start, range.end)) {
      return true;
    }
  }

  // IP range match
  if (entry.ip_range_start && entry.ip_range_end) {
    if (isIpInRange(ip, entry.ip_range_start, entry.ip_range_end)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if the client IP is whitelisted for the tenant
 */
export async function checkIpWhitelist(
  options: CheckIpWhitelistOptions
): Promise<IpWhitelistResult> {
  const { tenantId, headers, allowWhenEmpty = false } = options;

  // Extract client IP from headers
  const clientIp = extractIpAddress(headers);

  if (!clientIp) {
    return {
      allowed: false,
      reason: 'Unable to determine client IP address',
    };
  }

  // Special case: localhost/development (127.0.0.1, ::1, ::ffff:127.0.0.1)
  if (
    clientIp === '127.0.0.1' ||
    clientIp === '::1' ||
    clientIp === '::ffff:127.0.0.1' ||
    clientIp.startsWith('192.168.') || // Private network
    clientIp.startsWith('10.') // Private network
  ) {
    if (process.env.NODE_ENV === 'development') {
      return {
        allowed: true,
        clientIp,
        reason: 'Development environment - localhost allowed',
      };
    }
  }

  // Fetch active whitelist entries for this tenant
  const whitelistEntries = await prisma.$queryRaw<IpWhitelistEntry[]>`
    SELECT * FROM public.ip_whitelist
    WHERE tenant_id = ${tenantId}::uuid
      AND is_active = true
  `;

  // If whitelist is empty
  if (whitelistEntries.length === 0) {
    return {
      allowed: allowWhenEmpty,
      clientIp,
      reason: allowWhenEmpty
        ? 'Whitelist empty - access allowed by policy'
        : 'IP whitelist is empty - access denied for security',
    };
  }

  // Check if IP matches any whitelist entry
  for (const entry of whitelistEntries) {
    if (matchesWhitelistEntry(clientIp, entry)) {
      return {
        allowed: true,
        clientIp,
        matchedRule: entry,
        reason: `Matched whitelist rule: ${entry.description || entry.ip_address}`,
      };
    }
  }

  return {
    allowed: false,
    clientIp,
    reason: `IP ${clientIp} not found in whitelist`,
  };
}

/**
 * Middleware wrapper for IP whitelist check
 * Throws error if IP not whitelisted
 */
export async function requireWhitelistedIp(
  options: CheckIpWhitelistOptions
): Promise<void> {
  const result = await checkIpWhitelist(options);

  if (!result.allowed) {
    const error = new Error(
      result.reason || 'Access denied: IP address not whitelisted'
    );
    (error as any).code = 'IP_NOT_WHITELISTED';
    (error as any).clientIp = result.clientIp;
    throw error;
  }
}

/**
 * Get all active whitelist entries for a tenant
 */
export async function getWhitelistEntries(
  tenantId: string
): Promise<IpWhitelistEntry[]> {
  return prisma.$queryRaw<IpWhitelistEntry[]>`
    SELECT * FROM public.ip_whitelist
    WHERE tenant_id = ${tenantId}::uuid
    ORDER BY created_at DESC
  `;
}

/**
 * Add IP to whitelist
 */
export async function addIpToWhitelist(params: {
  tenantId: string;
  ipAddress: string;
  description?: string;
  createdBy?: string;
}): Promise<IpWhitelistEntry> {
  const { tenantId, ipAddress, description, createdBy } = params;

  // Validate IP format
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/(?:[0-9]|[1-2][0-9]|3[0-2]))?$/;
  if (!ipRegex.test(ipAddress)) {
    throw new Error('Invalid IP address or CIDR notation');
  }

  const result = await prisma.$queryRaw<IpWhitelistEntry[]>`
    INSERT INTO public.ip_whitelist (tenant_id, ip_address, description, created_by)
    VALUES (
      ${tenantId}::uuid,
      ${ipAddress},
      ${description || null},
      ${createdBy ? `${createdBy}::uuid` : null}
    )
    RETURNING *
  `;

  return result[0];
}

/**
 * Remove IP from whitelist
 */
export async function removeIpFromWhitelist(params: {
  tenantId: string;
  entryId: string;
}): Promise<void> {
  const { tenantId, entryId } = params;

  await prisma.$executeRaw`
    DELETE FROM public.ip_whitelist
    WHERE id = ${entryId}::uuid
      AND tenant_id = ${tenantId}::uuid
  `;
}

/**
 * Toggle whitelist entry active status
 */
export async function toggleWhitelistEntry(params: {
  tenantId: string;
  entryId: string;
  isActive: boolean;
}): Promise<void> {
  const { tenantId, entryId, isActive } = params;

  await prisma.$executeRaw`
    UPDATE public.ip_whitelist
    SET is_active = ${isActive},
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ${entryId}::uuid
      AND tenant_id = ${tenantId}::uuid
  `;
}

/**
 * Validate IP address format
 */
export function isValidIpAddress(ip: string): boolean {
  const ipRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
}

/**
 * Validate CIDR notation
 */
export function isValidCIDR(cidr: string): boolean {
  const cidrRegex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\/(?:[0-9]|[1-2][0-9]|3[0-2])$/;
  return cidrRegex.test(cidr);
}
