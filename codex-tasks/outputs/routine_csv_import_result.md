## Routine CSV Import – Result

Status: ✅ Component created, ✅ Backend added

Files
- Added: `src/components/RoutineCSVImport.tsx`
  - Parses CSV (required headers: routine_title, dance_category, classification; optional choreographer, props)
  - Validates rows; shows preview with inline errors
  - Exposes `onParsed` callback for integration

Backend
- Added `entry.bulkImport` (src/server/routers/entry.ts)
  - Maps `dance_category` and `classification` names to IDs (case‑insensitive)
  - Uses first age group + size category by sort order as defaults
  - Creates records in `competition_entries` with status `draft`
  - Returns success/fail counts and error messages

Next Integration Steps
- Add a small wrapper to call `trpc.entry.bulkImport.mutate({ studio_id, competition_id, routines })` after CSV parse/confirm

Build
- Global build currently blocked by unrelated missing dependency in `ProfileSettingsForm.tsx`.
