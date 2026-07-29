"use client";

import { motion, type MotionValue } from "motion/react";

export type FigureMood = "calm" | "scared" | "smug" | "dead";

/** A suspect with a face.
 *
 *  The silhouette is the same one it always was — head, raised arms, torso,
 *  legs — but it now has eyes that follow the reader, brows and a mouth that
 *  change with the mood, and a little sweat when it is being aimed at. That is
 *  the whole trick of this game's atmosphere: a shape you point a gun at should
 *  look back at you.
 *
 *  `eyeX`/`eyeY` are MotionValues in the range −1..1, driven straight from the
 *  pointer by the scene. They are MotionValues rather than props on purpose:
 *  the pupils then move without React re-rendering four figures on every mouse
 *  event, and the writes stay on transform. */
export default function HandsUpFigure({
  mood = "calm",
  eyeX,
  eyeY,
}: {
  mood?: FigureMood;
  eyeX?: MotionValue<number>;
  eyeY?: MotionValue<number>;
}) {
  const scared = mood === "scared";
  const smug = mood === "smug";
  const dead = mood === "dead";

  /* Geometry is set as plain attributes, not animated: framer-motion needs an
     initial value for every animated key, and `d`/`rx` without one render as
     the literal string "undefined" — which is exactly what the console was
     complaining about. Moods are discrete anyway, and this keeps the only
     animated properties on transform and opacity. */
  const eyeRx = smug ? 5 : scared ? 6.4 : 5.6;
  const eyeRy = smug ? 2.1 : scared ? 6.4 : 4.6;

  return (
    <svg viewBox="0 0 120 220" className="h-full w-full overflow-visible">
      {/* left arm raised */}
      <path
        d={scared ? "M44 68 Q14 40 6 -6" : "M44 68 Q18 44 10 2"}
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
        fill="none"
      />
      {/* right arm raised */}
      <path
        d={scared ? "M76 68 Q106 40 114 -6" : "M76 68 Q102 44 110 2"}
        stroke="currentColor"
        strokeWidth="13"
        strokeLinecap="round"
        fill="none"
      />

      {/* head */}
      <circle cx="60" cy="34" r="22" fill="currentColor" />

      {/* ---------------- face ---------------- */}
      {/* eye whites: wide when frightened, narrowed to slits when smug */}
      <g opacity={dead ? 0 : 1}>
        <ellipse cx="52" cy="31" rx={eyeRx} ry={eyeRy} fill="#fff" />
        <ellipse cx="68" cy="31" rx={eyeRx} ry={eyeRy} fill="#fff" />

        {/* pupils — driven by the pointer, clamped inside the whites */}
        <motion.circle
          cx="52"
          cy="31"
          r={smug ? 1.5 : scared ? 1.9 : 2.2}
          fill="#0b1220"
          style={
            eyeX && eyeY
              ? { x: eyeX, y: eyeY, scale: 1 }
              : undefined
          }
        />
        <motion.circle
          cx="68"
          cy="31"
          r={smug ? 1.5 : scared ? 1.9 : 2.2}
          fill="#0b1220"
          style={eyeX && eyeY ? { x: eyeX, y: eyeY } : undefined}
        />
      </g>

      {/* brows: up and apart when scared, slanted inward when smug */}
      {!dead && (
        <g stroke="#0b1220" strokeWidth="1.8" strokeLinecap="round" fill="none" opacity={0.9}>
          <path
            d={
              scared
                ? "M46 22 Q52 19 58 22"
                : smug
                  ? "M46 24 Q52 21 58 25"
                  : "M46 23 Q52 21 58 23"
            }
          />
          <path
            d={
              scared
                ? "M62 22 Q68 19 74 22"
                : smug
                  ? "M62 25 Q68 21 74 24"
                  : "M62 23 Q68 21 74 23"
            }
          />
        </g>
      )}

      {/* mouth: an O of panic, a crooked grin, a flat line, or an X when down */}
      {dead ? (
        <g stroke="#0b1220" strokeWidth="2" strokeLinecap="round">
          <path d="M48 28 L57 37 M57 28 L48 37" />
          <path d="M63 28 L72 37 M72 28 L63 37" />
          <path d="M54 45 Q60 41 66 45" fill="none" />
        </g>
      ) : (
        <path
          stroke="#0b1220"
          strokeWidth="2"
          strokeLinecap="round"
          fill={scared ? "#0b1220" : "none"}
          d={
            scared
              ? "M56 42 Q60 38 64 42 Q60 47 56 42"
              : smug
                ? "M52 42 Q60 49 69 40"
                : "M54 43 Q60 45 66 43"
          }
        />
      )}

      {/* a bead of sweat, only while being aimed at */}
      {scared && (
        <motion.path
          d="M78 22 q3 5 0 7 q-3 -2 0 -7"
          fill="#7dd3fc"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: [0, 1, 1, 0], y: [-4, 0, 10, 16] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeIn" }}
        />
      )}

      {/* torso */}
      <path d="M38 60 L82 60 L92 152 L28 152 Z" fill="currentColor" />
      {/* legs */}
      <path d="M40 152 L33 218 L50 218 L55 152 Z" fill="currentColor" />
      <path d="M80 152 L87 218 L70 218 L65 152 Z" fill="currentColor" />
    </svg>
  );
}
