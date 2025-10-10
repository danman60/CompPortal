## Task: Add "User Already Exists" Error Handling with Password Reset Flow

**Context:**
- File: `src/app/signup/page.tsx`
- Current behavior: Form blanks when user already exists
- New behavior: Show error message with link to password reset

**Requirements:**

1. **Error Detection:**
   - Catch Supabase error when email already exists
   - Error message typically: "User already registered" or similar

2. **UI Changes:**
   - Show error message below email field: "This email is already registered."
   - Add helper text with link: "Already have an account? [Sign in here](/login) or [reset your password](/reset-password)"
   - Error text color: `text-red-400`
   - Link styling: `text-purple-400 hover:text-purple-300 underline`

3. **Password Reset Page:**
   - Create `src/app/reset-password/page.tsx`
   - Simple form with email input
   - Uses Supabase `auth.resetPasswordForEmail()`
   - Success message: "Password reset email sent. Check your inbox."
   - Glassmorphic design matching signup/login pages

4. **Error State Management:**
   - Add `error` state to signup form
   - Display error persistently until user modifies email field
   - Clear error when email input changes

**Deliverables:**
- Updated `src/app/signup/page.tsx` with error handling
- New `src/app/reset-password/page.tsx` with reset flow

**Pattern Reference:**
```typescript
// Error display pattern
{error && (
  <div className="text-red-400 text-sm mt-1">
    {error}
    <p className="mt-2">
      Already have an account?{' '}
      <Link href="/login" className="text-purple-400 hover:text-purple-300 underline">
        Sign in here
      </Link>
      {' '}or{' '}
      <Link href="/reset-password" className="text-purple-400 hover:text-purple-300 underline">
        reset your password
      </Link>
    </p>
  </div>
)}
```
