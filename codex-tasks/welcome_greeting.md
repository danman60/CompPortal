## Task: Personalized Welcome Greeting

**Context:**
- File: src/components/WelcomeGreeting.tsx
- Usage: Dashboard header (replace generic "Welcome to CompPortal")
- Pattern: Time-based greeting + user name

**Requirements:**
1. Time-based greeting:
   - 5am-11am: "Good morning"
   - 11am-5pm: "Good afternoon"
   - 5pm-9pm: "Good evening"
   - 9pm-5am: "Good night"
2. Include user's first name: "Good morning, Sarah!"
3. Optional subtext showing role (Studio Director / Competition Director)
4. Emoji based on time of day (🌅🌞🌆🌙)

**Deliverables:**
- Complete WelcomeGreeting.tsx component
- Export default WelcomeGreeting
- Props: name (string), role (optional string)

**Component Structure:**
```tsx
interface WelcomeGreetingProps {
  name: string;
  role?: string;
  className?: string;
}

export default function WelcomeGreeting({ name, role, className = '' }: WelcomeGreetingProps) {
  const hour = new Date().getHours();

  const getGreeting = () => {
    if (hour >= 5 && hour < 11) return { text: 'Good morning', emoji: '🌅' };
    if (hour >= 11 && hour < 17) return { text: 'Good afternoon', emoji: '🌞' };
    if (hour >= 17 && hour < 21) return { text: 'Good evening', emoji: '🌆' };
    return { text: 'Good night', emoji: '🌙' };
  };

  const greeting = getGreeting();

  return (
    <div className={className}>
      <h1 className="text-3xl font-bold text-white flex items-center gap-2">
        <span>{greeting.emoji}</span>
        <span>{greeting.text}, {name}!</span>
      </h1>
      {role && (
        <p className="text-gray-400 text-sm mt-1">{role}</p>
      )}
    </div>
  );
}
```

**Styling:**
- Large heading (text-3xl)
- Bold font
- White text with emoji
- Optional gray subtext for role

**Codex will**: Generate complete component
**Claude will**: Integrate into dashboards (replace existing welcome text), pass user data
