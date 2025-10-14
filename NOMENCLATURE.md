# CompPortal UI Nomenclature

## Component Types

### CARDS
**Definition**: Elements that display information and may be clickable.

**Characteristics**:
- Show data/stats (numbers, status, content)
- Can be interactive (clickable)
- Primary purpose: Information display
- May have visual indicators (colors, icons, badges)

**Examples**:
- Stats cards showing "5 Dancers", "3 Routines" with counts
- Entry cards displaying routine information
- Reservation cards with approval status
- Competition cards with dates and details

**Location in codebase**:
- `QuickStatsWidget.tsx` - Stats CARDS at top of dashboard
- `EntriesList.tsx` - Routine CARDS in grid/table view
- `ReservationsPage.tsx` - Reservation CARDS

### BUTTONS
**Definition**: Elements with no information display that only link to other places.

**Characteristics**:
- No data/stats displayed
- Only action/navigation
- Primary purpose: Navigation or triggering actions
- Usually have labels and icons

**Examples**:
- "Create Routine" button
- "Import CSV" button
- Navigation buttons in forms

**Location in codebase**:
- Action buttons in page headers
- Form submission buttons
- Navigation links

## Important Notes

1. **Do not duplicate CARDS as BUTTONS**: If information is already shown in CARDS, don't create duplicate BUTTONS for the same navigation.

2. **SortableDashboardCards is for action BUTTONS**: This component was removed from Studio Director dashboard to eliminate duplicate navigation elements.

3. **QuickStatsWidget is for info CARDS**: This component displays statistical information with optional tooltips.

## History

- **2025-01**: Removed duplicate dashboard BUTTONS (My Dancers, My Reservations, My Routines) that duplicated functionality of stats CARDS above them.
