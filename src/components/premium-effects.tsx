"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function AmbientBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="mesh absolute inset-0 opacity-70" />
      <motion.div
        className="absolute left-[-10rem] top-16 h-80 w-80 rounded-full bg-gain/15 blur-3xl"
        animate={{ x: [0, 26, 0], y: [0, -18, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-9rem] top-4 h-72 w-72 rounded-full bg-amber/15 blur-3xl"
        animate={{ x: [0, -20, 0], y: [0, 24, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export function BorderBeam({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover:opacity-100",
        className,
      )}
    >
      <span className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-black/35 to-transparent" />
      <span className="absolute inset-y-8 right-0 w-px bg-gradient-to-b from-transparent via-gain/45 to-transparent" />
    </span>
  );
}

export function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-full bg-black/[0.06]", className)}>
      <div className="absolute inset-y-0 -left-full w-full animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}
