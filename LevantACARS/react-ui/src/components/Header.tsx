import { LogOut } from 'lucide-react';
import { SimBridge } from '../bridge';
import type { AuthState, ConnectionState } from '../types';

interface Props {
  auth: AuthState;
  connection: ConnectionState;
}

export default function Header({ auth, connection }: Props) {
  const initial = auth.pilotName ? auth.pilotName[0].toUpperCase() : '?';

  return (
    <header className="flex items-center gap-2.5 px-4 h-12 bg-surface-dark border-b border-border-subtle z-10">
      {/* Logo only — no text */}
      <div className="pr-2">
        <div className="pilot-badge-container !w-[26px] !h-[26px]"><img src="img/icon.jpg" alt="Levant VA" className="pilot-badge-img" /></div>
      </div>

      {/* Rank badge */}
      <div className="inline-flex items-center gap-[5px] px-2.5 py-[5px] bg-surface-card rounded-lg text-[10px] font-semibold text-gold">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
        </svg>
        {auth.pilotRank}
      </div>

      {/* Hours badge */}
      <div className="inline-flex items-center gap-[5px] px-2.5 py-[5px] bg-surface-card rounded-lg text-[10px] font-semibold text-txt-secondary">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round"/>
        </svg>
        {auth.pilotHours.toFixed(1)}h
      </div>

      <div className="flex-1" />

      {/* SIM / API pills */}
      <div className="flex gap-1">
        <StatusPill label="SIM" connected={connection.simConnected} />
        <StatusPill label="API" connected={connection.apiConnected} />
      </div>

      {/* Pilot info */}
      <div className="flex items-center gap-2 pl-1">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-[11px] font-bold text-white shrink-0">
          {initial}
        </div>
        <div>
          <div className="text-[11px] font-semibold text-txt-primary">{auth.pilotName}</div>
          <div className="text-[9px] font-semibold text-txt-disabled">{auth.pilotId}</div>
        </div>
      </div>

      {/* Logout */}
      <button
        onClick={() => SimBridge.logout()}
        className="inline-flex items-center gap-1 px-2 py-[5px] bg-transparent border-none text-txt-disabled text-[10px] font-semibold rounded-sm cursor-pointer hover:text-danger hover:bg-danger/10 transition-colors"
        title="Sign Out"
      >
        <LogOut size={14} strokeWidth={1.5} />
      </button>
    </header>
  );
}

function StatusPill({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="inline-flex items-center gap-[5px] px-[9px] py-[5px] bg-surface-card rounded-lg text-[9px] font-bold tracking-wide">
      <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${
        connected ? 'bg-success shadow-[0_0_6px_#00D26A]' : 'bg-danger'
      }`} />
      <span style={{ color: connected ? '#00D26A' : '#FF4757' }}>{label}</span>
    </div>
  );
}
