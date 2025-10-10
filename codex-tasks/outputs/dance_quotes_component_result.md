# dance_quotes_component_result

File
- src/components/DanceQuote.tsx

Code
```tsx
export default function DanceQuote({ className = '' }: { className?: string }) {
  const quotes: { text: string; author: string }[] = [
    { text: 'Dance is the hidden language of the soul.', author: 'Martha Graham' },
    { text: 'To dance is to be out of yourself, larger, more powerful, more beautiful.', author: 'Agnes de Mille' },
    { text: 'Great dancers are not great because of their technique, they are great because of their passion.', author: 'Martha Graham' },
    { text: 'The truest expression of a people is in its dance and in its music.', author: 'Agnes de Mille' },
    { text: 'Dance first. Think later. It’s the natural order.', author: 'Samuel Beckett' },
    { text: 'If you hit a wall, climb over it, crawl under it, or dance on top of it.', author: 'Unknown' },
    { text: 'Dancing is creating a sculpture that is visible only for a moment.', author: 'Erol Ozan' },
    { text: 'The job of feet is walking, but their hobby is dancing.', author: 'Amit Kalantri' },
    { text: 'Dance is the timeless interpretation of life.', author: 'Shah Asad Rizvi' },
    { text: 'Dance is the joy of movement and the heart of life.', author: 'Unknown' },
    { text: 'Everything in the universe has rhythm. Everything dances.', author: 'Maya Angelou' },
    { text: 'When you dance, you can enjoy the luxury of being you.', author: 'Paulo Coelho' },
    { text: 'The body says what words cannot.', author: 'Martha Graham' },
    { text: 'Dance is music made visible.', author: 'George Balanchine' },
    { text: 'Take your passion and make it happen.', author: 'Irene Cara' },
    { text: 'Dancing is the poetry of the foot.', author: 'John Dryden' },
    { text: 'Those who were seen dancing were thought to be insane by those who could not hear the music.', author: 'Friedrich Nietzsche' },
    { text: 'We should consider every day lost on which we have not danced at least once.', author: 'Friedrich Nietzsche' },
    { text: 'Dancers are the athletes of God.', author: 'Albert Einstein' },
    { text: 'To watch us dance is to hear our hearts speak.', author: 'Indian Proverb' },
    { text: 'Dance is the only art in which we ourselves are the stuff of which it is made.', author: 'Ted Shawn' },
    { text: 'Let us read, and let us dance; these two amusements will never do any harm to the world.', author: 'Voltaire' },
    { text: 'The one thing that you have that nobody else has is you. Your voice, your mind, your story, your vision.', author: 'Neil Gaiman' },
    { text: 'Dancing is like dreaming with your feet.', author: 'Constanze' },
    { text: 'Dance with your heart and your feet will follow.', author: 'Unknown' },
    { text: 'Practice like you’ve never won. Perform like you’ve never lost.', author: 'Unknown' },
    { text: 'Do it big, do it right, and do it with style.', author: 'Fred Astaire' },
    { text: 'I do not try to dance better than anyone else. I only try to dance better than myself.', author: 'Mikhail Baryshnikov' },
    { text: 'Without dance, what’s the pointe?', author: 'Unknown' },
    { text: 'Dance is a conversation between body and soul.', author: 'Unknown' },
    { text: 'The purpose of art is to wash the dust of daily life off our souls.', author: 'Pablo Picasso' },
    { text: 'Dance is moving sculpture.', author: 'Pina Bausch' },
    { text: 'You don’t have to know about ballet to enjoy it, all you have to do is look at it.', author: 'Edwin Denby' },
    { text: 'To dance is to be beside yourself.', author: 'Aristotle' },
    { text: 'I don’t want people who want to dance, I want people who have to dance.', author: 'George Balanchine' },
    { text: 'The moment is everything. Don’t think, just dance.', author: 'Unknown' },
    { text: 'Dance is the hidden language of the soul of the body.', author: 'Martha Graham' },
    { text: 'Dancing is the world’s favorite metaphor.', author: 'Kristy Nilsson' },
    { text: 'Art is not what you see, but what you make others see.', author: 'Edgar Degas' },
    { text: 'Hand in hand, on the edge of the sand, they danced by the light of the moon.', author: 'Edward Lear' },
    { text: 'Life is short and there will always be dirty dishes, so let’s dance.', author: 'James Howe' },
    { text: 'Dance is the joy of movement.', author: 'Unknown' },
    { text: 'Work like you don’t need the money. Love like you’ve never been hurt. Dance like nobody’s watching.', author: 'Satchel Paige' },
    { text: 'Feet, what do I need you for when I have wings to fly?', author: 'Frida Kahlo' },
    { text: 'Dance is the fastest way to happiness.', author: 'Unknown' },
    { text: 'Movement never lies.', author: 'Martha Graham' },
    { text: 'Dancing is a perpendicular expression of a horizontal desire.', author: 'George Bernard Shaw' },
    { text: 'The discipline of dance is so extraordinary.', author: 'Suzanne Farrell' },
    { text: 'When you get the choice to sit it out or dance, I hope you dance.', author: 'Lee Ann Womack' },
    { text: 'To dance is to be out of yourself.', author: 'Agnes de Mille' },
    { text: 'Dance is for everybody. I believe that the dance came from the people and that it should always be delivered back to the people.', author: 'Alvin Ailey' },
    { text: 'The practice of being fully present is the practice of love. Dance invites presence.', author: 'Unknown' },
    { text: 'Dance is the mathematics of the soul.', author: 'Arielle Dombasle' },
    { text: 'Ballet is a universe of the imagination, a place of magic and enchantment, of exquisitely beautiful images.', author: 'Trudy Garfunkel' },
    { text: 'There are shortcuts to happiness, and dancing is one of them.', author: 'Vicki Baum' },
    { text: 'Dance is a song of the body. Either of joy or pain.', author: 'Martha Graham' },
    { text: 'Dancing faces you toward Heaven, whichever direction you turn.', author: 'Terri Guillemets' },
    { text: 'We dance to express what cannot be said.', author: 'Unknown' },
    { text: 'The dance is over, the applause subsided, but the joy and feeling will stay with you forever.', author: 'W.M. Tory' },
    { text: 'The only way to make sense out of change is to plunge into it, move with it, and join the dance.', author: 'Alan Watts' },
    { text: 'Wherever a dancer stands is holy ground.', author: 'Martha Graham' },
    { text: 'Dancing is the loftiest, the most moving, the most beautiful of the arts.', author: 'Havelock Ellis' },
    { text: 'Dance is the art of thinking with your feet.', author: 'Armand van Helden' },
  ];

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const quote = quotes[dayOfYear % quotes.length];

  const emojis = ['💃', '🩰', '🕺', '✨', '🎵', '🎶', '🌟'];
  const emoji = emojis[dayOfYear % emojis.length];

  return (
    <div
      className={
        `bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4 ${className}`
      }
    >
      <div className="flex items-start gap-3">
        <div className="text-2xl" aria-hidden>
          {emoji}
        </div>
        <div>
          <p className="text-gray-200 italic">“{quote.text}”</p>
          <p className="text-gray-400 text-sm mt-2">- {quote.author}</p>
        </div>
      </div>
    </div>
  );
}
```

Validation Checklist
- Uses glassmorphic styling: `bg-white/10 backdrop-blur-md rounded-xl border border-white/20`.
- 50+ quotes present; deterministic daily rotation via day-of-year.
- Emoji-only iconography; no external icon libraries.
- Minimal API: default export with optional `className` prop.

