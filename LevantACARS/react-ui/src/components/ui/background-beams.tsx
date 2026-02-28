import { useEffect, useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, animate } from 'motion/react';
import { cn } from './utils';

const BEAM_COLORS = ['#C5A059', '#2DCE89', '#C5A059'];

export function BackgroundBeams({ className, children }: { className?: string; children?: React.ReactNode }) {
  const color = useMotionValue(BEAM_COLORS[0]);
  const bg = useMotionTemplate`radial-gradient(ellipse 80% 50% at 50% -20%, ${color}08 0%, transparent 60%)`;
  const idxRef = useRef(0);

  useEffect(() => {
    const step = () => {
      idxRef.current = (idxRef.current + 1) % BEAM_COLORS.length;
      animate(color, BEAM_COLORS[idxRef.current], { duration: 6, ease: 'easeInOut' });
    };
    step();
    const iv = setInterval(step, 6000);
    return () => clearInterval(iv);
  }, [color]);

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <motion.div
        className="pointer-events-none absolute inset-0 z-0"
        style={{ background: bg }}
      />
      {/* Static subtle beams */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute left-1/4 top-0 h-full w-px bg-gradient-to-b from-accent-gold/10 via-transparent to-transparent" />
        <div className="absolute left-1/2 top-0 h-full w-px bg-gradient-to-b from-accent-cyan/5 via-transparent to-transparent" />
        <div className="absolute left-3/4 top-0 h-full w-px bg-gradient-to-b from-accent-gold/8 via-transparent to-transparent" />
      </div>
      <div className="relative z-10 flex flex-col h-full">{children}</div>
    </div>
  );
}
