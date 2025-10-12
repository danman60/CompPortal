## My Routines Summary Element – Result

Status: ✅ Component created

Files
- Added: `src/components/RoutinesSummaryElement.tsx`
  - Fetches entries via `trpc.entry.getAll({ studioId, competitionId })`
  - Fetches reservation via `trpc.reservation.getAll` and computes remaining tokens
  - Displays: Total Routines, Estimated Total (sum of `total_fee`), Remaining Tokens
  - Actions: Send Summary (toast placeholder), Download PDF (toast placeholder)

Next Steps
- Optionally add backend endpoints (`entry.getSummary`, `entry.submitSummary`, `entry.downloadSummaryPDF`) to formalize these actions
- Integrate the component into the appropriate page (e.g., `EntriesList` header when a competition is selected)

Build
- Global build currently blocked by unrelated missing dependency in `ProfileSettingsForm.tsx`.

