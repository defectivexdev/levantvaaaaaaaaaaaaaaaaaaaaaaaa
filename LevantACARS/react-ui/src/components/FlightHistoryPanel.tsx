import { memo, useState, useEffect, useCallback } from 'react';
import { Plane, Clock, ArrowRight, RefreshCw, TrendingUp } from 'lucide-react';
import { fetchPilotStats, type RecentFlight } from '../api';

interface Props {
  pilotId: string;
}

function FlightHistoryPanel({ pilotId }: Props) {
  const [flights, setFlights] = useState<RecentFlight[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!pilotId) return;
    setLoading(true);
    const stats = await fetchPilotStats(pilotId);
    setFlights(stats?.recentFlights ?? []);
    setLoading(false);
  }, [pilotId]);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 120_000);
    return () => clearInterval(iv);
  }, [refresh]);

  const gradeColor = (grade: string) => {
    if (grade === 'Butter') return 'bg-accent-gold/15 text-accent-gold border-accent-gold/30';
    if (grade === 'Very Smooth' || grade === 'Smooth') return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    if (grade === 'Normal') return 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30';
    if (grade === 'Hard' || grade === 'Very Hard') return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    return 'bg-white/5 text-gray-400 border-white/10';
  };

  const landingRateColor = (rate: number | undefined) => {
    if (!rate) return '#94a3b8';
    const r = Math.abs(rate);
    if (r <= 250) return '#00cfd5';
    if (r <= 500) return '#f8fafc';
    if (r <= 700) return '#fbbf24';
    return '#ef4444';
  };

  const statusColor = (status: string) => {
    if (status === 'Approved') return 'text-emerald-400';
    if (status === 'Rejected') return 'text-rose-400';
    return 'text-amber-400';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-3 bg-white/[0.02] border-b border-white/5 flex justify-between items-center shrink-0">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2" style={{ fontFamily: "'JetBrains Mono', Consolas, monospace" }}>
          <Plane size={13} className="text-accent-gold" /> FLIGHT HISTORY
        </h3>
        <button
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-white hover:bg-white/5 transition-all bg-transparent border-none cursor-pointer disabled:opacity-30"
          style={{ fontFamily: "'JetBrains Mono', Consolas, monospace" }}
        >
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Flight list */}
      <div className="flex-1 overflow-y-auto p-4">
        {flights.length === 0 ? (
          <div className="text-gray-600 text-xs py-12 text-center font-mono tracking-widest uppercase">
            {loading ? 'Loading flight history...' : 'No flights recorded yet'}
          </div>
        ) : (
          <div className="space-y-2">
            {flights.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-dark-950/40 border border-white/[0.04] hover:border-white/[0.08] transition-colors"
              >
                {/* Callsign */}
                <div className="w-20 shrink-0">
                  <span className="text-xs font-bold text-white font-mono">{f.callsign}</span>
                </div>

                {/* Route */}
                <div className="flex items-center gap-2 w-32 shrink-0">
                  <span className="text-xs font-mono font-bold text-accent-gold">{f.departureIcao}</span>
                  <ArrowRight size={10} className="text-gray-600" />
                  <span className="text-xs font-mono text-white/60">{f.arrivalIcao}</span>
                </div>

                {/* Aircraft */}
                <span className="text-[10px] font-mono text-gray-500 w-16 truncate">{f.aircraftType}</span>

                {/* Flight Time */}
                <div className="flex items-center gap-1 text-[10px] text-gray-500 w-14" title="Flight time">
                  <Clock size={9} />
                  <span className="font-mono">{typeof f.flightTime === 'number' ? `${(f.flightTime / 60).toFixed(1)}h` : '—'}</span>
                </div>

                {/* Landing Rate */}
                <div className="flex items-center gap-1 text-[10px] w-16" title="Landing rate">
                  <TrendingUp size={9} style={{ color: landingRateColor(f.landingRate) }} />
                  <span className="font-mono font-bold" style={{ color: landingRateColor(f.landingRate) }}>{f.landingRate ? `${f.landingRate} fpm` : '—'}</span>
                </div>

                {/* Landing Grade */}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${gradeColor(f.landingGrade)}`} style={{ fontFamily: "'JetBrains Mono', Consolas, monospace" }}>
                  {f.landingGrade || '—'}
                </span>

                {/* Score */}
                <span className="text-xs font-mono text-gray-400 w-10 text-right font-bold">{f.score}%</span>

                {/* Status */}
                <span className={`text-[10px] font-bold uppercase tracking-wider ml-auto ${statusColor(f.status)}`} style={{ fontFamily: "'JetBrains Mono', Consolas, monospace" }}>
                  {f.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(FlightHistoryPanel);
