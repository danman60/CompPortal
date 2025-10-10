'use client';

export default function DanceQuote({ className = '' }: { className?: string }) {
  const quotes: { text: string; author: string }[] = [
    { text: 'There are shortcuts to happiness, and dancing is one of them.', author: 'Vicki Baum' },
    { text: 'Dancing is like dreaming with your feet!', author: 'Constanze Mozart' },
    { text: 'Dance is the hidden language of the soul.', author: 'Martha Graham' },
    { text: 'If you stumble, make it part of the dance.', author: 'Anonymous' },
    { text: 'Take more chances, dance more dances.', author: 'Anonymous' },
    { text: 'Dance and you\'ll feel better.', author: 'James Brown' },
    { text: 'Forget your troubles and dance.', author: 'Bob Marley' },
    { text: 'Ballet is a dance executed by the human soul.', author: 'Alexander Pushkin' },
    { text: 'You dance love, and you dance joy, and you dance dreams.', author: 'Gene Kelly' },
    { text: 'Dance every performance as if it were your last.', author: 'Erik Bruhn' },
    { text: 'To watch us dance is to hear our hearts speak.', author: 'Indian Proverb' },
    { text: 'To dance is to be out of yourself. Larger, more beautiful, more powerful.', author: 'Agnes de Mille' },
    { text: 'You have to love dancing to stick to it.', author: 'Merce Cunningham' },
    { text: 'Dance is an art in space and time.', author: 'Merce Cunningham' },
    { text: 'Great dancers are great because of their passion.', author: 'Martha Graham' },
    { text: 'Nobody cares if you can\'t dance well. Just get up and dance.', author: 'Martha Graham' },
    { text: 'I do not try to dance better than anyone else. I only try to dance better than myself.', author: 'Mikhail Baryshnikov' },
    { text: 'Take your work seriously, but never yourself.', author: 'Anonymous' },
    { text: 'The most essential thing in dance discipline is devotion.', author: 'Merce Cunningham' },
    { text: 'When you dance, you can enjoy the luxury of being you.', author: 'Paulo Coelho' },
    { text: 'The dance is strong magic.', author: 'Pearl Primus' },
    { text: 'To dance is to be alive.', author: 'Unknown' },
    { text: 'Dance is the timeless interpretation of life.', author: 'Shah Asad Rizvi' },
    { text: 'Dance is the movement of the universe concentrated in an individual.', author: 'Isadora Duncan' },
    { text: 'You dance because you have to.', author: 'Katherine Dunham' },
    { text: 'Dance is a poem of which each movement is a word.', author: 'Mata Hari' },
    { text: 'Dance first. Think later. It\'s the natural order.', author: 'Samuel Beckett' },
    { text: 'Dancers are the interpreters of life.', author: 'Anonymous' },
    { text: 'Dance is the joy of movement and the heart of life.', author: 'Anonymous' },
    { text: 'We should consider every day lost on which there is no dancing.', author: 'Friedrich Nietzsche' },
    { text: 'Life is the dancer and you are the dance.', author: 'Eckhart Tolle' },
    { text: 'When you dance to your own rhythm, life taps its toes to your beat.', author: 'Terri Guillemets' },
    { text: 'Dance is music made visible.', author: 'George Balanchine' },
    { text: 'Dancing is creating a sculpture that is visible only for a moment.', author: 'Erol Ozan' },
    { text: 'Let us read, and let us dance; these two amusements will never do any harm to the world.', author: 'Voltaire' },
    { text: 'If you can talk, you can sing. If you can walk, you can dance.', author: 'Zimbabwe Proverb' },
    { text: 'Movement never lies.', author: 'Martha Graham' },
    { text: 'When you move your body, you move your spirit.', author: 'Anonymous' },
    { text: 'In dancing you can see your life. You see how it was, how it is, how it can be.', author: 'Twyla Tharp' },
    { text: 'To dance is to be free.', author: 'Anonymous' },
    { text: 'Dance is the only art of which we ourselves are the stuff of which it is made.', author: 'Ted Shawn' },
    { text: 'Dance is love made visible.', author: 'Anonymous' },
    { text: 'Dance with your heart, your eyes, your soul.', author: 'Anonymous' },
    { text: 'Dance first, think later.', author: 'Samuel Beckett' },
    { text: 'A dancer\'s feet must be strong, but her heart even stronger.', author: 'Anonymous' },
    { text: 'Dance is life in motion.', author: 'Anonymous' },
    { text: 'To dance is to whisper to the earth.', author: 'Anonymous' },
    { text: 'Dancers are athletes of God.', author: 'Albert Einstein' },
    { text: 'Dance to the beat of your own heart.', author: 'Anonymous' },
    { text: 'Dancing is silent poetry.', author: 'Anonymous' },
    { text: 'Dance is the art of the soul moving.', author: 'Anonymous' },
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
          <p className="text-gray-200 italic">"{quote.text}"</p>
          <p className="text-gray-400 text-sm mt-2">- {quote.author}</p>
        </div>
      </div>
    </div>
  );
}
