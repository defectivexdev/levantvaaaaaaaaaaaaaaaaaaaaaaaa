import { useState, useEffect, useCallback, useRef } from 'react';
import { Plane, Briefcase, Route, Shield, Timer, PlayCircle, XCircle, Clock, Users, Package, PlaneTakeoff, RefreshCw, Loader2, Zap } from 'lucide-react';
import { SimBridge } from '../bridge';
import { cn } from './ui/utils';
import { HoverBorderGradient } from './ui/hover-border-gradient';
import { pushToast } from './ToastOverlay';
import { fetchActiveBid } from '../api';
import type { FlightState, TelemetryData, BidData } from '../types';

interface Props {
  flight: FlightState;
  telemetry: TelemetryData;
  bid?: BidData | null;
  pilotId?: string;
  injectBid?: (b: BidData | null) => void;
  addLogEntry?: (message: string) => void;
  cancelFlight?: () => void;
  submitFlight?: () => void;
}

function useCountdown(expiresAt: string | undefined) {
  const [remaining, setRemaining] = useState('');
  const [pct, setPct] = useState(100);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const now = Date.now();
      const end = new Date(expiresAt).getTime();
      const diff = end - now;
      if (diff <= 0) { setRemaining('EXPIRED'); setPct(0); setExpired(true); return; }
      setExpired(false);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      // Percentage based on 24h window
      const totalWindow = 24 * 3600000;
      setPct(Math.min(100, Math.max(0, (diff / totalWindow) * 100)));
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [expiresAt]);

  return { remaining, pct, expired };
}

// Module-level flag: survives component unmount/remount (tab switches)
let _autoStartFired = false;
let _lastStartTime = 0;

export default function FlightPlan({ flight, telemetry, bid, pilotId, injectBid, addLogEntry, cancelFlight, submitFlight }: Props) {
  const active = flight.isActive && flight.flightNumber;
  const hasBid = !active && bid && bid.callsign;
  const { remaining, pct, expired } = useCountdown(bid?.expiresAt);
  const [cancelling, setCancelling] = useState(false);
  const autoStartFiredRef = useRef(_autoStartFired);

  // Sync module flag on mount — if flight is already active, mark as fired
  useEffect(() => {
    if (flight.isActive) {
      _autoStartFired = true;
      autoStartFiredRef.current = true;
    }
  }, []); // run once on mount

  // Debug: log state transitions
  useEffect(() => {
    console.log('[FlightPlan] State:', { active: !!active, hasBid: !!hasBid, bidCallsign: bid?.callsign ?? 'null', flightActive: flight.isActive, flightNumber: flight.flightNumber });
  }, [active, hasBid, bid, flight.isActive, flight.flightNumber]);

  const handleStartFlight = useCallback(() => {
    if (!bid || !pilotId) return;
    // Hard guard: never re-start if flight is already running
    if (flight.isActive) return;
    // Dedup: prevent firing more than once per 10s (tab switch remount guard)
    const now = Date.now();
    if (now - _lastStartTime < 10000) return;
    _lastStartTime = now;
    console.log('[FlightPlan] Starting flight:', bid.callsign);
    SimBridge.startFlight({
      pilotId,
      flightNumber: bid.flightNumber || bid.callsign || '',
      callsign: bid.callsign || '',
      departureIcao: bid.departureIcao,
      arrivalIcao: bid.arrivalIcao,
      route: bid.route || '',
      aircraftType: bid.aircraftType || '',
      aircraftRegistration: bid.aircraftRegistration || '',
      pax: bid.pax || 0,
      cargo: bid.cargo || 0,
    });
    addLogEntry?.('Flight Started — Telemetry recording initiated');
    pushToast('success', 'Flight started — ACARS recording active');
  }, [bid, pilotId, addLogEntry, flight.isActive]);

  // ── Auto-Start: detect movement with a loaded bid ──
  useEffect(() => {
    if (autoStartFiredRef.current) return;
    if (_autoStartFired) return; // module-level dedup
    if (!hasBid || !bid || !pilotId || expired) return;
    if (flight.isActive) return; // already active

    const hasMovement = telemetry.altitude > 50 || telemetry.groundSpeed > 30;
    if (hasMovement) {
      console.log('[FlightPlan] Auto-start triggered — altitude:', telemetry.altitude, 'GS:', telemetry.groundSpeed);
      autoStartFiredRef.current = true;
      _autoStartFired = true;
      handleStartFlight();
      addLogEntry?.('Auto-Start: Movement detected — flight recording initiated');
    }
  }, [hasBid, bid, pilotId, expired, flight.isActive, telemetry.altitude, telemetry.groundSpeed, handleStartFlight, addLogEntry]);

  // Reset auto-start flag only when flight truly ends (not on tab switch)
  useEffect(() => {
    if (!flight.isActive && !hasBid) {
      autoStartFiredRef.current = false;
      _autoStartFired = false;
    }
  }, [flight.isActive, hasBid]);

  const handleCancelBid = useCallback(() => {
    setCancelling(true);
    SimBridge.cancelBid();
    setTimeout(() => setCancelling(false), 2000);
  }, []);

  // Force Initialize: manual override when auto-start didn't fire
  const handleForceInit = useCallback(() => {
    if (!bid || !pilotId) return;
    console.log('[FlightPlan] Force Initialize triggered');
    handleStartFlight();
    addLogEntry?.('Manual Override: Flight force-initialized by pilot');
  }, [bid, pilotId, handleStartFlight, addLogEntry]);

  // Auto-cancel when timer expires
  useEffect(() => {
    if (expired && hasBid) {
      SimBridge.cancelBid();
    }
  }, [expired, hasBid]);

  return (
    <div className="glass-card rounded-xl relative overflow-hidden border border-white/5">
      {active ? (
        <div className="p-0">
          <div className="bg-dark-900/40 border border-white/5 rounded-xl flex flex-col relative overflow-hidden m-2">
            {/* Decorative bg text */}
            <div className="absolute -right-8 top-4 text-[6rem] font-display font-bold text-white/[0.02] leading-none pointer-events-none select-none">
              {flight.flightNumber}
            </div>

            {/* Status badges */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-1">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold tracking-[0.15em] border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                <div className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                DATA LINK ACTIVE
              </div>
              {flight.callsign && (
                <span className="text-xs font-mono font-bold text-accent-gold/50 tracking-widest">{flight.callsign}</span>
              )}
              {flight.aircraftType && (
                <span className="text-xs font-mono text-gray-600 tracking-widest">{flight.aircraftType}</span>
              )}
            </div>

            {/* DEP → ARR */}
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex flex-col">
                <span className="text-xs font-mono text-accent-gold/60 tracking-[0.3em] font-bold">DEP</span>
                <span className="text-3xl font-display font-bold text-white tracking-tighter">{flight.departureIcao}</span>
              </div>

              <div className="flex-1 flex flex-col items-center px-8 relative">
                <div className="text-xs font-bold text-accent-gold/40 mb-2 font-mono tracking-widest uppercase">
                  {flight.flightNumber}
                </div>
                <div className="w-full relative h-[2px] bg-white/5 rounded-full">
                  <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent-gold/80 to-accent-gold rounded-full transition-all duration-700" style={{ width: `${flight.progress || 0}%` }} />
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-all duration-700" style={{ left: `${flight.progress || 0}%` }}>
                    <Plane className="text-accent-gold fill-current rotate-90" size={13} style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.6))' }} />
                  </div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent-gold/60" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/20" />
                </div>
                <div className="flex items-center justify-between w-full mt-2">
                  <span className="text-xs text-gray-600 font-mono font-bold tracking-widest uppercase">{telemetry.aircraftTitle?.split(' ')[0] || ''}</span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="text-xs font-mono text-accent-gold/60 tracking-[0.3em] font-bold">ARR</span>
                <span className="text-3xl font-display font-bold text-white tracking-tighter">{flight.arrivalIcao}</span>
              </div>
            </div>

            {/* Flight Metrics Row */}
            <div className="grid grid-cols-4 gap-px mx-4 mb-2 rounded-lg overflow-hidden border border-white/[0.04]">
              <MetricCell icon={<Timer size={9} />} label="FLT TIME" value={flight.flightTime} />
              <MetricCell icon={<Route size={9} />} label="DISTANCE" value={`${Math.round(flight.distanceNm)} nm`} />
              <MetricCell icon={<Shield size={9} />} label="COMFORT" value={`${flight.comfortScore}%`} color={flight.comfortScore >= 90 ? 'text-emerald-400' : flight.comfortScore >= 70 ? 'text-amber-400' : 'text-rose-400'} />
              <MetricCell label="EXCEEDANCES" value={String(flight.exceedanceCount)} color={flight.exceedanceCount > 0 ? 'text-rose-400' : 'text-emerald-400'} />
            </div>

            {/* Action buttons: Submit + Cancel */}
            <div className="flex gap-2 mx-4 mb-3">
              <button
                onClick={submitFlight}
                className="flex-1 py-2.5 rounded-lg font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer border-none transition-all duration-300 hover:brightness-110 hover:shadow-lg hover:shadow-emerald-500/20"
                style={{ background: 'linear-gradient(135deg, #00d26a 0%, #00a854 100%)' }}
              >
                <Shield size={14} className="text-dark-950" />
                <span className="text-dark-950">End Flight</span>
              </button>
              <button
                onClick={cancelFlight}
                className="px-4 py-2.5 rounded-lg font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all duration-200"
              >
                <XCircle size={14} />
                Cancel Flight
              </button>
            </div>

          </div>
        </div>
      ) : hasBid ? (
        <div className="p-0">
          <div className="bg-dark-900/40 border border-white/5 rounded-xl flex flex-col relative overflow-hidden m-2">
            {/* Header: status + countdown */}
            <div className="flex items-center justify-between px-4 pt-3 pb-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold tracking-[0.15em] border bg-amber-500/10 border-amber-500/20 text-amber-400">
                  <div className="h-1 w-1 rounded-full bg-amber-400 animate-pulse" />
                  FLIGHT BOOKED
                </div>
                <span className="text-xs font-mono font-bold text-accent-gold/50 tracking-widest">{bid!.callsign}</span>
              </div>
              {/* Countdown timer */}
              {remaining && (
                <div className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-bold tracking-wider border",
                  expired
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                    : pct < 15
                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                      : "bg-white/5 border-white/10 text-gray-400"
                )}>
                  <Clock size={10} />
                  <span className="font-mono">{remaining}</span>
                </div>
              )}
            </div>

            {/* Expiry progress bar */}
            {remaining && !expired && (
              <div className="mx-4 mt-1">
                <div className="h-[3px] w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-1000",
                      pct < 15 ? "bg-rose-500" : pct < 40 ? "bg-amber-500" : "bg-accent-gold"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            )}

            {/* DEP → ARR */}
            <div className="flex items-center justify-between px-4 py-2">
              <div className="flex flex-col">
                <span className="text-xs font-mono text-accent-gold/60 tracking-[0.3em] font-bold">DEP</span>
                <span className="text-3xl font-display font-bold text-white tracking-tighter">{bid!.departureIcao}</span>
                {bid!.departureName && <span className="text-xs text-gray-600 truncate max-w-[120px]">{bid!.departureName}</span>}
              </div>

              <div className="flex-1 flex flex-col items-center px-8 relative">
                <div className="text-xs font-bold text-accent-gold/40 mb-2 font-mono tracking-widest uppercase">
                  {bid!.flightNumber}
                </div>
                <div className="w-full relative h-[2px] bg-white/5 rounded-full">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent-gold/60" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/20" />
                </div>
                {bid!.route && (
                  <div className="text-xs text-gray-700 font-mono mt-2 truncate max-w-full">{bid!.route}</div>
                )}
              </div>

              <div className="flex flex-col items-end">
                <span className="text-xs font-mono text-accent-gold/60 tracking-[0.3em] font-bold">ARR</span>
                <span className="text-3xl font-display font-bold text-white tracking-tighter">{bid!.arrivalIcao}</span>
                {bid!.arrivalName && <span className="text-xs text-gray-600 truncate max-w-[120px]">{bid!.arrivalName}</span>}
              </div>
            </div>

            {/* Bid details row */}
            <div className="grid grid-cols-3 gap-px mx-4 mb-2 rounded-lg overflow-hidden border border-white/[0.04]">
              {bid!.aircraftType && (
                <div className="bg-dark-950/50 py-1.5 px-2 flex flex-col items-center gap-0.5">
                  <div className="flex items-center gap-1 text-gray-600">
                    <PlaneTakeoff size={9} />
                    <span className="text-xs font-bold uppercase tracking-widest">Aircraft</span>
                  </div>
                  <span className="text-xs font-bold font-mono text-white">{bid!.aircraftType}</span>
                </div>
              )}
              <div className="bg-dark-950/50 py-1.5 px-2 flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1 text-gray-600">
                  <Users size={9} />
                  <span className="text-xs font-bold uppercase tracking-widest">PAX</span>
                </div>
                <span className="text-xs font-bold font-mono text-white">{bid!.pax || 0}</span>
              </div>
              <div className="bg-dark-950/50 py-1.5 px-2 flex flex-col items-center gap-0.5">
                <div className="flex items-center gap-1 text-gray-600">
                  <Package size={9} />
                  <span className="text-xs font-bold uppercase tracking-widest">Cargo</span>
                </div>
                <span className="text-xs font-bold font-mono text-white">{bid!.cargo || 0} kg</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mx-4 mb-3">
              <button
                onClick={handleStartFlight}
                disabled={expired}
                className={cn(
                  "flex-1 py-2.5 rounded-lg font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer border-none transition-all duration-300",
                  expired
                    ? "opacity-40 cursor-not-allowed bg-gray-700"
                    : "hover:brightness-110 hover:shadow-lg hover:shadow-accent-gold/20"
                )}
                style={expired ? {} : { background: 'linear-gradient(135deg, #d4af37 0%, #cd7f32 100%)' }}
              >
                <PlayCircle size={14} className="text-dark-950" />
                <span className="text-dark-950">Start Flight</span>
              </button>
              <button
                onClick={handleForceInit}
                disabled={expired}
                className="px-3 py-2.5 rounded-lg font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-1.5 cursor-pointer border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all duration-200 disabled:opacity-40"
                title="Force start flight recording (manual override)"
              >
                <Zap size={12} />
              </button>
              <button
                onClick={handleCancelBid}
                disabled={cancelling}
                className="px-4 py-2.5 rounded-lg font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all duration-200 disabled:opacity-40"
              >
                <XCircle size={14} />
                {cancelling ? 'Cancelling...' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      ) : telemetry.altitude > 1000 && !bid ? (
        /* State Watchdog: pilot is airborne with no bid — bypass EmptyState */
        <div className="flex flex-col items-center justify-center py-8 gap-4">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
            <PlaneTakeoff size={11} className="text-amber-400" />
            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-[0.2em]">Airborne — No Flight Plan</span>
          </div>
          <p className="text-[9px] text-slate-600/70 font-mono tracking-wider">Altitude {Math.round(telemetry.altitude).toLocaleString()} FT detected — fetch bid to begin tracking</p>
          <HoverBorderGradient
            onClick={() => {
              if (pilotId) {
                fetchActiveBid(pilotId).then(result => {
                  if (result.bid) {
                    const bidData: BidData = {
                      type: 'bid',
                      callsign: result.bid.callsign,
                      flightNumber: result.bid.flightNumber || '',
                      departureIcao: result.bid.departureIcao,
                      arrivalIcao: result.bid.arrivalIcao,
                      departureName: result.bid.departureName || '',
                      arrivalName: result.bid.arrivalName || '',
                      aircraftType: result.bid.aircraftType || '',
                      aircraftRegistration: result.bid.aircraftRegistration || '',
                      route: result.bid.route || '',
                      pax: result.bid.pax || 0,
                      cargo: result.bid.cargo || 0,
                      createdAt: result.bid.createdAt,
                      expiresAt: result.bid.expiresAt,
                    };
                    injectBid?.(bidData);
                    pushToast('success', `Bid loaded: ${bidData.departureIcao} → ${bidData.arrivalIcao}`);
                  } else if (result.error) {
                    pushToast('danger', result.error);
                  } else {
                    pushToast('info', 'No active bid found');
                  }
                }).catch(() => {});
              }
            }}
            disabled={!pilotId}
          >
            <span className="flex items-center gap-2 text-accent-gold">
              <RefreshCw size={13} />
              Fetch Bid
            </span>
          </HoverBorderGradient>
        </div>
      ) : (
        <EmptyState pilotId={pilotId} injectBid={injectBid} addLogEntry={addLogEntry} />
      )}
    </div>
  );
}

function MetricCell({ icon, label, value, color }: { icon?: React.ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="bg-dark-950/50 py-1.5 px-2 flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1 text-gray-600">
        {icon}
        <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
      </div>
      <span className={`text-xs font-bold font-mono ${color || 'text-white'}`}>{value}</span>
    </div>
  );
}


function EmptyState({ pilotId, injectBid, addLogEntry }: { pilotId?: string; injectBid?: (b: BidData | null) => void; addLogEntry?: (message: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [simbriefId, setSimbriefId] = useState<string | null>(null);
  const cooldownRef = useRef<number | null>(null);

  // Fetch SimBrief ID from pilot settings on mount
  useEffect(() => {
    if (!pilotId) return;
    fetch('https://www.levant-va.com/api/acars/pilot-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pilotId }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.simbriefId) setSimbriefId(data.simbriefId);
      })
      .catch(() => {});
  }, [pilotId]);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) window.clearTimeout(cooldownRef.current);
    };
  }, []);

  const handleFetchBid = useCallback(async () => {
    if (!pilotId || loading) return;
    
    // Prevent multiple rapid clicks
    if (cooldownRef.current) {
      console.log('[EmptyState] Fetch already in progress, ignoring');
      return;
    }
    
    setLoading(true);
    console.log('[EmptyState] Fetching SimBrief flight plan for pilot:', pilotId);
    
    try {
      const result = await fetchActiveBid(pilotId);
      console.log('[EmptyState] Bid result:', JSON.stringify(result));
      
      if (result.error) {
        console.error('[EmptyState] Bid error:', result.error);
        pushToast('danger', result.error);
      } else if (!result.bid) {
        pushToast('warning', 'No active bid found — fetch SimBrief on web portal first');
      } else {
        const bidData: BidData = {
          type: 'bid',
          callsign: result.bid.callsign,
          flightNumber: result.bid.flightNumber,
          departureIcao: result.bid.departureIcao,
          arrivalIcao: result.bid.arrivalIcao,
          departureName: result.bid.departureName,
          arrivalName: result.bid.arrivalName,
          aircraftType: result.bid.aircraftType,
          aircraftRegistration: result.bid.aircraftRegistration,
          route: result.bid.route,
          pax: result.bid.pax,
          cargo: result.bid.cargo,
          createdAt: result.bid.createdAt,
          expiresAt: result.bid.expiresAt,
        };
        console.log('[EmptyState] Injecting bid into global state:', bidData.callsign);
        injectBid?.(bidData);
        addLogEntry?.(`Flight Plan Loaded — ${bidData.departureIcao} → ${bidData.arrivalIcao} — Ready for Takeoff`);
        pushToast('success', `Bid loaded: ${result.bid.departureIcao} → ${result.bid.arrivalIcao}`);
      }
    } catch (error) {
      console.error('[EmptyState] Fetch exception:', error);
      pushToast('danger', 'Network error - check your connection');
    } finally {
      // Set cooldown to prevent rapid retries
      if (cooldownRef.current) window.clearTimeout(cooldownRef.current);
      cooldownRef.current = window.setTimeout(() => {
        setLoading(false);
        cooldownRef.current = null;
      }, 2000); // 2 second cooldown
    }
  }, [pilotId, loading, injectBid, addLogEntry]);

  return (
    <div className="flex flex-col items-center justify-center py-10 relative gap-1">
      <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/5 mb-3">
        <Briefcase size={18} className="text-slate-600" />
      </div>
      <h3 className="text-[11px] font-bold uppercase tracking-[0.25em] text-slate-400">No Flight Plan</h3>
      <p className="text-[9px] text-slate-600 font-mono tracking-widest mt-1 mb-5">FETCH BID FROM WEB PORTAL TO BEGIN</p>
      <HoverBorderGradient
        onClick={handleFetchBid}
        disabled={loading || !pilotId}
        containerClassName={cn(
          loading && 'opacity-60',
        )}
      >
        {loading ? (
          <span className="flex items-center gap-2 text-accent-gold">
            <Loader2 size={13} className="animate-spin" />
            Syncing...
          </span>
        ) : (
          <span className="flex items-center gap-2 text-accent-gold">
            <RefreshCw size={13} />
            Fetch Bid
          </span>
        )}
      </HoverBorderGradient>
      <p className="text-[9px] text-slate-700 font-mono mt-4 tracking-wider">
        Fetches your flight plan from web portal
      </p>
      {simbriefId && (
        <div className="mt-3 px-3 py-1.5 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
          <p className="text-[8px] text-cyan-400/60 font-mono tracking-wider">
            SimBrief ID: <span className="text-cyan-400 font-bold">{simbriefId}</span>
          </p>
        </div>
      )}
    </div>
  );
}
