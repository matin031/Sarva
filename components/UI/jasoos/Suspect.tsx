"use client";
import { motion } from "motion/react";
import HandsUpFigure from "./HandsUpFigure";
import type { SuspectRole } from "@/lib/jasoos-data";

export type SuspectVisualState = "idle" | "shot-correct" | "shot-wrong" | "dimmed";

function Suspect({
  role,
  state,
  wordInVerse,
  onShoot,
}: {
  role: SuspectRole;
  state: SuspectVisualState;
  wordInVerse?: string;
  onShoot: () => void;
}) {
  const disabled = state !== "idle";
  const revealed = state !== "idle";

  return (
    <button
      type="button"
      onClick={onShoot}
      disabled={disabled}
      aria-label={`نشانه‌گیری به سمت مظنونِ ${role}`}
      className={`group relative flex flex-col items-center gap-y-2 shrink-0 ${
        state === "dimmed" ? "opacity-25" : ""
      } ${disabled ? "cursor-default" : "cursor-crosshair"}`}
    >
      <motion.div
        animate={
          state === "shot-correct"
            ? { rotate: 14, y: 46, opacity: 0, filter: "brightness(0.4)" }
            : state === "shot-wrong"
              ? { x: [0, -8, 8, -5, 5, 0] }
              : { y: [0, -4, 0] }
        }
        transition={
          state === "shot-correct"
            ? { duration: 0.55, ease: "easeIn" }
            : state === "shot-wrong"
              ? { duration: 0.5 }
              : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
        }
        className={`w-14 sm:w-20 transition-colors duration-200 ${
          state === "shot-correct"
            ? "text-destructive"
            : state === "shot-wrong"
              ? "text-gold"
              : "text-foreground/85 group-enabled:group-hover:text-primary"
        } drop-shadow-[0_6px_10px_rgba(0,0,0,0.55)]`}
      >
        <HandsUpFigure />
      </motion.div>

      <span className="text-xs sm:text-sm font-bold px-3 py-1 rounded-full glass whitespace-nowrap">
        {role}
      </span>

      {revealed && (
        <span
          className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
            wordInVerse
              ? "text-primary bg-primary/10"
              : "text-destructive bg-destructive/10"
          }`}
        >
          {wordInVerse ?? "در بیت نیست"}
        </span>
      )}

      {state === "shot-wrong" && (
        <span className="absolute -top-2 -right-1 text-destructive text-lg sm:text-xl font-black">
          ✕
        </span>
      )}
    </button>
  );
}

export default Suspect;
