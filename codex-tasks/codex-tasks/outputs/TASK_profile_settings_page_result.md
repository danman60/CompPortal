#!/usr/bin/env markdown
# TASK_profile_settings_page_result

Files
- src/app/dashboard/settings/page.tsx
- src/components/ProfileSettingsForm.tsx
- src/server/routers/user.ts (added `updateProfile`, extended `getCurrentUser`)

Summary
- Server page renders client form. Client fetches current user via tRPC and updates profile with `updateProfile` mutation.
- Fields: first name, last name, email (read-only), phone, notifications toggle.
- UI: Glassmorphic card, gradient title, loading state, success/error toasts.

Validation Checklist
- First/last name required before submit.
- Save button shows "Saving..." while pending and disables.
- Toasts displayed on success/error.

