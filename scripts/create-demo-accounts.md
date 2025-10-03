# Demo Account Creation Instructions

Since Supabase Auth requires email confirmation, these accounts need to be created manually through the Supabase dashboard or directly in the database.

## 3 Demo Accounts Required

### 1. Studio Director Account
- **Email**: `studio@compportal.test`
- **Password**: `StudioDemo123!`
- **Role**: `studio_director`
- **Studio**: Will be linked to existing or new test studio
- **Can Access**:
  - Only their own studio's dancers
  - Only their own studio's entries
  - Only their own studio's reservations
  - Create/edit entries for their studio
  - Register dancers for their studio

### 2. Competition Director Account
- **Email**: `director@compportal.test`
- **Password**: `DirectorDemo123!`
- **Role**: `competition_director`
- **Can Access**:
  - ALL studios and their data
  - ALL competition entries
  - Approve/reject reservations
  - Manage competition settings
  - View analytics across all studios
  - Release reservation tokens

### 3. Super Admin Account
- **Email**: `admin@compportal.test`
- **Password**: `AdminDemo123!`
- **Role**: `super_admin`
- **Can Access**:
  - Everything competition directors can access
  - Manage user roles
  - System-wide settings
  - Platform administration

## SQL to Update Roles After Account Creation

After creating these accounts in Supabase Auth dashboard, run this SQL to set their roles:

```sql
-- Update studio director role
UPDATE public.user_profiles
SET role = 'studio_director'
WHERE id = (SELECT id FROM auth.users WHERE email = 'studio@compportal.test');

-- Update competition director role
UPDATE public.user_profiles
SET role = 'competition_director'
WHERE id = (SELECT id FROM auth.users WHERE email = 'director@compportal.test');

-- Update super admin role
UPDATE public.user_profiles
SET role = 'super_admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@compportal.test');
```

## Creating Accounts in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/cafugvuaatsgihrsmvvl/auth/users
2. Click "Add user" → "Create new user"
3. Enter email and password
4. Check "Auto Confirm User" to skip email verification
5. Create user
6. Run the SQL above to assign roles

## Alternative: Direct SQL Insert (Advanced)

This bypasses Supabase Auth UI but requires password hashing:

```sql
-- This is a template - you'll need to generate proper password hashes
-- Use Supabase dashboard instead for simplicity
```
