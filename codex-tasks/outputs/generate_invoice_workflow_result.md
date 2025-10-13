## Replace Approve/Reject with Generate Invoice – Result

Status: ✅ Complete

Server
- Added `invoice.createFromReservation` (src/server/routers/invoice.ts)
  - Builds invoice line items from non‑cancelled entries for the reservation’s studio+competition
  - Creates `invoices` record; then approves reservation and sets `spaces_confirmed`
  - Logs activity `invoice.create` (non‑blocking)

Client
- Reservations UI (src/components/ReservationsList.tsx)
  - Replaced director “Approve/Reject” action block on pending reservations with a single “Generate Invoice” button
  - Button calls `trpc.invoice.createFromReservation.mutate({ reservationId, spacesConfirmed })`
  - On success: invalidates reservations list and shows toast

Notes
- Existing approve/reject logic remains in codebase for non‑pending paths; pending view now prefers invoice generation
- No schema changes required

Build
- Global build is currently blocked by an unrelated missing dependency (`@hookform/resolvers/zod`).

