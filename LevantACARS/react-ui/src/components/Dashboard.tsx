import { MapPin, Plane, Send } from 'lucide-react';
import { SimBridge } from '../bridge';
import PrimaryFlightDisplay from './avionics/PrimaryFlightDisplay';
import FlightDataPanel from './FlightDataPanel';
import FlightLogs from './FlightLogs';
import type { TelemetryData, FlightState, ScoreResult, UILogEntry } from '../types';

interface Props {
  telemetry: TelemetryData;
  flight: FlightState;
  score: ScoreResult | null;
  activityLog: UILogEntry[];
  exceedanceLog: UILogEntry[];
}

export default function Dashboard({ telemetry, flight, score, activityLog, exceedanceLog }: Props) {
  return (
    <div className="flex flex-col h-full">

      {/* ═══ Flight Info Bar (when active) ═══ */}
      {flight.isActive && (
        <div className="flex items-center justify-between px-[18px] py-3 mx-3.5 mt-3 bg-surface-card border border-border-subtle rounded-lg flight-bar-glow animated-border">
          <div className="flex items-center gap-3">
            <span className="text-[15px] font-bold text-accent">{flight.flightNumber}</span>
            <span className="text-[13px] text-txt-secondary">
              {flight.departureIcao}
              <span className="text-txt-disabled"> → </span>
              {flight.arrivalIcao}
            </span>
            <Badge color="gold">{flight.flightTime}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {telemetry.onGround && telemetry.groundSpeed < 5 && (
              <button
                onClick={() => SimBridge.endFlight()}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-[10px] font-bold text-dark-950 cursor-pointer hover:brightness-110 transition-all"
                style={{ background: 'linear-gradient(135deg, #d4af37 0%, #cd7f32 100%)' }}
              >
                <Send size={11} />
                FILE PIREP
              </button>
            )}
            <button
              onClick={() => SimBridge.endFlight()}
              className="inline-flex items-center px-3.5 py-1.5 rounded-md text-[10px] font-bold text-danger bg-danger/15 border border-danger/20 cursor-pointer hover:bg-danger/25 transition-colors"
            >
              END FLIGHT
            </button>
          </div>
        </div>
      )}

      {/* ═══ Flight Progress Bar ═══ */}
      {flight.isActive && telemetry.plannedDistanceNm > 0 && (
        <div className="mx-3.5 mt-2 p-3 bg-surface-card border border-border-subtle rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-accent-gold uppercase tracking-[0.15em]">{flight.departureIcao}</span>
            <span className="text-[9px] text-txt-disabled font-mono">
              {telemetry.distanceFlownNm.toFixed(0)} / {telemetry.plannedDistanceNm.toFixed(0)} nm
            </span>
            <span className="text-[10px] font-bold text-accent uppercase tracking-[0.15em]">{flight.arrivalIcao}</span>
          </div>
          <div className="relative h-[6px] rounded-full bg-surface-elevated overflow-visible">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent-gold/80 to-accent transition-all duration-[15s] ease-linear progress-shimmer"
              style={{ width: `${Math.min(100, telemetry.flightProgress * 100)}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 transition-all duration-[15s] ease-linear"
              style={{ left: `${Math.min(100, telemetry.flightProgress * 100)}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="bg-surface-card border border-accent-gold/40 rounded-full p-[3px] shadow-[0_0_8px_rgba(212,175,55,0.4)]">
                <Plane size={10} className="text-accent-gold" style={{ transform: 'rotate(90deg)' }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Score Card (after flight) ═══ */}
      {score && (
        <div className="mx-3.5 mt-3 p-4 bg-surface-card border border-border-subtle rounded-lg animate-score-reveal">
          <div className="text-[9px] font-bold text-txt-disabled uppercase tracking-[1px] mb-3">FLIGHT REPORT</div>
          <div className="grid grid-cols-3 gap-1.5 mb-2">
            <ScoreItem label="SCORE" value={`${score.finalScore}%`} className="text-accent" />
            <ScoreItem label="LANDING" value={score.landingGrade} className="text-gold" />
            <ScoreItem label="XP EARNED" value={`+${score.xpEarned}`} className="text-success" />
          </div>
          <div className="text-[11px] text-txt-secondary">{score.landingDescription}</div>
          {score.rejected && (
            <div className="text-[11px] text-danger font-semibold mt-1">{score.rejectionReason}</div>
          )}
        </div>
      )}

      {/* ═══ Main Scrollable Content ═══ */}
      <div className="flex-1 overflow-y-auto p-3.5">

        {/* Aircraft + Phase */}
        <div className="p-3.5 bg-surface-card border border-border-subtle rounded-lg mb-2 card-hover-glow">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[9px] font-bold text-txt-disabled uppercase tracking-[1px] mb-1">AIRCRAFT</div>
              <div className="text-sm font-semibold text-txt-primary">{telemetry.aircraftTitle}</div>
            </div>
            <div className="flex gap-2 items-center">
              <Badge color="accent">{telemetry.phase}</Badge>
              {telemetry.isPaused ? (
                <Badge color="warning">PAUSED</Badge>
              ) : telemetry.simRate > 1.01 ? (
                <Badge color="danger">{telemetry.simRate}x</Badge>
              ) : (
                <Badge color="success">1x</Badge>
              )}
              {telemetry.isNonStandard && (
                <span className="text-[8px] font-bold text-danger uppercase tracking-wider">NON-STD</span>
              )}
            </div>
          </div>
        </div>

        {/* ═══ Flight Data Panel (Glass Cockpit) ═══ */}
        <div className="mb-3">
          <FlightDataPanel telemetry={telemetry} />
        </div>

        {/* ═══ Primary Flight Display (Avionics Suite) ═══ */}
        <div className="mb-3">
          <PrimaryFlightDisplay telemetry={telemetry} />
        </div>

        {/* Flight-active panels */}
        {flight.isActive && (
          <>
            {/* Integrity Meter */}
            <div className="p-3.5 bg-surface-card border border-border-subtle rounded-lg mb-3 crt-scanlines">
              <div className="flex items-center justify-between mb-2">
                <div className="text-[9px] font-bold text-txt-disabled uppercase tracking-[1px]">FLIGHT INTEGRITY</div>
                <span className="value-mono text-[18px] font-bold" style={{ color: integrityColor(telemetry.integrityScore) }}>
                  {telemetry.integrityScore}%
                </span>
              </div>
              <div className="h-[5px] rounded-full bg-surface-elevated overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${telemetry.integrityScore}%`, backgroundColor: integrityColor(telemetry.integrityScore) }}
                />
              </div>
              {telemetry.isNonStandard && (
                <div className="text-[9px] text-danger font-semibold mt-1.5">Sim rate detected — integrity reduced</div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-3">
              {/* Comfort */}
              <div className="p-3.5 bg-surface-card border border-border-subtle rounded-lg">
                <div className="text-[9px] font-bold text-txt-disabled uppercase tracking-[1px] mb-1">COMFORT</div>
                <div className="flex items-center gap-3">
                  <span className="value-mono text-[22px] font-bold text-success">{flight.comfortScore}%</span>
                  <div className="flex-1">
                    <div className="h-[3px] rounded-full bg-surface-elevated overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-500"
                           style={{ width: `${flight.comfortScore}%` }} />
                    </div>
                  </div>
                </div>
              </div>
              {/* Violations */}
              <div className="p-3.5 bg-surface-card border border-border-subtle rounded-lg">
                <div className="text-[9px] font-bold text-txt-disabled uppercase tracking-[1px] mb-1">VIOLATIONS</div>
                <span className="value-mono text-[22px] font-bold text-warning">{flight.exceedanceCount}</span>
              </div>
              {/* Pause Time */}
              <div className="p-3.5 bg-surface-card border border-border-subtle rounded-lg">
                <div className="text-[9px] font-bold text-txt-disabled uppercase tracking-[1px] mb-1">PAUSE TIME</div>
                <span className={`value-mono text-[22px] font-bold ${telemetry.totalPauseSeconds > 0 ? 'text-danger' : 'text-txt-secondary'}`}>
                  {Math.floor(telemetry.totalPauseSeconds / 60)}m {Math.floor(telemetry.totalPauseSeconds % 60)}s
                </span>
              </div>
            </div>
          </>
        )}

        {/* ═══ Flight Logs (always visible, real data) ═══ */}
        <div className="min-h-[200px]">
          <FlightLogs activityLog={activityLog} exceedanceLog={exceedanceLog} />
        </div>
      </div>

      {/* ═══ Bottom Bar ═══ */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-surface-dark border-t border-border-subtle">
        <div className="flex items-center gap-2 value-mono text-[9px] text-txt-disabled">
          <MapPin size={11} />
          <span>{telemetry.latitude.toFixed(4)}  {telemetry.longitude.toFixed(4)}</span>
        </div>
        {flight.isActive && (
          <button
            onClick={() => SimBridge.cancelFlight()}
            className="px-2 py-1 bg-transparent border-none text-danger text-[9px] font-semibold cursor-pointer rounded hover:bg-danger/10 transition-colors"
          >
            Cancel Flight
          </button>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────

function Badge({ color, children }: { color: 'accent' | 'gold' | 'success' | 'warning' | 'danger'; children: React.ReactNode }) {
  const colorMap = {
    accent:  'bg-accent/10 text-accent',
    gold:    'bg-gold/10 text-gold',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger:  'bg-danger/10 text-danger',
  };
  return (
    <span className={`inline-flex items-center px-[9px] py-[3px] rounded-md text-[9px] font-bold uppercase tracking-wide ${colorMap[color]}`}>
      {children}
    </span>
  );
}

function integrityColor(score: number): string {
  if (score > 89) return '#2ecc71';
  if (score > 69) return '#f1c40f';
  return '#e74c3c';
}

function ScoreItem({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="bg-surface-elevated rounded-lg p-3.5 text-center">
      <div className="text-[9px] font-bold text-txt-disabled uppercase tracking-[1px] mb-1">{label}</div>
      <div className={`value-mono text-[22px] font-bold ${className}`}>{value}</div>
    </div>
  );
}
