## Merge Routine Creation Forms – Result

Status: ✅ Complete (single-screen form in use)

Changes
- Added unified form component: `src/components/UnifiedRoutineForm.tsx`
  - Single screen with sections: Basic Information, Classification, Additional Details
  - Uses existing lookup data and tRPC `entry.create`
  - Computes a simple estimated fee from size category (participants added later)
- Updated page: `src/app/dashboard/entries/create/page.tsx`
  - Switched from `EntryForm` (multi-step) to `UnifiedRoutineForm` (single screen)

Notes
- Participants assignment remains a separate flow (unchanged)
- Live Review Bar remains available in EntryForm paths; unified screen focuses on simplification

Build
- Global build blocked by unrelated missing dependency `@hookform/resolvers/zod` in `src/components/ProfileSettingsForm.tsx`.

