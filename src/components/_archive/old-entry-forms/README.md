# Old Entry Form Components - Archived

**Archived Date:** January 5, 2025
**Reason:** Replaced by rebuilt entry form system with Phase 2 logic

## Files Archived

- `EntryForm.tsx` - Old entry creation form (pre-Phase 2)
- `EntryEditModal.tsx` - Old modal-based entry editor
- `EntryDetails.tsx` - Old entry details display component
- `EntryStatusTimelineWrapper.tsx` - Old status timeline wrapper

## Current Active Components

**Entry Creation:**
- `/components/rebuild/entries/EntryCreateFormV2.tsx` - New entry creation form with Phase 2 logic
- Used by: `/app/dashboard/entries/create/page.tsx`

**CSV Import:**
- `/components/RoutineCSVImport.tsx` - CSV import with import sessions
- Used by: `/app/dashboard/entries/import/page.tsx`

**Entry Editing:**
- `/components/rebuild/entries/EntryEditForm.tsx` - Entry editing with Phase 2 validation
- Used by: `/app/dashboard/entries/[id]/page.tsx`

## Why These Were Archived

The original entry form components did not include Phase 2 business logic requirements:
- Age calculation with +1 bump
- Solo classification locking
- Extended time pricing ($5 flat solos, $2/dancer groups)
- Title upgrade (solo-only, +$30)
- Size category auto-detection
- CSV import session management

The rebuild (`/components/rebuild/entries/`) includes all Phase 2 requirements and has been fully tested and verified in production.

## DO NOT USE THESE ARCHIVED FILES

These components are kept for historical reference only. All new development should use the rebuilt entry form system in `/components/rebuild/entries/`.
