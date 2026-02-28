import { useEffect, useRef } from 'react';
import { Minus, Square, X, ShieldCheck, Globe, CheckCircle } from 'lucide-react';
import { SimBridge, isWebView2 } from '../bridge';
import type { AuthState, ConnectionState } from '../types';

interface Props {
  auth: AuthState;
  connection: ConnectionState;
}

export default function LinkScreen({ auth, connection: _connection }: Props) {
  const loginTriggered = useRef(false);

  useEffect(() => {
    if (auth.deviceCode || auth.isLoggedIn || loginTriggered.current) return;
    const timer = setTimeout(() => {
      if (!loginTriggered.current && isWebView2()) {
        loginTriggered.current = true;
        SimBridge.login();
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [auth.deviceCode, auth.isLoggedIn]);

  const handleLogin = () => {
    if (!loginTriggered.current && isWebView2()) {
      loginTriggered.current = true;
      SimBridge.login();
    }
  };

  return (
    <div className="h-full w-full bg-dark-950 flex flex-col">
      {/* ── Title Bar ─────────────────────────────────────── */}
      <div
        className="h-11 flex items-center justify-between px-5 shrink-0 relative z-50 cursor-default"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <div className="pilot-badge-container !w-7 !h-7">
            <img src="img/icon.jpg" alt="Levant" className="pilot-badge-img" />
          </div>
          <span className="text-sm font-bold tracking-widest">LEVANT<span className="text-accent-gold ml-1">ACARS</span></span>
          <span className="text-xs text-white/30 font-mono">v3.0</span>
        </div>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          <button onClick={() => SimBridge.minimizeWindow()} className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-all bg-transparent border-none cursor-pointer"><Minus className="w-3.5 h-3.5" strokeWidth={2} /></button>
          <button onClick={() => SimBridge.maximizeWindow()} className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-all bg-transparent border-none cursor-pointer"><Square className="w-3 h-3" strokeWidth={2} /></button>
          <button onClick={() => SimBridge.closeWindow()} className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-red-500/80 transition-all bg-transparent border-none cursor-pointer"><X className="w-3.5 h-3.5" strokeWidth={2} /></button>
        </div>
      </div>

      {/* ── Content ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8">
        {/* Logo + Branding */}
        <div className="flex flex-col items-center gap-5">
          <div className="pilot-badge-container !w-24 !h-24 !border-2">
            <img src="img/icon.jpg" alt="Levant Virtual Airlines" className="pilot-badge-img" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-display font-bold tracking-[0.25em] uppercase text-white">Levant Virtual</h1>
            <div className="flex items-center justify-center gap-3 mt-2">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-accent-gold/40" />
              <span className="text-xs font-mono text-accent-gold/60 tracking-[0.4em] uppercase font-bold">Flight Deck Ops</span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-accent-gold/40" />
            </div>
          </div>
        </div>

        {/* Auth Card */}
        <div className="glass-frosted rounded-2xl p-8 w-[380px] flex flex-col items-center gap-5">
          {/* Shield Icon */}
          <div className="p-3 rounded-xl bg-accent-gold/10 border border-accent-gold/20">
            <ShieldCheck size={24} className="text-accent-gold" />
          </div>

          <div className="text-center">
            <h2 className="text-sm font-bold text-white">Secure Web Authorization</h2>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
              Sign in through the Levant Crew Center. No password<br />stored locally.
            </p>
          </div>

          {/* SSO / Zero-Password / Device Code badges */}
          <div className="flex items-center gap-4">
            <Badge label="SSO" />
            <Badge label="Zero-Password" />
            <Badge label="Device Code" />
          </div>

          {/* Login Button or Device Code */}
          {auth.deviceCode ? (
            <div className="flex flex-col items-center gap-3 w-full">
              <div className="w-full py-3 rounded-xl bg-dark-800 border border-white/5 flex items-center justify-center">
                <span className="font-mono text-xl font-bold tracking-[6px] text-accent-gold char-stagger">
                  {auth.deviceCode.split('').map((c, i) => <span key={i}>{c}</span>)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-gold status-breathe text-accent-gold" />
                Waiting for authorization...
              </div>
            </div>
          ) : (
            <button
              onClick={handleLogin}
              className="w-full py-3.5 rounded-xl font-bold text-sm tracking-wider uppercase flex items-center justify-center gap-2.5 cursor-pointer border-none transition-all duration-300 hover:brightness-110 hover:shadow-lg hover:shadow-accent-gold/20"
              style={{ background: 'linear-gradient(135deg, #d4af37 0%, #cd7f32 100%)' }}
            >
              <Globe size={16} className="text-dark-950" />
              <span className="text-dark-950">Login via Levant</span>
            </button>
          )}

          <p className="text-xs text-gray-600 text-center leading-relaxed">
            A unique code will be generated for you to authorize<br />this device through the Levant Crew Center.
          </p>
        </div>
      </div>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-accent-emerald font-mono font-bold tracking-wider uppercase">
      <CheckCircle size={10} className="text-accent-emerald" />
      {label}
    </div>
  );
}
