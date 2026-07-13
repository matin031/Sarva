"use client";
import { motion, AnimatePresence } from "motion/react";

function GunHud({ shots }: { shots: number }) {
  return (
    <div className="pointer-events-none absolute bottom-0 inset-x-0 z-20 flex justify-center sm:justify-end sm:pl-10">
      <AnimatePresence>
        {shots > 0 && (
          <motion.div
            key={shots}
            initial={{ opacity: 0.9, scale: 0.4 }}
            animate={{ opacity: 0, scale: 1.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="absolute bottom-24 sm:bottom-28 right-1/2 sm:right-24 translate-x-1/2 sm:translate-x-0
              size-20 rounded-full bg-gold/70 blur-xl"
          />
        )}
      </AnimatePresence>
      <motion.div
        key={`gun-${shots}`}
        initial={{ y: 0, rotate: 0 }}
        animate={{ y: [0, -16, 0], rotate: [0, -8, 0] }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="text-foreground/90 w-28 sm:w-36 drop-shadow-[0_-6px_16px_rgba(0,0,0,0.5)]"
      >
        <svg viewBox="0 0 140 120" fill="currentColor">
          {/* forearm */}
          <path d="M50 120 L74 120 L82 66 L58 66 Z" />
          {/* hand grip */}
          <path d="M56 68 L92 68 L96 30 L60 30 Z" />
          {/* slide/barrel */}
          <path d="M60 30 L136 30 L136 14 L64 14 Z" />
          {/* trigger guard */}
          <path
            d="M66 34 Q56 46 66 58"
            stroke="currentColor"
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </motion.div>
    </div>
  );
}

export default GunHud;
