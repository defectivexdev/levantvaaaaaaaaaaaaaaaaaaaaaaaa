import { Cloud } from 'lucide-react';
import type { WeatherData } from '../types';

interface Props {
  weather: WeatherData | null;
}

export default function WeatherPanel({ weather }: Props) {
  return (
    <div className="glass-card rounded-xl border border-white/5 overflow-hidden">
      <div className="px-4 py-2 bg-white/5 border-b border-white/5 flex items-center gap-2">
        <Cloud size={12} className="text-accent-gold" />
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-[0.2em]">Weather</h3>
      </div>

      {!weather ? (
        <div className="text-gray-600 text-xs py-10 text-center font-mono tracking-widest uppercase">No weather data available</div>
      ) : (
        <div className="p-4 space-y-4">
          <div className="text-sm font-mono font-bold text-white">{weather.station}</div>

          <div className="grid grid-cols-2 gap-3">
            <WxCell label="Temperature" value={weather.temperature} />
            <WxCell label="Wind" value={weather.wind} />
            <WxCell label="Visibility" value={weather.visibility} />
            <WxCell label="Clouds" value={weather.clouds} />
            <WxCell label="Pressure" value={weather.pressure} />
          </div>

          {weather.metar && (
            <div className="pt-3 border-t border-white/5">
              <div className="text-xs text-gray-500 uppercase tracking-widest mb-1.5">Raw METAR</div>
              <div className="text-accent-emerald font-mono text-xs break-all leading-relaxed bg-dark-950/40 rounded-lg p-3 border border-white/5">{weather.metar}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function WxCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase tracking-widest">{label}</div>
      <div className="text-xs font-mono font-bold text-white mt-0.5">{value}</div>
    </div>
  );
}
