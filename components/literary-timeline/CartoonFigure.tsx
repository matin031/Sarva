"use client";

import { motion, type TargetAndTransition, type Transition } from "motion/react";
import { RIGS, type Move } from "@/lib/literary-timeline/cartoon-rig";
import PIVOTS from "@/lib/literary-timeline/cartoon-pivots.json";
import s from "./timeline.module.css";

const LOOP = { repeat: Infinity, repeatDelay: 1.1 } as const;
const BODY: Partial<Record<Move, [TargetAndTransition, Transition]>> = {
  hop: [{ y: [0, -22, 0, -10, 0] }, { duration: .8, ease: "easeOut", ...LOOP }],
  spin: [{ rotateY: [0, 360] }, { duration: .9, ease: "easeInOut", ...LOOP, repeatDelay: 1.8 }],
  squash: [{ scaleY: [1, .86, 1.07, 1], scaleX: [1, 1.08, .96, 1] }, { duration: .7, ...LOOP }],
  lean: [{ rotate: [0, -7, 6, -3, 0] }, { duration: 1.2, ease: "easeInOut", ...LOOP }],
};

/** A full-length cartoon that acts while `active`. The raised hand is its own
 *  image (`cartoons/rig/<id>-hand.webp`, cut by scripts/timeline/rig-cartoons.mjs)
 *  over the body with that hand removed, so it can wave around the wrist; glasses
 *  drop onto the eye line; the whole body can hop, spin, squash or lean.
 *  With no rig, or with reduced motion, it is a still picture. */
export function CartoonFigure({ id, src, alt, active, reduced, idleDelay = 0 }: { id: string; src: string; alt: string; active: boolean; reduced: boolean; idleDelay?: number }) {
  const rig = RIGS[id];
  const play = active && !reduced;
  const pivot = rig?.moves.includes("wave") && !reduced ? (PIVOTS as Record<string, number[]>)[id] : undefined;
  const body = rig?.moves.map(move => BODY[move]).find(Boolean);
  const eyes = rig?.moves.includes("glasses") ? rig.eyes : undefined;
  const layer = (part: string) => `/literary-timeline/cartoons/rig/${id}-${part}.webp`;

  return <motion.span className={s.figure} animate={play && body ? body[0] : { y: 0, rotateY: 0, scaleX: 1, scaleY: 1, rotate: 0 }} transition={play && body ? body[1] : { duration: .3 }}>
    {/* eslint-disable-next-line @next/next/no-img-element -- two stacked layers of one local file; next/image adds nothing here */}
    <img className={s.figureLayer} src={pivot ? layer("body") : src} alt={alt} draggable={false} />
    {/* Speaking: a full wave. Otherwise a small one now and then, staggered by `idleDelay`. */}
    {pivot && <motion.img className={s.figureLayer} src={layer("hand")} alt="" aria-hidden="true" draggable={false}
      style={{ transformOrigin: `${pivot[0]}% ${pivot[1]}%` }}
      animate={{ rotate: play ? [0, -16, 12, -16, 12, 0] : [0, -9, 6, 0] }}
      transition={play ? { duration: 1.3, ease: "easeInOut", repeat: Infinity, repeatDelay: .7 } : { duration: 1, ease: "easeInOut", repeat: Infinity, repeatDelay: 7, delay: idleDelay }} />}
    {eyes && <motion.svg className={s.glasses} viewBox="0 0 100 40" aria-hidden="true"
      style={{ left: `${eyes[0]}%`, top: `${eyes[1]}%`, width: `${eyes[2] * 2}%`, marginLeft: `${-eyes[2]}%`, marginTop: `${-eyes[2] * .4}%` }}
      initial={false} animate={play ? { y: [-60, 4, 0], opacity: [0, 1, 1], rotate: [-25, 6, 0] } : { y: -60, opacity: 0, rotate: -25 }}
      transition={play ? { duration: .7, times: [0, .7, 1], delay: .25 } : { duration: .3 }}>
      <circle cx="25" cy="20" r="15" />
      <circle cx="75" cy="20" r="15" />
      <path d="M40 18q10-7 20 0M10 16 1 11M90 16l9-5" />
    </motion.svg>}
  </motion.span>;
}
