## Task: Create Competition Director Profile Settings Page

**Context:**
- File: `src/app/dashboard/settings/page.tsx` (new file)
- Pattern: Follow existing form patterns from `src/components/StudioSetupWizard.tsx`
- User: Competition Director can edit their profile information

**Requirements:**

1. **Server Component** to fetch user data via tRPC
2. **Client Component** for the form (`ProfileSettingsForm.tsx`)
3. **Fields to Edit:**
   - First Name (text input)
   - Last Name (text input)
   - Email (read-only, display only)
   - Phone (text input, optional)
   - Notifications Enabled (toggle switch)

4. **Styling:**
   - Glassmorphic design: `bg-white/10 backdrop-blur-md border border-white/20`
   - Form inputs: `bg-white/10 border border-white/20 text-white rounded-lg px-4 py-2`
   - Save button: `bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg`
   - Page title: "Profile Settings" with gradient text

5. **Backend:**
   - Add `updateProfile` mutation to `src/server/routers/user.ts`
   - Update user_profiles table with new data
   - Validate: first_name and last_name required

6. **UX:**
   - Success toast on save: "Profile updated successfully"
   - Error handling with toast notifications
   - Loading state on submit button: "Saving..." with disabled state

**Deliverables:**
- `src/app/dashboard/settings/page.tsx` (server component)
- `src/components/ProfileSettingsForm.tsx` (client component)
- Updated `src/server/routers/user.ts` with `updateProfile` mutation

**Pattern Reference:**
```typescript
// Glassmorphic form pattern
<div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-6">
  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
    Profile Settings
  </h2>
  {/* Form fields */}
</div>
```
