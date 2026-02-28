import { motion } from 'motion/react';
import { Wifi, Clock, Signal, Plane } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { AuthState, ConnectionState } from '../types';
import { SimBridge } from '../bridge';

interface Props {
  auth: AuthState;
  connection: ConnectionState;
}

export default function StatusBar({ auth, connection }: Props) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toUTCString().split(' ')[4];
  };

  const simOk = connection.simConnected;
  const apiOk = connection.apiConnected;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 backdrop-blur-sm border-b border-cyan-500/40 shadow-lg shadow-cyan-500/10"
    >
      <div className="px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            {/* Logo + Branding */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-4 py-2 rounded-lg border border-cyan-500/30">
              <div className="relative">
                <Plane className="w-7 h-7 text-cyan-400" />
                {simOk && (
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse" />
                )}
              </div>
              <div>
                <div className="text-cyan-400 tracking-wide text-base font-semibold">Levant Airlines</div>
                <div className="text-slate-400 text-[10px] uppercase tracking-wider">ACARS System</div>
              </div>
            </div>

            {/* SIM Connection */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
              simOk
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${simOk ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className={`text-sm ${simOk ? 'text-green-400' : 'text-red-400'}`}>
                {simOk ? 'SIM CONNECTED' : 'SIM OFFLINE'}
              </span>
            </div>

            {/* API Connection */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${
              apiOk
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className={`w-2 h-2 rounded-full ${apiOk ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              <span className={`text-sm ${apiOk ? 'text-green-400' : 'text-red-400'}`}>
                {apiOk ? 'API LINKED' : 'API OFFLINE'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <Signal className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-300 text-sm">{apiOk ? 'STRONG' : 'NONE'}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
              <Wifi className="w-4 h-4 text-cyan-400" />
              <span className="text-slate-300 text-sm">DATALINK</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-lg border border-cyan-500/30">
              <Clock className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-cyan-400">{formatTime(currentTime)} UTC</span>
            </div>

            {/* Pilot info */}
            {auth.isLoggedIn && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                  {auth.pilotName ? auth.pilotName[0].toUpperCase() : '?'}
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-white">{auth.pilotName}</div>
                  <div className="text-[9px] text-slate-400">{auth.pilotRank}</div>
                </div>
                <button
                  onClick={() => SimBridge.logout()}
                  className="ml-2 px-2 py-1 text-[10px] text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors border-none bg-transparent cursor-pointer"
                  title="Sign Out"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
