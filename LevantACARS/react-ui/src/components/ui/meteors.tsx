import { cn } from './utils';

export function Meteors({ number = 15, className }: { number?: number; className?: string }) {
  const meteors = new Array(number).fill(null);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {meteors.map((_, idx) => (
        <span
          key={idx}
          className={cn(
            'absolute top-1/2 left-1/2 h-0.5 w-0.5 rounded-full bg-slate-500 rotate-[215deg]',
            'before:content-[""] before:absolute before:top-1/2 before:transform before:-translate-y-1/2',
            'before:w-[50px] before:h-px before:bg-gradient-to-r before:from-accent-gold/40 before:to-transparent',
            'animate-meteor',
            className,
          )}
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${2 + Math.random() * 4}s`,
          }}
        />
      ))}
    </div>
  );
}
