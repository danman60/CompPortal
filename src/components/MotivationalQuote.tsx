'use client';

import { useEffect, useState } from 'react';

const QUOTES = [
  { text: "Every dancer is a star in their own spotlight.", emoji: "✨" },
  { text: "Practice makes progress, not perfection.", emoji: "💪" },
  { text: "Dance is the hidden language of the soul.", emoji: "🎭" },
  { text: "Success is the sum of small efforts repeated day in and day out.", emoji: "🌟" },
  { text: "Your only limit is you. Break through it!", emoji: "🚀" },
  { text: "Champions are made when no one is watching.", emoji: "🏆" },
  { text: "The stage is waiting for your magic.", emoji: "🎪" },
  { text: "Believe in yourself and all that you are.", emoji: "💫" },
  { text: "Hard work beats talent when talent doesn't work hard.", emoji: "🔥" },
  { text: "Dream it. Believe it. Achieve it.", emoji: "🌈" },
  { text: "Your dancers are counting on you to lead with passion.", emoji: "💖" },
  { text: "Every routine is a new opportunity to shine.", emoji: "💎" },
];

export default function MotivationalQuote() {
  // Random quote on each page load (login)
  const [quote] = useState(() => QUOTES[Math.floor(Math.random() * QUOTES.length)]);

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-md rounded-xl border border-purple-400/30 p-4">
      <div className="flex items-start gap-3">
        <span className="text-3xl">{quote.emoji}</span>
        <div className="flex-1">
          <p className="text-purple-200 font-medium italic">
            "{quote.text}"
          </p>
        </div>
      </div>
    </div>
  );
}
