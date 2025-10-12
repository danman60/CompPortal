# Two-Factor Authentication (2FA)

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: January 13, 2025

## Overview

TOTP-based (Time-based One-Time Password) two-factor authentication system for enhanced account security in CompPortal. Supports authenticator apps (Google Authenticator, Authy, etc.) with backup code recovery.

## Features

### 1. TOTP Authentication
- **Standard**: RFC 6238 compliant TOTP
- **Library**: otplib (battle-tested, widely used)
- **Compatible Apps**: Google Authenticator, Authy, Microsoft Authenticator, 1Password
- **Code Length**: 6 digits
- **Window**: 30-second time step

### 2. QR Code Setup
- **Generation**: Automatic QR code creation for easy setup
- **Library**: qrcode package
- **Format**: data:image URL for direct display
- **Manual Entry**: Secret key provided for manual entry

### 3. Backup Codes
- **Count**: 10 codes per user
- **Format**: `XXXX-XXXX` (8 characters, hyphenated)
- **Storage**: SHA-256 hashed
- **One-Time Use**: Codes deleted after use
- **Regeneration**: Available anytime with 2FA verification

### 4. Audit Logging
- **Actions Logged**: setup, verify, disable, backup_used
- **Data**: User ID, action, success status, IP, user agent, timestamp
- **Retention**: Database-based (configurable)
- **Access**: Users can view their own audit log

### 5. Admin Statistics
- **Metrics**: Total users, 2FA adoption rate, recent setups, failures
- **Access**: Admin/super_admin only
- **Use Case**: Monitor security adoption, identify issues

## Database Schema

### user_profiles (Extended)

```sql
ALTER TABLE "public"."user_profiles"
  ADD COLUMN "two_factor_enabled" BOOLEAN DEFAULT false,
  ADD COLUMN "two_factor_secret" TEXT,           -- Encrypted TOTP secret
  ADD COLUMN "two_factor_backup_codes" JSONB,    -- Array of hashed codes
  ADD COLUMN "two_factor_verified_at" TIMESTAMP(6);
```

### two_factor_audit_log (New Table)

```sql
CREATE TABLE "public"."two_factor_audit_log" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE,
  "action" VARCHAR(50) NOT NULL,  -- 'setup', 'verify', 'disable', 'backup_used'
  "success" BOOLEAN DEFAULT true,
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "timestamp" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints (tRPC)

### 1. Check 2FA Status
```typescript
const status = await trpc.twoFactor.getStatus.query();
// Returns: { enabled: boolean, backupCodeCount: number }
```

### 2. Start 2FA Setup
```typescript
const setup = await trpc.twoFactor.startSetup.query();
// Returns: {
//   secret: string,
//   qrCode: string (data URL),
//   backupCodes: string[],
//   formattedBackupCodes: string
// }
```

### 3. Verify and Enable 2FA
```typescript
await trpc.twoFactor.verifySetup.mutate({
  secret: 'JBSWY3DPEHPK3PXP',
  token: '123456',  // 6-digit code from authenticator app
  backupCodes: ['XXXX-XXXX', ...]
});
// Returns: { success: true, message: '2FA enabled successfully' }
```

### 4. Verify 2FA During Login
```typescript
const result = await trpc.twoFactor.verify.mutate({
  token: '123456' // or backup code 'XXXX-XXXX'
});
// Returns: { success: true, backupCodeUsed?: boolean }
```

### 5. Disable 2FA
```typescript
await trpc.twoFactor.disable.mutate({
  token: '123456' // Current TOTP code required
});
// Returns: { success: true, message: '2FA disabled successfully' }
```

### 6. Regenerate Backup Codes
```typescript
const codes = await trpc.twoFactor.regenerateBackupCodes.mutate({
  token: '123456' // Current TOTP code required
});
// Returns: {
//   success: true,
//   backupCodes: string[],
//   formattedBackupCodes: string
// }
```

### 7. Get Audit Log
```typescript
const audit = await trpc.twoFactor.getAuditLog.query({
  limit: 50 // optional, defaults to 50
});
// Returns: { logs: TwoFactorAuditLog[], count: number }
```

### 8. Get Statistics (Admin Only)
```typescript
const stats = await trpc.twoFactor.getStatistics.query();
// Returns: {
//   totalUsers: number,
//   usersWithOFA: number,
//   adoptionRate: number,
//   recentSetups: number,
//   recentFailures: number
// }
```

## Setup Flow (User Perspective)

### Step 1: User Initiates Setup
1. Navigate to Profile Settings → Security
2. Click "Enable Two-Factor Authentication"
3. System generates secret and QR code

### Step 2: Scan QR Code
1. Open authenticator app (Google Authenticator, Authy, etc.)
2. Scan QR code displayed on screen
3. Authenticator app adds account: `CompPortal (user@example.com)`

### Step 3: Verify and Save Backup Codes
1. Enter 6-digit code from authenticator app
2. System verifies code
3. Display 10 backup codes
4. User downloads/prints backup codes
5. 2FA enabled!

### Step 4: Login with 2FA
1. Enter email and password (normal login)
2. Prompted for 6-digit 2FA code
3. Enter code from authenticator app (or backup code)
4. Access granted

## Security Features

### 1. Secret Encryption
```typescript
// Secrets are encrypted before storage
const encrypted = encryptSecret(secret, process.env.TWO_FACTOR_ENCRYPTION_KEY);

// Decrypted only when needed for verification
const secret = decryptSecret(encrypted, process.env.TWO_FACTOR_ENCRYPTION_KEY);
```

**⚠️ IMPORTANT**: Set `TWO_FACTOR_ENCRYPTION_KEY` in environment variables:
```bash
# Generate a secure key
openssl rand -hex 32

# Add to .env.local
TWO_FACTOR_ENCRYPTION_KEY=your_secure_key_here
```

### 2. Backup Code Hashing
```typescript
// Backup codes are SHA-256 hashed before storage
const hashed = hashBackupCode('XXXX-XXXX');
// Stored: 'a3b2c1...' (hex digest)

// Verification: Hash input and compare
const valid = hashedCodes.includes(hashBackupCode(userInput));
```

### 3. One-Time Backup Codes
- Used codes are removed from database immediately
- No replay attacks possible
- User notified of remaining code count

### 4. Audit Trail
- All 2FA actions logged with:
  - User ID
  - Action type
  - Success/failure status
  - IP address (for anomaly detection)
  - User agent
  - Timestamp
- Users can review their own audit log
- Admins can monitor system-wide statistics

### 5. Row-Level Security (RLS)
```sql
-- Users can only view their own audit logs
CREATE POLICY "Users can view their own 2FA audit logs"
  ON "public"."two_factor_audit_log"
  FOR SELECT
  USING (user_id = auth.uid());
```

## Integration Examples

### 1. Add 2FA to Login Flow

```typescript
// In login handler
async function handleLogin(email: string, password: string) {
  // Step 1: Authenticate with email/password
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;

  // Step 2: Check if user has 2FA enabled
  const status = await trpc.twoFactor.getStatus.query();

  if (status.enabled) {
    // Show 2FA verification modal
    setShow2FAModal(true);
  } else {
    // Proceed to dashboard
    router.push('/dashboard');
  }
}

// In 2FA verification modal
async function verify2FA(token: string) {
  const result = await trpc.twoFactor.verify.mutate({ token });

  if (result.success) {
    if (result.backupCodeUsed) {
      toast.warning(`Backup code used. ${status.backupCodeCount - 1} codes remaining.`);
    }
    router.push('/dashboard');
  } else {
    toast.error('Invalid code. Please try again.');
  }
}
```

### 2. 2FA Setup Component

```typescript
'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import Image from 'next/image';

export function TwoFactorSetup() {
  const [step, setStep] = useState<'init' | 'scan' | 'verify' | 'complete'>('init');
  const [setupData, setSetupData] = useState<any>(null);

  const startSetup = trpc.twoFactor.startSetup.useQuery(undefined, {
    enabled: false
  });

  const verifySetup = trpc.twoFactor.verifySetup.useMutation();

  async function handleStart() {
    const data = await startSetup.refetch();
    setSetupData(data.data);
    setStep('scan');
  }

  async function handleVerify(token: string) {
    await verifySetup.mutateAsync({
      secret: setupData.secret,
      token,
      backupCodes: setupData.backupCodes
    });
    setStep('complete');
  }

  return (
    <div>
      {step === 'init' && (
        <button onClick={handleStart}>
          Enable Two-Factor Authentication
        </button>
      )}

      {step === 'scan' && (
        <div>
          <h3>Scan QR Code</h3>
          <Image
            src={setupData.qrCode}
            alt="QR Code"
            width={200}
            height={200}
          />
          <p>Or enter manually: {setupData.secret}</p>
          <button onClick={() => setStep('verify')}>Next</button>
        </div>
      )}

      {step === 'verify' && (
        <div>
          <h3>Verify Code</h3>
          <input
            type="text"
            maxLength={6}
            placeholder="000000"
            onChange={(e) => {
              if (e.target.value.length === 6) {
                handleVerify(e.target.value);
              }
            }}
          />
        </div>
      )}

      {step === 'complete' && (
        <div>
          <h3>Save Backup Codes</h3>
          <pre>{setupData.formattedBackupCodes}</pre>
          <button onClick={() => downloadBackupCodes(setupData.backupCodes)}>
            Download Codes
          </button>
        </div>
      )}
    </div>
  );
}
```

### 3. Require 2FA for Admin Actions

```typescript
// In sensitive mutation
export const deleteCompetition = publicProcedure
  .input(z.object({
    competitionId: z.string(),
    twoFactorToken: z.string().optional()
  }))
  .mutation(async ({ input, ctx }) => {
    // Check if user has 2FA enabled
    const has2FA = await is2FAEnabled(ctx.userId);

    if (has2FA) {
      // Require 2FA verification for sensitive action
      if (!input.twoFactorToken) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '2FA verification required'
        });
      }

      const result = await verify2FA({
        userId: ctx.userId,
        token: input.twoFactorToken
      });

      if (!result.success) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid 2FA code'
        });
      }
    }

    // Proceed with deletion
    await prisma.competitions.delete({
      where: { id: input.competitionId }
    });
  });
```

## Configuration

### Environment Variables

```bash
# Required for production
TWO_FACTOR_ENCRYPTION_KEY=your_32_byte_hex_key_here

# Optional customization
APP_NAME="CompPortal"                    # Default: CompPortal
BACKUP_CODE_COUNT=10                     # Default: 10
BACKUP_CODE_LENGTH=8                     # Default: 8
```

### Generate Encryption Key

```bash
# Linux/Mac
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Monitoring

### Dashboard Metrics

**For Admins:**
- Total users with 2FA enabled
- Adoption rate percentage
- Recent setup count (last 30 days)
- Recent failure count (last 7 days)

**Query:**
```typescript
const stats = await trpc.twoFactor.getStatistics.query();

console.log(`2FA Adoption: ${stats.adoptionRate}%`);
console.log(`Recent Setups: ${stats.recentSetups}`);
console.log(`Recent Failures: ${stats.recentFailures}`);
```

### User Audit Log

**For Users:**
```typescript
const audit = await trpc.twoFactor.getAuditLog.query({ limit: 50 });

audit.logs.forEach(log => {
  console.log(`[${log.timestamp}] ${log.action}: ${log.success ? 'SUCCESS' : 'FAIL'}`);
  console.log(`  IP: ${log.ipAddress}`);
  console.log(`  Agent: ${log.userAgent}`);
});
```

## Troubleshooting

### Issue: "Invalid verification code"

**Causes:**
1. Time drift between server and device
2. Incorrect secret scanned
3. Wrong code entry

**Solutions:**
1. Check device time synchronization
2. Regenerate QR code and re-scan
3. Use backup code instead
4. Check authenticator app has correct account

### Issue: "Unable to decrypt 2FA secret"

**Cause:** Missing or changed `TWO_FACTOR_ENCRYPTION_KEY`

**Solution:**
1. Verify environment variable is set
2. If key changed, users must re-setup 2FA
3. Log error and provide user-friendly message

### Issue: Backup codes not working

**Causes:**
1. Code already used
2. Incorrect format (missing hyphen)
3. Code not saved during setup

**Solutions:**
1. Check remaining code count
2. Try another backup code
3. Regenerate new codes (requires TOTP code)
4. Disable 2FA and re-setup if locked out

### Issue: High failure rate in statistics

**Investigation:**
1. Check audit log for patterns (specific users, IPs, times)
2. Look for brute force attempts (many failures from same IP)
3. Check for time synchronization issues (failures clustered)
4. Verify app compatibility (failures from specific user agents)

**Actions:**
1. Contact affected users
2. Implement rate limiting if needed
3. Add time drift tolerance (otplib default: ±1 window)
4. Provide better user guidance

## Migration Guide

### For Existing Users

1. **Announce feature** via email/notification
2. **Optional initially** - Don't force 2FA
3. **Incentivize adoption** - Security badge, priority support
4. **Gradual rollout** - Enable for admins first, then all users
5. **Recovery process** - Support team can disable 2FA if user locked out

### Database Migration

```bash
# Apply migration
npx prisma migrate deploy

# Or manually
psql $DATABASE_URL -f prisma/migrations/20250113000003_add_two_factor_authentication/migration.sql

# Verify
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name LIKE 'two_factor%';"
```

## Security Best Practices

### 1. Require 2FA for Admin Accounts
```typescript
// Check at login
if (userRole === 'super_admin' || userRole === 'competition_director') {
  if (!has2FA) {
    toast.warning('Admin accounts must enable 2FA');
    router.push('/settings/security');
  }
}
```

### 2. Periodically Remind Users
```typescript
// Show reminder if 2FA not enabled after 30 days
const accountAge = Date.now() - user.created_at.getTime();
const thirtyDays = 30 * 24 * 60 * 60 * 1000;

if (accountAge > thirtyDays && !has2FA) {
  showSecurityReminder();
}
```

### 3. Monitor Failed Attempts
```typescript
// Alert on multiple failures
const recentFailures = await prisma.$queryRaw`
  SELECT user_id, COUNT(*) as failures
  FROM public.two_factor_audit_log
  WHERE action = 'verify'
    AND success = false
    AND timestamp > NOW() - INTERVAL '1 hour'
  GROUP BY user_id
  HAVING COUNT(*) >= 5
`;

if (recentFailures.length > 0) {
  alertSecurityTeam(recentFailures);
}
```

### 4. Secure Backup Codes
- Warn users to store codes securely
- Provide download/print options
- Show remaining code count
- Allow regeneration (with 2FA verification)

## References

- **Migration**: `prisma/migrations/20250113000003_add_two_factor_authentication/migration.sql`
- **Library**: `src/lib/two-factor.ts`
- **Router**: `src/server/routers/twoFactor.ts`
- **RFC 6238**: TOTP Specification
- **otplib**: https://github.com/yeojz/otplib
- **qrcode**: https://github.com/soldair/node-qrcode

## Support

For issues or questions:
- Review audit log for error patterns
- Check environment variables
- Verify time synchronization
- Test with multiple authenticator apps
- Contact security team for account lockouts
