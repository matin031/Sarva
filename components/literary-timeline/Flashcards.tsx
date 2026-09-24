"use client";

import { useState, type CSSProperties } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Repeat, Shuffle } from "lucide-react";
import { ERAS, fa } from "@/lib/literary-timeline/data";
import { EraBadge } from "./EraBadge";
import s from "./timeline.module.css";

const DECK = ERAS.slice(1);
const LABELS = [["language", "زبانی"], ["literary", "ادبی"], ["thought", "فکری"]] as const;

export function Flashcards({ reduced }: { reduced: boolean }) {
  const [order, setOrder] = useState(() => DECK.map((_, i) => i));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [direction, setDirection] = useState(1);
  const era = DECK[order[index]];

  function go(step: number) {
    setDirection(step);
    setFlipped(false);
    setIndex(i => (i + step + DECK.length) % DECK.length);
  }

  function shuffle() {
    const next = [...order];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setOrder(next); setIndex(0); setFlipped(false);
  }

  return <div className={s.panelBody} onKeyDown={event => {
    if (event.target instanceof HTMLButtonElement && event.key === " ") return;
    if (event.key === "ArrowLeft") { event.preventDefault(); go(1); }
    if (event.key === "ArrowRight") { event.preventDefault(); go(-1); }
  }}>
    <Dialog.Title className={s.panelTitle}>کارت‌های مرور</Dialog.Title>
    <Dialog.Description className={s.panelDescription}>اول سبک را به یاد بیاور، بعد کارت را برگردان.</Dialog.Description>
    <div className={s.cardStage}>
      <AnimatePresence mode="popLayout" custom={direction} initial={false}>
        <motion.button
          key={era.id}
          className={s.flashcard}
          style={{ "--era-color": era.color } as CSSProperties}
          onClick={() => setFlipped(f => !f)}
          aria-label={flipped ? `ویژگی‌های ${era.name}؛ برای برگشت بزن` : `${era.name}؛ برای دیدن ویژگی‌ها بزن`}
          custom={direction}
          initial={reduced ? false : { x: direction * -120, opacity: 0, rotate: direction * -6 }}
          animate={{ x: 0, opacity: 1, rotate: 0 }}
          exit={reduced ? { opacity: 0 } : { x: direction * 120, opacity: 0, rotate: direction * 6 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
        >
          <motion.span className={s.flashInner} animate={{ rotateY: flipped ? 180 : 0 }} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 200, damping: 20 }}>
            <span className={s.flashFront}>
              <EraBadge era={era} size="large" />
              <strong>{era.name}</strong>
              <small>{era.period}</small>
              <em>{era.tags.slice(0, 2).join(" · ")}</em>
              <span className={s.flashHint}><Repeat size={14} /> برگرداندن</span>
            </span>
            <span className={s.flashBack}>
              <strong>{era.name}</strong>
              {LABELS.map(([key, label]) => <span key={key} className={s.flashRow}><b>{label}</b>{era.features[key]}</span>)}
            </span>
          </motion.span>
        </motion.button>
      </AnimatePresence>
    </div>
    <div className={s.cardControls}>
      <button className={s.roundButton} onClick={() => go(-1)} aria-label="کارت قبلی"><ChevronRight size={20} /></button>
      <span className={s.cardCount} aria-live="polite">{fa(index + 1)} از {fa(DECK.length)}</span>
      <button className={s.roundButton} onClick={() => go(1)} aria-label="کارت بعدی"><ChevronLeft size={20} /></button>
      <button className={s.softButton} onClick={shuffle}><Shuffle size={16} /> بُر زدن</button>
    </div>
  </div>;
}
