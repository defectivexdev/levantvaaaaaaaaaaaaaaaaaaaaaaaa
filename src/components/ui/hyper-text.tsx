"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, Variants } from "motion/react";

import { cn } from "@/lib/utils";

interface HyperTextProps {
  children: string;
  duration?: number;
  framerProps?: Variants;
  className?: string;
  animateOnHover?: boolean;
}

const alphabets = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const getRandomInt = (max: number) => Math.floor(Math.random() * max);

export function HyperText({
  children,
  duration = 800,
  framerProps = {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 3 },
  },
  className,
  animateOnHover = true,
}: HyperTextProps) {
  const [displayText, setDisplayText] = useState(children.split(""));
  const [isAnimating, setIsAnimating] = useState(false);
  const iterations = useRef(0);

  const triggerAnimation = () => {
    iterations.current = 0;
    setIsAnimating(true);
  };

  useEffect(() => {
    const interval = setInterval(
      () => {
        if (!isAnimating) {
          clearInterval(interval);
          return;
        }
        if (iterations.current < children.length) {
          setDisplayText((t) =>
            t.map((l, i) =>
              i <= iterations.current
                ? children[i]
                : alphabets[getRandomInt(26)]
            )
          );
          iterations.current = iterations.current + 0.1;
        } else {
          setIsAnimating(false);
          clearInterval(interval);
        }
      },
      duration / (children.length * 10)
    );
    return () => clearInterval(interval);
  }, [children, duration, isAnimating]);

  return (
    <div
      className="flex scale-100 cursor-default overflow-hidden py-2"
      onMouseEnter={() => animateOnHover && triggerAnimation()}
    >
      <AnimatePresence>
        {displayText.map((letter, i) => (
          <motion.span
            key={i}
            className={cn("font-mono", className)}
            {...framerProps}
          >
            {letter === " " ? "\u00A0" : letter}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
