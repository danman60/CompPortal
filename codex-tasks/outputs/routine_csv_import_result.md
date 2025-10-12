## Routine CSV Import – Result

Status: ✅ Component created, ⏳ Backend pending

Files
- Added: `src/components/RoutineCSVImport.tsx`
  - Parses CSV (required headers: routine_title, dance_category, classification; optional choreographer, props)
  - Validates rows; shows preview with inline errors
  - Exposes `onParsed` callback for integration

Next Integration Steps
- Add `entry.bulkImport` tRPC mutation to insert routines (map category/classification names to IDs)
- Wire the component into a page (e.g., routines list) and call the mutation on confirm

Build
- Global build currently blocked by unrelated missing dependency in `ProfileSettingsForm.tsx`.

