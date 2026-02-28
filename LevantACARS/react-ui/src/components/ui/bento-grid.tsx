import { cn } from './utils';

export function BentoGrid({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn('grid md:auto-rows-[4.5rem] grid-cols-3 gap-1.5', className)}>
      {children}
    </div>
  );
}

export function BentoGridItem({
  className,
  title,
  description,
  header,
  icon,
}: {
  className?: string;
  title?: string | React.ReactNode;
  description?: string | React.ReactNode;
  header?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'group/bento row-span-1 rounded-lg border border-[var(--acars-border)] bg-[var(--acars-screen)]/80 backdrop-blur-md p-2 crt-glow',
        'flex flex-col justify-between gap-0.5',
        'hover:border-[var(--acars-dim)]/30 transition-colors duration-200',
        className,
      )}
    >
      <div className="flex items-center gap-1.5">
        {icon && <span className="text-slate-500">{icon}</span>}
        {title && <span className="telemetry-label">{title}</span>}
      </div>
      {header}
      {description && (
        <span className="text-[9px] font-mono text-slate-600 tracking-wider uppercase">{description}</span>
      )}
    </div>
  );
}
