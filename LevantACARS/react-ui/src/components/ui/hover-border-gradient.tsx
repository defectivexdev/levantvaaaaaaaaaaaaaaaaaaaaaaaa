import { useState, useEffect, useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, animate } from 'motion/react';
import { cn } from './utils';

const GRADIENT_COLORS = ['#d4af37', '#cd7f32', '#22d3ee', '#d4af37'];

export function HoverBorderGradient({
  children,
  className,
  containerClassName,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const color = useMotionValue(GRADIENT_COLORS[0]);
  const border = useMotionTemplate`1px solid ${color}`;
  const boxShadow = useMotionTemplate`0 0 20px ${color}15, 0 0 40px ${color}08`;
  const idxRef = useRef(0);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    const step = () => {
      idxRef.current = (idxRef.current + 1) % GRADIENT_COLORS.length;
      animate(color, GRADIENT_COLORS[idxRef.current], { duration: 2, ease: 'easeInOut' });
    };
    step();
    const iv = setInterval(step, 2000);
    return () => clearInterval(iv);
  }, [color]);

  return (
    <motion.div
      style={{
        border: hovered ? border : '1px solid rgba(255,255,255,0.08)',
        boxShadow: hovered ? boxShadow : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={disabled ? undefined : onClick}
      className={cn(
        'relative rounded-xl bg-dark-900/80 backdrop-blur-md px-6 py-3',
        'font-bold text-xs tracking-wider uppercase',
        'cursor-pointer transition-all duration-300',
        'flex items-center justify-center gap-2',
        disabled && 'opacity-40 cursor-not-allowed',
        containerClassName,
      )}
    >
      <span className={cn('relative z-10', className)}>{children}</span>
    </motion.div>
  );
}
