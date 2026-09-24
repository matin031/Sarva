"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "motion/react";
import { Bookmark } from "lucide-react";
import { QALAMI, type Person, type StageLine } from "@/lib/literary-timeline/data";
import { CartoonFigure } from "./CartoonFigure";
import { Mascot } from "./Mascot";
import { Portrait, portraitFor } from "./Portrait";
import s from "./timeline.module.css";

/** One figure on the stage. It climbs out of the ground as the stage scrolls
 *  in, each a little after the one before, then drifts with the page. */
function Actor({ index, count, enter, drift, speaking, reduced, children }: { index: number; count: number; enter: MotionValue<number>; drift: MotionValue<number>; speaking: boolean; reduced: boolean; children: React.ReactNode }) {
  const start = index / (count + 2) * .5;
  const rise = useTransform(enter, [start, start + .45], [140, 0], { clamp: true });
  const tilt = useTransform(enter, [start, start + .45], [index % 2 ? 9 : -9, 0], { clamp: true });
  const sway = useTransform(drift, [0, 1], [index % 2 ? 14 : -14, index % 2 ? -14 : 14]);
  const y = useTransform(() => rise.get() + sway.get());
  const opacity = useTransform(enter, [start, start + .2], [0, 1], { clamp: true });
  return <motion.div className={s.actor} data-actor data-speaking={speaking || undefined} style={reduced ? undefined : { y, rotate: tilt, opacity }}>
    <motion.div className={s.actorBody} animate={reduced ? undefined : { scale: speaking ? 1.06 : 1 }} transition={{ type: "spring", stiffness: 300, damping: 16 }}>
      {children}
    </motion.div>
  </motion.div>;
}

/** The chapter's featured people as full-length characters, talking in turn.
 *  The stage pins under the era dock while its lines play (the pinned stretch
 *  is `.stageTrack::after`, about 110px of scroll per line), so the bubble and
 *  the speaker are always on screen together. Scrolling back replays the lines. */
export function PoetStage({ people, lines, reduced, saved, onPerson, onSave }: { people: Person[]; lines: StageLine[]; reduced: boolean; saved: string[]; onPerson: (person: Person) => void; onSave: (id: string) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [line, setLine] = useState(-1);
  const { scrollYProgress: enter } = useScroll({ target: ref, offset: ["start end", "end 70%"] });
  const { scrollYProgress: drift } = useScroll({ target: track, offset: ["start end", "end start"] });
  const { scrollY } = useScroll();
  const follow = () => {
    const stage = ref.current, box = track.current;
    if (!stage || !box) return;
    const pinTop = parseFloat(getComputedStyle(stage).top) || 0;
    const rect = box.getBoundingClientRect(), own = stage.getBoundingClientRect();
    // Before the pin: speak only once every figure has fully risen into view.
    if (rect.top > pinTop) {
      const inView = own.top >= pinTop && [...stage.querySelectorAll("[data-actor]")].every(actor => actor.getBoundingClientRect().bottom <= window.innerHeight);
      return setLine(inView ? 0 : -1);
    }
    const progress = (pinTop - rect.top) / Math.max(1, rect.height - own.height);
    setLine(Math.min(lines.length - 1, Math.floor(progress * lines.length)));
  };
  useMotionValueEvent(scrollY, "change", follow);
  useEffect(follow);

  const current = lines[Math.max(line, 0)];
  const hasQalami = lines.some(l => l.who === QALAMI);
  const slots = people.length + (hasQalami ? 1 : 0);
  const speakerSlot = current ? (current.who === QALAMI ? people.length : people.findIndex(p => p.name === current.who)) : -1;
  // Visual order is right-to-left, so the tail is measured from the right edge.
  const tail = `${((speakerSlot + .5) / slots) * 100}%`;
  const shown = reduced ? Math.max(line, 0) : line;

  return <div ref={track} className={s.stageTrack} style={{ "--lines": lines.length } as React.CSSProperties}><div ref={ref} className={s.stage} style={{ "--slots": slots } as React.CSSProperties}>
    <div className={s.stageTalk} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        {shown >= 0 && current && <motion.p key={shown} className={s.stageBubble} style={{ "--tail": tail } as React.CSSProperties}
          initial={reduced ? false : { opacity: 0, y: 12, scale: .92 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduced ? undefined : { opacity: 0, y: -6, scale: .96 }} transition={{ type: "spring", stiffness: 420, damping: 26 }}>
          <b>{current.who}</b>{current.text}
        </motion.p>}
      </AnimatePresence>
      {lines.length > 1 && <span className={s.stageDots} aria-hidden="true">{lines.map((_, i) => <i key={i} data-on={i <= line || undefined} />)}</span>}
    </div>
    <div className={s.stageFloor}>
      {people.map((person, i) => {
        const isSaved = saved.includes(person.id);
        return <Actor key={person.id} index={i} count={slots} enter={enter} drift={drift} speaking={speakerSlot === i && line >= 0} reduced={reduced}>
          <button className={s.actorOpen} onClick={() => onPerson(person)}>
            <span className={s.actorFigure}>{portraitFor(person).cartoon ? <CartoonFigure id={person.id} src={portraitFor(person).src!} alt={`تصویرسازی ${person.name}`} active={speakerSlot === i && line >= 0} reduced={reduced} idleDelay={1.5 + i * 2.3} /> : <span className={s.actorFallback}><Portrait person={person} /></span>}</span>
            <span className={s.actorName}>{person.name}</span>
          </button>
          <button className={s.savePerson} onClick={() => onSave(person.id)} aria-label={`${isSaved ? "حذف نشان" : "نشان کردن"} ${person.name}`} aria-pressed={isSaved}><Bookmark size={14} fill={isSaved ? "currentColor" : "none"} /></button>
        </Actor>;
      })}
      {hasQalami && <Actor index={people.length} count={slots} enter={enter} drift={drift} speaking={speakerSlot === people.length && line >= 0} reduced={reduced}>
        <span className={s.actorQalami}><Mascot waving={speakerSlot === people.length && line >= 0} /></span>
        <span className={s.actorName}>{QALAMI}</span>
      </Actor>}
    </div>
  </div></div>;
}
