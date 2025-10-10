#!/usr/bin/env markdown
# studio_setup_wizard_result

File
- src/components/StudioSetupWizard.tsx

Summary
- 3-step glassmorphic wizard modal with progress indicator and validation on Step 1.
- Steps: Studio Info, Logo Upload (optional), Preferences.
- Exposes `onComplete` with collected data; includes `isOpen` and `onClose`.

Validation Checklist
- Required fields on Step 1 show red borders/messages when missing.
- Skip button supported; Next/Previous navigation included.

