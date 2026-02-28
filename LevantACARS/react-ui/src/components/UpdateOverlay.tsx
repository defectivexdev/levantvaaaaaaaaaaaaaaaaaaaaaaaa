import { motion, AnimatePresence } from 'motion/react';
import { Download, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

interface UpdateStatus {
  status: string;
  message: string;
  version?: string;
  progress?: number;
}

interface Props {
  updateStatus: UpdateStatus | null;
}

export default function UpdateOverlay({ updateStatus }: Props) {
  if (!updateStatus) return null;

  const { status, message, version, progress } = updateStatus;

  const icon = status === 'checking' ? <Loader2 size={18} className="animate-spin text-cyan-400" />
    : status === 'downloading' ? <Download size={18} className="text-accent-gold" />
    : status === 'installing' ? <RefreshCw size={18} className="animate-spin text-emerald-400" />
    : status === 'upToDate' ? <CheckCircle2 size={18} className="text-emerald-400" />
    : <AlertCircle size={18} className="text-rose-400" />;

  const borderColor = status === 'error' ? 'from-rose-500 to-rose-600'
    : status === 'upToDate' ? 'from-emerald-500 to-cyan-500'
    : 'from-accent-gold to-cyan-500';

  return (
    <AnimatePresence>
      <motion.div
        key="update-overlay"
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] w-[380px]"
      >
        <div className={`p-[1px] bg-gradient-to-r ${borderColor} rounded-2xl shadow-2xl`}>
          <div className="bg-slate-950/95 backdrop-blur-xl rounded-2xl p-4 flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-center gap-3">
              {icon}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-white uppercase tracking-[0.15em] font-mono">
                  {status === 'checking' ? 'Checking for Updates'
                    : status === 'downloading' ? `Downloading ${version || 'Update'}`
                    : status === 'installing' ? `Installing ${version || 'Update'}`
                    : status === 'upToDate' ? 'Up to Date'
                    : 'Update Error'}
                </h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{message}</p>
              </div>
            </div>

            {/* Progress bar — only show during download/install */}
            {(status === 'downloading' || status === 'installing') && (
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: status === 'installing'
                      ? 'linear-gradient(90deg, #2DCE89, #22D3EE)'
                      : 'linear-gradient(90deg, #C5A059, #22D3EE)',
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${progress ?? 0}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
            )}

            {/* Progress text */}
            {status === 'downloading' && typeof progress === 'number' && (
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Progress</span>
                <span className="text-xs font-bold font-mono text-accent-gold">{progress}%</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
