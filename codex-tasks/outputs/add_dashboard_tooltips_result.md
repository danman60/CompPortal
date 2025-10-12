# Result: Add Tooltips Above Dashboard Cards

- Removed the "Getting Started" panel from StudioDirectorDashboard
- Added `Tooltip` component for simple hover tooltips
- Enabled optional `tooltip` on dashboard cards and render above cards
- Added tooltip text to Studio Director cards

## Files Changed

- Added: `src/components/Tooltip.tsx`
- Updated: `src/components/SortableDashboardCards.tsx` (optional `tooltip`, wrapped Link with Tooltip when provided)
- Updated: `src/components/StudioDirectorDashboard.tsx` (added tooltip text to `STUDIO_DIRECTOR_CARDS`, removed Getting Started block)

## Snippets

- src/components/Tooltip.tsx
```tsx
export default function Tooltip({ text, children, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const positionClasses = { top: 'bottom-full left-1/2 -translate-x-1/2 mb-2', bottom: 'top-full left-1/2 -translate-x-1/2 mt-2', left: 'right-full top-1/2 -translate-y-1/2 mr-2', right: 'left-full top-1/2 -translate-y-1/2 ml-2' };
  return (
    <div className="relative inline-block" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
      {children}
      {isVisible && text && (
        <div className={`absolute z-50 ${positionClasses[position]}`}>
          <div className="bg-gray-900 text-white text-sm rounded-lg px-3 py-2 shadow-xl border border-white/20 whitespace-nowrap">{text}</div>
        </div>
      )}
    </div>
  );
}
```

- src/components/SortableDashboardCards.tsx
```diff
 export interface DashboardCard {
   id: string;
   href: string;
   icon: string;
   title: string;
   description: string;
+  tooltip?: string;
 }

+import Tooltip from './Tooltip';

 // ... inside SortableCard
-  return (
-    <div ref={setNodeRef} style={style} {...attributes} className="relative">
-      <Link ...> ... </Link>
-    </div>
-  );
+  const content = (<Link ...> ... </Link>);
+  return (
+    <div ref={setNodeRef} style={style} {...attributes} className="relative">
+      {card.tooltip ? (<Tooltip text={card.tooltip} position="top">{content}</Tooltip>) : content}
+    </div>
+  );
```

- src/components/StudioDirectorDashboard.tsx (cards excerpt)
```ts
const STUDIO_DIRECTOR_CARDS: DashboardCard[] = [
  { id: 'dancers', href: '/dashboard/dancers', icon: '🩰', title: 'My Dancers', description: 'Register and manage dancers', tooltip: 'Add or import your dancers' },
  { id: 'routines', href: '/dashboard/entries', icon: '🎭', title: 'My Routines', description: 'Create and edit routines', tooltip: 'Create your routines' },
  { id: 'reservations', href: '/dashboard/reservations', icon: '📅', title: 'My Reservations', description: 'Reserve routines for events', tooltip: 'Reserve routine slots' },
  { id: 'results', href: '/dashboard/scoreboard', icon: '🏆', title: 'Results', description: 'View competition scores', tooltip: 'Check your scores and rankings' },
  { id: 'invoices', href: '/dashboard/invoices', icon: '🧾', title: 'My Invoices', description: 'View studio billing', tooltip: 'View and pay invoices' },
  { id: 'music', href: '/dashboard/music', icon: '🎵', title: 'Music Tracking', description: 'Monitor music file uploads', tooltip: 'Upload routine music files' },
];
```

## Validation Checklist
- Tooltips appear above cards on hover
- No drag-and-drop regression (tooltips wrap, not interfere with DnD events)
- Getting Started section removed
- No backend changes required

