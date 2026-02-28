import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Activity, CheckCircle, AlertCircle, RefreshCcw } from 'lucide-react';

interface DeployLog {
  _id: string;
  version: string;
  deployedAt: string;
  status: string;
  commitMessage: string;
  environment: string;
}

export const DeploymentHistory = () => {
  const [logs, setLogs] = useState<DeployLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [stableVersion, setStableVersion] = useState('');

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/deploy-logs');
      const data = await res.json();
      setLogs(data.logs || []);
      setStableVersion(data.stableVersion);
    } catch (err) {
      console.error('Failed to fetch deploy logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetStable = async (version: string) => {
    try {
      const res = await fetch('/api/admin/set-stable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version })
      });
      if (res.ok) {
        setStableVersion(version);
        alert(`Version ${version} is now marked as STABLE.`);
      }
    } catch (err) {
      console.error('Failed to set stable version:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="glass-card p-6 rounded-2xl border border-white/[0.08] backdrop-blur-md overflow-hidden bg-black/20">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold flex items-center gap-2 text-white">
          <Activity size={20} className="text-accent-gold" />
          System Deployment History
        </h3>
        <button 
          onClick={fetchLogs}
          disabled={loading}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white disabled:opacity-50"
        >
          <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>
      
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left text-sm">
          <thead className="text-gray-400 border-b border-white/[0.06] uppercase tracking-widest text-[10px]">
            <tr>
              <th className="pb-3 font-medium">Version</th>
              <th className="pb-3 font-medium">Changes / Commit</th>
              <th className="pb-3 font-medium">Timestamp</th>
              <th className="pb-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {logs.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="py-10 text-center text-gray-500 italic text-xs">
                  No deployment logs found in database.
                </td>
              </tr>
            )}
            {logs.map((log, index) => (
              <tr key={log._id} className="hover:bg-white/5 transition-colors group">
                <td className="py-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-mono font-bold ${
                      log.version === stableVersion 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-white/5 text-gray-400 border border-transparent'
                    }`}>
                      {log.version}
                    </span>
                    {log.version === stableVersion && (
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    )}
                  </div>
                </td>
                <td className="py-4 text-gray-300 max-w-xs truncate font-medium">
                  {log.commitMessage || 'Automated build'}
                </td>
                <td className="py-4 text-gray-500 font-mono text-[11px]">
                  {format(new Date(log.deployedAt), 'MMM dd, HH:mm:ss')}
                </td>
                <td className="py-4 text-right">
                  {log.version !== stableVersion ? (
                    <button 
                      onClick={() => handleSetStable(log.version)}
                      className="text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg bg-accent-gold/10 text-accent-gold border border-accent-gold/20 hover:bg-accent-gold hover:text-black transition-all opacity-0 group-hover:opacity-100"
                    >
                      Set Stable
                    </button>
                  ) : (
                    <div className="flex items-center justify-end gap-1.5 text-emerald-400/60 font-bold uppercase text-[10px] tracking-widest">
                      <CheckCircle size={10} />
                      Current Stable
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {loading && (
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
                <span className="text-[10px] text-accent-gold font-bold uppercase tracking-widest">Fetching Logs...</span>
            </div>
        </div>
      )}
    </div>
  );
};
