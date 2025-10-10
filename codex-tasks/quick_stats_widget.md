## Task: Quick Stats Widget Component

**Context:**
- File: src/components/QuickStatsWidget.tsx
- Usage: Dashboard sidebar or header
- Pattern: Compact stats display with icons

**Requirements:**
1. Display 3-4 key metrics in compact format
2. Each stat: icon + number + label
3. Glassmorphic card design
4. Responsive (stacks on mobile, horizontal on desktop)
5. Props: stats array with { icon, value, label, color }

**Deliverables:**
- Complete QuickStatsWidget.tsx component
- Export default QuickStatsWidget
- Flexible stats configuration via props

**Component Structure:**
```tsx
interface Stat {
  icon: string; // Emoji or SVG path
  value: string | number;
  label: string;
  color?: string; // e.g., 'text-green-400', 'text-purple-400'
}

interface QuickStatsWidgetProps {
  stats: Stat[];
  className?: string;
}

export default function QuickStatsWidget({ stats, className = '' }: QuickStatsWidgetProps) {
  return (
    <div className={`bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="text-center">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className={`text-2xl font-bold ${stat.color || 'text-white'}`}>
              {stat.value}
            </div>
            <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Example Usage:**
```tsx
<QuickStatsWidget
  stats={[
    { icon: '🎭', value: 42, label: 'Routines', color: 'text-purple-400' },
    { icon: '👥', value: 18, label: 'Dancers', color: 'text-blue-400' },
    { icon: '📅', value: 3, label: 'Events', color: 'text-green-400' },
    { icon: '📊', value: '85%', label: 'Complete', color: 'text-yellow-400' },
  ]}
/>
```

**Styling:**
- Glassmorphic background
- Grid layout (2 cols mobile, 4 cols desktop)
- Icon + value + label structure
- Color customization per stat

**Codex will**: Generate complete widget component
**Claude will**: Integrate into dashboards with real data
