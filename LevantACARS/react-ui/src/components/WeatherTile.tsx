import { useState, useEffect, useCallback } from 'react';
import { CloudRain, CheckCircle2, Wind, Eye, Thermometer, Gauge, RefreshCw } from 'lucide-react';
import { fetchMetar, fetchTaf, type MetarResult, type TafResult } from '../services/weather';

interface Props {
  icao: string;
  label?: string;
  onQnhUpdate?: (qnh: number) => void;
}

export default function WeatherTile({ icao, label, onQnhUpdate }: Props) {
  const [metar, setMetar] = useState<MetarResult | null>(null);
  const [taf, setTaf] = useState<TafResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showTaf, setShowTaf] = useState(false);

  const refresh = useCallback(async () => {
    if (!icao || icao.length < 4) return;
    setLoading(true);
    const [m, t] = await Promise.all([fetchMetar(icao), fetchTaf(icao)]);
    setMetar(m);
    setTaf(t);
    if (m?.qnh && onQnhUpdate) onQnhUpdate(m.qnh);
    setLoading(false);
  }, [icao, onQnhUpdate]);

  // Fetch on mount & every 120s
  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 120_000);
    return () => clearInterval(iv);
  }, [refresh]);

  const isSevere = metar?.isSevere ?? false;

  return (
    <div
      className={`relative flex flex-col justify-between p-2.5 h-full rounded-lg border transition-all duration-500 ${
        isSevere
          ? 'bg-red-500/10 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.1)]'
          : 'bg-slate-900/50 border-white/10'
      }`}
    >
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <p className="telemetry-label" style={{ fontSize: 8 }}>{label || 'METAR'}</p>
          <h3 className="text-sm font-mono text-white mt-0.5 font-bold">{icao || '----'}</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/5 transition-all bg-transparent border-none cursor-pointer disabled:opacity-30"
            title="Refresh"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          {isSevere ? (
            <CloudRain size={16} className="text-red-500 animate-pulse" />
          ) : (
            <CheckCircle2 size={16} className="text-cyan-400" />
          )}
        </div>
      </div>

      {/* Conditions badges */}
      {metar?.conditions && metar.conditions.length > 0 && (
        <div className="flex gap-1 mt-1.5 flex-wrap">
          {metar.conditions.map((c) => (
            <span
              key={c}
              className="px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-red-500/20 text-red-400 border border-red-500/30"
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {/* Parsed fields */}
      {metar ? (
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-1.5">
          <WeatherField icon={<Wind size={10} />} label="Wind" value={metar.wind} />
          <WeatherField icon={<Eye size={10} />} label="Vis" value={metar.visibility} />
          <WeatherField icon={<Thermometer size={10} />} label="Temp" value={metar.temperature} />
          <WeatherField icon={<Gauge size={10} />} label="QNH" value={metar.pressure} highlight />
        </div>
      ) : (
        <div className="mt-2 text-[10px] font-mono text-slate-600">
          {loading ? 'FETCHING LIVE DATA...' : 'No METAR available'}
        </div>
      )}

      {/* Raw METAR */}
      {metar && (
        <div className="mt-1.5 px-1.5 py-1 rounded-md bg-dark-950/50 border border-white/[0.04]">
          <p className="text-[8px] font-mono leading-snug text-slate-400 break-all">{metar.raw}</p>
        </div>
      )}

      {/* TAF toggle */}
      {taf && (
        <div className="mt-1.5">
          <button
            onClick={() => setShowTaf(!showTaf)}
            className="text-[9px] font-bold uppercase tracking-[0.2em] text-cyan-400/60 hover:text-cyan-400 transition-colors bg-transparent border-none cursor-pointer px-0"
          >
            {showTaf ? '▼ Hide TAF' : '▶ Show TAF'}
          </button>
          {showTaf && (
            <div className="mt-1 px-1.5 py-1 rounded-md bg-dark-950/50 border border-white/[0.04]">
              <p className="text-[8px] font-mono leading-snug text-slate-500 break-all">{taf.raw}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WeatherField({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-slate-600">{icon}</span>
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">{label}</span>
      <span className={`text-[10px] font-mono font-bold ml-auto ${highlight ? 'text-cyan-400' : 'text-white/70'}`}>
        {value}
      </span>
    </div>
  );
}
