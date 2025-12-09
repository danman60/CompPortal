'use client';

import { useEffect, useState } from 'react';

const QUOTES = [
  { text: "There are shortcuts to happiness, and dancing is one of them.", author: "Vicki Baum", emoji: "✨" },
  { text: "Dancing is like dreaming with your feet!", author: "Constanze Mozart", emoji: "💃" },
  { text: "Dance is the hidden language of the soul.", author: "Martha Graham", emoji: "🎭" },
  { text: "If you stumble, make it part of the dance.", author: "Anonymous", emoji: "💫" },
  { text: "Take more chances, dance more dances.", author: "Anonymous", emoji: "🌟" },
  { text: "Dance and you'll feel better.", author: "James Brown", emoji: "🎵" },
  { text: "Forget your troubles and dance.", author: "Bob Marley", emoji: "🎶" },
  { text: "Ballet is a dance executed by the human soul.", author: "Alexander Pushkin", emoji: "🩰" },
  { text: "You dance love, and you dance joy, and you dance dreams.", author: "Gene Kelly", emoji: "💖" },
  { text: "Dance every performance as if it were your last.", author: "Erik Bruhn", emoji: "🏆" },
  { text: "To watch us dance is to hear our hearts speak.", author: "Indian Proverb", emoji: "❤️" },
  { text: "To dance is to be out of yourself. Larger, more beautiful, more powerful.", author: "Agnes de Mille", emoji: "✨" },
  { text: "You have to love dancing to stick to it.", author: "Merce Cunningham", emoji: "💪" },
  { text: "Dance is an art in space and time.", author: "Merce Cunningham", emoji: "⏰" },
  { text: "Great dancers are great because of their passion.", author: "Martha Graham", emoji: "🔥" },
  { text: "Nobody cares if you can't dance well. Just get up and dance.", author: "Martha Graham", emoji: "🚀" },
  { text: "I do not try to dance better than anyone else. I only try to dance better than myself.", author: "Mikhail Baryshnikov", emoji: "🌟" },
  { text: "Take your work seriously, but never yourself.", author: "Anonymous", emoji: "😊" },
  { text: "The most essential thing in dance discipline is devotion.", author: "Merce Cunningham", emoji: "🙏" },
  { text: "When you dance, you can enjoy the luxury of being you.", author: "Paulo Coelho", emoji: "💃" },
  { text: "The dance is strong magic.", author: "Pearl Primus", emoji: "✨" },
  { text: "To dance is to be alive.", author: "Unknown", emoji: "💫" },
  { text: "Dance is the timeless interpretation of life.", author: "Shah Asad Rizvi", emoji: "⏳" },
  { text: "Dance is the movement of the universe concentrated in an individual.", author: "Isadora Duncan", emoji: "🌌" },
  { text: "You dance because you have to.", author: "Katherine Dunham", emoji: "💪" },
  { text: "Dance is a poem of which each movement is a word.", author: "Mata Hari", emoji: "📝" },
  { text: "Dance first. Think later. It's the natural order.", author: "Samuel Beckett", emoji: "🎭" },
  { text: "Dancers are the interpreters of life.", author: "Anonymous", emoji: "🎨" },
  { text: "Dance is the joy of movement and the heart of life.", author: "Anonymous", emoji: "❤️" },
  { text: "We should consider every day lost on which there is no dancing.", author: "Friedrich Nietzsche", emoji: "📅" },
  { text: "Life is the dancer and you are the dance.", author: "Eckhart Tolle", emoji: "🌟" },
  { text: "When you dance to your own rhythm, life taps its toes to your beat.", author: "Terri Guillemets", emoji: "🎵" },
  { text: "Dance is music made visible.", author: "George Balanchine", emoji: "🎶" },
  { text: "Dancing is creating a sculpture that is visible only for a moment.", author: "Erol Ozan", emoji: "🗿" },
  { text: "Let us read, and let us dance; these two amusements will never do any harm to the world.", author: "Voltaire", emoji: "📚" },
  { text: "If you can talk, you can sing. If you can walk, you can dance.", author: "Zimbabwe Proverb", emoji: "🚶" },
  { text: "Movement never lies.", author: "Martha Graham", emoji: "💯" },
  { text: "When you move your body, you move your spirit.", author: "Anonymous", emoji: "✨" },
  { text: "In dancing you can see your life. You see how it was, how it is, how it can be.", author: "Twyla Tharp", emoji: "👁️" },
  { text: "To dance is to be free.", author: "Anonymous", emoji: "🦋" },
  { text: "Dance is the only art of which we ourselves are the stuff of which it is made.", author: "Ted Shawn", emoji: "🎨" },
  { text: "Dance is love made visible.", author: "Anonymous", emoji: "💖" },
  { text: "Dance with your heart, your eyes, your soul.", author: "Anonymous", emoji: "❤️" },
  { text: "Dance first, think later.", author: "Samuel Beckett", emoji: "💃" },
  { text: "A dancer's feet must be strong, but her heart even stronger.", author: "Anonymous", emoji: "💪" },
  { text: "Dance is life in motion.", author: "Anonymous", emoji: "🌊" },
  { text: "To dance is to whisper to the earth.", author: "Anonymous", emoji: "🌍" },
  { text: "Dancers are athletes of God.", author: "Albert Einstein", emoji: "⚡" },
  { text: "Dance to the beat of your own heart.", author: "Anonymous", emoji: "❤️" },
  { text: "Dancing is silent poetry.", author: "Anonymous", emoji: "📖" },
  { text: "Dance is the art of the soul moving.", author: "Anonymous", emoji: "✨" },
];

export default function MotivationalQuote() {
  // Start with consistent quote to avoid hydration mismatch, then randomize after mount
  const [quote, setQuote] = useState(QUOTES[0]);

  useEffect(() => {
    // Pick random quote after hydration is complete
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  return (
    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-md rounded-xl border border-purple-400/30 p-4">
      <div className="flex items-start gap-3">
        <span className="text-3xl">{quote.emoji}</span>
        <div className="flex-1">
          <p className="text-purple-200 font-medium italic">
            "{quote.text}"
          </p>
          <p className="text-purple-300/70 text-sm mt-1">
            — {quote.author}
          </p>
        </div>
      </div>
    </div>
  );
}
