import { useRef, useEffect } from "react";
import { motion, useMotionTemplate, useMotionValue, animate } from "motion/react";
import { cn } from "./utils";

const COLORS = ["#d4af37", "#cd7f32", "#22d3ee", "#d4af37"];

export function GlowCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const color = useMotionValue(COLORS[0]);
  const border = useMotionTemplate`1px solid ${color}`;
  const boxShadow = useMotionTemplate`0 0 12px ${color}20, 0 0 30px ${color}10`;
  const indexRef = useRef(0);

  useEffect(() => {
    const step = () => {
      indexRef.current = (indexRef.current + 1) % COLORS.length;
      animate(color, COLORS[indexRef.current], { duration: 3, ease: "easeInOut" });
    };
    step();
    const iv = setInterval(step, 3000);
    return () => clearInterval(iv);
  }, [color]);

  return (
    <motion.div
      style={{ border, boxShadow }}
      className={cn(
        "rounded-xl bg-dark-900/60 backdrop-blur-md relative overflow-hidden",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
