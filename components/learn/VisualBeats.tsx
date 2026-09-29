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
      <motion.div className={s.sense} data-off={stage >= 2 && !beat.keep || undefined} initial={false}
        animate={stage >= 1 ? { opacity: 1, scale: 1, rotate: stage >= 2 && !reduced && !beat.keep ? -4 : 0 } : { opacity: 0, scale: .6 }} transition={SPRING}>
        <span className={s.senseEmoji} aria-hidden="true">{beat.said.emoji}</span>
        <small>{beat.labels?.[0] ?? "معنیِ حقیقی"}</small>
        <b>{beat.said.text}</b>
        <AnimatePresence>{stage >= 2 && !beat.keep && <motion.i className={s.senseX} initial={reduced ? false : { scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 500, damping: 14 }} aria-label="جور نیست">✖</motion.i>}</AnimatePresence>
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
        <small>{beat.labels?.[1] ?? "معنیِ مقصود"}</small>
        <b>{beat.meant.text}</b>
      </motion.div>
    </div>
    <p className={s.clueNote} data-on={stage >= 2 || undefined}>🔦 {beat.keep ? "نشانه" : "قرینه"}: «{beat.clue}»</p>
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

/* ───────── خطِ زمان ───────── */

type TimelineItem = import("@/lib/learn/types").TimelineItem;

/** یک خطِ زمان با دو وصف. تا `placed` نشده خط خالی است و یک «؟» رویش؛ بعد
 *  وصف‌ها از بالا می‌افتند: جدا روی دو نقطه، یا هر دو روی یک نقطه با جرقه.
 *  زمان در فارسی از راست به چپ می‌رود، پس نقطهٔ اول سمتِ راست است. */
function TimelineTrack({ item, placed, reduced }: { item: TimelineItem; placed: boolean; reduced: boolean }) {
  const same = item.a.at === item.b.at;
  const spots = same ? [50] : [24, 76];
  const drop = (delay: number) => ({
    initial: reduced ? false : { y: -70, opacity: 0, scale: .6 },
    animate: { y: 0, opacity: 1, scale: 1 },
    transition: { type: "spring" as const, stiffness: 380, damping: 16, delay: reduced ? 0 : delay },
  });
  const chip = (sense: TimelineItem["a"], delay: number) => <motion.span className={s.tlChip} {...drop(delay)}>
    <i aria-hidden="true">{sense.emoji}</i>{sense.text}
  </motion.span>;
  return <div className={s.timeline} data-same={placed && same || undefined}>
    <div className={s.tlStage}>
      {!placed && <span className={s.tlQuestion}>؟</span>}
      {placed && (same
        ? <div className={s.tlStack} style={{ right: "50%" }}>
          {chip(item.a, 0)}
          {chip(item.b, .35)}
          <motion.span className={s.tlSpark} initial={reduced ? false : { scale: 0, rotate: -40 }} animate={{ scale: [0, 1.5, 1], rotate: 0 }} transition={{ delay: reduced ? 0 : .7, duration: .5 }} aria-hidden="true">⚡</motion.span>
        </div>
        : <>
          <div className={s.tlStack} style={{ right: `${spots[0]}%` }}>{chip(item.a, 0)}</div>
          <div className={s.tlStack} style={{ right: `${spots[1]}%` }}>{chip(item.b, .35)}</div>
        </>)}
    </div>
    <div className={s.tlLine}>
      <motion.i className={s.tlArrow} initial={false} animate={{ scaleX: 1 }} />
      {placed && spots.map((spot, n) => <motion.b key={n} className={s.tlTick} style={{ right: `${spot}%` }} initial={reduced ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: reduced ? 0 : .15 }} />)}
    </div>
    <div className={s.tlLabels}>
      {placed && (same
        ? <motion.span style={{ right: "50%" }} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduced ? 0 : .9 }}>{item.a.at} <b>· یک نقطه!</b></motion.span>
        : <>
          <motion.span style={{ right: `${spots[0]}%` }} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }}>{item.a.at}</motion.span>
          <motion.span style={{ right: `${spots[1]}%` }} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduced ? 0 : .35 }}>{item.b.at}</motion.span>
        </>)}
    </div>
  </div>;
}

/** دو خطِ زمان زیرِ هم، پشتِ سرِ هم پر می‌شوند: اول تضاد، بعد متناقض‌نما. */
export function TimelineDemoBeat({ beat, reduced }: BeatProps<"timelineDemo">) {
  const [stage, setStage] = useState(reduced ? 2 : 0);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const timers = [700, 2600].map((at, i) => window.setTimeout(() => setStage(i + 1), at));
    return () => timers.forEach(window.clearTimeout);
  }, [run, reduced]);
  const row = (item: TimelineItem, on: boolean, label: string, emoji: string) => <div className={s.tlRow}>
    <p className={s.tlRowHead}><span aria-hidden="true">{emoji}</span> {label}</p>
    <p className={s.tlSentence}>{item.line}</p>
    <TimelineTrack key={`${run}-${on}`} item={item} placed={on} reduced={reduced} />
  </div>;
  return <Card reduced={reduced}>
    {row(beat.apart, stage >= 1, "تضاد: دو نقطهٔ جدا", "⚔️")}
    {row(beat.together, stage >= 2, "متناقض‌نما: یک نقطه", "🌗")}
    <p className={s.demoCaption} data-on={stage >= 2 || undefined}><Rich text={beat.caption} /></p>
    {!reduced && <button className={s.ghostButton} onClick={() => { setStage(0); setRun(r => r + 1); }}><RotateCcw size={14} /> دوباره</button>}
  </Card>;
}

function TimelineLine({ item, onDone, reduced, host }: { item: TimelineItem; onDone: (clean: boolean) => void; reduced: boolean; host: string }) {
  const [guess, setGuess] = useState<boolean | null>(null);
  const same = item.a.at === item.b.at;
  const right = guess === same;
  function pick(one: boolean) {
    if (guess !== null) return;
    setGuess(one); sound(one === same ? "correct" : "wrong");
    if (one === same) window.setTimeout(() => onDone(true), 2600);
  }
  return <motion.div initial={reduced ? false : { opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={SPRING}>
    <p className={s.tlSentence} data-big>{item.line}</p>
    <Source src={item.src} />
    <TimelineTrack item={item} placed={guess !== null} reduced={reduced} />
    <div className={s.tlChoices}>
      <button onClick={() => pick(false)} disabled={guess !== null} data-state={guess === null ? undefined : !same ? "right" : guess === false ? "wrong" : "idle"}><span aria-hidden="true">⚔️</span> دو نقطهٔ جدا <small>تضاد</small></button>
      <button onClick={() => pick(true)} disabled={guess !== null} data-state={guess === null ? undefined : same ? "right" : guess === true ? "wrong" : "idle"}><span aria-hidden="true">🌗</span> یک نقطه <small>متناقض‌نما</small></button>
    </div>
    <Feedback message={guess === null ? "" : right ? `درسته. ${item.why}` : item.why} tone={guess === null ? "hint" : right ? "good" : "bad"} host={host} reduced={reduced} />
    {guess !== null && !right && <button className={s.primaryButton} onClick={() => onDone(false)} autoFocus>فهمیدم، بعدی <ArrowLeft size={16} /></button>}
  </motion.div>;
}

export function TimelineBeat({ beat, reduced, solved, onSolve, host }: BeatProps<"timeline">) {
  const q = useQueue(beat.items, solved);
  const done = solved ? beat.items.length : beat.items.length - new Set(q.queue).size;
  return <Card reduced={reduced}>
    <p className={s.prompt}><Rich text={beat.prompt} /></p>
    <QueueHead done={done} total={beat.items.length} streak={q.streak} left={solved ? 0 : q.left} />
    {solved || q.current === undefined
      ? <Feedback message={beat.success} tone="good" host={host} reduced={reduced} />
      : <TimelineLine key={q.round} item={beat.items[q.current]} reduced={reduced} host={host} onDone={clean => q.next(clean, onSolve)} />}
  </Card>;
}

/* ───────── گروه‌ساز ───────── */

/** هسته وسطِ صحنه است؛ وابسته‌ها یکی‌یکی می‌آیند و شاگرد جایشان را تعیین
 *  می‌کند. در فارسی پیشین سمتِ راستِ هسته می‌نشیند (پیش از آن خوانده
 *  می‌شود) و پسین سمتِ چپ. */
export function GrowBeat({ beat, reduced, solved, onSolve, host }: BeatProps<"grow">) {
  const [placed, setPlaced] = useState(solved ? beat.parts.length : 0);
  const [misses, setMisses] = useState(0);
  const [shake, setShake] = useState(0);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<Tone>("hint");
  const done = placed >= beat.parts.length;
  const current = beat.parts[placed];
  function put(side: "pre" | "post") {
    if (done || !current) return;
    if (side === current.side) {
      sound("correct"); setTone("good"); setMessage(current.why);
      const next = placed + 1;
      setPlaced(next);
      if (next >= beat.parts.length) window.setTimeout(() => { setMessage(beat.success); onSolve(misses === 0); }, 900);
      return;
    }
    sound("wrong"); setMisses(n => n + 1); setShake(n => n + 1); setTone("bad");
    setMessage(`نه، «${current.text}» ${current.side === "pre" ? "==قبل از== هسته" : "==بعد از== هسته"} می‌شینه. ${current.why}`);
  }
  const shown = beat.parts.map((part, i) => ({ ...part, i })).filter(part => part.i < placed);
  const word = (part: { text: string; label: string; i: number }) => <motion.span key={part.i} className={s.growWord}
    initial={reduced ? false : { opacity: 0, scale: .4, y: -40 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 420, damping: 16 }}>
    <small>{part.label}</small>{part.text}
  </motion.span>;
  return <Card reduced={reduced}>
    <p className={s.prompt}><Rich text={beat.prompt} /></p>
    <div className={s.growRow}>
      {shown.filter(part => part.side === "pre").map(word)}
      <motion.span className={s.growHead} animate={done && !reduced ? { scale: [1, 1.12, 1] } : {}} transition={{ duration: .5 }}><small>هسته</small>{beat.head}</motion.span>
      {shown.filter(part => part.side === "post").map(word)}
    </div>
    {!done && current && <>
      <motion.div key={`${placed}-${shake}`} className={s.growChip} initial={reduced ? false : { opacity: 0, y: -14 }}
        animate={shake && !reduced ? { opacity: 1, y: 0, x: [0, -9, 8, -5, 0] } : { opacity: 1, y: 0 }} transition={{ duration: .4 }}>
        {current.text}
      </motion.div>
      <div className={s.growButtons}>
        <button onClick={() => put("pre")}><ArrowRightIcon /> قبل از هسته <small>پیشین</small></button>
        <button onClick={() => put("post")}>بعد از هسته <small>پسین</small> <ArrowLeft size={18} /></button>
      </div>
    </>}
    <p className={s.counter} data-done={done || undefined}>{fa(Math.min(placed, beat.parts.length))} از {fa(beat.parts.length)}</p>
    <Feedback message={solved ? beat.success : message} tone={solved ? "good" : tone} host={host} reduced={reduced} />
  </Card>;
}

const ArrowRightIcon = () => <ArrowLeft size={18} style={{ transform: "scaleX(-1)" }} />;
