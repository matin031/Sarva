"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring } from "motion/react";
import { ArrowLeft, Check, Clock3, Layers3, Lock, Play } from "lucide-react";
import type { LessonCard } from "@/lib/learn";
import type { CharacterId } from "@/lib/learn/types";
import { PERSONAS } from "../persona";
import LensHero from "./LensHero";
import s from "./hub.module.css";
import lx from "../learn.module.css";

/** فهرستِ درسنامه‌های تعاملی (`/learn`).
 *
 *  سه بخش: سردر با «یه جمله، دو تا عینک» (LensHero)، دو «جهان» (کارگاهِ
 *  دستور و آسمانِ آرایه) که زبانه‌اند، و مسیرِ پیچانِ درس‌های جهانِ انتخاب‌شده
 *  که با اسکرول کشیده می‌شود و درسِ بعدی رویش می‌تپد.
 *
 *  هر دو جهان در HTML هستند و جهانِ غیرفعال فقط `hidden` است، تا موتورِ
 *  جست‌وجو همهٔ لینک‌ها را ببیند. جهان در hash می‌ماند (`#dastoor` / `#arayeh`).
 *
 *  پیشرفت از همان کلیدِ `localStorage`ی خوانده می‌شود که `LessonPlayer`
 *  می‌نویسد، پس فقط بعد از hydration معلوم است. */

type Group = { id: LessonCard["group"]; hash: string; title: string; lede: string };
type Progress = { pct: number; done: boolean; at: number };

const fa = (n: number) => n.toLocaleString("fa-IR");
const two = (n: number) => fa(n).padStart(2, "۰");

function readProgress(card: LessonCard): Progress | null {
  try {
    const saved = JSON.parse(localStorage.getItem(`sarva-learn-${card.slug}-v1`) ?? "null") as { step?: number; at?: number } | null;
    if (!saved || typeof saved.step !== "number" || saved.step >= card.beats) return null;
    const done = saved.step >= card.finish;
    return { pct: done ? 100 : Math.max(3, Math.round(saved.step / card.finish * 100)), done, at: saved.at ?? 0 };
  } catch { return null; }
}

/** اسمِ هر جهان و زیرعنوانش؛ متنِ قفسه‌ها از `LESSON_GROUPS` می‌آید. */
const WORLD: Record<Group["id"], { name: string; tagline: string }> = {
  grammar: { name: "کارگاهِ جمله", tagline: "پیچ‌ومهره‌های جمله رو باز کن" },
  figures: { name: "آسمانِ خیال", tagline: "ببین شاعر چی دیده که ما ندیدیم" },
};

export default function LearnHub({ groups, cards }: { groups: readonly Group[]; cards: LessonCard[] }) {
  const [active, setActive] = useState<Group["id"]>(groups[0].id);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const found: Record<string, Progress> = {};
    for (const card of cards) { const p = readProgress(card); if (p) found[card.slug] = p; }
    const fromHash = groups.find(g => `#${g.hash}` === window.location.hash);
    const latest = Object.entries(found).filter(([, p]) => !p.done).sort(([, a], [, b]) => b.at - a.at)[0];
    const latestGroup = latest && cards.find(card => card.slug === latest[0])?.group;
    // Browser-only state, restored after hydration so the server render stays stable.
    /* eslint-disable react-hooks/set-state-in-effect */
    setProgress(found);
    if (fromHash) setActive(fromHash.id);
    else if (latestGroup) setActive(latestGroup);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [cards, groups]);

  const resume = useMemo(() => {
    const open = cards.filter(card => progress[card.slug] && !progress[card.slug].done);
    return open.sort((a, b) => progress[b.slug].at - progress[a.slug].at)[0];
  }, [cards, progress]);

  function choose(id: Group["id"]) {
    setActive(id);
    history.replaceState(null, "", `#${groups.find(g => g.id === id)!.hash}`);
  }

  function onTabKey(event: KeyboardEvent, i: number) {
    const keys: Record<string, number> = { ArrowLeft: i + 1, ArrowRight: i - 1, Home: 0, End: groups.length - 1 };
    if (!(event.key in keys)) return;
    event.preventDefault();
    const to = (keys[event.key] + groups.length) % groups.length;
    choose(groups[to].id);
    tabs.current[to]?.focus();
  }

  return <main className={s.hub} dir="rtl">
    <div className={s.aurora} aria-hidden><span /><span /><span /></div>

    <header className={s.hero}>
      <div className={s.heroText}>
        <p className={s.eyebrow}><span className={s.eyebrowDot} /> درسنامهٔ تعاملی</p>
        <h1 className={s.title}>هر جمله رو با <em>دو تا عینک</em> ببین</h1>
        <p className={s.lede}>با عینکِ دستور، نقشِ هر کلمه رو می‌بینی؛ با عینکِ آرایه، خیالِ پشتش رو. {fa(cards.length)} درسِ گفت‌وگویی، با سؤال‌های ریز و مثال‌های کتابِ خودت.</p>
        <div className={s.heroActions}>
          {resume
            ? <Link href={`/learn/${resume.slug}`} className={s.cta}><Play size={16} aria-hidden /> ادامهٔ «{resume.title}» <small>{fa(progress[resume.slug].pct)}٪</small></Link>
            : <a href="#worlds" className={s.cta}><Play size={16} aria-hidden /> از همین‌جا شروع کن</a>}
          <span className={s.heroMeta}>مثال‌ها از فارسیِ دهم تا دوازدهم · هر درس {fa(Math.min(...cards.map(c => c.minutes)))} تا {fa(Math.max(...cards.map(c => c.minutes)))} دقیقه</span>
        </div>
      </div>
      <LensHero />
    </header>

    <section id="worlds" className={s.worlds} aria-label="قفسه‌ها">
      <div className={s.worldTabs} role="tablist" aria-label="قفسه‌ها">
        {groups.map((group, i) => {
          const list = cards.filter(card => card.group === group.id);
          const done = list.filter(card => progress[card.slug]?.done).length;
          const on = group.id === active;
          return <button key={group.id} ref={el => { tabs.current[i] = el; }} type="button" role="tab" id={`tab-${group.hash}`} aria-controls={`panel-${group.hash}`}
            aria-selected={on} tabIndex={on ? 0 : -1} className={s.world} data-world={group.id} onClick={() => choose(group.id)} onKeyDown={event => onTabKey(event, i)}>
            <WorldArt world={group.id} />
            <span className={s.worldBody}>
              <span className={s.worldKicker}>{WORLD[group.id].name}</span>
              <span className={s.worldTitle}>{group.title}</span>
              <span className={s.worldTagline}>{WORLD[group.id].tagline}</span>
              <span className={s.worldFaces} aria-hidden>{list.map(card => <Face key={card.slug} character={card.character} className={s.worldFace} />)}</span>
            </span>
            <Ring value={done} total={list.length} />
          </button>;
        })}
      </div>

      {groups.map(group => <section key={group.id} role="tabpanel" id={`panel-${group.hash}`} aria-labelledby={`tab-${group.hash}`}
        hidden={group.id !== active} className={s.panel} data-world={group.id}>
        <p className={s.panelLede}>{group.lede}</p>
        {group.id === active && <Path cards={cards.filter(card => card.group === group.id)} progress={progress} />}
        {group.id !== active && <ol className={s.srOnly}>{cards.filter(card => card.group === group.id).map(card =>
          <li key={card.slug}><Link href={`/learn/${card.slug}`}>{card.title}</Link></li>)}</ol>}
      </section>)}
    </section>

    <p className={s.foot}><Lock size={13} aria-hidden /> درس‌هایی که قفل دارن اسمت رو صدا می‌زنن، پس اول باید وارد بشی.</p>
  </main>;
}

/* ───────── جهان‌ها ───────── */

/** ستاره‌های ثابت (نه تصادفی) تا رندرِ سرور و مرورگر یکی باشند. */
const STARS = Array.from({ length: 28 }, (_, i) => ({ x: (i * 37 + 11) % 100, y: (i * 53 + 7) % 100, d: (i % 7) * .45, big: i % 9 === 0 }));
const CONSTELLATION = "12,70 26,42 44,56 58,24 76,38 90,18";

function WorldArt({ world }: { world: Group["id"] }) {
  if (world === "grammar") return <span className={s.worldArt} aria-hidden>
    <svg viewBox="0 0 120 80" className={s.tree}>
      <path d="M60 14 L30 40 M60 14 L90 40 M30 40 L16 66 M30 40 L44 66 M90 40 L78 66 M90 40 L104 66" />
      {[[60, 14], [30, 40], [90, 40], [16, 66], [44, 66], [78, 66], [104, 66]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i ? 4 : 5.5} />)}
    </svg>
  </span>;
  return <span className={s.worldArt} aria-hidden>
    {STARS.map((star, i) => <i key={i} className={s.star} data-big={star.big || undefined} style={{ left: `${star.x}%`, top: `${star.y}%`, animationDelay: `${star.d}s` }} />)}
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className={s.constellation}><polyline points={CONSTELLATION} /></svg>
  </span>;
}

function Ring({ value, total }: { value: number; total: number }) {
  const pct = total ? value / total : 0;
  return <span className={s.ring} style={{ ["--p" as string]: pct }} aria-label={`${fa(value)} از ${fa(total)} درس تموم شده`}>
    <span className={s.ringText}>{fa(value)}<small>/{fa(total)}</small></span>
  </span>;
}

function Face({ character, className }: { character: CharacterId; className?: string }) {
  const { Face: F } = PERSONAS[character];
  return <span className={`${lx.palette} ${className ?? ""}`} data-lesson={character}><F mood="happy" className={s.face} /></span>;
}

/* ───────── مسیر ───────── */

/** جای افقیِ هر گره روی مسیرِ دسکتاپ (درصد از چپ)؛ زیگزاگِ نرم. */
const XS = [70, 30, 70, 30, 70, 30];

function Path({ cards, progress }: { cards: LessonCard[]; progress: Record<string, Progress> }) {
  const reduced = useReducedMotion() ?? false;
  const box = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: box, offset: ["start 75%", "end 55%"] });
  const drawn = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  const next = cards.findIndex(card => !progress[card.slug]?.done);
  const rows = cards.length;
  const xs = cards.map((_, i) => XS[i % XS.length]);
  // هر ردیف ۱۰۰ واحد ارتفاع دارد؛ SVG با preserveAspectRatio="none" کش می‌آید.
  const curve = xs.map((x, i) => i === 0 ? `M${x} 50` : `C${xs[i - 1]} ${i * 100} ${x} ${i * 100} ${x} ${i * 100 + 50}`).join(" ");

  return <ol ref={box} className={s.path} style={{ ["--rows" as string]: rows }}>
    <svg className={s.track} viewBox={`0 0 100 ${rows * 100}`} preserveAspectRatio="none" aria-hidden>
      <path d={curve} className={s.trackBase} vectorEffect="non-scaling-stroke" />
      <motion.path d={curve} className={s.trackDrawn} vectorEffect="non-scaling-stroke" style={{ pathLength: reduced ? 1 : drawn }} />
    </svg>
    {/* روی گوشی گره‌ها یک ستون‌اند؛ خط با CSS کشیده می‌شود تا با لبهٔ راست بچسبد، نه با درصد. */}
    <span className={s.rail} aria-hidden><motion.span style={{ scaleY: reduced ? 1 : drawn }} /></span>

    {cards.map((card, i) => <Stop key={card.slug} card={card} n={i + 1} x={xs[i]} progress={progress[card.slug]} next={i === next} reduced={reduced} />)}
  </ol>;
}

function Stop({ card, n, x, progress, next, reduced }: { card: LessonCard; n: number; x: number; progress?: Progress; next: boolean; reduced: boolean }) {
  const state = progress?.done ? "done" : next ? "next" : progress ? "open" : "idle";
  const pct = progress?.pct ?? 0;
  const spot = (event: PointerEvent<HTMLAnchorElement>) => {
    const el = event.currentTarget, r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${event.clientX - r.left}px`);
    el.style.setProperty("--my", `${event.clientY - r.top}px`);
  };

  return <motion.li className={`${lx.palette} ${s.stop}`} data-lesson={card.character} data-side={x > 50 ? "right" : "left"} data-state={state}
    style={{ ["--x" as string]: x }}
    initial={reduced ? false : { opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }}
    transition={{ type: "spring", stiffness: 160, damping: 22 }}>
    <Link href={`/learn/${card.slug}`} className={s.node} tabIndex={-1} aria-hidden style={{ ["--pct" as string]: pct }}>
      <span className={s.nodeFace}><Face character={card.character} /></span>
      {state === "done" && <span className={s.nodeBadge}><Check size={12} strokeWidth={3} /></span>}
      <AnimatePresence>{next && <motion.span className={s.bubble} initial={reduced ? false : { opacity: 0, scale: .6, y: 6 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 18, delay: .3 }}>{progress ? `ادامه · ${fa(pct)}٪` : "شروع"}</motion.span>}</AnimatePresence>
    </Link>

    <Link href={`/learn/${card.slug}`} className={s.card} onPointerMove={spot}>
      <span className={s.cardHead}>
        <span className={s.num}>{two(n)}</span>
        <span className={s.cardTitle}>{card.title}</span>
        {card.needsName && <Lock size={13} className={s.lock} aria-label="ورود لازم است" />}
      </span>
      <span className={s.tagline}>{card.tagline}</span>
      <span className={s.meta}>
        <span><Layers3 size={13} aria-hidden /> {fa(card.chapters)} فصل</span>
        <span><Clock3 size={13} aria-hidden /> حدودِ {fa(card.minutes)} دقیقه</span>
        {state === "done" && <span className={s.done}><Check size={13} aria-hidden /> تمومه</span>}
        {progress && !progress.done && <span className={s.pct}>{fa(pct)}٪</span>}
      </span>
      <ArrowLeft size={18} className={s.chev} aria-hidden />
    </Link>
  </motion.li>;
}
