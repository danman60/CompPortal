# Task: Multi-User Studio Accounts with Role Management

**Priority**: MEDIUM (Task #17 from TODO.md)
**Estimate**: 4-6 hours
**Source**: BUGS_AND_FEATURES.md Studio Management

## Context

Currently, each studio has a single owner account. Studios need multiple user logins (owner + staff) with different permission levels to manage dancers, routines, and reservations collaboratively.

## Database Schema

### Existing Tables

**`user_profiles`** - Already has:
- `id`, `first_name`, `last_name`, `phone`, `avatar_url`
- `notification_preferences` (JSONB)

**`users`** - Supabase auth table (don't modify directly)

**`studios`** - Already has:
- `id`, `name`, `owner_id` (references users)

### New Migration Required

**File**: `codex-tasks/migrations/20251012_add_studio_users_roles.sql`

```sql
-- Studio user roles and permissions
-- Migration: 20251012_add_studio_users_roles

-- Create studio_users join table
CREATE TABLE IF NOT EXISTS public.studio_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'staff', -- 'owner', 'admin', 'staff', 'viewer'
  permissions JSONB DEFAULT '{}', -- Flexible permission overrides
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(studio_id, user_id) -- Prevent duplicate user assignments
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_studio_users_studio ON public.studio_users(studio_id);
CREATE INDEX IF NOT EXISTS idx_studio_users_user ON public.studio_users(user_id);
CREATE INDEX IF NOT EXISTS idx_studio_users_role ON public.studio_users(role);

-- Enable RLS
ALTER TABLE public.studio_users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own studio associations
CREATE POLICY "Users can view their studio memberships"
ON public.studio_users FOR SELECT
USING (
  user_id = (SELECT auth.uid())
  OR studio_id IN (
    SELECT studio_id FROM public.studio_users
    WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
  )
);

-- RLS Policy: Owners and admins can insert new studio users
CREATE POLICY "Owners and admins can add studio users"
ON public.studio_users FOR INSERT
WITH CHECK (
  studio_id IN (
    SELECT studio_id FROM public.studio_users
    WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
  )
);

-- RLS Policy: Owners and admins can update studio users
CREATE POLICY "Owners and admins can update studio users"
ON public.studio_users FOR UPDATE
USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_users
    WHERE user_id = (SELECT auth.uid()) AND role IN ('owner', 'admin')
  )
);

-- RLS Policy: Only owners can delete studio users
CREATE POLICY "Only owners can remove studio users"
ON public.studio_users FOR DELETE
USING (
  studio_id IN (
    SELECT studio_id FROM public.studio_users
    WHERE user_id = (SELECT auth.uid()) AND role = 'owner'
  )
);

-- Migrate existing studios to studio_users
-- Add existing studio owners to studio_users table
INSERT INTO public.studio_users (studio_id, user_id, role, accepted_at, invited_by)
SELECT
  id as studio_id,
  owner_id as user_id,
  'owner' as role,
  created_at as accepted_at,
  owner_id as invited_by
FROM public.studios
WHERE owner_id IS NOT NULL
ON CONFLICT (studio_id, user_id) DO NOTHING;

COMMENT ON TABLE public.studio_users IS 'Join table for multi-user studio access with role-based permissions';
COMMENT ON COLUMN public.studio_users.role IS 'Roles: owner (full access), admin (manage users/settings), staff (create/edit routines), viewer (read-only)';
COMMENT ON COLUMN public.studio_users.permissions IS 'JSONB for granular permission overrides: {can_manage_billing: true, can_delete_dancers: false}';
```

## Role Definitions

### Owner
- **Count**: 1 per studio (original creator)
- **Permissions**: Full access to everything
- **Can**: Invite/remove users, change settings, delete studio, manage billing
- **Cannot**: Be removed from studio

### Admin
- **Count**: Unlimited
- **Permissions**: Almost full access
- **Can**: Invite/remove staff, edit studio settings, manage all routines/dancers
- **Cannot**: Remove owner, delete studio, manage billing

### Staff
- **Count**: Unlimited
- **Permissions**: Day-to-day operations
- **Can**: Create/edit routines, add/edit dancers, view invoices, upload music
- **Cannot**: Invite users, change settings, view billing details

### Viewer
- **Count**: Unlimited
- **Permissions**: Read-only access
- **Can**: View routines, dancers, schedules, scores
- **Cannot**: Create/edit/delete anything

## Backend Implementation

### 1. Add studioUser Router

**File**: `src/server/routers/studioUser.ts` (NEW FILE)

```typescript
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { prisma } from '@/lib/prisma';
import { logActivity } from '@/lib/activity';
import { sendEmail } from '@/lib/email';

export const studioUserRouter = router({
  // Get all users for a studio (owner/admin only)
  getByStudio: protectedProcedure
    .input(z.object({ studioId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Check if user is owner/admin of this studio
      const membership = await prisma.studio_users.findFirst({
        where: {
          studio_id: input.studioId,
          user_id: ctx.userId,
          role: { in: ['owner', 'admin'] },
          is_active: true,
        },
      });

      if (!membership) {
        throw new Error('Unauthorized: Only owners and admins can view studio users');
      }

      const users = await prisma.studio_users.findMany({
        where: {
          studio_id: input.studioId,
          is_active: true,
        },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              user_profiles: {
                select: {
                  first_name: true,
                  last_name: true,
                  phone: true,
                  avatar_url: true,
                },
              },
            },
          },
          users_studio_users_invited_byTousers: {
            select: {
              id: true,
              email: true,
              user_profiles: {
                select: {
                  first_name: true,
                  last_name: true,
                },
              },
            },
          },
        },
        orderBy: [
          { role: 'asc' }, // owner first, then admin, staff, viewer
          { created_at: 'asc' },
        ],
      });

      return { users };
    }),

  // Invite a new user to studio
  invite: protectedProcedure
    .input(z.object({
      studioId: z.string().uuid(),
      email: z.string().email(),
      role: z.enum(['admin', 'staff', 'viewer']), // Can't directly invite as owner
      firstName: z.string().optional(),
      lastName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { studioId, email, role, firstName, lastName } = input;

      // Check if user is owner/admin of this studio
      const membership = await prisma.studio_users.findFirst({
        where: {
          studio_id: studioId,
          user_id: ctx.userId,
          role: { in: ['owner', 'admin'] },
          is_active: true,
        },
      });

      if (!membership) {
        throw new Error('Unauthorized: Only owners and admins can invite users');
      }

      // Check if user already exists in auth system
      const existingUser = await prisma.users.findFirst({
        where: { email },
      });

      if (existingUser) {
        // User exists, add them to studio
        const existingMembership = await prisma.studio_users.findFirst({
          where: {
            studio_id: studioId,
            user_id: existingUser.id,
          },
        });

        if (existingMembership) {
          if (existingMembership.is_active) {
            throw new Error('User is already a member of this studio');
          } else {
            // Reactivate existing membership
            const updated = await prisma.studio_users.update({
              where: { id: existingMembership.id },
              data: {
                role,
                is_active: true,
                invited_by: ctx.userId,
                invited_at: new Date(),
              },
            });
            return { studioUserId: updated.id, status: 'reactivated' };
          }
        }

        // Create new studio_users record
        const studioUser = await prisma.studio_users.create({
          data: {
            studio_id: studioId,
            user_id: existingUser.id,
            role,
            invited_by: ctx.userId,
            accepted_at: new Date(), // Auto-accept for existing users
          },
        });

        // Activity logging
        try {
          await logActivity({
            userId: ctx.userId,
            studioId,
            action: 'studio_user.invite',
            entityType: 'studio_user',
            entityId: studioUser.id,
            details: {
              invited_user_email: email,
              role,
            },
          });
        } catch (err) {
          console.error('Failed to log activity (studio_user.invite):', err);
        }

        // TODO: Send notification email

        return { studioUserId: studioUser.id, status: 'added' };
      } else {
        // User doesn't exist - create invitation record
        // For MVP, we'll require users to sign up first
        throw new Error('User not found. Please ask them to create an account first, then invite them.');

        // Future: Create pending invitation system
        // const invitation = await prisma.studio_invitations.create({...})
        // Send invitation email with signup link
      }
    }),

  // Update user role/permissions
  updateRole: protectedProcedure
    .input(z.object({
      studioUserId: z.string().uuid(),
      role: z.enum(['owner', 'admin', 'staff', 'viewer']),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the studio_users record
      const studioUser = await prisma.studio_users.findUnique({
        where: { id: input.studioUserId },
      });

      if (!studioUser) {
        throw new Error('Studio user not found');
      }

      // Check if current user is owner of this studio
      const membership = await prisma.studio_users.findFirst({
        where: {
          studio_id: studioUser.studio_id,
          user_id: ctx.userId,
          role: 'owner',
          is_active: true,
        },
      });

      if (!membership) {
        throw new Error('Unauthorized: Only owners can change user roles');
      }

      // Don't allow changing owner role
      if (studioUser.role === 'owner' && input.role !== 'owner') {
        throw new Error('Cannot change owner role. Transfer ownership first.');
      }

      // Update role
      const updated = await prisma.studio_users.update({
        where: { id: input.studioUserId },
        data: {
          role: input.role,
          updated_at: new Date(),
        },
      });

      // Activity logging
      try {
        await logActivity({
          userId: ctx.userId,
          studioId: studioUser.studio_id,
          action: 'studio_user.update_role',
          entityType: 'studio_user',
          entityId: updated.id,
          details: {
            previous_role: studioUser.role,
            new_role: input.role,
          },
        });
      } catch (err) {
        console.error('Failed to log activity (studio_user.update_role):', err);
      }

      return updated;
    }),

  // Remove user from studio
  remove: protectedProcedure
    .input(z.object({
      studioUserId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get the studio_users record
      const studioUser = await prisma.studio_users.findUnique({
        where: { id: input.studioUserId },
      });

      if (!studioUser) {
        throw new Error('Studio user not found');
      }

      // Check if current user is owner of this studio
      const membership = await prisma.studio_users.findFirst({
        where: {
          studio_id: studioUser.studio_id,
          user_id: ctx.userId,
          role: 'owner',
          is_active: true,
        },
      });

      if (!membership) {
        throw new Error('Unauthorized: Only owners can remove users');
      }

      // Don't allow removing owner
      if (studioUser.role === 'owner') {
        throw new Error('Cannot remove studio owner. Transfer ownership first.');
      }

      // Soft delete (deactivate)
      const updated = await prisma.studio_users.update({
        where: { id: input.studioUserId },
        data: {
          is_active: false,
          updated_at: new Date(),
        },
      });

      // Activity logging
      try {
        await logActivity({
          userId: ctx.userId,
          studioId: studioUser.studio_id,
          action: 'studio_user.remove',
          entityType: 'studio_user',
          entityId: updated.id,
          details: {
            removed_user_id: studioUser.user_id,
            role: studioUser.role,
          },
        });
      } catch (err) {
        console.error('Failed to log activity (studio_user.remove):', err);
      }

      return { success: true };
    }),

  // Get current user's role in a studio
  getMyRole: protectedProcedure
    .input(z.object({ studioId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const membership = await prisma.studio_users.findFirst({
        where: {
          studio_id: input.studioId,
          user_id: ctx.userId,
          is_active: true,
        },
      });

      if (!membership) {
        return { role: null, permissions: {} };
      }

      return {
        role: membership.role,
        permissions: membership.permissions as any,
        canManageUsers: ['owner', 'admin'].includes(membership.role),
        canEditSettings: ['owner', 'admin'].includes(membership.role),
        canCreateContent: ['owner', 'admin', 'staff'].includes(membership.role),
      };
    }),
});
```

### 2. Update _app.ts Router

**File**: `src/server/routers/_app.ts`

Add studioUser router:
```typescript
import { studioUserRouter } from './studioUser';

export const appRouter = router({
  // ... existing routers
  studioUser: studioUserRouter,
});
```

## Frontend Implementation

### 3. Create Studio Users Management Page

**File**: `src/app/dashboard/settings/studio/users/page.tsx` (NEW FILE)

```typescript
'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function StudioUsersPage() {
  const router = useRouter();
  const [studioId, setStudioId] = useState<string>(''); // Get from context or URL
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'staff' | 'viewer'>('staff');

  const { data: usersData, isLoading, refetch } = trpc.studioUser.getByStudio.useQuery(
    { studioId },
    { enabled: !!studioId }
  );

  const { data: myRole } = trpc.studioUser.getMyRole.useQuery({ studioId }, { enabled: !!studioId });

  const inviteMutation = trpc.studioUser.invite.useMutation({
    onSuccess: () => {
      toast.success('User invited successfully!', { position: 'top-right' });
      setShowInviteModal(false);
      setInviteEmail('');
      refetch();
    },
    onError: (error) => {
      toast.error(error.message, { position: 'top-right' });
    },
  });

  const updateRoleMutation = trpc.studioUser.updateRole.useMutation({
    onSuccess: () => {
      toast.success('Role updated!', { position: 'top-right' });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message, { position: 'top-right' });
    },
  });

  const removeMutation = trpc.studioUser.remove.useMutation({
    onSuccess: () => {
      toast.success('User removed from studio', { position: 'top-right' });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message, { position: 'top-right' });
    },
  });

  if (!myRole?.canManageUsers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-300">Only studio owners and admins can manage users.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-12 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-white text-xl">Loading studio users...</p>
          </div>
        </div>
      </div>
    );
  }

  const users = usersData?.users || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Studio Users</h1>
            <p className="text-gray-300">Manage team members and permissions</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg"
          >
            + Invite User
          </button>
        </div>

        {/* Users List */}
        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
                    {user.users?.user_profiles?.first_name?.charAt(0) || user.users?.email?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white font-semibold">
                      {user.users?.user_profiles?.first_name} {user.users?.user_profiles?.last_name}
                    </p>
                    <p className="text-gray-300 text-sm">{user.users?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Role Badge */}
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    user.role === 'owner' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-400/30' :
                    user.role === 'admin' ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30' :
                    user.role === 'staff' ? 'bg-green-500/20 text-green-400 border border-green-400/30' :
                    'bg-gray-500/20 text-gray-400 border border-gray-400/30'
                  }`}>
                    {user.role.toUpperCase()}
                  </span>

                  {/* Actions (only for non-owners) */}
                  {user.role !== 'owner' && myRole?.role === 'owner' && (
                    <div className="flex gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => {
                          updateRoleMutation.mutate({
                            studioUserId: user.id,
                            role: e.target.value as any,
                          });
                        }}
                        className="px-3 py-1 bg-white/5 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to remove this user?')) {
                            removeMutation.mutate({ studioUserId: user.id });
                          }
                        }}
                        className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Invited By */}
              {user.users_studio_users_invited_byTousers && (
                <p className="text-gray-400 text-xs mt-2">
                  Invited by {user.users_studio_users_invited_byTousers.user_profiles?.first_name} {user.users_studio_users_invited_byTousers.user_profiles?.last_name} on {new Date(user.invited_at).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gradient-to-br from-slate-900 to-gray-900 rounded-xl border border-white/20 p-8 max-w-md w-full mx-4">
              <h3 className="text-2xl font-bold text-white mb-6">Invite User</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Role
                  </label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="admin">Admin - Full management access</option>
                    <option value="staff">Staff - Create/edit content</option>
                    <option value="viewer">Viewer - Read-only access</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                  }}
                  className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    inviteMutation.mutate({
                      studioId,
                      email: inviteEmail,
                      role: inviteRole,
                    });
                  }}
                  disabled={!inviteEmail || inviteMutation.isPending}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white font-semibold rounded-lg"
                >
                  {inviteMutation.isPending ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Role Permissions Reference */}
        <div className="mt-12 bg-white/5 backdrop-blur-md rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Role Permissions</h3>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-semibold text-yellow-400 mb-2">Owner</p>
              <ul className="text-gray-300 space-y-1">
                <li>• Full access</li>
                <li>• Manage users</li>
                <li>• Billing</li>
                <li>• Delete studio</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-blue-400 mb-2">Admin</p>
              <ul className="text-gray-300 space-y-1">
                <li>• Invite users</li>
                <li>• Edit settings</li>
                <li>• Manage content</li>
                <li>• No billing</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-green-400 mb-2">Staff</p>
              <ul className="text-gray-300 space-y-1">
                <li>• Create routines</li>
                <li>• Add dancers</li>
                <li>• Upload music</li>
                <li>• View invoices</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-400 mb-2">Viewer</p>
              <ul className="text-gray-300 space-y-1">
                <li>• View only</li>
                <li>• No editing</li>
                <li>• See schedules</li>
                <li>• Check scores</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Validation Checklist

- [ ] Migration applied (studio_users table created)
- [ ] RLS policies working
- [ ] Existing studio owners migrated to studio_users
- [ ] studioUser router created and registered
- [ ] Studio users management page created
- [ ] Invite functionality working
- [ ] Role update functionality working
- [ ] Remove user functionality working
- [ ] Activity logging for all operations
- [ ] Build passes (npm run build)
- [ ] UI follows glassmorphic design pattern

## Testing

1. Apply migration via Supabase MCP
2. Verify existing studio owners appear in studio_users table
3. As studio owner, navigate to studio users management
4. Invite a user with 'staff' role
5. Change their role to 'admin'
6. Try to remove them (should work for owner)
7. Try accessing as staff (should not see management page)
8. Verify activity logs capture all operations

## Future Enhancements

- Studio invitation system (invite before signup)
- Transfer ownership feature
- Granular permissions (JSONB overrides)
- User activity audit trail
- Bulk user import

## Notes

- Owner role is permanent (transfer required to change)
- Soft delete (is_active flag) preserves audit trail
- Activity logging captures all user management actions
- RLS policies ensure secure data access
- Current implementation requires users to signup first, then get invited
