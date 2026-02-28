import { useState, useEffect } from 'react';
import { Minus, Square, X, LayoutDashboard, Globe, MessageCircle, MessageSquare, LogOut, Radio, RefreshCw } from 'lucide-react';
import { useTelemetry } from './hooks/useTelemetry';
import { SimBridge } from './bridge';
import LinkScreen from './components/LinkScreen';
import FlightLogs from './components/FlightLogs';
import FlightHistoryPanel from './components/FlightHistoryPanel';
import FlightPlan from './components/FlightPlan';
import LandingSummary from './components/LandingSummary';
import LiveMap from './components/LiveMap';
import ChatPanel from './components/ChatPanel';
import ToastOverlay from './components/ToastOverlay';
import { UpdateSplash } from './components/UpdateSplash';
import UpdateOverlay from './components/UpdateOverlay';
import WeatherTile from './components/WeatherTile';
import { BackgroundBeams } from './components/ui/background-beams';
import { AnimatedTooltip } from './components/ui/animated-tooltip';
import type { TelemetryData, FlightState, ScoreResult, UILogEntry, ConnectionState, AuthState } from './types';
import { fetchPilotStats, type PilotStats } from './api';

export type View = 'dashboard' | 'livemap' | 'chat' | 'logs';

export default function App() {
  const {
    telemetry,
    auth,
    connection,
    flight,
    score,
    bid,
    activityLog,
    exceedanceLog,
    injectBid,
    addLogEntry,
    qnhAltitude,
    discordVerified,
    setQnhOverride,
    updateStatus,
    touchdownPoint,
    cancelFlight,
    submitFlight,
  } = useTelemetry();

  (window as any).__LVT_WEIGHT_UNIT__ = auth.weightUnit || 'lbs';

  const [activeView, setActiveView] = useState<View>('dashboard');

  if (!auth.isLoggedIn) {
    return <LinkScreen auth={auth} connection={connection} />;
  }

  return (
    <BackgroundBeams className="h-screen w-screen bg-[#111827] flex flex-col overflow-hidden font-sans text-white">
      <ToastOverlay />
      <UpdateSplash />
      <UpdateOverlay updateStatus={updateStatus} />
      {/* ── Title Bar (Glassmorphism + Gold border) ─────── */}
      <div
        className="h-[35px] flex items-center justify-between px-4 shrink-0 relative z-50 border-b border-[rgba(197,160,89,0.3)] titlebar-drag"
        style={{ background: 'rgba(10, 25, 47, 0.9)', backdropFilter: 'blur(10px)', WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="pilot-badge-container !w-6 !h-6">
            <img src="img/icon.jpg" alt="Levant" className="pilot-badge-img" />
          </div>
          <span className="text-xs font-bold tracking-[0.2em] text-[#CCD6F6]">LEVANT<span className="text-accent-gold ml-1">ACARS</span></span>
          <span className="text-[10px] text-[#333d55] font-mono">v3.0</span>
        </div>
        <div className="flex items-center gap-0.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button onClick={() => SimBridge.minimizeWindow()} className="p-1.5 rounded text-[#555] hover:text-white hover:bg-white/10 transition-all bg-transparent border-none cursor-pointer"><Minus className="w-3 h-3" strokeWidth={2} /></button>
          <button onClick={() => SimBridge.maximizeWindow()} className="p-1.5 rounded text-[#555] hover:text-white hover:bg-white/10 transition-all bg-transparent border-none cursor-pointer"><Square className="w-2.5 h-2.5" strokeWidth={2} /></button>
          <button onClick={() => SimBridge.closeWindow()} className="p-1.5 rounded text-[#555] hover:text-white hover:bg-red-500/80 transition-all bg-transparent border-none cursor-pointer"><X className="w-3 h-3" strokeWidth={2} /></button>
        </div>
      </div>

      {/* ── Main Layout ──────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden p-3 pb-0 gap-3">
        {/* ── Sidebar (Levant Navy) ───────────────────── */}
        <div className="w-[170px] flex flex-col rounded-xl relative shrink-0 transition-all sidebar-glow" style={{ background: 'rgba(10, 25, 47, 0.95)' }}>
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent-gold/20 to-transparent" />
          <nav className="flex-1 flex flex-col gap-0.5 w-full px-2.5 py-3">
            <SideNavItem active={activeView === 'dashboard'} onClick={() => setActiveView('dashboard')} icon={<LayoutDashboard size={16} />} label="Dashboard" />
            <SideNavItem active={activeView === 'livemap'} onClick={() => setActiveView('livemap')} icon={<Globe size={16} />} label="Live Map" />
            <SideNavItem active={activeView === 'chat'} onClick={() => setActiveView('chat')} icon={<MessageCircle size={16} />} label="Pilot Chat" />
            <div className="h-px bg-gradient-to-r from-transparent via-[#1d3461] to-transparent mx-2 my-2" />
            <SideNavItem active={activeView === 'logs'} onClick={() => setActiveView('logs')} icon={<MessageSquare size={16} />} label="Flight Logs" />
          </nav>
          <div className="border-t border-[#1d3461] flex flex-col gap-0.5 px-2.5 py-2">
            <button onClick={() => SimBridge.checkForUpdate()} className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[#8892b0] hover:text-cyan-400 hover:bg-cyan-500/[0.06] transition-all bg-transparent border-none cursor-pointer text-[10px] font-mono tracking-wider">
              <RefreshCw size={12} />
              Check for Update
            </button>
            <button onClick={() => SimBridge.logout()} className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-[#555] hover:text-rose-400 hover:bg-rose-500/[0.06] transition-all bg-transparent border-none cursor-pointer text-xs font-mono tracking-wider">
              <LogOut size={13} />
              Sign Out
            </button>
          </div>
          <div className="px-2.5 pb-2 text-[9px] font-mono text-[#333d55] tracking-wider select-none">Levant VA · v3.0</div>
        </div>

        {/* ── Content Area ─────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 bg-dark-900 rounded-xl relative overflow-hidden" style={{ background: '#0d1f38' }}>
          {/* Header */}
          <header className="h-12 flex justify-between items-center px-5 border-b border-white/[0.03] shrink-0">
            <h2 className="text-sm font-bold tracking-tight flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-accent-gold/10 border border-accent-gold/20">
                {activeView === 'dashboard' && <LayoutDashboard size={13} className="text-accent-gold" />}
                {activeView === 'livemap' && <Globe size={13} className="text-accent-gold" />}
                {activeView === 'chat' && <MessageCircle size={13} className="text-accent-gold" />}
                {activeView === 'logs' && <MessageSquare size={13} className="text-accent-gold" />}
              </div>
              <span className="uppercase tracking-wider text-[12px]">
                {activeView === 'dashboard' && 'Flight Logbook'}
                {activeView === 'livemap' && 'Live Map'}
                {activeView === 'chat' && 'Pilot Chat'}
                {activeView === 'logs' && 'Flight Logs'}
              </span>
            </h2>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-[0.15em] border ${
                connection.simConnected && connection.apiConnected && discordVerified
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : connection.simConnected
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                <Radio size={10} />
                <div className={`h-1.5 w-1.5 rounded-full ${connection.simConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {connection.simConnected && connection.apiConnected ? 'ONLINE' : connection.simConnected ? 'SIM ONLY' : 'OFFLINE'}
              </div>
              <div className="text-right">
                <p className="text-xs font-bold leading-none">{auth.pilotName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-accent-gold font-mono bg-accent-gold/5 px-1.5 py-0.5 rounded border border-accent-gold/10 font-bold tracking-widest uppercase">{auth.pilotId}</span>
                  <span className="text-xs text-gray-400 font-mono tracking-widest uppercase">{auth.pilotRank}</span>
                </div>
              </div>
              <AnimatedTooltip items={[{ id: 1, name: auth.pilotName || 'Pilot', designation: `${auth.pilotRank || 'Cadet'} | ${auth.pilotId || '—'}`, image: auth.pilotAvatar || 'img/icon.jpg' }]} />
            </div>
          </header>

          {/* View */}
          <main className="flex-1 overflow-y-auto p-4">
            {activeView === 'dashboard' && (
              <DashboardView telemetry={telemetry} flight={flight} score={score} activityLog={activityLog} exceedanceLog={exceedanceLog} connection={connection} auth={auth} bid={bid} injectBid={injectBid} addLogEntry={addLogEntry} setQnhOverride={setQnhOverride} cancelFlight={cancelFlight} submitFlight={submitFlight} />
            )}
            {activeView === 'livemap' && <LiveMap telemetry={telemetry} touchdownPoint={touchdownPoint} />}
            {activeView === 'chat' && <ChatPanel pilotId={auth.pilotId} pilotName={auth.pilotName} />}
            {activeView === 'logs' && <FlightHistoryPanel pilotId={auth.pilotId} />}
          </main>
        </div>
      </div>

      {/* ── Live Telemetry Footer Bar ─────────────────────── */}
      <TelemetryFooter telemetry={telemetry} flight={flight} connection={connection} qnhAltitude={qnhAltitude} />
    </BackgroundBeams>
  );
}

// ── Live Telemetry Footer ─────────────────────────────────────────

function TelemetryFooter({ telemetry, flight, connection, qnhAltitude }: { telemetry: TelemetryData; flight: FlightState; connection: ConnectionState; qnhAltitude: number }) {
  const alt = qnhAltitude ?? Math.round(telemetry.altitude);
  const phaseColor = flight.currentPhase === 'Cruise' ? 'pill-info'
    : flight.currentPhase === 'Climbing' || flight.currentPhase === 'Takeoff' ? 'pill-active'
    : flight.currentPhase === 'Descending' || flight.currentPhase === 'Approach' ? 'pill-warning'
    : flight.currentPhase === 'Landed' ? 'pill-active'
    : 'pill-neutral';

  return (
    <div className="telemetry-bar shrink-0 h-10 flex items-center justify-between px-5 gap-6 mx-3 mb-2 rounded-lg flight-bar-glow">
      {/* Connection status */}
      <div className="flex items-center gap-2">
        <div className={`h-1.5 w-1.5 rounded-full ${connection.simConnected ? 'bg-[#2DCE89] status-breathe text-[#2DCE89]' : 'bg-red-500 status-breathe text-red-500'}`} />
        <span className="telemetry-bar-label">{connection.simConnected ? 'FSUIPC' : 'NO SIM'}</span>
      </div>

      {/* Telemetry readouts */}
      <div className="flex items-center gap-5 flex-1 justify-center">
        <div className="telemetry-bar-item">
          <span className="telemetry-bar-label">IAS</span>
          <span className="telemetry-bar-value" style={{ color: '#22D3EE' }}>{telemetry.ias}<span className="text-[8px] text-[#333d55] ml-0.5">KT</span></span>
        </div>
        <div className="telemetry-bar-item">
          <span className="telemetry-bar-label">ALT</span>
          <span className="telemetry-bar-value" style={{ color: '#22D3EE' }}>{alt.toLocaleString()}<span className="text-[8px] text-[#333d55] ml-0.5">FT</span></span>
        </div>
        <div className="telemetry-bar-item">
          <span className="telemetry-bar-label">VS</span>
          <span className="telemetry-bar-value" style={{ color: telemetry.verticalSpeed < -500 ? '#FFB000' : '#2DCE89' }}>
            {telemetry.verticalSpeed > 0 ? '+' : ''}{Math.round(telemetry.verticalSpeed)}<span className="text-[8px] text-[#333d55] ml-0.5">FPM</span>
          </span>
        </div>
        <div className="telemetry-bar-item">
          <span className="telemetry-bar-label">HDG</span>
          <span className="telemetry-bar-value">{String(Math.round(telemetry.heading)).padStart(3, '0')}°</span>
        </div>
        <div className="telemetry-bar-item">
          <span className="telemetry-bar-label">GS</span>
          <span className="telemetry-bar-value">{telemetry.groundSpeed}<span className="text-[8px] text-[#333d55] ml-0.5">KT</span></span>
        </div>
        <div className="telemetry-bar-item">
          <span className="telemetry-bar-label">G</span>
          <span className="telemetry-bar-value" style={{ color: telemetry.gForce > 1.5 ? '#ef4444' : telemetry.gForce > 1.2 ? '#FFB000' : '#2DCE89' }}>
            {telemetry.gForce.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Phase pill */}
      <div className="flex items-center gap-2">
        {flight.isActive && flight.currentPhase && (
          <span className={`status-pill ${phaseColor}`}>
            <span className="h-1 w-1 rounded-full bg-current animate-pulse" />
            {flight.currentPhase}
          </span>
        )}
        {flight.isActive && flight.flightTime && (
          <span className="telemetry-bar-label" style={{ color: '#C5A059' }}>{flight.flightTime}</span>
        )}
      </div>
    </div>
  );
}

// ── Sidebar Nav Item ─────────────────────────────────────────────────

function SideNavItem({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`w-full h-9 rounded-lg flex items-center gap-3 px-3 transition-all relative bg-transparent border-none cursor-pointer text-xs font-medium tracking-wider ${
        active
          ? 'text-accent-gold'
          : 'text-[#8892b0] hover:text-[#CCD6F6] hover:bg-[rgba(197,160,89,0.06)]'
      }`}
    >
      {active && <div className="absolute inset-0 bg-accent-gold/[0.06] border border-accent-gold/15 rounded-lg" />}
      {active && <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] bg-accent-gold rounded-r-full" />}
      <span className={`relative z-10 transition-all ${active ? 'drop-shadow-[0_0_6px_rgba(197,160,89,0.4)]' : ''}`}>{icon}</span>
      <span className="relative z-10 uppercase">{label}</span>
    </button>
  );
}

// ── Dashboard View ───────────────────────────────────────────────

function DashboardView({
  telemetry, flight, score, activityLog, exceedanceLog, connection, auth, bid, injectBid, addLogEntry, setQnhOverride, cancelFlight, submitFlight,
}: {
  telemetry: TelemetryData;
  flight: FlightState;
  score: ScoreResult | null;
  activityLog: UILogEntry[];
  exceedanceLog: UILogEntry[];
  connection: ConnectionState;
  auth: AuthState;
  bid: import('./types').BidData | null;
  injectBid: (b: import('./types').BidData | null) => void;
  addLogEntry: (message: string) => void;
  setQnhOverride: (qnh: number) => void;
  cancelFlight: () => void;
  submitFlight: () => void;
}) {
  // Resolve arrival ICAO from active flight or loaded bid
  const arrivalIcao = flight.arrivalIcao || bid?.arrivalIcao || '';
  const [stats, setStats] = useState<PilotStats | null>(null);

  useEffect(() => {
    if (!auth.pilotId) return;
    fetchPilotStats(auth.pilotId).then(setStats);
    const iv = setInterval(() => fetchPilotStats(auth.pilotId).then(setStats), 60000);
    return () => clearInterval(iv);
  }, [auth.pilotId]);

  const departureIcao = flight.departureIcao || bid?.departureIcao || '';

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* FSUIPC Connection Warning */}
      {!connection.simConnected && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 border border-rose-500/20">
          <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
          <span className="text-xs font-bold text-rose-400 uppercase tracking-[0.15em]">FSUIPC &mdash; Not Detected</span>
        </div>
      )}

      {/* Hero Flight Card */}
      <FlightPlan flight={flight} telemetry={telemetry} bid={bid} pilotId={auth.pilotId} injectBid={injectBid} addLogEntry={addLogEntry} cancelFlight={cancelFlight} submitFlight={submitFlight} />

      {/* Pilot Stats Row (below flight card) */}
      {stats && (
        <div className="grid grid-cols-4 gap-2">
          <StatCard label="Total Hours" value={stats.pilot.totalHours.toFixed(1)} color="text-accent-gold" />
          <StatCard label="Total Flights" value={String(stats.pilot.totalFlights)} color="text-accent-emerald" />
          <StatCard label="XP" value={stats.pilot.xp.toLocaleString()} color="text-accent-cyan" />
          <StatCard label="Rank" value={stats.pilot.rank} color="text-purple-400" small />
        </div>
      )}

      {/* Departure & Arrival METAR */}
      <div className="grid grid-cols-2 gap-3">
        <WeatherTile icao={departureIcao} label="Departure METAR" />
        <WeatherTile icao={arrivalIcao} label="Arrival METAR" onQnhUpdate={setQnhOverride} />
      </div>

      {/* Landing Summary (after flight) */}
      {score && <LandingSummary score={score} flight={flight} />}

      {/* Recent Flights */}
      {stats && stats.recentFlights.length > 0 && (
        <div className="glass-card rounded-xl border border-white/5 p-4">
          <div className="text-xs font-bold text-accent-gold/60 uppercase tracking-[0.2em] mb-3">Recent Flights</div>
          <div className="space-y-1">
            {stats.recentFlights.slice(0, 5).map((f, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-dark-950/40 border border-white/[0.03]">
                <span className="text-xs font-bold text-white w-16 truncate">{f.callsign}</span>
                <span className="text-xs font-mono text-accent-gold/70">{f.departureIcao}</span>
                <span className="text-xs text-gray-700">→</span>
                <span className="text-xs font-mono text-white/50">{f.arrivalIcao}</span>
                <span className="text-xs text-gray-600 ml-auto">{f.aircraftType}</span>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${f.landingGrade === 'Butter' ? 'bg-accent-gold/10 text-accent-gold' : f.landingGrade === 'Smooth' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-gray-400'}`}>
                  {f.landingGrade || '—'}
                </span>
                <span className="text-xs font-mono text-gray-500 w-8 text-right">{f.score}%</span>
                <span className={`text-xs font-bold uppercase tracking-wider px-1 py-0.5 rounded ${f.status === 'Approved' ? 'text-emerald-400' : f.status === 'Rejected' ? 'text-rose-400' : 'text-amber-400'}`}>
                  {f.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Log — flex-1 takes all remaining vertical space */}
      <div className="flex-1 min-h-[160px] rounded-xl bg-dark-900/40 backdrop-blur-md border border-white/[0.04] overflow-hidden">
        <FlightLogs activityLog={activityLog} exceedanceLog={exceedanceLog} />
      </div>
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────

function StatCard({ label, value, color, small }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div className="rounded-xl p-3 border border-[var(--acars-border)] bg-[var(--acars-screen)] crt-glow card-hover-glow flex flex-col items-center justify-center gap-1">
      <span className={`${small ? 'text-sm' : 'text-lg'} font-bold font-mono ${color}`} style={{ textShadow: '0 0 8px currentColor' }}>{value}</span>
      <span className="text-[9px] font-mono text-[#555] uppercase tracking-[0.2em]">{label}</span>
    </div>
  );
}
