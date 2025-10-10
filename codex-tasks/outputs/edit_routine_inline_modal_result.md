#!/usr/bin/env markdown
# edit_routine_inline_modal_result

File
- src/components/EntryEditModal.tsx

Summary
- Glassmorphic quick-edit modal for routine essentials: title, category, props, special notes; participants read-only.
- Controlled form state with save/cancel; `onSave` returns partial updates.

Validation Checklist
- Modal renders when `isOpen` and `entry` present.
- Save button shows loading state; closes on success.

