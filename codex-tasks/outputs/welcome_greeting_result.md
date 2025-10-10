#!/usr/bin/env markdown
# welcome_greeting_result

File
- src/components/WelcomeGreeting.tsx

Code
```tsx
interface WelcomeGreetingProps {
  name: string;
  role?: string;
  className?: string;
}

export default function WelcomeGreeting({ name, role, className = '' }: WelcomeGreetingProps) {
  const hour = new Date().getHours();

  const getGreeting = () => {
    if (hour >= 5 && hour < 11) return { text: 'Good morning', emoji: '☀️' };
    if (hour >= 11 && hour < 17) return { text: 'Good afternoon', emoji: '🌤️' };
    if (hour >= 17 && hour < 21) return { text: 'Good evening', emoji: '🌆' };
    return { text: 'Good night', emoji: '🌙' };
  };

  const greeting = getGreeting();

  return (
    <div className={className}>
      <h1 className="text-3xl font-bold text-white flex items-center gap-2">
        <span aria-hidden>{greeting.emoji}</span>
        <span>
          {greeting.text}, {name}!
        </span>
      </h1>
      {role && <p className="text-gray-400 text-sm mt-1">{role}</p>}
    </div>
  );
}
```

Validation Checklist
- Time-based greeting implemented per spec.
- Emoji-only iconography, no external icon libraries.
- Minimal API: default export with `name`, optional `role` and `className` props.
- Typography and spacing suitable for dashboard header.

