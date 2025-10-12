## Integrate Codex Components – Result

Status: ✅ Partially integrated (4/5), ⚠ Timeline wrapped for data

Sub-Task 1: QuickStatsWidget
- Studio: `src/components/StudioDirectorDashboard.tsx`
  - Imports `QuickStatsWidget`, `trpc`
  - Adds widget below dashboard cards with counts (dancers, routines, reservations, confirmed)
- Director: `src/components/CompetitionDirectorDashboard.tsx`
  - Imports `QuickStatsWidget`, `trpc`
  - Adds widget with counts (studios, reservations, invoices, approved)

Sub-Task 2: CompetitionFilter
- Entries list: `src/components/EntriesList.tsx`
  - Imports `CompetitionFilter`, `EntryEditModal`
  - Replaces competition `<select>` with `<CompetitionFilter />` bound to `selectedCompetition`
  - Maps competition objects from entries to `{ id, competition_name, competition_start_date }`

Sub-Task 3: RoutineStatusTimeline
- Page: `src/app/dashboard/entries/[id]/page.tsx`
  - Adds `<EntryStatusTimelineWrapper entryId={id} />` under `EntryDetails`
- Wrapper: `src/components/EntryStatusTimelineWrapper.tsx`
  - Fetches entry by id and adapts to `RoutineStatusTimeline` prop shape
  - Synthesizes a minimal events array up to current status

Sub-Task 4: EntryEditModal
- Entries list: `src/components/EntriesList.tsx`
  - Adds Quick Edit button on cards; opens `EntryEditModal`
  - Integrates `trpc.entry.update` and refetches on success

Sub-Task 5: JudgeBulkImportModal
- Judges page: `src/app/dashboard/judges/page.tsx`
  - Adds “Bulk Import CSV” button next to Add Judge
  - Adds `JudgeBulkImportModal` with `isOpen/onClose/onImportComplete` wiring (refreshes list)

Issues
- `RoutineStatusTimeline` expects events; wrapper provides basic events until richer history is available
- Build currently blocked by unrelated missing `@hookform/resolvers/zod`

Screenshots (described)
- QuickStatsWidget: 4 compact stat boxes beneath dashboard cards
- CompetitionFilter: labeled dropdown “Competition:” with clear button
- Timeline: vertical status markers below entry details header
- Quick Edit: fourth button “Quick Edit” on each card’s action row
- Judge Bulk Import: secondary button “Bulk Import CSV” beside Add Judge; modal with CSV chooser and validation summary

