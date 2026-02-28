import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const NOTIFIED_KEY = 'LVT_V3_NOTIFIED';

export function UpdateSplash() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(NOTIFIED_KEY) === 'true') return;
    setIsVisible(true);
    const timer = setTimeout(() => {
      setIsVisible(false);
      localStorage.setItem(NOTIFIED_KEY, 'true');
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem(NOTIFIED_KEY, 'true');
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-10 right-10 z-[100] p-[1px] bg-gradient-to-r from-cyan-500 to-blue-600 rounded-2xl shadow-2xl"
        >
          <div className="bg-slate-950/90 backdrop-blur-xl rounded-2xl p-4 flex items-center gap-4 border border-white/10">
            <div className="pilot-badge-container !w-12 !h-12">
              <img src="img/icon.jpg" alt="Update" className="pilot-badge-img" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm font-display">Levant ACARS <span className="font-mono text-cyan-400">v3.0</span></h4>
              <p className="text-slate-400 text-xs mt-0.5">Asset Update Complete. Welcome, Captain.</p>
            </div>
            <button
              onClick={dismiss}
              className="ml-4 text-slate-500 hover:text-white transition-colors bg-transparent border-none cursor-pointer text-lg"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
