# IP Whitelisting for Admin Actions

**Task #33** - IP Whitelisting for Admin Actions
**Status**: ✅ Complete (Infrastructure)
**Date**: January 13, 2025

## Overview

IP whitelist system to restrict sensitive admin actions to approved IP addresses or ranges. Prevents unauthorized access from compromised accounts by adding an additional security layer based on network location.

## Features

- **Individual IP Support** - Whitelist specific IP addresses
- **CIDR Range Support** - Whitelist entire subnets (e.g., 192.168.1.0/24)
- **IP Range Support** - Whitelist ranges (192.168.1.1 to 192.168.1.255)
- **Multi-Tenant** - Separate whitelist per tenant
- **Active/Inactive Toggle** - Temporarily disable rules without deletion
- **Audit Trail** - Track who created each whitelist entry
- **RLS Policies** - Row-level security for tenant isolation
- **Development Mode** - Localhost automatically allowed in dev
- **Proxy Support** - Extracts IP from X-Forwarded-For, X-Real-IP, CF-Connecting-IP

## Database Schema

### Table: `ip_whitelist`

```sql
CREATE TABLE public.ip_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  ip_address VARCHAR(45) NOT NULL,
  ip_range_start VARCHAR(45),
  ip_range_end VARCHAR(45),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.auth.users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:**
- `idx_ip_whitelist_tenant` - Tenant lookups
- `idx_ip_whitelist_ip` - IP address lookups
- `idx_ip_whitelist_active` - Active entries filter

**RLS Policies:**
- Users can view whitelist for their tenant
- Only admins can manage whitelist entries

## Implementation

### Core Library: `src/lib/ip-whitelist.ts`

**Key Functions:**

```typescript
import { checkIpWhitelist, requireWhitelistedIp } from '@/lib/ip-whitelist';

// Check if IP is whitelisted (non-blocking)
const result = await checkIpWhitelist({
  tenantId: 'abc-123',
  headers: request.headers,
  allowWhenEmpty: false, // Deny if whitelist is empty
});

if (!result.allowed) {
  console.log(`Access denied: ${result.reason}`);
  console.log(`Client IP: ${result.clientIp}`);
}

// Require whitelisted IP (throws error if not allowed)
try {
  await requireWhitelistedIp({
    tenantId: 'abc-123',
    headers: request.headers,
  });
  // Proceed with sensitive operation
} catch (error) {
  // Handle denied access
}
```

**Available Functions:**
- `checkIpWhitelist()` - Non-blocking check, returns result
- `requireWhitelistedIp()` - Throws error if not whitelisted
- `getWhitelistEntries()` - Fetch all entries for tenant
- `addIpToWhitelist()` - Add new entry
- `removeIpFromWhitelist()` - Delete entry
- `toggleWhitelistEntry()` - Enable/disable entry
- `isValidIpAddress()` - Validate IP format
- `isValidCIDR()` - Validate CIDR notation

### tRPC Router: `src/server/routers/ipWhitelist.ts`

**Endpoints:**

```typescript
// List all whitelist entries
const { entries, count } = await trpc.ipWhitelist.list.query();

// Add new entry
await trpc.ipWhitelist.add.mutate({
  ipAddress: '192.168.1.1', // or '192.168.1.0/24'
  description: 'Office network',
});

// Remove entry
await trpc.ipWhitelist.remove.mutate({
  entryId: 'entry-uuid',
});

// Toggle active status
await trpc.ipWhitelist.toggle.mutate({
  entryId: 'entry-uuid',
  isActive: false,
});

// Get statistics
const stats = await trpc.ipWhitelist.getStats.query();
// Returns: { total: 5, active: 4, inactive: 1 }
```

## IP Matching Logic

### 1. Exact IP Match
```typescript
Whitelist: 192.168.1.100
Matches: 192.168.1.100
Rejects: 192.168.1.101
```

### 2. CIDR Notation
```typescript
Whitelist: 192.168.1.0/24
Matches: 192.168.1.1, 192.168.1.100, 192.168.1.255
Rejects: 192.168.2.1, 10.0.0.1
```

### 3. IP Range
```typescript
Whitelist: start=192.168.1.10, end=192.168.1.20
Matches: 192.168.1.10, 192.168.1.15, 192.168.1.20
Rejects: 192.168.1.9, 192.168.1.21
```

## Usage Examples

### Protect Sensitive Admin Operation

```typescript
// In tRPC mutation
import { requireWhitelistedIp } from '@/lib/ip-whitelist';

export const adminRouter = router({
  approveStudio: protectedProcedure
    .input(z.object({ studioId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // Check IP whitelist before proceeding
      await requireWhitelistedIp({
        tenantId: ctx.tenantId!,
        headers: ctx.req?.headers || {},
      });

      // Proceed with sensitive operation
      const studio = await prisma.studios.update({
        where: { id: input.studioId },
        data: { status: 'approved' },
      });

      return { success: true, studio };
    }),
});
```

### API Route Protection

```typescript
// In API route handler
import { NextRequest, NextResponse } from 'next/server';
import { checkIpWhitelist } from '@/lib/ip-whitelist';

export async function POST(request: NextRequest) {
  const tenantId = request.headers.get('x-tenant-id');

  // Check IP whitelist
  const ipCheck = await checkIpWhitelist({
    tenantId: tenantId!,
    headers: request.headers,
    allowWhenEmpty: false,
  });

  if (!ipCheck.allowed) {
    return NextResponse.json(
      { error: ipCheck.reason },
      { status: 403 }
    );
  }

  // Proceed with sensitive operation
  // ...
}
```

### Server Action Protection

```typescript
// In server action
'use server';

import { requireWhitelistedIp } from '@/lib/ip-whitelist';
import { headers } from 'next/headers';

export async function deleteAllData(tenantId: string) {
  // Check IP whitelist
  const headersList = headers();
  await requireWhitelistedIp({
    tenantId,
    headers: headersList,
  });

  // Proceed with data deletion
  // ...
}
```

## Configuration

### Environment Variables

No additional environment variables required. Uses existing database and Supabase configuration.

### Default Behavior

| Setting | Default | Description |
|---------|---------|-------------|
| allowWhenEmpty | false | Deny access if whitelist is empty |
| is_active | true | New entries active by default |
| Development localhost | Allowed | 127.0.0.1 allowed in dev mode |
| Private networks | Allowed in dev | 192.168.x.x, 10.x.x.x in dev |

## Security Considerations

### Strengths

1. **Multi-Layer Security** - Combines authentication + IP restriction
2. **Proxy-Aware** - Correctly extracts IP behind proxies/CDNs
3. **Tenant Isolation** - RLS policies prevent cross-tenant access
4. **Audit Trail** - created_by tracks who added entries
5. **Flexible** - Individual IPs, CIDR, or ranges
6. **Non-Blocking** - Failed checks don't crash the app

### Limitations

1. **VPN Bypass** - User with VPN can change IP
2. **Shared IPs** - Multiple users on same IP all allowed
3. **Dynamic IPs** - Residential IPs change frequently
4. **Mobile Networks** - Cellular IPs change constantly
5. **IPv6** - Currently IPv4 only

### Best Practices

1. **Combine with MFA** - Use IP whitelisting + 2FA for max security
2. **Office Networks** - Whitelist office IP ranges
3. **VPN Endpoints** - Whitelist company VPN exit IPs
4. **Regular Audits** - Review whitelist entries quarterly
5. **Descriptive Names** - Add clear descriptions to entries
6. **Monitor Failures** - Log denied access attempts
7. **Emergency Access** - Keep backup admin access method

## Operations to Protect (Recommended)

### High Priority
- **Studio Approval/Rejection** - Payment implications
- **User Role Changes** - Permission escalation risk
- **Data Exports** - GDPR/privacy concerns
- **Bulk Deletions** - Irreversible data loss
- **Email Blasts** - Spam/reputation risk

### Medium Priority
- Competition Creation/Deletion
- Invoice Generation/Modification
- Pricing Changes
- System Settings Changes

### Low Priority
- Regular CRUD operations
- Read-only queries
- Standard user actions

## Migration Path

### Current State
- Infrastructure complete (database, utilities, router)
- Build passing (43 routes)
- Ready for integration

### Next Steps

1. **Integrate into Admin Router**
   ```typescript
   // Add to studio.approve, studio.reject, etc.
   await requireWhitelistedIp({ tenantId, headers });
   ```

2. **Create Admin UI**
   - Page: `/dashboard/settings/ip-whitelist`
   - Components: IpWhitelistManager.tsx
   - Features: Add, remove, toggle, view entries

3. **Add Monitoring**
   - Log denied access attempts
   - Alert on multiple failures
   - Dashboard widget for whitelist status

4. **Testing**
   - Test with office IP
   - Test with external IP (should deny)
   - Test CIDR ranges
   - Test with VPN

5. **Documentation**
   - Admin guide for managing whitelist
   - User communication about security measure
   - Troubleshooting guide for lockouts

## Troubleshooting

### Issue: Locked Out (IP Not Whitelisted)

**Immediate Fix:**
1. Access database directly (Supabase dashboard)
2. Add current IP to whitelist:
   ```sql
   INSERT INTO public.ip_whitelist (tenant_id, ip_address, description, is_active)
   VALUES ('your-tenant-id', 'your-current-ip', 'Emergency access', true);
   ```

### Issue: Can't Determine IP Address

**Causes:**
- Missing proxy headers
- Local development without proper setup
- Server-side rendering without request context

**Fix:**
- Ensure proxy forwarding headers configured
- Use `extractIpAddress()` helper
- Check middleware for header injection

### Issue: Development Environment Blocked

**Fix:**
Add localhost to whitelist or set `NODE_ENV=development` to auto-allow:
```bash
NODE_ENV=development npm run dev
```

### Issue: Mobile Users Can't Access

**Explanation:**
Mobile networks use dynamic IPs. Not suitable for IP whitelisting.

**Solutions:**
- Use different security measure for mobile (device fingerprinting, push auth)
- Whitelist entire carrier IP ranges (large, risky)
- Require MFA instead of IP whitelist

## Testing

### Manual Testing

```bash
# 1. Add whitelist entry
curl -X POST http://localhost:3000/api/trpc/ipWhitelist.add \
  -H "Content-Type: application/json" \
  -d '{"ipAddress": "192.168.1.100", "description": "Test IP"}'

# 2. Test protected operation
curl -X POST http://localhost:3000/api/admin/sensitive-action \
  -H "X-Forwarded-For: 192.168.1.100"
# Should succeed

curl -X POST http://localhost:3000/api/admin/sensitive-action \
  -H "X-Forwarded-For: 10.0.0.1"
# Should fail with 403
```

### Automated Tests

```typescript
describe('IP Whitelist', () => {
  it('should allow whitelisted IP', async () => {
    await addIpToWhitelist({
      tenantId: 'test-tenant',
      ipAddress: '192.168.1.1',
    });

    const result = await checkIpWhitelist({
      tenantId: 'test-tenant',
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });

    expect(result.allowed).toBe(true);
  });

  it('should deny non-whitelisted IP', async () => {
    const result = await checkIpWhitelist({
      tenantId: 'test-tenant',
      headers: { 'x-forwarded-for': '10.0.0.1' },
      allowWhenEmpty: false,
    });

    expect(result.allowed).toBe(false);
  });

  it('should match CIDR range', async () => {
    await addIpToWhitelist({
      tenantId: 'test-tenant',
      ipAddress: '192.168.1.0/24',
    });

    const result = await checkIpWhitelist({
      tenantId: 'test-tenant',
      headers: { 'x-forwarded-for': '192.168.1.100' },
    });

    expect(result.allowed).toBe(true);
  });
});
```

## Future Enhancements

- [ ] **IPv6 Support** - Full IPv6 address matching
- [ ] **GeoIP Restrictions** - Country/region-based restrictions
- [ ] **Time-Based Rules** - Allow IP only during business hours
- [ ] **Risk Scoring** - Combine IP + device + behavior
- [ ] **Auto-Ban** - Temporarily ban IPs after failed attempts
- [ ] **IP Reputation** - Integrate with threat intelligence feeds
- [ ] **Webhook Notifications** - Alert on denied access
- [ ] **Admin UI** - Visual management interface
- [ ] **Bulk Import** - CSV import of IP ranges
- [ ] **Export Logs** - Download access logs for audit

## Architecture

```
Request
  │
  ├─► extractIpAddress() → Get client IP from headers
  │
  ├─► checkIpWhitelist() → Query database
  │     ├─► Exact match?
  │     ├─► CIDR match?
  │     └─► Range match?
  │
  └─► Allow/Deny → Proceed or throw error
```

**Database Layer:**
- `ip_whitelist` table with RLS policies
- Indexes for fast lookups
- Tenant isolation

**Application Layer:**
- `src/lib/ip-whitelist.ts` - Core logic
- `src/server/routers/ipWhitelist.ts` - API endpoints
- Integration points in admin routers

---

**Status**: ✅ Infrastructure Complete
**Build**: Pass (43 routes)
**Next**: Integration into specific admin operations
**Task #33**: IP Whitelisting for Admin Actions implemented
