"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import type { Bin, Example } from "@/lib/learn/types";
import { bare, parseLine, plainLine } from "@/lib/learn/line";
import { Card, Feedback, LineView, QueueHead, SPRING, Source, fa, shuffle, sound, useQueue, type BeatProps, type Tone } from "./Beats";
import { Rich } from "./Rich";
import s from "./learn.module.css";

/* ───────── سبدها ───────── */

type SortItem = Example & { bin: number; why: string };

/** کلمه‌ای که در سبد می‌افتد: همان `|…|`ِ سطر، یا اگر نبود کلِ سطر. */
const focusWord = (item: SortItem) => {
  const focus = parseLine(item.line).find(token => token.focus);
  return focus ? bare(focus.text) : plainLine(item.line);
};

/** ردیفِ سبدها. هر سبد شکلک، اسم و کلمه‌هایی را که تا حالا درست در آن
 *  افتاده‌اند نشان می‌دهد، تا آخرِ دور یک «کلکسیون» جلوی چشم باشد. */
function Bins({ bins, piles, pick, answer, onPick, reduced }: {
  bins: Bin[]; piles: string[][]; pick?: number | null; answer?: number; onPick?: (bin: number) => void; reduced: boolean;
}) {
  return <div className={s.bins} style={{ gridTemplateColumns: `repeat(${bins.length}, minmax(0, 1fr))` }}>
    {bins.map((bin, b) => {
      const state = pick === null || pick === undefined ? undefined : b === answer ? "right" : b === pick ? "wrong" : "idle";
      return <motion.button key={b} className={s.bin} data-state={state} disabled={!onPick || state !== undefined} onClick={() => onPick?.(b)}
        animate={reduced ? {} : state === "wrong" ? { x: [0, -9, 8, -5, 3, 0] } : state === "right" && pick === b ? { scale: [1, 1.12, 1], rotate: [0, -3, 0] } : {}}
        whileHover={onPick && state === undefined && !reduced ? { y: -4 } : undefined} whileTap={onPick && state === undefined && !reduced ? { scale: .95 } : undefined}
        transition={{ duration: .45 }}>
        <span className={s.binEmoji} aria-hidden="true">{bin.emoji}</span>
        <b>{bin.label}</b>
        <span className={s.pile}>
          <AnimatePresence initial={false}>{piles[b].map((word, n) => <motion.i key={`${word}-${n}`} initial={reduced ? false : { scale: 0, y: -26, rotate: -20 }} animate={{ scale: 1, y: 0, rotate: 0 }} transition={{ type: "spring", stiffness: 420, damping: 14 }}>{word}</motion.i>)}</AnimatePresence>
        </span>
      </motion.button>;
    })}
  </div>;
}

function SortLine({ item, bins, piles, onRight, onDone, reduced, host }: {
  item: SortItem; bins: Bin[]; piles: string[][]; onRight: (bin: number, word: string) => void; onDone: (clean: boolean) => void; reduced: boolean; host: string;
}) {
  const tokens = useMemo(() => parseLine(item.line), [item.line]);
  const [pick, setPick] = useState<number | null>(null);
  const right = pick === item.bin;
  function choose(bin: number) {
    if (pick !== null) return;
    setPick(bin);
    if (bin === item.bin) { sound("correct"); onRight(bin, focusWord(item)); window.setTimeout(() => onDone(true), 1700); }
    else sound("wrong");
  }
  return <>
    <motion.div className={s.sortCard} initial={reduced ? false : { opacity: 0, y: -24, rotate: -3 }}
      animate={pick === null ? { opacity: 1, y: 0, rotate: 0 } : right ? { opacity: reduced ? 1 : .35, y: reduced ? 0 : 26, scale: reduced ? 1 : .8 } : { opacity: 1, x: reduced ? 0 : [0, -8, 7, -4, 0] }}
      // فنر فقط دو فریم را می‌تواند؛ لرزشِ چندفریمی باید tween باشد، وگرنه motion خطا می‌دهد و بقیهٔ انیمیشن‌ها هم می‌ایستند.
      transition={pick !== null && !right ? { duration: .4 } : SPRING}>
      <LineView tokens={tokens} focus={pick === null ? "ask" : right ? "yes" : "no"} reduced={reduced} big />
      <Source src={item.src} />
    </motion.div>
    <Bins bins={bins} piles={piles} pick={pick} answer={item.bin} onPick={choose} reduced={reduced} />
    <Feedback message={pick === null ? "" : right ? `درسته. ${item.why}` : `این یکی مالِ «${bins[item.bin].label}»ـه. ${item.why}`} tone={pick === null ? "hint" : right ? "good" : "bad"} host={host} reduced={reduced} />
    {pick !== null && !right && <button className={s.primaryButton} onClick={() => onDone(false)} autoFocus>فهمیدم، بعدی <ArrowLeft size={16} /></button>}
  </>;
}

export function SortBeat({ beat, reduced, solved, onSolve, host }: BeatProps<"sort">) {
  const q = useQueue(beat.items, solved);
  const all = () => beat.bins.map((_, b) => beat.items.filter(item => item.bin === b).map(focusWord));
  const [piles, setPiles] = useState<string[][]>(() => solved ? all() : beat.bins.map(() => []));
  const done = solved ? beat.items.length : beat.items.length - new Set(q.queue).size;
  const finished = solved || q.current === undefined;
  return <Card reduced={reduced}>
    <p className={s.prompt}><Rich text={beat.prompt} /></p>
    <QueueHead done={done} total={beat.items.length} streak={q.streak} left={solved ? 0 : q.left} />
    {finished
      ? <><Bins bins={beat.bins} piles={solved ? all() : piles} reduced={reduced} /><Feedback message={beat.success} tone="good" host={host} reduced={reduced} /></>
      : <SortLine key={q.round} item={beat.items[q.current]} bins={beat.bins} piles={piles} reduced={reduced} host={host}
        onRight={(bin, word) => setPiles(p => p.map((pile, b) => b === bin ? [...pile, word] : pile))}
        onDone={clean => q.next(clean, onSolve)} />}
  </Card>;
}

/* ───────── جابه‌جاییِ معنی ───────── */

/** مجاز روی صحنه: کلمه با معنیِ حقیقی‌اش بالا می‌آید، قرینه روشن می‌شود و آن
 *  معنی خط می‌خورد، بعد معنیِ مقصود از روی پلِ «علاقه» جایش می‌نشیند. */
export function MorphBeat({ beat, reduced }: BeatProps<"morph">) {
  const tokens = useMemo(() => parseLine(beat.line), [beat.line]);
  const clue = useMemo(() => new Set(beat.clue.split(/\s+/).map(bare)), [beat.clue]);
  const [stage, setStage] = useState(reduced ? 3 : 0);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const timers = [800, 2100, 3500].map((at, i) => window.setTimeout(() => setStage(i + 1), at));
    return () => timers.forEach(window.clearTimeout);
  }, [run, reduced]);
  return <Card reduced={reduced} className={s.morph}>
    <p className={s.line} data-big>{tokens.map((token, i) => <motion.span key={i} className={s.word}
      data-focus={token.focus ? stage >= 3 ? "yes" : "ask" : undefined}
      data-clue={!token.focus && stage >= 2 && clue.has(bare(token.text)) || undefined}
      animate={token.focus && stage === 1 && !reduced ? { y: [0, -12, 0] } : {}} transition={{ duration: .5 }}>{token.text}</motion.span>)}</p>
    <Source src={beat.src} />
    <div className={s.morphStage}>
      <motion.div className={s.sense} data-off={stage >= 2 || undefined} initial={false}
        animate={stage >= 1 ? { opacity: 1, scale: 1, rotate: stage >= 2 && !reduced ? -4 : 0 } : { opacity: 0, scale: .6 }} transition={SPRING}>
        <span className={s.senseEmoji} aria-hidden="true">{beat.said.emoji}</span>
        <small>معنیِ حقیقی</small>
        <b>{beat.said.text}</b>
        <AnimatePresence>{stage >= 2 && <motion.i className={s.senseX} initial={reduced ? false : { scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 500, damping: 14 }} aria-label="جور نیست">✖</motion.i>}</AnimatePresence>
      </motion.div>
      <div className={s.bridge} data-on={stage >= 3 || undefined}>
        <svg viewBox="0 0 120 24" aria-hidden="true">
          <motion.path d="M116 12H10m9-8-9 8 9 8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
            initial={false} animate={{ pathLength: stage >= 3 ? 1 : 0 }} transition={{ duration: reduced ? 0 : .7, ease: "easeInOut" }} />
        </svg>
        <span>{beat.bridge}</span>
      </div>
      <motion.div className={s.sense} data-meant initial={false}
        animate={stage >= 3 ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: .6, x: -24 }} transition={{ type: "spring", stiffness: 300, damping: 15, delay: reduced ? 0 : .35 }}>
        <span className={s.senseEmoji} aria-hidden="true">{beat.meant.emoji}</span>
        <small>معنیِ مقصود</small>
        <b>{beat.meant.text}</b>
      </motion.div>
    </div>
    <p className={s.clueNote} data-on={stage >= 2 || undefined}>🔦 قرینه: «{beat.clue}»</p>
    <p className={s.demoCaption} data-on={stage >= 3 || undefined}><Rich text={beat.caption} /></p>
    {!reduced && <button className={s.ghostButton} onClick={() => { setStage(0); setRun(r => r + 1); }}><RotateCcw size={14} /> دوباره</button>}
  </Card>;
}

/* ───────── سؤال‌ساز ───────── */

export function BuildBeat({ beat, reduced, solved, onSolve, host }: BeatProps<"build">) {
  const tokens = useMemo(() => parseLine(beat.line), [beat.line]);
  const targets = useMemo(() => tokens.flatMap(t => t.target === undefined ? [] : [t.target]), [tokens]);
  const pool = useMemo(() => shuffle(beat.pieces.map((text, i) => ({ text, i })), piece => `${piece.text}${piece.i}`), [beat.pieces]);
  /** ترتیبِ درست به‌صورتِ ایندکسِ تکه‌ها — برای بازگرداندنِ حالتِ حل‌شده. */
  const order = useMemo(() => {
    const used = new Set<number>();
    return beat.answer.map(text => { const i = beat.pieces.findIndex((p, n) => p === text && !used.has(n)); used.add(i); return i; });
  }, [beat.answer, beat.pieces]);
  const [built, setBuilt] = useState<number[]>(() => solved ? order : []);
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<Tone>("hint");
  const done = built.length === beat.answer.length;

  function tap(i: number) {
    if (done || built.includes(i)) return;
    if (beat.pieces[i] === beat.answer[built.length]) {
      const next = [...built, i];
      setBuilt(next); sound("correct");
      if (next.length === beat.answer.length) { setTone("good"); setMessage(beat.success); onSolve(misses === 0); }
      else { setTone("hint"); setMessage(""); }
      return;
    }
    setMisses(n => n + 1); setShake(i); setTone("bad"); sound("wrong");
    window.setTimeout(() => setShake(n => n === i ? null : n), 500);
    const piece = beat.pieces[i];
    setMessage(beat.notes?.[piece] ?? `«${piece}» اینجا جا نمی‌شه. تکهٔ ${fa(built.length + 1)}ـمِ سؤال چیه؟`);
  }

  return <Card reduced={reduced}>
    <p className={s.prompt}><Rich text={beat.prompt} /></p>
    <LineView tokens={tokens} found={done ? targets : []} reduced={reduced} big />
    <div className={s.buildSlots}>
      {beat.answer.map((_, n) => built[n] !== undefined
        ? <motion.span key={n} className={s.buildChip} data-in initial={reduced || solved ? false : { scale: .3, y: 26, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 520, damping: 17 }}>{beat.pieces[built[n]]}</motion.span>
        : <span key={n} className={s.buildSlot} data-next={n === built.length && !done || undefined} />)}
      <span className={s.buildMark}>؟</span>
    </div>
    <AnimatePresence>{done && <motion.p className={s.buildReveal} initial={reduced ? false : { opacity: 0, y: -12, scale: .8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 380, damping: 14 }}><Rich text={beat.reveal} /></motion.p>}</AnimatePresence>
    {!done && <div className={s.buildPool}>{pool.map(({ text, i }) => built.includes(i)
      ? <span key={i} className={s.buildGhost}>{text}</span>
      : <motion.button key={i} className={s.buildChip} onClick={() => tap(i)}
        animate={shake === i && !reduced ? { x: [0, -8, 7, -4, 0] } : { x: 0 }} transition={{ duration: .4 }}
        whileHover={reduced ? undefined : { y: -3 }} whileTap={reduced ? undefined : { scale: .94 }}>{text}</motion.button>)}</div>}
    <Feedback message={solved ? beat.success : message} tone={solved ? "good" : tone} host={host} reduced={reduced} />
  </Card>;
}
