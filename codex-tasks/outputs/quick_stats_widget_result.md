#!/usr/bin/env markdown
# quick_stats_widget_result

File
- src/components/QuickStatsWidget.tsx

Code
```tsx
interface Stat {
  icon: string; // Emoji
  value: string | number;
  label: string;
  color?: string; // Tailwind text color class
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
            <div className="text-2xl mb-1" aria-hidden>
              {stat.icon}
            </div>
            <div className={`text-2xl font-bold ${stat.color || 'text-white'}`}>{stat.value}</div>
            <div className="text-xs text-gray-400 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Validation Checklist
- Glassmorphic card with border/blur.
- Responsive: 2 cols on mobile, 4 on desktop.
- Uses emoji-only icons; flexible color per stat.

