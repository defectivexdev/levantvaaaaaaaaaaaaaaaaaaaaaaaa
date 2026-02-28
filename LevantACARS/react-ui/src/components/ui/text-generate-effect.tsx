import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './utils';

export function TextGenerateEffect({
  words,
  className,
  duration = 0.3,
}: {
  words: string;
  className?: string;
  duration?: number;
}) {
  const [displayedWords, setDisplayedWords] = useState<string[]>([]);
  const wordArray = words.split(' ');

  useEffect(() => {
    setDisplayedWords([]);
    let i = 0;
    const interval = setInterval(() => {
      if (i < wordArray.length) {
        setDisplayedWords((prev) => [...prev, wordArray[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 60);
    return () => clearInterval(interval);
  }, [words]);

  return (
    <div className={cn('font-mono text-sm', className)}>
      <AnimatePresence>
        {displayedWords.map((word, idx) => (
          <motion.span
            key={`${word}-${idx}`}
            initial={{ opacity: 0, filter: 'blur(8px)' }}
            animate={{ opacity: 1, filter: 'blur(0px)' }}
            transition={{ duration, delay: 0 }}
            className="inline-block mr-1"
          >
            {word}
          </motion.span>
        ))}
      </AnimatePresence>
      {displayedWords.length < wordArray.length && (
        <span className="inline-block w-[2px] h-[1em] bg-accent-gold/60 animate-pulse ml-0.5 align-middle" />
      )}
    </div>
  );
}
