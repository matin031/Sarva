"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowUpLeft, Check, Flame, Lightbulb, RotateCcw, Search, X } from "lucide-react";
import type { Beat, Example, Mood } from "@/lib/learn/types";
import { hasLessonPath } from "@/lib/learn";
import { bare, parseLine, targetCount, type Token } from "@/lib/learn/line";
import { playFeedback, isSoundMuted } from "@/lib/exam/feedback-sfx";
import { Tick } from "./Characters";
import { speak, useStage } from "./persona";
import { Rich } from "./Rich";
import s from "./learn.module.css";

type Of<K extends Beat["kind"]> = Extract<Beat, { kind: K }>;
export type BeatProps<K extends Beat["kind"]> = { beat: Of<K>; solved: boolean; onSolve: (firstTry: boolean) => void; reduced: boolean; fresh: boolean; host: string; memo?: number; onMemo?: (value: number) => void };
type Tone = "good" | "bad" | "hint";

const SPRING = { type: "spring", stiffness: 360, damping: 24 } as const;
const sound = (kind: "correct" | "wrong") => { if (!isSoundMuted()) playFeedback(kind); };
export const fa = (n: number) => n.toLocaleString("fa-IR");

/* ───────── pieces ───────── */

/** A line from the host, with a moment of «…» first when it is new. */
export function HostLine({ text, mood = "happy", host, fresh, reduced }: { text: string; mood?: Mood; host: string; fresh: boolean; reduced: boolean }) {
  const [typing, setTyping] = useState(fresh && !reduced);
  useEffect(() => {
    if (!typing) return;
    const timer = window.setTimeout(() => setTyping(false), 650);
    return () => window.clearTimeout(timer);
  }, [typing]);
  const { persona } = useStage();
  return <div className={s.hostRow}>
    <persona.Face mood={mood} className={s.avatar} />
    <motion.div className={s.bubble} initial={reduced ? false : { opacity: 0, scale: .85, x: 20 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={SPRING}>
      <span className={s.bubbleName}>{host}</span>
      {typing ? <span className={s.typing} aria-label="در حال نوشتن"><i /><i /><i /></span> : <p><Rich text={text} /></p>}
    </motion.div>
  </div>;
}

function StudentLine({ text, reduced }: { text: string; reduced: boolean }) {
  return <motion.div className={s.studentRow} initial={reduced ? false : { opacity: 0, scale: .85, x: -20 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={SPRING}>
    <p className={s.studentBubble}>{text}</p>
  </motion.div>;
}

function Feedback({ message, tone, host, reduced }: { message: string; tone: Tone; host: string; reduced: boolean }) {
  const { persona } = useStage();
  return <AnimatePresence mode="wait">
    {message && <motion.div key={message} className={s.feedback} data-tone={tone} role="status" initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .2 }}>
      <persona.Face mood={tone === "good" ? "cool" : tone === "hint" ? "think" : "wow"} className={s.feedbackFace} />
      <p><b>{host}:</b> <Rich text={message} delay={150} /></p>
    </motion.div>}
  </AnimatePresence>;
}

function Card({ children, className = "", reduced }: { children: ReactNode; className?: string; reduced: boolean }) {
  return <motion.section className={`${s.card} ${className}`} initial={reduced ? false : { opacity: 0, y: 30, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={SPRING}>{children}</motion.section>;
}

/** Where a line comes from in the textbook. */
const Source = ({ src }: { src?: string }) => src ? <p className={s.source}>{src}</p> : null;

/** A marked line (lib/learn/line.ts) as words. With `onTap` every word is a
 *  button; `found` crowns answers; `hint` lights up the prepositions (1) and
 *  then makes the answers pulse (2); `blank` hides the prepositions. */
function LineView({ tokens, onTap, found = [], hint = 0, miss, blank, filled, focus, reduced, big }: {
  tokens: Token[]; onTap?: (i: number) => void; found?: number[]; hint?: number; miss?: number | null;
  blank?: boolean; filled?: boolean; focus?: "yes" | "no" | "ask"; reduced: boolean; big?: boolean;
}) {
  const { persona: { mark } } = useStage();
  return <p className={s.line} data-big={big || undefined}>{tokens.map((token, i) => {
    const king = token.target !== undefined && found.includes(token.target);
    if (blank && token.prep && !filled) return <span key={i} className={s.blank}>؟</span>;
    const props = {
      className: s.word,
      "data-king": king || undefined,
      "data-prep": token.prep && (hint >= 1 || !onTap || filled) || undefined,
      "data-pulse": hint >= 2 && token.target !== undefined && !king || undefined,
      "data-focus": token.focus ? focus ?? "ask" : undefined,
    };
    const inner = <>
      <AnimatePresence>{king && <motion.span className={s.wordCrown} initial={reduced ? false : { y: -30, opacity: 0, rotate: -30 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 420, damping: 12 }} aria-hidden="true">{mark}</motion.span>}</AnimatePresence>
      {token.text}
    </>;
    if (!onTap) return <motion.span key={i} {...props} initial={filled && token.prep && !reduced ? { scale: 1.6, y: -14 } : false} animate={{ scale: 1, y: 0 }} transition={{ type: "spring", stiffness: 400, damping: 14 }}>{inner}</motion.span>;
    return <motion.button key={i} {...props} onClick={() => onTap(i)}
      animate={miss === i && !reduced ? { x: [0, -7, 6, -4, 0] } : king && !reduced ? { y: [0, -8, 0] } : {}} transition={{ duration: .4 }}>{inner}</motion.button>;
  })}</p>;
}

/** One «find the متمم» line: taps, escalating hints, feedback. */
function useTapLine(item: Example, onDone: (clean: boolean) => void) {
  const { persona } = useStage();
  const tokens = useMemo(() => parseLine(item.line), [item.line]);
  const total = targetCount(item.line);
  const [found, setFound] = useState<number[]>([]);
  const [misses, setMisses] = useState(0);
  const [miss, setMiss] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<Tone>("bad");
  const done = found.length === total;
  const glow = persona.glow;
  function tap(i: number) {
    if (done) return;
    const token = tokens[i];
    if (token.target !== undefined) {
      if (found.includes(token.target)) { setTone("hint"); setMessage("اینو گرفتی. بعدی؟"); return; }
      const next = [...found, token.target];
      setFound(next); sound("correct");
      if (next.length === total) { setTone("good"); setMessage(""); onDone(misses === 0); }
      else { setTone("hint"); setMessage(`درسته. ${fa(total - next.length)} تای دیگه مونده.`); }
      return;
    }
    const n = misses + 1;
    setMisses(n); setMiss(i); setTone("bad"); sound("wrong");
    window.setTimeout(() => setMiss(m => m === i ? null : m), 500);
    const w = bare(token.text);
    const dressed = (line: string) => line.replaceAll("%کلمه%", w);
    const why = item.notes?.[w] ?? dressed(token.prep && persona.hint ? persona.hint.miss : persona.miss);
    setMessage(persona.hint && n === glow - 1 ? `${why}\n${persona.hint.when}` : n >= glow ? `${why}\nجواب داره چشمک می‌زنه.` : why);
  }
  return { tokens, total, found, miss, message, tone, tap, done, hint: done ? 0 : misses >= glow ? 2 : persona.hint && misses >= 2 ? 1 : 0, clean: misses === 0 };
}

/* ───────── beats ───────── */

export function ChapterBeat({ beat, reduced }: BeatProps<"chapter">) {
  return <motion.div className={s.chapter} initial={reduced ? false : { opacity: 0, scale: .6, rotate: -6 }} animate={{ opacity: 1, scale: 1, rotate: -1.5 }} transition={{ type: "spring", stiffness: 300, damping: 14 }}>
    <span aria-hidden="true">{beat.emoji}</span><h2>{beat.title}</h2>
  </motion.div>;
}

export function SayBeat({ beat, host, fresh, reduced }: BeatProps<"say">) {
  return <HostLine text={beat.text} mood={beat.mood} host={host} fresh={fresh} reduced={reduced} />;
}

export function AskBeat({ beat, host, fresh, reduced, solved, memo, onMemo }: BeatProps<"ask">) {
  const { name } = useStage();
  return <>
    <HostLine text={beat.text} mood={beat.mood} host={host} fresh={fresh} reduced={reduced} />
    {memo === undefined && !solved ? <motion.div className={s.replies} initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : .7 }}>
      {beat.replies.map((reply, i) => <button key={i} onClick={() => onMemo?.(i)}>{speak(reply.label, name)}</button>)}
    </motion.div> : memo !== undefined && <>
      <StudentLine text={speak(beat.replies[memo].label, name)} reduced={reduced} />
      <HostLine text={beat.replies[memo].answer} mood="cool" host={host} fresh={fresh} reduced={reduced} />
    </>}
  </>;
}

/** The preposition hops onto the next word, the gap closes, a crown lands. */
export function DemoBeat({ beat, reduced }: BeatProps<"demo">) {
  const [stage, setStage] = useState(reduced ? 3 : 0);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const timers = [700, 1500, 2300].map((at, i) => window.setTimeout(() => setStage(i + 1), at));
    return () => timers.forEach(window.clearTimeout);
  }, [run, reduced]);
  const before = beat.words.slice(0, beat.prep), after = beat.words.slice(beat.prep + 2);
  return <Card reduced={reduced} className={s.demo}>
    <div className={s.demoLine}>
      {before.map((word, i) => <span key={`b${i}`} className={s.demoWord}>{word}</span>)}
      <motion.span className={s.demoPair} animate={{ columnGap: stage >= 2 ? 2 : 34 }} transition={SPRING}>
        <motion.span animate={stage === 1 ? { y: [0, -34, 0], rotate: [0, -18, 0] } : { y: 0 }} transition={{ duration: .6 }}>
          <Tick label={beat.words[beat.prep]} className={stage >= 2 ? s.tickHold : ""} />
        </motion.span>
        <span className={s.demoTarget} data-king={stage >= 3 || undefined}>
          <AnimatePresence>{stage >= 3 && <motion.span className={s.demoCrown} initial={{ y: -46, opacity: 0, rotate: -30 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 420, damping: 12 }} aria-hidden="true">👑</motion.span>}</AnimatePresence>
          {beat.words[beat.prep + 1]}
          {stage >= 3 && <motion.small initial={reduced ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>متمم</motion.small>}
        </span>
      </motion.span>
      {after.map((word, i) => <span key={`a${i}`} className={s.demoWord}>{word}</span>)}
    </div>
    <p className={s.demoCaption} data-on={stage >= 3 || undefined}>{beat.caption}</p>
    {!reduced && <button className={s.ghostButton} onClick={() => { setStage(0); setRun(r => r + 1); }}><RotateCcw size={14} /> دوباره</button>}
  </Card>;
}

export function CardsBeat({ beat, reduced, solved, onSolve }: BeatProps<"cards">) {
  const { persona } = useStage();
  const [open, setOpen] = useState<number[]>(() => solved ? beat.cards.map((_, i) => i) : []);
  const [seen, setSeen] = useState<number[]>(() => solved ? beat.cards.map((_, i) => i) : []);
  function flip(i: number) {
    setOpen(open.includes(i) ? open.filter(n => n !== i) : [...open, i]);
    if (seen.includes(i)) return;
    const next = [...seen, i];
    setSeen(next);
    if (!solved && next.length >= beat.need) { sound("correct"); onSolve(true); }
  }
  return <Card reduced={reduced}>
    <p className={s.prompt}><Rich text={beat.prompt} /></p>
    <div className={s.flipGrid}>{beat.cards.map((card, i) => <button key={i} className={s.flip} data-open={open.includes(i) || undefined} onClick={() => flip(i)} aria-label={`کارتِ «${card.front}»`} aria-pressed={open.includes(i)}>
      <motion.span className={s.flipInner} animate={{ rotateY: open.includes(i) ? 180 : 0 }} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 20 }}>
        <span className={s.flipFront}><persona.Chip label={card.front} /></span>
        <span className={s.flipBack}>
          {card.example
            ? <LineView tokens={parseLine(card.example)} found={parseLine(card.example).flatMap(t => t.target === undefined ? [] : [t.target])} reduced />
            : <span className={s.twoMeanings}>{card.meanings?.map((meaning, n) => <b key={n}>{meaning}</b>)}</span>}
          {card.src && <small>{card.src}</small>}
        </span>
      </motion.span>
    </button>)}</div>
    <p className={s.counter} data-done={solved || undefined}>{solved ? <><Check size={15} /> بقیه رو هم اگه خواستی برگردون.</> : `${fa(seen.length)} از ${fa(beat.need)}`}</p>
  </Card>;
}

export function CatchBeat({ beat, reduced, solved, onSolve, host }: BeatProps<"catch">) {
  const { persona } = useStage();
  const [got, setGot] = useState<number[]>(() => solved ? beat.items.flatMap((item, i) => item.ok ? [i] : []) : []);
  const [wrong, setWrong] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<Tone>("bad");
  const total = beat.items.filter(item => item.ok).length;
  function pick(i: number) {
    if (solved || got.includes(i) || wrong.includes(i)) return;
    const item = beat.items[i];
    if (!item.ok) { sound("wrong"); setWrong([...wrong, i]); setTone("bad"); setMessage(item.why); return; }
    const next = [...got, i];
    setGot(next);
    if (next.length === total) { sound("correct"); setTone("good"); setMessage(beat.success); onSolve(wrong.length === 0); }
    else { setTone("hint"); setMessage(`${fa(total - next.length)} تای دیگه مونده.`); }
  }
  return <Card reduced={reduced}>
    <p className={s.prompt}><Rich text={beat.prompt} /></p>
    <div className={s.catchField}>{beat.items.map((item, i) => {
      const state = got.includes(i) ? "got" : wrong.includes(i) ? "wrong" : "free";
      return <motion.button key={i} className={s.catchItem} data-state={state} onClick={() => pick(i)} disabled={state !== "free" || solved}
        animate={state === "wrong" && !reduced ? { x: [0, -8, 7, -5, 3, 0] } : state === "got" && !reduced ? { scale: [1, 1.25, 1] } : {}} transition={{ duration: .4 }}
        style={{ rotate: `${((i * 37) % 11) - 5}deg` }}>
        {state === "got" ? <persona.Chip label={item.text} /> : <span>{item.text}</span>}
        {state === "wrong" && <X size={14} className={s.catchX} />}
      </motion.button>;
    })}</div>
    <p className={s.counter} data-done={solved || undefined}>{fa(got.length)} از {fa(total)}</p>
    <Feedback message={message} tone={solved ? "good" : tone} host={host} reduced={reduced} />
  </Card>;
}

export function TapBeat({ beat, reduced, solved, onSolve, host }: BeatProps<"tap">) {
  const line = useTapLine(beat.item, clean => onSolve(clean));
  const found = solved ? Array.from({ length: line.total }, (_, i) => i) : line.found;
  return <Card reduced={reduced}>
    <p className={s.prompt}><Rich text={beat.prompt} /></p>
    <LineView tokens={line.tokens} onTap={solved ? undefined : line.tap} found={found} hint={line.hint} miss={line.miss} reduced={reduced} big />
    <Source src={beat.item.src} />
    <p className={s.counter} data-done={solved || undefined}>{fa(found.length)} از {fa(line.total)}</p>
    <Feedback message={solved ? beat.success : line.message} tone={solved ? "good" : line.tone} host={host} reduced={reduced} />
  </Card>;
}

/** Progress for a queue of lines, where a missed line comes back at the end. */
function useQueue<T>(items: T[], solved: boolean) {
  const [queue, setQueue] = useState<number[]>(() => solved ? [] : items.map((_, i) => i));
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [slips, setSlips] = useState(0);
  const [round, setRound] = useState(0);
  const [tries, setTries] = useState<Record<number, number>>({});
  const current = queue[0];
  function next(clean: boolean, onEmpty: (clean: boolean) => void) {
    /* سطری که غلط جواب داده شده می‌رود تهِ صف تا دوباره بیاید.
​
       ⚠️ ولی نه بی‌نهایت بار. بعد از سه بار رهایش کن، وگرنه شاگردی که واقعاً
       گیر کرده هیچ راهِ جلو رفتن ندارد — مخصوصاً در قدم‌هایی که یک آیتم
       بیشتر ندارند و صف هیچ‌وقت خالی نمی‌شود. توضیحِ جوابِ درست را هم که
       هر بار دیده است. */
    const seen = (tries[current] ?? 0) + 1;
    setTries(t => ({ ...t, [current]: seen }));
    const rest = clean || seen >= 3 ? queue.slice(1) : [...queue.slice(1), current];
    const s2 = clean ? streak + 1 : 0;
    setStreak(s2); setBest(Math.max(best, s2));
    if (!clean) setSlips(n => n + 1);
    setQueue(rest); setRound(r => r + 1);
    if (!rest.length) onEmpty(slips === 0 && clean);
  }
  return { current, queue, streak, best, next, round, left: queue.length };
}

function QueueHead({ done, total, streak, left }: { done: number; total: number; streak: number; left: number }) {
  return <div className={s.queueHead}>
    <div className={s.queueBar}><motion.i animate={{ width: `${Math.min(1, done / total) * 100}%` }} transition={SPRING} /></div>
    <span className={s.streak} data-hot={streak >= 3 || undefined}><Flame size={14} /> {fa(streak)}</span>
    <span className={s.left}>{fa(left)} تا مونده</span>
  </div>;
}

function RoundLine({ item, onDone, reduced, host }: { item: Example; onDone: (clean: boolean) => void; reduced: boolean; host: string }) {
  const [finished, setFinished] = useState(false);
  const line = useTapLine(item, clean => { setFinished(true); window.setTimeout(() => onDone(clean), clean ? 900 : 1500); });
  return <motion.div initial={reduced ? false : { opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={SPRING}>
    <LineView tokens={line.tokens} onTap={finished ? undefined : line.tap} found={line.found} hint={line.hint} miss={line.miss} reduced={reduced} big />
    <Source src={item.src} />
    <Feedback message={finished ? line.clean ? "درسته." : "درسته. اگه لازم باشه این سطر دوباره میاد." : line.message} tone={finished ? "good" : line.tone} host={host} reduced={reduced} />
  </motion.div>;
}

export function RoundBeat({ beat, reduced, solved, onSolve, host }: BeatProps<"round">) {
  const q = useQueue(beat.items, solved);
  const done = solved ? beat.items.length : beat.items.length - new Set(q.queue).size;
  return <Card reduced={reduced}>
    <p className={s.prompt}><Rich text={beat.prompt} /></p>
    <QueueHead done={done} total={beat.items.length} streak={q.streak} left={solved ? 0 : q.left} />
    {solved || q.current === undefined
      ? <Feedback message={beat.success} tone="good" host={host} reduced={reduced} />
      : <RoundLine key={q.round} item={beat.items[q.current]} reduced={reduced} host={host} onDone={clean => q.next(clean, onSolve)} />}
  </Card>;
}

function FillLine({ item, onDone, reduced, host }: { item: Of<"fill">["items"][number]; onDone: (clean: boolean) => void; reduced: boolean; host: string }) {
  const tokens = useMemo(() => parseLine(item.line), [item.line]);
  const answer = tokens.find(t => t.prep)!.text;
  const [out, setOut] = useState<string[]>([]);
  const [filled, setFilled] = useState(false);
  function pick(option: string) {
    if (filled || out.includes(option)) return;
    if (option === answer) { sound("correct"); setFilled(true); window.setTimeout(() => onDone(out.length === 0), out.length ? 1600 : 1100); return; }
    sound("wrong"); setOut([...out, option]);
  }
  return <motion.div initial={reduced ? false : { opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={SPRING}>
    <LineView tokens={tokens} blank filled={filled} found={filled ? tokens.flatMap(t => t.target === undefined ? [] : [t.target]) : []} reduced={reduced} big />
    <Source src={item.src} />
    <div className={s.chips}>{item.options.map(option => <motion.button key={option} onClick={() => pick(option)} disabled={filled || out.includes(option)}
      data-state={filled && option === answer ? "right" : out.includes(option) ? "out" : "open"}
      animate={out.at(-1) === option && !reduced ? { x: [0, -8, 7, -4, 0] } : {}} transition={{ duration: .4 }}>{option}</motion.button>)}</div>
    <Feedback message={filled ? out.length ? "درسته. این یکی آخر دور دوباره میاد." : "درسته." : out.length ? item.why : ""} tone={filled ? "good" : "bad"} host={host} reduced={reduced} />
  </motion.div>;
}

export function FillBeat({ beat, reduced, solved, onSolve, host }: BeatProps<"fill">) {
  const q = useQueue(beat.items, solved);
  const done = solved ? beat.items.length : beat.items.length - new Set(q.queue).size;
  return <Card reduced={reduced}>
    <p className={s.prompt}><Rich text={beat.prompt} /></p>
    <QueueHead done={done} total={beat.items.length} streak={q.streak} left={solved ? 0 : q.left} />
    {solved || q.current === undefined
      ? <Feedback message={beat.success} tone="good" host={host} reduced={reduced} />
      : <FillLine key={q.round} item={beat.items[q.current]} reduced={reduced} host={host} onDone={clean => q.next(clean, onSolve)} />}
  </Card>;
}

function JudgeLine({ item, onDone, reduced, host }: { item: Of<"judge">["items"][number]; onDone: (clean: boolean) => void; reduced: boolean; host: string }) {
  const tokens = useMemo(() => parseLine(item.line), [item.line]);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const right = answer === item.yes;
  function decide(yes: boolean) {
    if (answer !== null) return;
    setAnswer(yes); sound(yes === item.yes ? "correct" : "wrong");
    if (yes === item.yes) window.setTimeout(() => onDone(true), 1300);
  }
  const { persona } = useStage();
  return <div className={s.judge}>
    <motion.div className={s.judgeCard} drag={answer === null && !reduced ? "x" : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={.6}
      onDragEnd={(_, info) => { if (Math.abs(info.offset.x) > 90) decide(info.offset.x > 0); }}
      initial={reduced ? false : { opacity: 0, y: 30, rotate: -3 }}
      animate={answer === null ? { opacity: 1, y: 0, rotate: 0, x: 0 } : { y: 0, x: right ? (answer ? 60 : -60) : 0, rotate: right ? (answer ? 5 : -5) : 0, opacity: 1 }}
      transition={SPRING} data-verdict={answer === null ? undefined : right ? "right" : "wrong"}>
      <LineView tokens={tokens} focus={answer === null ? "ask" : item.yes ? "yes" : "no"} reduced={reduced} big />
      <Source src={item.src} />
    </motion.div>
    <div className={s.judgeButtons}>
      <button onClick={() => decide(true)} disabled={answer !== null} data-picked={answer === true || undefined}><Check size={18} /> {persona.judge[0]}</button>
      <button onClick={() => decide(false)} disabled={answer !== null} data-picked={answer === false || undefined}><X size={18} /> {persona.judge[1]}</button>
    </div>
    <Feedback message={answer === null ? "" : right ? `درسته. ${item.why}` : item.why} tone={answer === null ? "hint" : right ? "good" : "bad"} host={host} reduced={reduced} />
    {answer !== null && !right && <button className={s.primaryButton} onClick={() => onDone(false)} autoFocus>فهمیدم، بعدی <ArrowLeft size={16} /></button>}
  </div>;
}

export function JudgeBeat({ beat, reduced, solved, onSolve, host }: BeatProps<"judge">) {
  const q = useQueue(beat.items, solved);
  const done = solved ? beat.items.length : beat.items.length - new Set(q.queue).size;
  return <Card reduced={reduced}>
    <p className={s.prompt}><Rich text={beat.prompt} /></p>
    <QueueHead done={done} total={beat.items.length} streak={q.streak} left={solved ? 0 : q.left} />
    {solved || q.current === undefined
      ? <Feedback message={beat.success} tone="good" host={host} reduced={reduced} />
      : <JudgeLine key={q.round} item={beat.items[q.current]} reduced={reduced} host={host} onDone={clean => q.next(clean, onSolve)} />}
  </Card>;
}

export function ChoiceBeat({ beat, reduced, solved, onSolve, host }: BeatProps<"choice">) {
  const [out, setOut] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const correct = beat.options.findIndex(option => option.correct);
  function pick(i: number) {
    if (solved || out.includes(i)) return;
    if (i === correct) { sound("correct"); setMessage(beat.success); onSolve(out.length === 0); return; }
    sound("wrong"); setOut([...out, i]); setMessage(beat.options[i].why);
  }
  return <Card reduced={reduced}>
    <p className={s.prompt}><Rich text={beat.prompt} /></p>
    {beat.stimulus && <p className={s.stimulus}><Rich text={beat.stimulus} /></p>}
    <Source src={beat.src} />
    <div className={s.options}>{beat.options.map((option, i) => {
      const state = solved ? i === correct ? "right" : "idle" : out.includes(i) ? "out" : "open";
      return <motion.button key={i} data-state={state} onClick={() => pick(i)} disabled={state !== "open"}
        animate={state === "out" && !reduced ? { x: [0, -9, 8, -5, 3, 0] } : {}} transition={{ duration: .4 }}
        whileHover={state === "open" && !reduced ? { scale: 1.02 } : undefined} whileTap={state === "open" && !reduced ? { scale: .97 } : undefined}>
        <span>{state === "right" ? <Check size={14} /> : state === "out" ? <X size={14} /> : fa(i + 1)}</span><Rich text={option.text} />
      </motion.button>;
    })}</div>
    <Feedback message={solved ? beat.success : message} tone={solved ? "good" : "bad"} host={host} reduced={reduced} />
  </Card>;
}

export function TipBeat({ beat, reduced, fresh }: BeatProps<"tip">) {
  const lean = beat.lean ?? [];
  const [shown, setShown] = useState(reduced || !fresh ? lean.length : 0);
  useEffect(() => {
    if (shown >= lean.length) return;
    const timer = window.setTimeout(() => setShown(n => n + 1), 750);
    return () => window.clearTimeout(timer);
  }, [shown, lean.length]);
  const ready = shown >= lean.length;
  return <motion.section className={s.tip} initial={reduced ? false : { opacity: 0, scale: .9, rotate: 1.5 }} animate={{ opacity: 1, scale: 1 + (ready ? 0 : shown * .015), rotate: 0 }} transition={SPRING}>
    <span className={s.tipLabel}><Lightbulb size={15} /> {beat.title}</span>
    {lean.length > 0 && <div className={s.lean}>{lean.slice(0, shown).map((line, i) => <motion.p key={i} style={{ fontSize: `${17 + i * 5}px` }} initial={reduced ? false : { opacity: 0, x: 30, scale: .7 }} animate={{ opacity: ready ? .55 : 1, x: 0, scale: 1 }} transition={{ type: "spring", stiffness: 400, damping: 18 }}>{line}</motion.p>)}</div>}
    {ready && beat.body.map((line, i) => <motion.p key={i} className={s.tipLine} initial={reduced ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : i * .25 }}><Rich text={line} delay={500 + i * 400} /></motion.p>)}
  </motion.section>;
}

export function DetourBeat({ beat, reduced }: BeatProps<"detour">) {
  const [open, setOpen] = useState(false);
  const live = hasLessonPath(beat.to);
  return <Card reduced={reduced} className={s.detour}>
    <p className={s.prompt}><Rich text={beat.text} /></p>
    <div className={s.detourActions}>
      {live ? <Link className={s.primaryButton} href={beat.to}>{beat.label} <ArrowUpLeft size={16} /></Link>
        : <span className={s.soon} title="این صفحه هنوز آماده نیست">{beat.label} <small>به‌زودی</small></span>}
      <button className={s.ghostButton} onClick={() => setOpen(o => !o)} aria-expanded={open}>{open ? "بستن" : beat.recap.title}</button>
    </div>
    <AnimatePresence initial={false}>{open && <motion.div className={s.recap} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
      <dl>{beat.recap.rows.map(([term, meaning]) => <div key={term}><dt>{term}</dt><dd>{meaning}</dd></div>)}</dl>
      <p className={s.stimulus}><Rich text={beat.recap.example} /></p>
    </motion.div>}</AnimatePresence>
  </Card>;
}

/* ───────── دو نقاب ───────── */

/** ترتیبِ ثابتِ گزینه‌ها. تصادفیِ واقعی نه: سرور و مرورگر باید یک چیز بسازند،
 *  وگرنه هیدریشن سرِ همین چند تا دکمه می‌شکند. */
const rank = (text: string) => [...text].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 7);
const shuffle = <T,>(items: T[], of: (item: T) => string) => [...items].sort((a, b) => rank(of(a)) - rank(of(b)));

/** نمایشِ خودکارِ دو معنی: نقاب اول می‌افتد، نقاب دوم می‌آید، بعد هر دو با هم. */
export function DuoBeat({ beat, reduced }: BeatProps<"duo">) {
  const tokens = useMemo(() => parseLine(beat.line), [beat.line]);
  const [stage, setStage] = useState(reduced ? 3 : 0);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const timers = [700, 2000, 3400].map((at, i) => window.setTimeout(() => setStage(i + 1), at));
    return () => timers.forEach(window.clearTimeout);
  }, [run, reduced]);
  const faces = ["🙂", "😏", "🎭"];
  const face = stage >= 3 ? 2 : stage - 1;
  return <Card reduced={reduced} className={s.duo}>
    <p className={s.line} data-big>{tokens.map((token, i) => token.focus
      ? <span key={i} className={s.word} data-focus={stage >= 3 ? "yes" : "ask"}>
        <AnimatePresence mode="wait">{stage >= 1 && <motion.span key={face} className={s.wordCrown}
          initial={reduced ? false : { y: -26, opacity: 0, rotate: -25 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: -20, opacity: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 13 }} aria-hidden="true">{faces[face]}</motion.span>}</AnimatePresence>
        {token.text}
      </span>
      : <span key={i} className={s.word}>{token.text}</span>)}</p>
    <Source src={beat.src} />
    <div className={s.duoMeanings}>
      {[beat.a, beat.b].map((meaning, i) => <motion.span key={i} className={s.duoMeaning}
        animate={{ opacity: stage >= 3 || stage === i + 1 ? 1 : .18, y: stage >= 3 || stage === i + 1 ? 0 : 6 }} transition={{ duration: .35 }}>
        <b>{fa(i + 1)}</b> {meaning}
      </motion.span>)}
    </div>
    <p className={s.demoCaption} data-on={stage >= 3 || undefined}><Rich text={beat.caption} delay={200} /></p>
    {!reduced && <button className={s.ghostButton} onClick={() => { setStage(0); setRun(r => r + 1); }}><RotateCcw size={14} /> دوباره</button>}
  </Card>;
}

/** یک کلمهٔ `|…|` و چند معنی ریخته روی میز: هر دو نقابِ درست را باید برداری. */
function MaskLine({ item, onDone, reduced, host }: { item: Of<"masks">["items"][number]; onDone: (clean: boolean) => void; reduced: boolean; host: string }) {
  const tokens = useMemo(() => parseLine(item.line), [item.line]);
  const options = useMemo(() => shuffle([...item.meanings, ...item.decoys], meaning => meaning), [item]);
  const [found, setFound] = useState<string[]>([]);
  const [out, setOut] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<Tone>("hint");
  const done = found.length === 2;
  function pick(option: string) {
    if (done || found.includes(option) || out.includes(option)) return;
    if (item.meanings.includes(option)) {
      const next = [...found, option];
      setFound(next); sound("correct"); setTone("good");
      if (next.length === 2) { setMessage(item.why); window.setTimeout(() => onDone(out.length === 0), 2400); }
      else setMessage("یه نقاب افتاد. حالا اون یکی معنیش کدومه؟");
      return;
    }
    sound("wrong"); setOut([...out, option]); setTone("bad");
    setMessage("نچ. این معنی توی این سطر ==جا نمی‌افته==. هر دو معنی باید با خودِ جمله جور دربیان.");
  }
  return <motion.div initial={reduced ? false : { opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={SPRING}>
    <LineView tokens={tokens} focus={done ? "yes" : "ask"} reduced={reduced} big />
    <Source src={item.src} />
    <div className={s.slots}>{[0, 1].map(i => <div key={i} className={s.slot} data-filled={found[i] ? true : undefined}>
      <span aria-hidden="true">{found[i] ? (i ? "😏" : "🙂") : "🎭"}</span>
      {found[i]
        ? <motion.b initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>{found[i]}</motion.b>
        : <i>نقابِ {i ? "دوم" : "اول"}</i>}
    </div>)}</div>
    <div className={s.maskOptions}>{options.map(option => <motion.button key={option} onClick={() => pick(option)} disabled={done || found.includes(option) || out.includes(option)}
      data-state={found.includes(option) ? "right" : out.includes(option) ? "out" : "open"}
      animate={out.at(-1) === option && !reduced ? { x: [0, -8, 7, -4, 0] } : {}} transition={{ duration: .4 }}>{option}</motion.button>)}</div>
    <Feedback message={message} tone={tone} host={host} reduced={reduced} />
  </motion.div>;
}

export function MasksBeat({ beat, reduced, solved, onSolve, host }: BeatProps<"masks">) {
  const q = useQueue(beat.items, solved);
  const done = solved ? beat.items.length : beat.items.length - new Set(q.queue).size;
  return <Card reduced={reduced}>
    <p className={s.prompt}><Rich text={beat.prompt} /></p>
    <QueueHead done={done} total={beat.items.length} streak={q.streak} left={solved ? 0 : q.left} />
    {solved || q.current === undefined
      ? <Feedback message={beat.success} tone="good" host={host} reduced={reduced} />
      : <MaskLine key={q.round} item={beat.items[q.current]} reduced={reduced} host={host} onDone={clean => q.next(clean, onSolve)} />}
  </Card>;
}

/** کلمه را به معنیِ پنهانش وصل کن: اول از ستون راست، بعد از ستون چپ. */
export function PairBeat({ beat, reduced, solved, onSolve, host }: BeatProps<"pair">) {
  const right = useMemo(() => shuffle(beat.rows, row => row.hidden), [beat.rows]);
  const [tied, setTied] = useState<string[]>(() => solved ? beat.rows.map(row => row.word) : []);
  const [held, setHeld] = useState<string | null>(null);
  const [bad, setBad] = useState<string | null>(null);
  const [slips, setSlips] = useState(0);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<Tone>("hint");
  function join(hidden: string) {
    if (solved || tied.length === beat.rows.length) return;
    if (!held) { setTone("hint"); setMessage("اول یه کلمه از ستون راست بردار، بعد بیا این‌ور."); return; }
    const row = beat.rows.find(item => item.word === held)!;
    if (row.hidden !== hidden) {
      sound("wrong"); setSlips(n => n + 1); setBad(hidden); setTone("bad");
      setMessage(`«${row.word}» این معنی رو نمی‌ده. دوباره نگاه کن.`);
      window.setTimeout(() => setBad(value => value === hidden ? null : value), 500);
      return;
    }
    const next = [...tied, held];
    sound("correct"); setTied(next); setHeld(null); setTone("good");
    if (next.length === beat.rows.length) { setMessage(beat.success); onSolve(slips === 0); }
    else setMessage(`درسته. ${fa(beat.rows.length - next.length)} تای دیگه مونده.`);
  }
  return <Card reduced={reduced}>
    <p className={s.prompt}><Rich text={beat.prompt} /></p>
    <div className={s.pairGrid}>
      <div className={s.pairColumn}>{beat.rows.map(row => <button key={row.word} className={s.pairWord}
        data-state={tied.includes(row.word) ? "tied" : held === row.word ? "held" : "open"}
        disabled={tied.includes(row.word) || solved} onClick={() => { setHeld(row.word); setMessage(""); }}>
        <b>{row.word}</b><small>{row.seen}</small>
      </button>)}</div>
      <div className={s.pairColumn}>{right.map(row => <motion.button key={row.hidden} className={s.pairMeaning}
        data-state={tied.includes(row.word) ? "tied" : "open"} disabled={tied.includes(row.word) || solved} onClick={() => join(row.hidden)}
        animate={bad === row.hidden && !reduced ? { x: [0, -8, 7, -4, 0] } : {}} transition={{ duration: .4 }}>
        {tied.includes(row.word) ? <Check size={14} /> : <span aria-hidden="true">🎭</span>}{row.hidden}
      </motion.button>)}</div>
    </div>
    <p className={s.counter} data-done={tied.length === beat.rows.length || undefined}>{fa(tied.length)} از {fa(beat.rows.length)}</p>
    <Feedback message={solved ? beat.success : message} tone={solved ? "good" : tone} host={host} reduced={reduced} />
  </Card>;
}

/** فهرستِ مرجعِ ته درس. گیت نیست؛ برای همین جست‌وجو دارد و شمارش ندارد. */
export function ListBeat({ beat, reduced }: BeatProps<"list">) {
  const [query, setQuery] = useState("");
  const needle = query.trim();
  const rows = needle ? beat.rows.filter(row => `${row.word} ${row.a} ${row.b}`.includes(needle)) : beat.rows;
  return <Card reduced={reduced} className={s.listCard}>
    <p className={s.prompt}>{beat.title}</p>
    <p className={s.listIntro}><Rich text={beat.intro} /></p>
    <label className={s.search}>
      <Search size={16} />
      <input value={query} onChange={event => setQuery(event.target.value)} placeholder="دنبال کلمه‌ای می‌گردی؟" aria-label="جست‌وجو در فهرست" />
    </label>
    <div className={s.listGrid}>{rows.map(row => <div key={row.word} className={s.listItem}>
      <b>{row.word}</b>
      <span><i aria-hidden="true">🙂</i> {row.a}</span>
      <span><i aria-hidden="true">😏</i> {row.b}</span>
    </div>)}</div>
    <p className={s.counter}>{rows.length ? `${fa(rows.length)} کلمه` : "چیزی پیدا نشد. یه جور دیگه بنویس."}</p>
  </Card>;
}

/* ───────── ارکان ───────── */

/** یک سطر و چند رکن: هر بار یک رکن پرسیده می‌شود و شاگرد روی کلمه‌اش می‌زند.
 *  رکنی که پیدا شد، برچسبش را نگه می‌دارد تا آخرِ سطر همه‌شان کنار هم باشند. */
function PillarLine({ item, onDone, reduced, host }: { item: Of<"pillars">["items"][number]; onDone: (clean: boolean) => void; reduced: boolean; host: string }) {
  const { persona } = useStage();
  const tokens = useMemo(() => parseLine(item.line), [item.line]);
  const order = useMemo(() => item.ask ?? item.roles.map((_, i) => i), [item]);
  const [found, setFound] = useState<number[]>([]);
  const [misses, setMisses] = useState(0);
  const [miss, setMiss] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<Tone>("hint");
  const done = found.length === order.length;
  const want = order[found.length];

  function tap(i: number) {
    if (done) return;
    const token = tokens[i];
    if (token.target === want) {
      const next = [...found, want];
      setFound(next); sound("correct"); setTone("good");
      if (next.length === order.length) { setMessage(item.why); window.setTimeout(() => onDone(misses === 0), 2400); }
      else setMessage(`درسته. حالا «${item.roles[order[next.length]]}» کدومه؟`);
      return;
    }
    const n = misses + 1;
    setMisses(n); setMiss(i); setTone("bad"); sound("wrong");
    window.setTimeout(() => setMiss(m => m === i ? null : m), 500);
    const word = bare(token.text);
    // رکنی که قبلاً زده شده، اشتباهِ تازه‌ای نیست — فقط جایش را یادآوری کن.
    const already = token.target !== undefined && found.includes(token.target);
    const why = already ? `«${word}» رو قبلاً زدی؛ اون «${item.roles[token.target!]}» بود.`
      : item.notes?.[word] ?? persona.miss.replaceAll("%کلمه%", word);
    setMessage(n >= persona.glow && !already ? `${why}\nجواب داره چشمک می‌زنه.` : why);
  }

  const hint = done || misses < persona.glow ? 0 : 2;
  return <motion.div initial={reduced ? false : { opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={SPRING}>
    <p className={s.wanted}>روی <b>{item.roles[want] ?? ""}</b> بزن</p>
    <PillarView tokens={tokens} roles={item.roles} found={found} want={want} hint={hint} miss={miss} onTap={done ? undefined : tap} reduced={reduced} />
    <Source src={item.src} />
    <div className={s.pillarSlots}>{order.map((role, i) => <span key={role} className={s.pillarSlot} data-on={i < found.length || undefined}>
      {i < found.length ? <Check size={13} /> : <i>{fa(i + 1)}</i>}{item.roles[role]}
    </span>)}</div>
    <Feedback message={message} tone={tone} host={host} reduced={reduced} />
  </motion.div>;
}

/** مثل `LineView`، ولی هر گروهِ پیداشده برچسبِ رکنش را بالای سرش نگه می‌دارد. */
function PillarView({ tokens, roles, found, want, hint, miss, onTap, reduced }: {
  tokens: Token[]; roles: string[]; found: number[]; want: number; hint: number; miss: number | null;
  onTap?: (i: number) => void; reduced: boolean;
}) {
  return <p className={s.line} data-big>{tokens.map((token, i) => {
    const got = token.target !== undefined && found.includes(token.target);
    // فقط اولین کلمهٔ هر گروه برچسب می‌گیرد، وگرنه برچسب تکرار می‌شود.
    const head = got && tokens[i - 1]?.target !== token.target;
    const props = {
      className: s.word,
      "data-king": got || undefined,
      "data-pulse": hint >= 2 && token.target === want && !got || undefined,
    };
    const inner = <>
      {head && <motion.span className={s.roleTag} initial={reduced ? false : { y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 16 }}>{roles[token.target!]}</motion.span>}
      {token.text}
    </>;
    if (!onTap) return <span key={i} {...props}>{inner}</span>;
    return <motion.button key={i} {...props} onClick={() => onTap(i)}
      animate={miss === i && !reduced ? { x: [0, -7, 6, -4, 0] } : got && !reduced ? { y: [0, -8, 0] } : {}} transition={{ duration: .4 }}>{inner}</motion.button>;
  })}</p>;
}

export function PillarsBeat({ beat, reduced, solved, onSolve, host }: BeatProps<"pillars">) {
  const q = useQueue(beat.items, solved);
  const done = solved ? beat.items.length : beat.items.length - new Set(q.queue).size;
  return <Card reduced={reduced}>
    <p className={s.prompt}><Rich text={beat.prompt} /></p>
    <QueueHead done={done} total={beat.items.length} streak={q.streak} left={solved ? 0 : q.left} />
    {solved || q.current === undefined
      ? <Feedback message={beat.success} tone="good" host={host} reduced={reduced} />
      : <PillarLine key={q.round} item={beat.items[q.current]} reduced={reduced} host={host} onDone={clean => q.next(clean, onSolve)} />}
  </Card>;
}

/** دوراهیِ ته درس. جوابِ «نه» در `LessonPlayer` به جمع‌بندی می‌پرد. */
export function ForkBeat({ beat, host, fresh, reduced, memo, onMemo }: BeatProps<"fork">) {
  return <>
    <HostLine text={beat.text} mood={beat.mood} host={host} fresh={fresh} reduced={reduced} />
    {memo === undefined ? <motion.div className={s.replies} initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduced ? 0 : .7 }}>
      <button onClick={() => onMemo?.(0)}>{beat.yes}</button>
      <button onClick={() => onMemo?.(1)}>{beat.no}</button>
    </motion.div> : <>
      <StudentLine text={memo === 0 ? beat.yes : beat.no} reduced={reduced} />
      <HostLine text={memo === 0 ? beat.yesReply : beat.noReply} mood="cool" host={host} fresh={fresh} reduced={reduced} />
    </>}
  </>;
}
