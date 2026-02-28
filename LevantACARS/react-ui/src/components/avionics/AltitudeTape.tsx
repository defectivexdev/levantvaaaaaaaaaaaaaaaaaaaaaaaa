import { motion } from 'motion/react';

interface Props {
  altitude: number;
  displayAltitude: string;
}

const TICK_HEIGHT = 32;
const VISIBLE_TICKS = 12;

export default function AltitudeTape({ altitude, displayAltitude }: Props) {
  const baseAlt = Math.floor(altitude / 100) * 100;
  const offset = ((altitude % 100) / 100) * TICK_HEIGHT;

  const ticks: number[] = [];
  const half = Math.floor(VISIBLE_TICKS / 2);
  for (let i = -half; i <= half; i++) {
    ticks.push(baseAlt + i * 100);
  }

  return (
    <div className="relative w-[120px] h-[320px] bg-zinc-900/80 border border-zinc-700 rounded-l-md overflow-hidden select-none">
      {/* Moving scale */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ y: offset }}
          transition={{ type: 'tween', duration: 0.1, ease: 'linear' }}
          className="absolute w-full"
          style={{ top: '50%', marginTop: -(VISIBLE_TICKS / 2) * TICK_HEIGHT }}
        >
          {ticks.map((val, i) => {
            const isMajor = val % 500 === 0;
            return (
              <div
                key={i}
                className="flex items-center justify-end pr-2"
                style={{ height: TICK_HEIGHT }}
              >
                <span
                  className={`text-right tabular-nums ${
                    isMajor
                      ? 'text-[11px] font-semibold text-zinc-300'
                      : 'text-[9px] text-zinc-600'
                  }`}
                >
                  {isMajor ? val.toLocaleString() : ''}
                </span>
                <div
                  className={`ml-1.5 bg-zinc-600 ${isMajor ? 'w-4 h-[1px]' : 'w-2 h-[1px]'}`}
                />
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Center readout box */}
      <div className="absolute top-1/2 -translate-y-1/2 left-[-2px] right-[-2px] h-14 bg-black border-2 border-cyan-400 z-10 flex items-center justify-center shadow-[0_0_20px_rgba(34,211,238,0.35)]">
        <span className="text-[26px] font-bold text-cyan-400 tabular-nums tracking-tight">
          {displayAltitude}
        </span>
        <span className="text-[9px] text-cyan-700 font-bold ml-1 self-end mb-2.5">FT</span>
      </div>

      {/* Gradient fades top/bottom */}
      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-zinc-900/90 to-transparent z-[5] pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-900/90 to-transparent z-[5] pointer-events-none" />
    </div>
  );
}
