# GDPR Compliance - Data Export & Deletion

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Last Updated**: January 13, 2025

## Overview

Complete GDPR (General Data Protection Regulation) compliance implementation for CompPortal, providing users with:
- **Right to Data Portability** (Article 20): Export all personal data in machine-readable format
- **Right to be Forgotten** (Article 17): Request permanent deletion of personal data

## Features

### 1. Data Export
- **Comprehensive Coverage**: All user data exported including:
  - Personal information (email, name, phone, timezone)
  - Profile settings (tenant, role, notification preferences, 2FA status)
  - Owned studios (id, name, code, status)
  - Dancers registered (first name, last name, DOB)
  - Competition entries (title, status, competition details)
  - Reservations (spaces requested, status, competition)
  - Invoices (total, status, competition)
  - Activity logs (last 1000 actions)
- **Multiple Formats**: JSON (structured) or CSV (spreadsheet-compatible)
- **Metadata**: Export date, version, format included
- **Audit Trail**: All exports logged with timestamp, format, and user IP

### 2. Account Deletion
- **Two-Step Process**:
  1. Preview deletion (shows counts of data to be deleted)
  2. Confirm deletion (requires typing "DELETE_MY_ACCOUNT")
- **Cascade Deletion**: Properly handles foreign key constraints:
  - Documents → Email logs → Invoices → Entries → Reservations → Dancers → Studios → Activity logs → 2FA audit → Profile
- **Comprehensive**: Deletes all user data including:
  - User profile and settings
  - All owned studios and associated data
  - All dancers registered by user
  - All competition entries and participants
  - All reservations and invoices
  - All uploaded documents
  - All activity logs
  - All 2FA audit logs
  - All email logs
- **Audit Trail**: Deletion requests and confirmations logged
- **Irreversible**: Clear warnings shown to users

### 3. Admin Features
- **GDPR Statistics Dashboard**:
  - Total exports (all time)
  - Total deletion requests
  - Total confirmed deletions
  - Recent exports (last 30 days)
  - Recent deletions (last 30 days)
- **Audit Log Access**: View all GDPR actions system-wide
- **Force Delete**: Super admins can delete accounts with reason tracking

## API Endpoints (tRPC)

### 1. Get Data Summary
```typescript
const summary = await trpc.gdpr.getDataSummary.query();
// Returns: {
//   summary: {
//     studios: number,
//     dancers: number,
//     entries: number,
//     reservations: number,
//     invoices: number
//   },
//   userId: string
// }
```

**Purpose**: Preview data counts before deletion
**Access**: Authenticated users (own data only)

### 2. Export Data
```typescript
const result = await trpc.gdpr.exportData.mutate({
  format: 'json' // or 'csv'
});
// Returns: {
//   success: true,
//   data: string (formatted data),
//   filename: string,
//   mimeType: string,
//   exportDate: string (ISO 8601)
// }
```

**Purpose**: Export all user data in requested format
**Access**: Authenticated users (own data only)
**Audit**: Logged with format and timestamp

### 3. Request Deletion
```typescript
const preview = await trpc.gdpr.requestDeletion.mutate();
// Returns: {
//   success: true,
//   message: 'Deletion request created',
//   summary: { studios: 2, dancers: 15, entries: 8, ... },
//   confirmation_required: true
// }
```

**Purpose**: Step 1 - Preview deletion and create audit log
**Access**: Authenticated users (own account only)

### 4. Confirm Deletion
```typescript
const result = await trpc.gdpr.confirmDeletion.mutate({
  confirmation: 'DELETE_MY_ACCOUNT',
  userId: 'user-uuid-here'
});
// Returns: {
//   success: true,
//   message: 'Account and all associated data have been permanently deleted',
//   deleted_records: {
//     user_profiles: 1,
//     studios: 2,
//     dancers: 15,
//     entries: 8,
//     reservations: 3,
//     invoices: 5,
//     activity_logs: 247,
//     documents: 12,
//     email_logs: 18,
//     two_factor_audit: 5
//   }
// }
```

**Purpose**: Step 2 - Execute permanent deletion
**Access**: Authenticated users (own account only)
**Verification**: Must match userId and type exact confirmation phrase
**Audit**: Logged before deletion executes

### 5. Get Audit Log (Admin)
```typescript
const audit = await trpc.gdpr.getAuditLog.query({
  userId: 'optional-user-uuid',
  limit: 100 // default 100, max 500
});
// Returns: {
//   logs: Array<{
//     user_id: string,
//     action: string,
//     details: string,
//     timestamp: Date
//   }>,
//   count: number
// }
```

**Purpose**: View GDPR actions (exports, deletion requests, confirmations)
**Access**: Competition directors and super admins only
**Filter**: Optional userId to view specific user's GDPR history

### 6. Get Statistics (Admin)
```typescript
const stats = await trpc.gdpr.getStatistics.query();
// Returns: {
//   total_exports: number,
//   total_deletion_requests: number,
//   total_deletions_confirmed: number,
//   recent_exports: number, // Last 30 days
//   recent_deletions: number // Last 30 days
// }
```

**Purpose**: Monitor GDPR compliance metrics
**Access**: Competition directors and super admins only

### 7. Admin Delete User (Super Admin)
```typescript
const result = await trpc.gdpr.adminDeleteUser.mutate({
  userId: 'user-uuid-to-delete',
  reason: 'Account violation: spam behavior reported'
});
// Returns: {
//   success: true,
//   message: 'User account forcibly deleted by admin',
//   deleted_records: { ... },
//   admin_id: string
// }
```

**Purpose**: Emergency account deletion by super admin
**Access**: Super admins only
**Audit**: Logs admin ID and reason for deletion
**Reason Required**: Minimum 10 characters

## Implementation Details

### Data Export Structure (JSON)
```json
{
  "personal_information": {
    "user_id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+1-555-0123",
    "role": "studio_director",
    "timezone": "America/Toronto",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "profile": {
    "tenant_id": "tenant-uuid",
    "notification_preferences": {
      "sms": false,
      "email": true,
      "competition_updates": true
    },
    "two_factor_enabled": true
  },
  "studios": [
    {
      "id": "studio-uuid",
      "name": "Elite Dance Studio",
      "code": "ELITE2024",
      "status": "active",
      "role": "owner"
    }
  ],
  "dancers": [
    {
      "id": "dancer-uuid",
      "first_name": "Jane",
      "last_name": "Smith",
      "date_of_birth": "2010-05-15",
      "created_at": "2024-02-01T14:20:00Z"
    }
  ],
  "entries": [
    {
      "id": "entry-uuid",
      "title": "Swan Lake Solo",
      "competition_name": "Spring Championships 2024",
      "status": "confirmed",
      "created_at": "2024-03-10T09:15:00Z"
    }
  ],
  "reservations": [...],
  "invoices": [...],
  "activity_logs": [...],
  "metadata": {
    "export_date": "2025-01-13T16:45:00Z",
    "export_version": "1.0",
    "format": "json"
  }
}
```

### CSV Export Format
```csv
Personal Information
Field,Value
User ID,uuid
Email,user@example.com
First Name,John
Last Name,Doe
Phone,+1-555-0123
Role,studio_director
Created At,2024-01-15T10:30:00Z

Studios
ID,Name,Code,Status,Role
studio-uuid,Elite Dance Studio,ELITE2024,active,owner

Dancers
ID,First Name,Last Name,Date of Birth,Created At
dancer-uuid,Jane,Smith,2010-05-15,2024-02-01T14:20:00Z

Competition Entries
ID,Title,Competition,Status,Created At
entry-uuid,Swan Lake Solo,Spring Championships 2024,confirmed,2024-03-10T09:15:00Z
```

### Deletion Cascade Order
**Critical**: Foreign keys require specific deletion order to avoid constraint violations.

1. **Documents** - Child of studios, uploaded_by references user
2. **Email logs** - Child of studios
3. **Invoices** - References reservations and competitions
4. **Entries** - Has entry_participants child table (cascades automatically)
5. **Reservations** - References competitions
6. **Dancers** - Child of studios
7. **Studios** - Owned by user
8. **Activity logs** - Direct user reference (raw SQL)
9. **2FA audit logs** - Direct user reference (raw SQL)
10. **User profile** - Final deletion (cascades to users table via RLS)

**Note**: Supabase auth.users deletion should be handled via Supabase Admin API or dashboard, not directly in application code.

## Integration Examples

### 1. Data Export UI Component
```typescript
'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';

export function DataExportButton() {
  const [format, setFormat] = useState<'json' | 'csv'>('json');

  const exportMutation = trpc.gdpr.exportData.useMutation({
    onSuccess: (data) => {
      // Create download
      const blob = new Blob([data.data], { type: data.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      link.click();
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully');
    },
    onError: (error) => {
      toast.error(`Export failed: ${error.message}`);
    }
  });

  return (
    <div>
      <select value={format} onChange={(e) => setFormat(e.target.value as 'json' | 'csv')}>
        <option value="json">JSON</option>
        <option value="csv">CSV</option>
      </select>

      <button
        onClick={() => exportMutation.mutate({ format })}
        disabled={exportMutation.isPending}
      >
        {exportMutation.isPending ? 'Exporting...' : 'Export My Data'}
      </button>
    </div>
  );
}
```

### 2. Account Deletion UI Component
```typescript
'use client';

import { trpc } from '@/lib/trpc';
import { useState } from 'react';

export function DeleteAccountFlow() {
  const [step, setStep] = useState<'preview' | 'confirm'>('preview');
  const [confirmation, setConfirmation] = useState('');
  const [summary, setSummary] = useState<any>(null);

  const requestMutation = trpc.gdpr.requestDeletion.useMutation({
    onSuccess: (data) => {
      setSummary(data.summary);
      setStep('confirm');
    }
  });

  const confirmMutation = trpc.gdpr.confirmDeletion.useMutation({
    onSuccess: (data) => {
      toast.success('Account deleted successfully');
      // Redirect to logout/home
      window.location.href = '/';
    },
    onError: (error) => {
      toast.error(`Deletion failed: ${error.message}`);
    }
  });

  const handleConfirm = () => {
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      toast.error('Please type the exact confirmation phrase');
      return;
    }

    confirmMutation.mutate({
      confirmation: 'DELETE_MY_ACCOUNT',
      userId: currentUserId // from context
    });
  };

  return (
    <div>
      {step === 'preview' && (
        <div>
          <h2>Delete Your Account</h2>
          <p className="text-red-600">
            ⚠️ This action is permanent and cannot be undone.
          </p>
          <button onClick={() => requestMutation.mutate()}>
            Preview Deletion
          </button>
        </div>
      )}

      {step === 'confirm' && summary && (
        <div>
          <h2>Confirm Account Deletion</h2>
          <p>The following data will be permanently deleted:</p>
          <ul>
            <li>{summary.studios} studios</li>
            <li>{summary.dancers} dancers</li>
            <li>{summary.entries} competition entries</li>
            <li>{summary.reservations} reservations</li>
            <li>{summary.invoices} invoices</li>
          </ul>

          <p className="font-bold">
            Type "DELETE_MY_ACCOUNT" to confirm:
          </p>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder="DELETE_MY_ACCOUNT"
          />

          <button
            onClick={handleConfirm}
            disabled={confirmMutation.isPending || confirmation !== 'DELETE_MY_ACCOUNT'}
            className="bg-red-600 text-white"
          >
            {confirmMutation.isPending ? 'Deleting...' : 'Permanently Delete Account'}
          </button>
        </div>
      )}
    </div>
  );
}
```

### 3. Admin GDPR Dashboard
```typescript
'use client';

import { trpc } from '@/lib/trpc';

export function GDPRAdminDashboard() {
  const { data: stats } = trpc.gdpr.getStatistics.useQuery();
  const { data: auditLog } = trpc.gdpr.getAuditLog.useQuery({ limit: 50 });

  return (
    <div>
      <h1>GDPR Compliance Dashboard</h1>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="card">
            <h3>Total Exports</h3>
            <p className="text-3xl">{stats.total_exports}</p>
            <p className="text-sm text-gray-600">
              {stats.recent_exports} in last 30 days
            </p>
          </div>

          <div className="card">
            <h3>Deletion Requests</h3>
            <p className="text-3xl">{stats.total_deletion_requests}</p>
          </div>

          <div className="card">
            <h3>Confirmed Deletions</h3>
            <p className="text-3xl">{stats.total_deletions_confirmed}</p>
            <p className="text-sm text-gray-600">
              {stats.recent_deletions} in last 30 days
            </p>
          </div>
        </div>
      )}

      {auditLog && (
        <div className="mt-8">
          <h2>Recent GDPR Actions</h2>
          <table>
            <thead>
              <tr>
                <th>User ID</th>
                <th>Action</th>
                <th>Details</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.logs.map((log, i) => (
                <tr key={i}>
                  <td>{log.user_id.slice(0, 8)}...</td>
                  <td>{log.action}</td>
                  <td>{log.details}</td>
                  <td>{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

## Security Considerations

### 1. Authentication & Authorization
- **All endpoints require authentication** via Supabase session
- **Own data only**: Users can only export/delete their own data
- **Admin endpoints**: Restricted to competition_director and super_admin roles
- **Force delete**: Super admin only with mandatory reason tracking

### 2. Audit Logging
- **All GDPR actions logged** in activity_logs table
- **Logged actions**: export, delete_request, delete_confirmed
- **Data captured**: user_id, action type, details (format, counts), timestamp
- **Admin access**: Audit logs viewable by admins for compliance reporting
- **User access**: Users can see their own audit trail

### 3. Confirmation Requirements
- **Two-step deletion**: Preview → Confirm prevents accidental deletion
- **Exact phrase required**: User must type "DELETE_MY_ACCOUNT" exactly
- **userId verification**: Confirm endpoint validates userId matches session

### 4. Data Integrity
- **Cascade handling**: Deletion order respects foreign key constraints
- **Transaction safety**: Deletions wrapped in try-catch with rollback on error
- **Error reporting**: Failed deletions return detailed error messages
- **Partial failure handling**: Returns success=false with deleted_records showing progress

### 5. Privacy by Design
- **No data leakage**: Export only includes user's own data
- **Tenant isolation**: All queries filtered by user ownership
- **IP tracking**: Export/deletion requests logged with IP for security audit
- **Irreversibility**: Clear warnings that deletion is permanent

## Legal Compliance

### GDPR Requirements Met

**Article 20 - Right to Data Portability**
- ✅ Data exported in structured, machine-readable format (JSON)
- ✅ Common format for interoperability (CSV also available)
- ✅ All personal data included (comprehensive export)
- ✅ Export provided without undue delay (immediate download)

**Article 17 - Right to be Forgotten**
- ✅ Users can request deletion at any time
- ✅ Deletion executed without undue delay (immediate)
- ✅ All personal data removed (cascade deletion)
- ✅ Audit trail maintained for compliance (activity logs)

**Article 30 - Records of Processing Activities**
- ✅ All GDPR actions logged with timestamp
- ✅ Purpose documented (export vs deletion)
- ✅ Data categories tracked (studios, dancers, entries, etc.)
- ✅ Retention period documented (logs kept indefinitely)

### Limitations

**Data Not Deleted (Legal Basis)**
- **Financial records**: May be required by law for 7 years (invoices, payments)
- **Audit logs**: Kept for security and compliance purposes
- **Anonymized data**: Aggregated statistics with no personal identifiers
- **Legal holds**: Data subject to legal proceedings may be retained

**Implementation Notes**
- Current implementation deletes ALL data including financial records
- Consider legal retention requirements in your jurisdiction
- May need to modify deletion logic to anonymize instead of delete invoices
- Consult legal counsel before deploying to production

## Testing Recommendations

### 1. Data Export Testing
```typescript
// Test JSON export
const jsonExport = await trpc.gdpr.exportData.mutate({ format: 'json' });
const data = JSON.parse(jsonExport.data);
assert(data.personal_information.email === currentUser.email);
assert(data.studios.length === expectedStudioCount);
assert(data.metadata.export_version === '1.0');

// Test CSV export
const csvExport = await trpc.gdpr.exportData.mutate({ format: 'csv' });
assert(csvExport.mimeType === 'text/csv');
assert(csvExport.data.includes('Personal Information'));
```

### 2. Deletion Flow Testing
```typescript
// Test preview
const summary = await trpc.gdpr.requestDeletion.mutate();
assert(summary.confirmation_required === true);
assert(typeof summary.summary.studios === 'number');

// Test deletion
const result = await trpc.gdpr.confirmDeletion.mutate({
  confirmation: 'DELETE_MY_ACCOUNT',
  userId: testUserId
});
assert(result.success === true);
assert(result.deleted_records.user_profiles === 1);

// Verify data removed
const userCheck = await prisma.user_profiles.findUnique({
  where: { id: testUserId }
});
assert(userCheck === null);
```

### 3. Admin Endpoint Testing
```typescript
// Test statistics
const stats = await trpc.gdpr.getStatistics.query();
assert(stats.total_exports >= 0);
assert(stats.total_deletions_confirmed >= 0);

// Test audit log
const audit = await trpc.gdpr.getAuditLog.query({ limit: 10 });
assert(audit.logs.length <= 10);
assert(audit.logs.every(log => log.action.startsWith('gdpr_')));
```

### 4. Security Testing
```typescript
// Test unauthorized access
await expect(
  trpc.gdpr.exportData.mutate({ format: 'json' })
).rejects.toThrow('UNAUTHORIZED');

// Test cross-user access
await expect(
  trpc.gdpr.confirmDeletion.mutate({
    confirmation: 'DELETE_MY_ACCOUNT',
    userId: otherUserId
  })
).rejects.toThrow('FORBIDDEN');

// Test admin-only endpoints
await expect(
  trpc.gdpr.getStatistics.query()
).rejects.toThrow('FORBIDDEN'); // For non-admin users
```

## Monitoring & Maintenance

### Key Metrics to Track
1. **Export volume**: Monitor total exports per day/week/month
2. **Export format preference**: JSON vs CSV usage
3. **Deletion requests**: Track deletion request rate
4. **Deletion completion**: Percentage of requests that confirm
5. **Failed deletions**: Track errors and investigate root causes
6. **Admin deletions**: Monitor forced deletions by admins

### Alerts to Configure
- High deletion rate (potential data breach response)
- Failed deletion errors (investigate database issues)
- Large export files (potential abuse or data leak)
- Admin force deletions (audit trail verification)

### Maintenance Tasks
- **Weekly**: Review GDPR audit logs for anomalies
- **Monthly**: Generate compliance report for legal team
- **Quarterly**: Test data export/deletion flows
- **Annually**: Legal review of retention policies

## References

- **Library**: `src/lib/gdpr.ts` (600+ lines)
- **Router**: `src/server/routers/gdpr.ts` (300+ lines)
- **GDPR Regulation**: https://gdpr-info.eu/
- **Article 17 (Right to be Forgotten)**: https://gdpr-info.eu/art-17-gdpr/
- **Article 20 (Data Portability)**: https://gdpr-info.eu/art-20-gdpr/

## Support

For GDPR-related questions:
- Review audit logs for user action history
- Check deleted_records counts for troubleshooting
- Verify cascade order if deletion fails
- Consult legal team for retention policy questions
