import { AnimatePresence, motion } from 'motion/react';
import AltitudeTape from './AltitudeTape';
import VSI from './VSI';
import HeadingTape from './HeadingTape';
import { useAltimeter } from '../../hooks/useAltimeter';
import type { TelemetryData } from '../../types';

interface Props {
  telemetry: TelemetryData;
}

export default function PrimaryFlightDisplay({ telemetry }: Props) {
  const altimeter = useAltimeter(telemetry.altitude, telemetry.verticalSpeed);

  return (
    <div className="flex flex-col gap-1.5 p-3.5 bg-surface-card border border-border-subtle rounded-lg">
      {/* PFD Label */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_5px_green]" />
          <span className="text-[9px] font-bold text-txt-disabled uppercase tracking-[2px]">
            Primary Flight Display
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Airspace indicator */}
          <span
            className={`text-[9px] px-2 py-0.5 rounded border font-bold ${
              telemetry.altitude > 18000
                ? 'border-orange-500/40 text-orange-400 bg-orange-500/10'
                : 'border-green-500/40 text-green-400 bg-green-500/10'
            }`}
          >
            {telemetry.altitude > 18000 ? 'CLASS A' : 'VFR/IFR'}
          </span>
          {/* Ground / Airborne */}
          <span
            className={`text-[9px] px-2 py-0.5 rounded border font-bold ${
              telemetry.onGround
                ? 'border-gold/40 text-gold bg-gold/10'
                : 'border-accent/40 text-accent bg-accent/10'
            }`}
          >
            {telemetry.onGround ? 'GROUND' : 'AIRBORNE'}
          </span>
        </div>
      </div>

      {/* ═══ Instruments Row ═══ */}
      <div className="flex items-center justify-center gap-1">
        {/* Speed readout (left side) */}
        <div className="flex flex-col items-center gap-1 w-[80px]">
          <div className="w-full bg-black/40 border border-zinc-700 rounded-md p-2 text-center">
            <div className="text-[8px] text-zinc-500 font-bold uppercase mb-0.5">IAS</div>
            <span className="text-[22px] font-bold text-green-400 tabular-nums leading-none">
              {telemetry.ias}
            </span>
            <span className="text-[8px] text-zinc-600 font-bold ml-0.5">KT</span>
          </div>
          <div className="w-full bg-black/40 border border-zinc-700 rounded-md p-2 text-center">
            <div className="text-[8px] text-zinc-500 font-bold uppercase mb-0.5">GS</div>
            <span className="text-[18px] font-bold text-zinc-300 tabular-nums leading-none">
              {telemetry.groundSpeed}
            </span>
            <span className="text-[8px] text-zinc-600 font-bold ml-0.5">KT</span>
          </div>
          <div className="w-full bg-black/40 border border-zinc-700 rounded-md p-2 text-center">
            <div className="text-[8px] text-zinc-500 font-bold uppercase mb-0.5">G-FORCE</div>
            <span className="text-[18px] font-bold text-zinc-300 tabular-nums leading-none">
              {telemetry.gForce.toFixed(2)}
            </span>
            <span className="text-[8px] text-zinc-600 font-bold ml-0.5">G</span>
          </div>
        </div>

        {/* Altitude Tape + VSI */}
        <AltitudeTape
          altitude={altimeter.indicatedAltitude}
          displayAltitude={altimeter.displayAltitude}
        />
        <VSI verticalSpeed={telemetry.verticalSpeed} />
      </div>

      {/* ═══ Heading Tape ═══ */}
      <HeadingTape heading={telemetry.heading} />

      {/* ═══ Baro Panel + Transition Alert ═══ */}
      <div className="flex items-center justify-between px-2 py-2 bg-black/30 border border-zinc-800 rounded-md">
        {/* VS Readout */}
        <div className="flex flex-col items-center">
          <span className="text-[8px] uppercase text-zinc-500 font-bold">V/S</span>
          <span
            className={`text-sm font-bold tabular-nums ${
              telemetry.verticalSpeed >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {telemetry.verticalSpeed > 0 ? '↑' : telemetry.verticalSpeed < 0 ? '↓' : '–'}{' '}
            {Math.abs(telemetry.verticalSpeed)}{' '}
            <span className="text-[9px] text-zinc-500">FPM</span>
          </span>
        </div>

        {/* Baro Setting */}
        <div
          className={`flex items-center gap-4 px-3 py-1.5 rounded-lg transition-colors ${
            altimeter.transitionWarning
              ? 'bg-orange-500/20 border border-orange-500 animate-pulse'
              : 'bg-black/20 border border-transparent'
          }`}
        >
          <div className="flex flex-col">
            <span className="text-[8px] uppercase text-zinc-500 font-bold">
              Altimeter (Baro)
            </span>
            <span className="text-lg font-black text-orange-400 tabular-nums leading-tight">
              {altimeter.qnhInHg}{' '}
              <span className="text-[9px] text-orange-700">IN HG</span>
            </span>
          </div>
          <button
            onClick={altimeter.toggleStandard}
            className={`px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest border transition-colors cursor-pointer ${
              altimeter.isStandard
                ? 'bg-cyan-500 border-cyan-400 text-black'
                : 'bg-zinc-800 border-zinc-600 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {altimeter.isStandard ? 'STD' : 'LOCAL'}
          </button>
        </div>

        {/* Transition Warning */}
        <AnimatePresence>
          {altimeter.transitionWarning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/20 border border-orange-500/50 rounded text-[9px] font-bold text-orange-400"
            >
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              SET STD ABOVE FL180
            </motion.div>
          )}
        </AnimatePresence>

        {/* Engines status */}
        <div className="flex flex-col items-center">
          <span className="text-[8px] uppercase text-zinc-500 font-bold">ENG</span>
          <span
            className={`text-sm font-bold ${
              telemetry.enginesOn ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {telemetry.enginesOn ? 'RUN' : 'OFF'}
          </span>
        </div>
      </div>
    </div>
  );
}
