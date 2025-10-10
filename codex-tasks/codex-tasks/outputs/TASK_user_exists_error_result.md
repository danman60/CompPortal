#!/usr/bin/env markdown
# TASK_user_exists_error_result

Files
- src/app/signup/page.tsx (enhanced error handling + links)
- src/app/reset-password/page.tsx (new page)

Summary
- Detects existing-user signup errors and shows persistent inline message with sign-in and reset-password links.
- Added reset-password page that calls Supabase `auth.resetPasswordForEmail()` with glassmorphic styling.

Validation Checklist
- Error clears when email input changes.
- Reset page shows success/error states and disables while sending.

