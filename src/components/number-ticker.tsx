"use client";

import { useEffect, useState } from "react";
import { useRef } from "react";
import { motion } from "framer-motion";

type NumberTickerProps = {
  value: number;
  format?: (value: number) => string;
  duration?: number;
};

export function NumberTicker({ value, format, duration = 720 }: NumberTickerProps) {
  const [display, setDisplay] = useState(value);
  const previous = useRef(value);

  useEffect(() => {
    let frame = 0;
    const frames = Math.max(1, Math.round(duration / 16));
    const start = previous.current;
    const diff = value - start;
    const tick = () => {
      frame += 1;
      const progress = 1 - Math.pow(1 - frame / frames, 3);
      setDisplay(start + diff * progress);
      if (frame < frames) requestAnimationFrame(tick);
      else previous.current = value;
    };
    requestAnimationFrame(tick);
  }, [duration, value]);

  return (
    <motion.span
      key={Math.round(value)}
      initial={{ opacity: 0.7, y: 4, filter: "blur(3px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.32 }}
    >
      {format ? format(display) : Math.round(display)}
    </motion.span>
  );
}
