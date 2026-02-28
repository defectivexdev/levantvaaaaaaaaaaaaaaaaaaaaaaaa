import { useEffect, useRef, useState, useCallback } from 'react';
import { onBridgeMessage, SimBridge } from '../bridge';
import {
  runDiscordDiagnostic,
  getLandingGrade,
  getLandingScore,
  saveFlightToLogbook,
} from '../discord';
import { pushToast } from '../components/ToastOverlay';
import type {
  TelemetryData,
  AuthState,
  ConnectionState,
  FlightState,
  ScoreResult,
  BridgeMessage,
  UILogEntry,
  WeatherData,
  BidData,
  TouchdownPoint,
} from '../types';

// ── Default state factories ───────────────────────────────────────

const defaultTelemetry: TelemetryData = {
  type: 'telemetry',
  latitude: 0,
  longitude: 0,
  altitude: 0,
  radioAltitude: 0,
  heading: 0,
  groundSpeed: 0,
  ias: 0,
  verticalSpeed: 0,
  pitch: 0,
  bank: 0,
  gForce: 1.0,
  onGround: true,
  enginesOn: false,
  totalFuel: 0,
  flapsPosition: 0,
  gearPosition: 0,
  parkingBrake: false,
  throttle: 0,
  stallWarning: false,
  overspeedWarning: false,
  aircraftTitle: 'N/A',
  phase: 'Preflight',
  fuelPercent: 0,
  simRate: 1.0,
  isPaused: false,
  totalPauseSeconds: 0,
  isNonStandard: false,
  integrityScore: 100,
  flightProgress: 0,
  distanceFlownNm: 0,
  plannedDistanceNm: 0,
};

const defaultAuth: AuthState = {
  type: 'auth',
  isLoggedIn: false,
  pilotName: '',
  pilotId: '',
  pilotRank: '',
  pilotAvatar: '',
  pilotHours: 0,
  pilotXp: 0,
  weightUnit: 'lbs',
  deviceCode: '',
  isLoggingIn: false,
};

const defaultConnection: ConnectionState = {
  type: 'connection',
  simConnected: false,
  apiConnected: false,
};

const defaultFlight: FlightState = {
  type: 'flight',
  isActive: false,
  flightNumber: '',
  callsign: '',
  departureIcao: '',
  arrivalIcao: '',
  aircraftType: '',
  currentPhase: 'Preflight',
  flightTime: '00:00',
  comfortScore: 100,
  exceedanceCount: 0,
  distanceNm: 0,
  fuelUsed: 0,
  landingRate: 0,
  progress: 0,
  oooi: { gateOut: '', wheelsOff: '', wheelsOn: '', gateIn: '' },
};

// ── Helpers ───────────────────────────────────────────────────────

const SUCCESS_KEYWORDS = ['takeoff', 'landing', 'arrived', 'departed', 'completed', 'started', 'cruise', 'pushback', 'taxi', 'boarding', 'reached'];
const WARNING_KEYWORDS = ['warning', 'alert', 'exceed', 'violation', 'overspeed', 'stall', 'fail'];

function classifyLog(message: string): 'success' | 'warning' | 'info' {
  const lower = message.toLowerCase();
  if (WARNING_KEYWORDS.some(k => lower.includes(k))) return 'warning';
  if (SUCCESS_KEYWORDS.some(k => lower.includes(k))) return 'success';
  return 'info';
}

// ── Hook ──────────────────────────────────────────────────────────

export function useTelemetry() {
  const [telemetry, setTelemetry] = useState<TelemetryData>(defaultTelemetry);
  const [auth, setAuth] = useState<AuthState>(defaultAuth);
  const [connection, setConnection] = useState<ConnectionState>(defaultConnection);
  const [flight, setFlight] = useState<FlightState>(defaultFlight);
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [discordVerified, setDiscordVerified] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{ status: string; message: string; version?: string; progress?: number } | null>(null);
  const qnhRef = useRef(1013.25);
  const [bid, setBid] = useState<BidData | null>(null);
  const [touchdownPoint, setTouchdownPoint] = useState<TouchdownPoint | null>(null);
  const [activityLog, setActivityLog] = useState<UILogEntry[]>([]);
  const [exceedanceLog, setExceedanceLog] = useState<UILogEntry[]>([]);
  const logIdRef = useRef(0);
  const authRef = useRef(auth);
  authRef.current = auth;

  // ── Landing Black Box ──────────────────────────────────────────
  const blackBoxRef = useRef({
    armed: false,
    touchdownFPM: 0,
    maxGForce: 1.0,
    fired: false,
  });

  // Throttle: skip telemetry setState if nothing visually changed (reduces re-renders)
  const lastTelemetryRef = useRef<TelemetryData | null>(null);
  function telemetryChanged(a: TelemetryData, b: TelemetryData): boolean {
    return a.phase !== b.phase || a.onGround !== b.onGround
      || a.stallWarning !== b.stallWarning || a.overspeedWarning !== b.overspeedWarning
      || Math.abs(a.altitude - b.altitude) > 5 || Math.abs(a.ias - b.ias) > 1
      || Math.abs(a.groundSpeed - b.groundSpeed) > 1 || Math.abs(a.heading - b.heading) > 0.5
      || Math.abs(a.verticalSpeed - b.verticalSpeed) > 10 || Math.abs(a.gForce - b.gForce) > 0.005
      || Math.abs(a.radioAltitude - b.radioAltitude) > 1;
  }

  const handleMessage = useCallback((data: unknown) => {
    const msg = data as BridgeMessage;
    if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

    switch (msg.type) {
      case 'telemetry': {
        const t = msg as TelemetryData;

        // Skip state update if values haven't changed enough to matter visually
        if (lastTelemetryRef.current && !telemetryChanged(lastTelemetryRef.current, t)) return;
        lastTelemetryRef.current = t;

        setTelemetry(prev => {
          // Detect phase changes and push toast
          if (prev.phase && t.phase && prev.phase !== t.phase && t.phase !== 'Preflight') {
            pushToast('info', `Phase: ${prev.phase} → ${t.phase}`);
          }
          // Stall/overspeed toast (once per activation)
          if (t.stallWarning && !prev.stallWarning) pushToast('danger', 'STALL WARNING — Increase speed!');
          if (t.overspeedWarning && !prev.overspeedWarning) pushToast('danger', 'OVERSPEED — Reduce speed!');

          // ── Landing Black Box: arm below 50ft, capture VS at touchdown ──
          // Uses Weight-on-Wheels (onGround) + radioAlt <= 1 for reliable detection
          const bb = blackBoxRef.current;
          if (t.radioAltitude < 50 && t.radioAltitude > 1 && !t.onGround) {
            bb.armed = true;
            // Continuously capture the last VS before wheels touch — most accurate FPM
            if (t.verticalSpeed < bb.touchdownFPM) bb.touchdownFPM = t.verticalSpeed;
            if (t.gForce > bb.maxGForce) bb.maxGForce = t.gForce;
          }
          if (bb.armed && !bb.fired && t.onGround && t.radioAltitude <= 1 && t.groundSpeed > 30) {
            bb.fired = true;
            const fpm = bb.touchdownFPM;
            const gf = bb.maxGForce;
            const grade = getLandingGrade(fpm);
            const score = getLandingScore(fpm);
            console.log(`[BlackBox] Touchdown: ${fpm.toFixed(0)} FPM, ${gf.toFixed(2)}G, ${grade}, ${score}%`);
            pushToast('info', `Touchdown: ${fpm.toFixed(0)} FPM — ${grade}`);
            // Touchdown notification is handled by C# DiscordWebhookService — no React-side webhook needed
          }
          // Reset black box when airborne again
          if (!t.onGround && t.radioAltitude > 50) {
            bb.armed = false;
            bb.fired = false;
            bb.touchdownFPM = 0;
            bb.maxGForce = 1.0;
          }

          return t;
        });
        break;
      }
      case 'auth':
        setAuth(msg as AuthState);
        break;
      case 'connection': {
        const c = msg as ConnectionState;
        setConnection(prev => {
          if (c.simConnected && !prev.simConnected) pushToast('success', 'FSUIPC Connected');
          if (!c.simConnected && prev.simConnected) pushToast('warning', 'FSUIPC Disconnected');
          return c;
        });
        break;
      }
      case 'flight': {
        const f = msg as FlightState;
        setFlight(prev => {
          // Detect flight start transition (was inactive → now active)
          if (f.isActive && !prev.isActive && f.callsign) {
            console.log('[useTelemetry] Flight started:', f.callsign);
            // Webhook notification handled by C# DiscordWebhookService — no React-side webhook needed
          }
          return f;
        });
        break;
      }
      case 'score': {
        const s = msg as ScoreResult;
        setScore(s);
        // Webhook notification handled by C# DiscordWebhookService — save to local logbook only
        setFlight(prev => {
          if (prev.callsign) {
            const fpm = prev.landingRate || blackBoxRef.current.touchdownFPM || 0;
            const grade = s.landingGrade || getLandingGrade(fpm);
            const reportString = `${prev.callsign} has landed at ${prev.arrivalIcao} with a landing rate of ${fpm.toFixed(2)}fpm and performance score of ${s.finalScore}%.`;
            saveFlightToLogbook({
              date: new Date().toLocaleDateString(),
              callsign: prev.callsign,
              route: `${prev.departureIcao}-${prev.arrivalIcao}`,
              departureIcao: prev.departureIcao,
              arrivalIcao: prev.arrivalIcao,
              aircraftType: prev.aircraftType,
              fpm,
              score: s.finalScore,
              grade,
              flightTime: prev.flightTime,
              report: reportString,
            });
          }
          return prev;
        });
        break;
      }
      case 'activity': {
        const raw = msg as { message: string; timestamp?: string };
        const entry: UILogEntry = {
          id: ++logIdRef.current,
          kind: classifyLog(raw.message),
          event: raw.message,
          timestamp: raw.timestamp || new Date().toLocaleTimeString('en-GB', { hour12: false }),
        };
        // Deduplicate: skip if the most recent activity has the same message
        setActivityLog(prev => {
          if (prev.length > 0 && prev[0].event === raw.message) return prev;
          return [entry, ...prev].slice(0, 100);
        });
        break;
      }
      case 'exceedance': {
        const raw = msg as { message: string; timestamp?: string };
        const entry: UILogEntry = {
          id: ++logIdRef.current,
          kind: 'warning',
          event: raw.message,
          timestamp: raw.timestamp || new Date().toLocaleTimeString('en-GB', { hour12: false }),
        };
        // Deduplicate: skip if the most recent exceedance has the same message
        setExceedanceLog(prev => {
          if (prev.length > 0 && prev[0].event === raw.message) return prev;
          return [entry, ...prev].slice(0, 100);
        });
        pushToast('warning', raw.message);
        break;
      }
      case 'weather': {
        const w = msg as WeatherData;
        // Parse QNH from pressure field or metar
        if (w.qnh && w.qnh > 0) {
          qnhRef.current = w.qnh;
        } else if (w.pressure) {
          const match = w.pressure.match(/(\d{3,4}\.?\d*)/); 
          if (match) {
            const val = parseFloat(match[1]);
            // If value looks like inHg (28-32 range), convert to hPa
            qnhRef.current = val < 100 ? val * 33.8639 : val;
          }
        }
        setWeather(w);
        break;
      }
      case 'touchdown': {
        const td = msg as TouchdownPoint & { type: string };
        setTouchdownPoint({ latitude: td.latitude, longitude: td.longitude, landingRate: td.landingRate, groundSpeed: td.groundSpeed });
        break;
      }
      case 'bid': {
        const b = msg as BidData;
        const resolved = b.callsign ? b : null;
        console.log('[useTelemetry] bid message received:', resolved?.callsign ?? 'null');
        setBid(resolved);
        break;
      }
      case 'updateStatus': {
        const u = msg as { status: string; message: string; version?: string; progress?: number };
        setUpdateStatus(u);
        // Auto-dismiss "up to date" and "error" after 4s
        if (u.status === 'upToDate' || u.status === 'error') {
          setTimeout(() => setUpdateStatus(null), 4000);
        }
        break;
      }
    }
  }, []);

  useEffect(() => {
    const unsub = onBridgeMessage(handleMessage);
    return unsub;
  }, [handleMessage]);

  // Auto-fetch bid when logged in + periodic poll (every 30s)
  const prevLoggedIn = useRef(false);
  const prevPilotId = useRef('');
  useEffect(() => {
    if (auth.isLoggedIn && !prevLoggedIn.current) {
      // Just logged in — fetch bid + run one-time Discord diagnostic
      if (auth.pilotId) SimBridge.fetchBid();
      runDiscordDiagnostic()
        .then(() => { setDiscordVerified(localStorage.getItem('LVT_DISCORD_VERIFIED') === 'true'); })
        .catch(() => {});
    }
    // Also fetch bid when pilotId arrives after login (race condition fix)
    if (auth.isLoggedIn && auth.pilotId && !prevPilotId.current) {
      console.log('[useTelemetry] pilotId arrived, fetching bid:', auth.pilotId);
      SimBridge.fetchBid();
    }
    prevLoggedIn.current = auth.isLoggedIn;
    prevPilotId.current = auth.pilotId || '';

    if (!auth.isLoggedIn) return;
    const iv = setInterval(() => {
      if (!flight.isActive && auth.pilotId) SimBridge.fetchBid();
    }, 30000);
    return () => clearInterval(iv);
  }, [auth.isLoggedIn, auth.pilotId, flight.isActive]);

  const clearScore = useCallback(() => setScore(null), []);
  const clearLogs = useCallback(() => {
    setActivityLog([]);
    setExceedanceLog([]);
  }, []);

  // Cancel active flight — call C# bridge + reset all UI state to default
  const cancelFlight = useCallback(() => {
    SimBridge.cancelFlight();
    setFlight(defaultFlight);
    setScore(null);
    setBid(null);
    setTouchdownPoint(null);
    setActivityLog([]);
    setExceedanceLog([]);
    // Reset black box
    blackBoxRef.current = { armed: false, touchdownFPM: 0, maxGForce: 1.0, fired: false };
    pushToast('info', 'Flight cancelled — ACARS reset');
  }, []);

  // Submit / end the active flight — call C# bridge
  const submitFlight = useCallback(() => {
    SimBridge.endFlight();
    pushToast('info', 'Submitting flight...');
  }, []);

  // Allow external QNH injection (e.g. from IVAO METAR)
  const setQnhOverride = useCallback((qnh: number) => {
    if (qnh > 0) qnhRef.current = qnh;
  }, []);

  // Direct bid injection (bypasses C# bridge for React-side API calls)
  const injectBid = useCallback((b: BidData | null) => {
    console.log('[useTelemetry] injectBid:', b?.callsign ?? 'null');
    setBid(b);
  }, []);

  // Programmatic log entry
  const addLogEntry = useCallback((message: string) => {
    const entry: UILogEntry = {
      id: ++logIdRef.current,
      kind: classifyLog(message),
      event: message,
      timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
    };
    setActivityLog(prev => [entry, ...prev].slice(0, 100));
  }, []);

  // ── QNH-Corrected Altitude ─────────────────────────────────────
  // Formula: Altitude_Indicated = Altitude_Pressure + ((QNH - 1013.25) * 27.3)
  const qnhAltitude = Math.round(
    telemetry.altitude + (qnhRef.current - 1013.25) * 27.3
  );

  return {
    telemetry,
    auth,
    connection,
    flight,
    score,
    weather,
    bid,
    touchdownPoint,
    activityLog,
    exceedanceLog,
    clearScore,
    clearLogs,
    injectBid,
    addLogEntry,
    qnhAltitude,
    discordVerified,
    setQnhOverride,
    updateStatus,
    cancelFlight,
    submitFlight,
  };
}
