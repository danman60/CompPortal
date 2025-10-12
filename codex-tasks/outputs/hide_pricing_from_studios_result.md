## Hide Pricing from Studio Directors – Result

Status: ✅ Complete

Changes
- Reservations: Hide deposit/total amounts for studio directors
  - Updated: `src/components/ReservationsList.tsx` to gate pricing under `!isStudioDirector`
- Invoices: Hide monetary totals for studio directors, show payment status instead
  - Updated: `src/components/InvoicesList.tsx` to conditionally render based on `studioId` prop
    - Directors (no `studioId`): show totals and grand total
    - Studio Directors (`studioId` present): show `reservation.paymentStatus` badge; hide totals

Notes
- Entries list currently does not render pricing, no changes needed
- Routine details page did not contain explicit pricing fields in this codebase

Testing
- Studio view (`/dashboard/invoices`): no dollar amounts visible; payment status appears
- Director view (`/dashboard/invoices/all`): totals and grand total visible
- Reservations page for studios: deposit/total section hidden

Build
- Global build still blocked by unrelated dependency `@hookform/resolvers/zod` in `src/components/ProfileSettingsForm.tsx`.

