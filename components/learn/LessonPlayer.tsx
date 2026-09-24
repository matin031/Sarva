"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Star, Volume2, VolumeX } from "lucide-react";
import { isGate, isScored, type Beat, type Lesson } from "@/lib/learn/types";
import { isSoundMuted, setSoundMuted } from "@/lib/exam/feedback-sfx";
import { AskBeat, CardsBeat, CatchBeat, ChapterBeat, ChoiceBeat, DemoBeat, DetourBeat, DuoBeat, FillBeat, ForkBeat, JudgeBeat, ListBeat, MasksBeat, PairBeat, PillarsBeat, RoundBeat, SayBeat, TapBeat, TipBeat, fa, type BeatProps } from "./Beats";
import { LessonStage, PERSONAS, useStage } from "./persona";
import { Rich } from "./Rich";
import s from "./learn.module.css";

type Saved = { step: number; solved: number[]; stars: number; memo: Record<number, number> };
const EMPTY: Saved = { step: 0, solved: [], stars: 0, memo: {} };

/** Skip past chapter headings so a heading always arrives with its first line. */
function advance(beats: Beat[], from: number) {
  let next = from + 1;
  while (beats[next]?.kind === "chapter" && next < beats.length - 1) next++;
  return next;
}

function Confetti() {
  const colors = ["#f5c542", "#ff8fa3", "#7fd1c7", "#a99af0", "#9ed27f", "#008687"];
  return <span className={s.confetti} aria-hidden="true">{Array.from({ length: 28 }, (_, i) => {
    const angle = (i / 28) * Math.PI * 2, distance = 110 + (i % 4) * 34;
    return <motion.i key={i} style={{ background: colors[i % colors.length], borderRadius: i % 3 ? "50%" : 3 }}
      initial={{ x: 0, y: 0, scale: 0 }} animate={{ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance + 40, scale: [0, 1.3, 0], rotate: 360 }} transition={{ duration: 1.3, ease: "easeOut", delay: (i % 5) * .04 }} />;
  })}</span>;
}

function Finish({ beat, stars, gates, onRestart, reduced }: { beat: Extract<Beat, { kind: "finish" }>; stars: number; gates: number; onRestart: () => void; reduced: boolean }) {
  const { persona } = useStage();
  return <motion.section className={s.finish} initial={reduced ? false : { opacity: 0, scale: .85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", stiffness: 240, damping: 18 }}>
    {!reduced && <Confetti />}
    <persona.Face mood="cool" className={s.finishHost} />
    <h2>{persona.finish}</h2>
    <p className={s.finishStars}><Star size={18} fill="currentColor" /> {fa(stars)} از {fa(gates)} سؤال رو بار اول درست زدی</p>
    <ul>{beat.learned.map((item, i) => <motion.li key={i} initial={reduced ? false : { opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: reduced ? 0 : .4 + i * .12 }}><Check size={16} /><Rich text={item} /></motion.li>)}</ul>
    <div className={s.finishActions}>
      <button className={s.ghostButton} onClick={onRestart}><RotateCcw size={15} /> از اول</button>
      <Link className={s.primaryButton} href="/doroos">درسنامه‌ها <ArrowLeft size={16} /></Link>
    </div>
  </motion.section>;
}

/** `name` نام کوچکِ کاربرِ واردشده است و جای `%نام%`ها را می‌گیرد. درس‌هایی که
 *  `needsName` دارند از صفحه‌شان ورود می‌خواهند، پس اینجا همیشه پر است. */
export default function LessonPlayer({ lesson, name = "رفیق" }: { lesson: Lesson; name?: string }) {
  const beats = lesson.beats;
  const key = `sarva-learn-${lesson.slug}-v1`;
  const reduced = useReducedMotion() ?? false;
  const first = advance(beats, -1);
  const start: Saved = { ...EMPTY, step: first };
  const [state, setState] = useState<Saved>(start);
  const [restored, setRestored] = useState(0);
  const [muted, setMuted] = useState(false);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const nextButton = useRef<HTMLButtonElement>(null);
  const { step, solved, stars, memo } = state;
  const persona = PERSONAS[lesson.character];
  const stage = useMemo(() => ({ persona, host: lesson.host, name }), [persona, lesson.host, name]);
  const current = beats[step];
  const open = !isGate(current) || solved.includes(step);
  const scored = beats.filter(isScored).length;
  const chapters = beats.flatMap((beat, i) => beat.kind === "chapter" ? [{ i, title: beat.title, emoji: beat.emoji }] : []);
  const progress = step / (beats.length - 1);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) ?? "null") as Saved | null;
      // Restore browser-only progress after hydration, never in server render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && typeof saved.step === "number" && saved.step < beats.length) { setState(saved); setRestored(saved.step); }
    } catch { /* a fresh start still works */ }
    setMuted(isSoundMuted());
  }, [key, beats.length]);

  function save(next: Saved) {
    setState(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* progress just won't survive a reload */ }
  }

  // Bring each new step into view, and put the continue button under the keyboard.
  useEffect(() => {
    if (step <= Math.max(restored, first)) return;
    const el = refs.current[step];
    if (!el) return;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
  }, [step, restored, first, reduced]);
  useEffect(() => { if (open) nextButton.current?.focus({ preventScroll: true }); }, [open, step]);

  const solve = (i: number) => (firstTry: boolean) => {
    if (solved.includes(i)) return;
    save({ ...state, solved: [...solved, i], stars: stars + (firstTry && isScored(beats[i]) ? 1 : 0) });
  };
  const restart = () => { save(start); setRestored(0); window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }); };
  /* دوراهی: «نه» (یعنی memo === 1) بخشِ تخصصی را رد می‌کند و یک‌راست
     به جمع‌بندی می‌رود. عمداً با `findIndex` و نه یک عددِ دستی، وگرنه اضافه‌کردنِ
     یک قدمِ تازه بی‌صدا پرش را خراب می‌کرد. */
  const skipToFinish = current.kind === "fork" && memo[step] === 1;
  const stepAfter = () => skipToFinish ? beats.findIndex(b => b.kind === "finish") : advance(beats, step);
  const nextLabel = current.kind === "say" && current.next ? current.next : "ادامه";

  function render(beat: Beat, i: number): ReactNode {
    const props = { solved: solved.includes(i), onSolve: solve(i), reduced, fresh: i === step && i > restored, host: lesson.host, memo: memo[i], onMemo: (value: number) => save({ ...state, memo: { ...memo, [i]: value }, solved: [...solved, i] }) };
    switch (beat.kind) {
      case "chapter": return <ChapterBeat beat={beat} {...props} />;
      case "say": return <SayBeat beat={beat} {...props} />;
      case "ask": return <AskBeat beat={beat} {...props} />;
      case "fork": return <ForkBeat beat={beat} {...props} />;
      case "demo": return <DemoBeat beat={beat} {...props} />;
      case "duo": return <DuoBeat beat={beat} {...props} />;
      case "cards": return <CardsBeat beat={beat} {...props} />;
      case "catch": return <CatchBeat beat={beat} {...props} />;
      case "tap": return <TapBeat beat={beat} {...props} />;
      case "round": return <RoundBeat beat={beat} {...props} />;
      case "fill": return <FillBeat beat={beat} {...props} />;
      case "judge": return <JudgeBeat beat={beat} {...props} />;
      case "masks": return <MasksBeat beat={beat} {...props} />;
      case "pair": return <PairBeat beat={beat} {...props} />;
      case "pillars": return <PillarsBeat beat={beat} {...props} />;
      case "choice": return <ChoiceBeat beat={beat} {...props} />;
      case "tip": return <TipBeat beat={beat} {...props} />;
      case "list": return <ListBeat beat={beat} {...props} />;
      case "detour": return <DetourBeat beat={beat} {...props} />;
      case "finish": return <Finish beat={beat} stars={stars} gates={scored} onRestart={restart} reduced={reduced} />;
    }
  }

  return <LessonStage value={stage}><div className={s.page} data-lesson={lesson.character} dir="rtl">
    <header className={s.bar}>
      <Link href="/doroos" className={s.barBack} aria-label="بازگشت به درسنامه‌ها"><ArrowRight size={18} /></Link>
      <div className={s.barTitle}><persona.Face mood="cool" className={s.barHost} /><strong>{lesson.title}</strong></div>
      <div className={s.track} role="progressbar" aria-label="پیشرفت درس" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <motion.i className={s.trackFill} animate={{ width: `${progress * 100}%` }} transition={{ type: "spring", stiffness: 120, damping: 22 }} />
        {chapters.map(chapter => <span key={chapter.i} className={s.trackStop} style={{ right: `${chapter.i / (beats.length - 1) * 100}%` }} data-on={step >= chapter.i || undefined} title={chapter.title}>{chapter.emoji}</span>)}
      </div>
      <span className={s.stars} title="سؤال‌هایی که بار اول درست زدی"><Star size={15} fill="currentColor" /> {fa(stars)}</span>
      <button className={s.iconButton} onClick={() => { setSoundMuted(!muted); setMuted(!muted); }} aria-label={muted ? "روشن کردن صدا" : "بی‌صدا"}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
      {step > first && <button className={s.iconButton} onClick={restart} aria-label="شروع از اول" title="از اول"><RotateCcw size={16} /></button>}
    </header>

    <main className={s.feed}>
      <div className={s.intro}>
        <persona.Face mood="cool" className={s.introHost} />
        <h1>{lesson.title}</h1>
        <p>{lesson.description}</p>
      </div>
      {beats.slice(0, step + 1).map((beat, i) => <div key={i} ref={el => { refs.current[i] = el; }} className={s.beat} data-kind={beat.kind}>{render(beat, i)}</div>)}
      <div className={s.nextRow}>
        <AnimatePresence mode="wait">
          {current.kind !== "finish" && (open
            ? <motion.button key={`n${step}`} ref={nextButton} className={s.nextButton} onClick={() => save({ ...state, step: stepAfter() })}
              initial={reduced ? false : { opacity: 0, y: 14, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: .9 }} transition={{ type: "spring", stiffness: 380, damping: 22, delay: reduced ? 0 : current.kind === "say" ? .7 : .2 }}
              whileHover={reduced ? undefined : { scale: 1.04 }} whileTap={reduced ? undefined : { scale: .95 }}>{nextLabel} <ArrowLeft size={18} /></motion.button>
            : <motion.p key={`w${step}`} className={s.waiting} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>{current.kind === "ask" || current.kind === "fork" ? "جوابت رو انتخاب کن 👆" : "اول جواب درست رو پیدا کن تا بریم جلو 👆"}</motion.p>)}
        </AnimatePresence>
      </div>
    </main>
  </div></LessonStage>;
}

export type { BeatProps };
