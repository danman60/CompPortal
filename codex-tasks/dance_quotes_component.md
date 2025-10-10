## Task: Random Dance Quote Component

**Context:**
- File: src/components/DanceQuote.tsx
- Usage: Dashboard header (both SD and CD)
- Pattern: Simple component with daily rotation

**Requirements:**
1. Array of 50+ inspirational dance quotes
2. Pick quote based on current date (same quote all day)
3. Quote rotation formula: `quotes[dayOfYear % quotes.length]`
4. Display with emoji + quote text
5. Glassmorphic styling matching existing design

**Deliverables:**
- Complete DanceQuote.tsx component
- Export default DanceQuote function
- Minimal props (optional className)

**Quote Examples:**
- "Dance is the hidden language of the soul." - Martha Graham
- "To dance is to be out of yourself, larger, more powerful, more beautiful." - Agnes De Mille
- "Great dancers are not great because of their technique, they are great because of their passion." - Martha Graham
- [Add 47+ more inspiring dance quotes]

**Component Structure:**
```tsx
export default function DanceQuote({ className = '' }: { className?: string }) {
  const quotes = [
    { text: '...', author: '...' },
    // 50+ quotes
  ];

  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const quote = quotes[dayOfYear % quotes.length];

  return (
    <div className={`glassmorphic p-4 ${className}`}>
      <p className="text-gray-300 italic">"{quote.text}"</p>
      <p className="text-gray-400 text-sm mt-2">- {quote.author}</p>
    </div>
  );
}
```

**Styling:**
- Background: bg-white/10 backdrop-blur-md
- Border: border-white/20
- Rounded: rounded-xl
- Text: Italic quote, smaller author

**Codex will**: Generate component with 50+ quotes
**Claude will**: Review, integrate into dashboards, test rotation
