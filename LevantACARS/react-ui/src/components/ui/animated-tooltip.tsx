import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './utils';

interface TooltipItem {
  id: number;
  name: string;
  designation: string;
  image?: string;
}

export function AnimatedTooltip({ items }: { items: TooltipItem[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="flex items-center gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="relative group"
          onMouseEnter={() => setHoveredIdx(item.id)}
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <AnimatePresence>
            {hoveredIdx === item.id && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute -top-14 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap"
              >
                <div className="bg-dark-800 border border-white/10 rounded-lg px-3 py-1.5 shadow-xl backdrop-blur-md">
                  <p className="text-xs font-bold text-white">{item.name}</p>
                  <p className="text-[10px] font-mono text-accent-gold/70 tracking-wider">{item.designation}</p>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-dark-800 border-b border-r border-white/10 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>
          {item.image ? (
            <div
              className={cn(
                'pilot-badge-container !w-8 !h-8 transition-all duration-200',
                hoveredIdx === item.id
                  ? '!border-accent-gold/60 scale-105 !shadow-lg !shadow-accent-gold/20'
                  : '!border-white/10',
              )}
            >
              <img src={item.image} alt={item.name} className="pilot-badge-img" />
            </div>
          ) : (
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200',
                hoveredIdx === item.id
                  ? 'border-2 border-accent-gold/60 bg-accent-gold/10 text-accent-gold scale-105'
                  : 'border-2 border-white/10 bg-dark-800 text-accent-gold/70',
              )}
            >
              {item.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
