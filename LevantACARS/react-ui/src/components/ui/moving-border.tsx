import { useRef, useEffect } from 'react';
import { motion, useMotionTemplate, useMotionValue, animate } from 'motion/react';
import { cn } from './utils';

export function MovingBorder({
  children,
  duration = 3000,
  borderRadius = '0.75rem',
  className,
  containerClassName,
  borderColor = '#d4af37',
}: {
  children: React.ReactNode;
  duration?: number;
  borderRadius?: string;
  className?: string;
  containerClassName?: string;
  borderColor?: string;
}) {
  const angle = useMotionValue(0);
  const background = useMotionTemplate`conic-gradient(from ${angle}deg, transparent 60%, ${borderColor}40 75%, ${borderColor}80 80%, ${borderColor}40 85%, transparent 95%)`;
  const animRef = useRef<ReturnType<typeof animate> | null>(null);

  useEffect(() => {
    animRef.current = animate(angle, [0, 360], {
      duration: duration / 1000,
      repeat: Infinity,
      ease: 'linear',
    });
    return () => { animRef.current?.stop(); };
  }, [angle, duration]);

  return (
    <div className={cn('relative p-[1px]', containerClassName)} style={{ borderRadius }}>
      <motion.div
        className="absolute inset-0 z-0"
        style={{ background, borderRadius }}
      />
      <div
        className={cn('relative z-10 bg-dark-900 backdrop-blur-md', className)}
        style={{ borderRadius }}
      >
        {children}
      </div>
    </div>
  );
}
