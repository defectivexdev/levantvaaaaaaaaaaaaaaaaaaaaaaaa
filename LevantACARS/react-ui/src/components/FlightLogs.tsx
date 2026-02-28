import { memo, useMemo } from 'react';
import { Activity, Zap, CheckSquare } from 'lucide-react';
import type { UILogEntry } from '../types';

interface Props {
  activityLog: UILogEntry[];
  exceedanceLog: UILogEntry[];
}

function FlightLogs({ activityLog, exceedanceLog }: Props) {
  const allLogs = useMemo(
    () => [...activityLog, ...exceedanceLog].sort((a, b) => b.id - a.id),
    [activityLog, exceedanceLog],
  );

  return (
    <div className="glass-card rounded-xl flex flex-col relative overflow-hidden h-full border border-white/5 bg-black/20">
      <div className="px-3 py-1.5 bg-white/5 border-b border-white/5 flex justify-between items-center shrink-0">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2" style={{ fontFamily: "'JetBrains Mono', Consolas, monospace" }}>
          <Activity size={10} className="text-accent-gold" /> FLIGHT ACTIVITY LOG
        </h3>
        <div className="text-[9px] font-mono text-gray-600 uppercase">Live Events</div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
        {allLogs.length === 0 && (
          <div className="text-gray-600 text-xs py-6 text-center font-mono tracking-widest uppercase">No events yet</div>
        )}
        {allLogs.map((log) => (
          <div key={log.id} className="flex items-start gap-2 border-b border-white/[0.02] pb-1 last:border-0" style={{ lineHeight: 1.2 }}>
            <span className="text-[10px] font-mono text-accent-gold/40 mt-px shrink-0" style={{ fontFamily: "'JetBrains Mono', Consolas, monospace" }}>{log.timestamp}</span>
            <div className="flex-1">
              <div className={`text-[11px] font-bold tracking-wide uppercase ${
                log.kind === 'warning' ? 'text-accent-rose' :
                log.kind === 'success' ? 'text-accent-emerald' : 'text-gray-300'
              }`} style={{ fontFamily: "'JetBrains Mono', Consolas, monospace" }}>
                {log.event}
              </div>
            </div>
            {log.kind === 'warning' && <Zap size={9} className="text-accent-rose animate-pulse shrink-0" />}
            {log.kind === 'success' && <CheckSquare size={9} className="text-accent-emerald shrink-0" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(FlightLogs);
