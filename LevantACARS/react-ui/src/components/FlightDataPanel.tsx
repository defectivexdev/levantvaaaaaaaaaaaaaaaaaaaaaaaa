import { memo } from 'react';
import { MoveUp, MoveDown, Activity, Navigation, Heart, Gauge, TriangleAlert } from 'lucide-react';
import { BentoGrid, BentoGridItem } from './ui/bento-grid';
import { GlowCard } from './ui/glowing-border';
import { cn } from './ui/utils';
import type { TelemetryData } from '../types';

interface Props {
  telemetry: TelemetryData;
  qnhAltitude?: number;
}

function FlightDataPanel({ telemetry, qnhAltitude }: Props) {
  // Use QNH-corrected altitude when available, otherwise raw
  const displayAlt = qnhAltitude ?? Math.round(telemetry.altitude);
  const gearDown = telemetry.gearPosition > 0.5;
  const flapsOut = telemetry.flapsPosition > 0;
  const pBrake = telemetry.parkingBrake;

  return (
    <div className="flex flex-col gap-2">
      {/* Warning Banners */}
      {(telemetry.stallWarning || telemetry.overspeedWarning) && (
        <div className="flex gap-2">
          {telemetry.stallWarning && (
            <GlowCard className="flex-1 flex items-center justify-center gap-2 py-2 !border-rose-500/40 animate-pulse">
              <TriangleAlert size={12} className="text-rose-400" />
              <span className="telemetry-label text-rose-400">STALL WARNING</span>
            </GlowCard>
          )}
          {telemetry.overspeedWarning && (
            <GlowCard className="flex-1 flex items-center justify-center gap-2 py-2 !border-amber-500/40 animate-pulse">
              <TriangleAlert size={12} className="text-amber-400" />
              <span className="telemetry-label text-amber-400">OVERSPEED</span>
            </GlowCard>
          )}
        </div>
      )}

      {/* Bento Grid — Primary Flight Instruments */}
      <BentoGrid className="grid-cols-3 md:auto-rows-[4.5rem]">
        {/* Altitude — double width hero tile */}
        <BentoGridItem
          className="col-span-2"
          title="Indicated Altitude"
          description="QNH Corrected"
          icon={<MoveUp size={10} />}
          header={
            <div className="flex items-baseline gap-1.5">
              <span className="telemetry-value active-telemetry" style={{ color: 'var(--acars-cyan)' }}>
                {displayAlt.toLocaleString()}
              </span>
              <span className="telemetry-unit text-slate-500">FT</span>
            </div>
          }
        />

        {/* Ground Speed */}
        <BentoGridItem
          title="Ground Speed"
          icon={<Activity size={10} />}
          header={
            <div className="flex items-baseline gap-1.5">
              <span className="telemetry-value glow-green">
                {telemetry.groundSpeed}
              </span>
              <span className="telemetry-unit text-slate-500">KTS</span>
            </div>
          }
        />

        {/* Vertical Speed */}
        <BentoGridItem
          title="Vertical Speed"
          icon={telemetry.verticalSpeed < 0 ? <MoveDown size={10} /> : <MoveUp size={10} />}
          header={
            <div className="flex items-baseline gap-1.5">
              <span className={cn(
                'telemetry-value',
                telemetry.verticalSpeed < -500 ? 'glow-amber' : 'glow-green',
              )} style={{ color: telemetry.verticalSpeed < -500 ? 'var(--acars-amber)' : 'var(--acars-green)' }}>
                {telemetry.verticalSpeed > 0 ? '+' : ''}{Math.round(telemetry.verticalSpeed)}
              </span>
              <span className="telemetry-unit text-slate-500">FPM</span>
            </div>
          }
        />

        {/* Heading */}
        <BentoGridItem
          title="Heading"
          icon={<Navigation size={10} />}
          header={
            <div className="flex items-baseline gap-1.5">
              <span className="telemetry-value glow-green">
                {String(Math.round(telemetry.heading)).padStart(3, '0')}
              </span>
              <span className="telemetry-unit text-slate-500">DEG</span>
            </div>
          }
        />

        {/* IAS */}
        <BentoGridItem
          title="IAS"
          icon={<Gauge size={10} />}
          header={
            <div className="flex items-baseline gap-1.5">
              <span className="telemetry-value glow-cyan" style={{ color: 'var(--acars-cyan)' }}>
                {telemetry.ias}
              </span>
              <span className="telemetry-unit text-slate-500">KTS</span>
            </div>
          }
        />

        {/* G-Force */}
        <BentoGridItem
          title="G-Force"
          icon={<Heart size={10} />}
          header={
            <div className="flex items-baseline gap-1.5">
              <span className={cn(
                'telemetry-value',
                telemetry.gForce > 1.5 ? 'glow-amber' : 'glow-green',
              )} style={{ color: telemetry.gForce > 1.5 ? '#ef4444' : telemetry.gForce > 1.2 ? 'var(--acars-amber)' : 'var(--acars-green)' }}>
                {telemetry.gForce.toFixed(2)}
              </span>
              <span className="telemetry-unit text-slate-500">G</span>
            </div>
          }
        />
      </BentoGrid>

      {/* Systems Strip — compact single-row for aircraft state */}
      <div className="grid grid-cols-5 gap-1.5">
        <SysCell label="RAD ALT" value={`${Math.round(telemetry.radioAltitude)}`} unit="FT" warn={telemetry.radioAltitude < 200 && !telemetry.onGround} />
        <SysCell label="PITCH" value={`${telemetry.pitch > 0 ? '+' : ''}${telemetry.pitch.toFixed(1)}`} unit="°" />
        <SysCell label="BANK" value={`${telemetry.bank > 0 ? '+' : ''}${telemetry.bank.toFixed(1)}`} unit="°" warn={Math.abs(telemetry.bank) > 35} />
        <SysCell label="THR" value={`${Math.round(telemetry.throttle)}`} unit="%" />
        <SysCell label="FLAPS" value={flapsOut ? `${Math.round(telemetry.flapsPosition * 100)}` : 'UP'} unit={flapsOut ? '%' : ''} />
      </div>

      {/* Status indicators row */}
      <div className="flex items-center gap-2 px-1">
        <StatusDot label="GEAR" active={gearDown} color={gearDown ? '#2DCE89' : '#555'} />
        <StatusDot label="P/BRK" active={pBrake} color={pBrake ? '#FFB000' : '#555'} />
        <StatusDot label="GND" active={telemetry.onGround} color={telemetry.onGround ? '#22D3EE' : '#555'} />
        <StatusDot label="ENG" active={telemetry.enginesOn} color={telemetry.enginesOn ? '#2DCE89' : '#ef4444'} />
      </div>
    </div>
  );
}

function SysCell({ label, value, unit, warn, color }: { label: string; value: string; unit: string; warn?: boolean; color?: string }) {
  return (
    <div className={cn(
      'rounded-lg border border-[var(--acars-border)] bg-[var(--acars-screen)]/60 px-2 py-1.5 flex flex-col items-center justify-center gap-0.5',
      warn && 'border-amber-500/30 bg-amber-500/5',
    )}>
      <span className="text-[7px] font-bold tracking-[0.15em] text-slate-600 uppercase font-mono">{label}</span>
      <div className="flex items-baseline gap-0.5">
        <span className="text-xs font-bold font-mono" style={{ color: color || (warn ? 'var(--acars-amber)' : 'var(--acars-green)'), textShadow: `0 0 6px ${color || (warn ? 'rgba(255,176,0,0.3)' : 'rgba(45,206,137,0.2)')}` }}>
          {value}
        </span>
        {unit && <span className="text-[7px] font-mono text-slate-600">{unit}</span>}
      </div>
    </div>
  );
}

function StatusDot({ label, active, color }: { label: string; active: boolean; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color, boxShadow: active ? `0 0 6px ${color}` : 'none' }} />
      <span className="text-[8px] font-bold font-mono tracking-wider uppercase" style={{ color }}>{label}</span>
    </div>
  );
}

export default memo(FlightDataPanel);
