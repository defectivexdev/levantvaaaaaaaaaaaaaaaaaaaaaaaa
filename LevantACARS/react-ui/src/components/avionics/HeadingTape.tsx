import { motion } from 'motion/react';

interface Props {
  heading: number; // 0-359
}

const DEG_PER_TICK = 5;
const PX_PER_DEG = 4;
const TOTAL_TICKS = 360 / DEG_PER_TICK; // 72
const TAPE_WIDTH = TOTAL_TICKS * DEG_PER_TICK * PX_PER_DEG; // 1440px

const CARDINAL: Record<number, string> = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };
const ORDINAL: Record<number, string> = { 45: 'NE', 135: 'SE', 225: 'SW', 315: 'NW' };

function buildTicks() {
  const ticks = [];
  for (let i = 0; i < TOTAL_TICKS; i++) {
    const deg = i * DEG_PER_TICK;
    const isMajor = deg % 30 === 0;
    const label = CARDINAL[deg] || ORDINAL[deg] || (deg % 10 === 0 ? String(deg) : '');
    ticks.push({ deg, isMajor, label });
  }
  return ticks;
}
const TICKS = buildTicks();

export default function HeadingTape({ heading }: Props) {
  // Normalize heading to [0, 360)
  const hdg = ((heading % 360) + 360) % 360;

  // We render 3 copies of the tape for seamless wrapping at 0°/360°
  const translateX = -(hdg * PX_PER_DEG) - TAPE_WIDTH;

  return (
    <div className="relative w-full h-[56px] bg-zinc-900/90 border border-zinc-700 rounded-md overflow-hidden select-none">
      {/* Center lubber line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[2px] h-3 bg-orange-500 z-20" />

      {/* Scrolling tape */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{ x: translateX }}
          transition={{ type: 'tween', duration: 0.1, ease: 'linear' }}
          className="flex items-end h-full"
          style={{ paddingLeft: '50%', width: TAPE_WIDTH * 3 }}
        >
          {[0, 1, 2].map((copy) =>
            TICKS.map((t, i) => (
              <div
                key={`${copy}-${i}`}
                className="flex-shrink-0 flex flex-col items-center"
                style={{ width: DEG_PER_TICK * PX_PER_DEG }}
              >
                <span
                  className={`text-[9px] mb-0.5 tabular-nums ${
                    CARDINAL[t.deg]
                      ? 'text-white font-bold'
                      : t.isMajor
                      ? 'text-zinc-400 font-semibold'
                      : 'text-zinc-700'
                  }`}
                >
                  {t.label}
                </span>
                <div
                  className={`w-[1px] ${
                    t.isMajor ? 'h-3 bg-zinc-500' : 'h-1.5 bg-zinc-700'
                  }`}
                />
              </div>
            ))
          )}
        </motion.div>
      </div>

      {/* Digital heading readout */}
      <div className="absolute inset-x-0 bottom-1 flex justify-center z-10">
        <span className="bg-black/80 px-2.5 py-0.5 border border-zinc-700 rounded text-[11px] font-bold text-cyan-400 tabular-nums">
          {Math.round(hdg).toString().padStart(3, '0')}°
        </span>
      </div>
    </div>
  );
}
