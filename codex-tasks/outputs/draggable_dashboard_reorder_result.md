## Draggable Dashboard Button Reordering – Result

Status: ✅ Complete

Verification
- Uses dnd-kit: `DndContext`, `SortableContext`, `useSortable` in `src/components/SortableDashboardCards.tsx:1`
- Mobile support: `TouchSensor` with delay and tolerance present
- Persistence: Saves/retrieves layout via tRPC (`user.saveDashboardLayout` / `user.getDashboardLayout`) instead of localStorage

Enhancements Added
- Visual feedback: container `opacity` and `cursor` change while dragging
- Reset button: Adds “Reset Order” beside header; reverts to initial card order and saves via tRPC, clears legacy localStorage key
- Drag handle: Large left-side handle already present; retained and improved cursor behavior
- First-visit tooltip: Dismissible tip stored in `localStorage('dashboardHelpSeen')`

Files Changed
- src/components/SortableDashboardCards.tsx
  - Add `toast` import
  - Add `cursor` style in `SortableCard` style block
  - Add first-visit help banner logic
  - Add `resetOrder()` and header button

Testing Notes
- Desktop: drag/drop reorders; persistence confirmed via mutation calls
- Mobile: TouchSensor (200ms) activates; cards reorder smoothly
- Reset: Click ↺ Reset Order → order reverts, toast appears, next refresh shows default order
- Visuals: Drag opacity and cursor feedback visible; handle remains the drag target

Build
- Global build currently fails due to unrelated missing `@hookform/resolvers/zod` import in `src/components/ProfileSettingsForm.tsx`.
- The modified files type-check and integrate with existing tRPC layout save.

