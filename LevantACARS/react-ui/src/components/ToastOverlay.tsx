import { useEffect, useState, useCallback, useRef } from 'react';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export interface Toast {
  id: number;
  kind: 'success' | 'warning' | 'info' | 'danger';
  message: string;
  timestamp: number;
}

let toastIdCounter = 0;

// Global push function — call from anywhere
const listeners: Array<(t: Toast) => void> = [];
export function pushToast(kind: Toast['kind'], message: string) {
  const t: Toast = { id: ++toastIdCounter, kind, message, timestamp: Date.now() };
  listeners.forEach(fn => fn(t));
}

export default function ToastOverlay() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const addToast = useCallback((t: Toast) => {
    setToasts(prev => [...prev.slice(-4), t]); // keep max 5
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(x => x.id !== t.id));
      timers.current.delete(t.id);
    }, 4000);
    timers.current.set(t.id, timer);
  }, []);

  useEffect(() => {
    listeners.push(addToast);
    return () => {
      const idx = listeners.indexOf(addToast);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, [addToast]);

  const dismiss = (id: number) => {
    setToasts(prev => prev.filter(x => x.id !== id));
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-14 right-4 z-[200] flex flex-col gap-1.5 pointer-events-none" style={{ maxWidth: '320px' }}>
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-2 px-3 py-2 rounded-lg border backdrop-blur-md animate-slide-in
            ${t.kind === 'success' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : ''}
            ${t.kind === 'warning' ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : ''}
            ${t.kind === 'danger' ? 'bg-rose-500/15 border-rose-500/30 text-rose-300' : ''}
            ${t.kind === 'info' ? 'bg-blue-500/15 border-blue-500/30 text-blue-300' : ''}
          `}
        >
          <div className="mt-0.5 shrink-0">
            {t.kind === 'success' && <CheckCircle size={12} />}
            {t.kind === 'warning' && <AlertTriangle size={12} />}
            {t.kind === 'danger' && <AlertTriangle size={12} />}
            {t.kind === 'info' && <Info size={12} />}
          </div>
          <span className="text-xs font-bold leading-tight flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="shrink-0 opacity-50 hover:opacity-100 bg-transparent border-none cursor-pointer text-current p-0">
            <X size={10} />
          </button>
        </div>
      ))}
    </div>
  );
}
