"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const BackgroundBeams = ({ className }: { className?: string }) => {
  return (
    <div
      className={cn(
        "absolute inset-0 z-0 h-full w-full bg-transparent overflow-hidden [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]",
        className
      )}
    >
      <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1000 1000"
          className="h-full w-full opacity-[0.4]"
          preserveAspectRatio="none"
        >
          <defs>
            <filter id="blur">
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>
          <g filter="url(#blur)">
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 1, 0.5, 1, 0] }}
              transition={{
                duration: 10,
                repeat: Infinity,
                ease: "linear",
                delay: 0,
              }}
              d="M0 500 Q 250 400 500 500 T 1000 500"
              fill="none"
              stroke="#d4af37"
              strokeWidth="2"
            />
            <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.8, 0.4, 0.8, 0] }}
              transition={{
                duration: 15,
                repeat: Infinity,
                ease: "linear",
                delay: 2,
              }}
              d="M0 200 Q 250 300 500 200 T 1000 200"
              fill="none"
              stroke="#cd7f32"
              strokeWidth="1.5"
            />
             <motion.path
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.6, 0.3, 0.6, 0] }}
              transition={{
                duration: 12,
                repeat: Infinity,
                ease: "linear",
                delay: 5,
              }}
              d="M0 800 Q 250 700 500 800 T 1000 800"
              fill="none"
              stroke="#d4af37"
              strokeWidth="1"
            />
          </g>
        </svg>
      </div>
    </div>
  );
};
