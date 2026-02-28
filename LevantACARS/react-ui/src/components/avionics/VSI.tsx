import { motion } from 'motion/react';

interface Props {
  verticalSpeed: number; // ft/min
}

const SCALE_MAX = 2000; // ±2000 fpm full deflection
const TRACK_HEIGHT = 280; // pixels for the full scale

export default function VSI({ verticalSpeed }: Props) {
  const clamped = Math.max(-SCALE_MAX, Math.min(SCALE_MAX, verticalSpeed));
  // Needle offset: positive VS moves needle UP (negative y)
  const needleY = -(clamped / SCALE_MAX) * (TRACK_HEIGHT / 2);
  const isClimb = verticalSpeed >= 0;

  return (
    <div className="relative w-[52px] h-[320px] bg-zinc-900/40 border border-zinc-700 rounded-r-md overflow-hidden select-none">
      {/* Scale labels */}
      <div className="absolute inset-0 flex flex-col justify-between py-3 items-center pointer-events-none">
        <span className="text-[8px] text-zinc-500 font-bold">+2k</span>
        <span className="text-[8px] text-zinc-500 font-bold">+1k</span>
        <span className="text-[8px] text-zinc-400 font-bold">0</span>
        <span className="text-[8px] text-zinc-500 font-bold">-1k</span>
        <span className="text-[8px] text-zinc-500 font-bold">-2k</span>
      </div>

      {/* Center zero line */}
      <div className="absolute top-1/2 left-0 w-full h-[1px] bg-zinc-700" />

      {/* Tick marks */}
      {[-2000, -1500, -1000, -500, 0, 500, 1000, 1500, 2000].map((val) => {
        const y = 50 - (val / SCALE_MAX) * 50; // percentage from top
        const isMajor = val % 1000 === 0;
        return (
          <div
            key={val}
            className={`absolute right-0 bg-zinc-600 ${isMajor ? 'w-3 h-[1px]' : 'w-1.5 h-[1px]'}`}
            style={{ top: `${y}%` }}
          />
        );
      })}

      {/* Animated needle */}
      <motion.div
        animate={{ y: needleY }}
        transition={{ type: 'tween', duration: 0.15, ease: 'easeOut' }}
        className="absolute top-1/2 left-1 right-1"
      >
        <div
          className={`h-[2px] rounded-full shadow-[0_0_8px] ${
            isClimb
              ? 'bg-green-400 shadow-green-400/50'
              : 'bg-red-400 shadow-red-400/50'
          }`}
        />
      </motion.div>

      {/* Digital readout at bottom */}
      <div className="absolute bottom-1.5 inset-x-0 flex justify-center">
        <span
          className={`text-[9px] font-bold tabular-nums ${
            isClimb ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {verticalSpeed > 0 ? '+' : ''}
          {verticalSpeed}
        </span>
      </div>
    </div>
  );
}
