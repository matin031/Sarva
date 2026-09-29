"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { ArrowLeft, Check, Clock3, Layers3, Lock } from "lucide-react";
import type { LessonCard } from "@/lib/learn";
import type { CharacterId } from "@/lib/learn/types";
import { PERSONAS } from "./persona";
import s from "./LearnHub.module.css";
import lx from "./learn.module.css";

/** فهرستِ درسنامه‌های تعاملی (`/learn`).
 *
 *  دو قفسهٔ جدا (دستور / آرایه) به شکلِ دو زبانه؛ هر دو در HTML هستند و
 *  زبانهٔ غیرفعال فقط `hidden` است، پس موتورِ جست‌وجو همهٔ لینک‌ها را می‌بیند.
 *  زبانه در hash می‌ماند (`#dastoor` / `#arayeh`) تا لینکِ مستقیم کار کند.
 *
 *  پیشرفت از همان کلیدِ `localStorage`ی خوانده می‌شود که `LessonPlayer`
 *  می‌نویسد؛ پس فقط بعد از hydration معلوم است و رندرِ سرور همه را «شروع‌نشده»
 *  نشان می‌دهد. */

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

export default function LearnHub({ groups, cards }: { groups: readonly Group[]; cards: LessonCard[] }) {
  const [active, setActive] = useState<Group["id"]>(groups[0].id);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const found: Record<string, Progress> = {};
    for (const card of cards) { const p = readProgress(card); if (p) found[card.slug] = p; }
    const fromHash = groups.find(g => `#${g.hash}` === window.location.hash);
    // Browser-only state, restored after hydration so the server render stays stable.
    /* eslint-disable react-hooks/set-state-in-effect */
    setProgress(found);
    if (fromHash) setActive(fromHash.id);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [cards, groups]);

  /** آخرین درسِ نیمه‌کاره؛ کارتِ «ادامه» بالای فهرست. */
  const resume = useMemo(() => {
    const open = cards.filter(card => progress[card.slug] && !progress[card.slug].done);
    return open.sort((a, b) => progress[b.slug].at - progress[a.slug].at)[0];
  }, [cards, progress]);

  function choose(id: Group["id"]) {
    setActive(id);
    const group = groups.find(g => g.id === id)!;
    history.replaceState(null, "", `#${group.hash}`);
  }

  function onTabKey(event: KeyboardEvent, i: number) {
    // صفحه راست‌به‌چپ است: «بعدی» یعنی چپ.
    const step = event.key === "ArrowLeft" ? 1 : event.key === "ArrowRight" ? -1 : 0;
    const to = event.key === "Home" ? 0 : event.key === "End" ? groups.length - 1 : (i + step + groups.length) % groups.length;
    if (!step && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    choose(groups[to].id);
    tabs.current[to]?.focus();
  }

  const finished = cards.filter(card => progress[card.slug]?.done).length;

  return <main className={s.hub} dir="rtl">
    <header className={s.hero}>
      <p className={s.eyebrow}>درسنامهٔ تعاملی</p>
      <h1 className={s.title}>دستور و آرایه رو <em>گفت‌وگویی</em> یاد بگیر</h1>
      <p className={s.lede}>هر مبحث یه گفت‌وگوی کوتاهه با سؤال‌های ریز و مثال‌های کتابِ خودت. هر جا بمونی، دفعهٔ بعد از همون‌جا ادامه می‌دی.</p>
      <p className={s.stats}>
        <span>{fa(cards.length)} مبحث</span>
        {finished > 0 && <span className={s.statDone}><Check size={14} aria-hidden /> {fa(finished)} تا رو تموم کردی</span>}
      </p>
    </header>

    {resume && <Link href={`/learn/${resume.slug}`} className={`${lx.palette} ${s.resume}`} data-lesson={resume.character}>
      <Avatar character={resume.character} className={s.resumeAvatar} />
      <span className={s.resumeBody}>
        <span className={s.resumeLabel}>ادامه از جایی که موندی</span>
        <span className={s.resumeTitle}>{resume.title}</span>
        <Bar pct={progress[resume.slug].pct} label={`پیشرفتِ ${resume.title}`} />
      </span>
      <span className={s.resumeGo}>ادامه <ArrowLeft size={16} aria-hidden /></span>
    </Link>}

    <div className={s.tabs} role="tablist" aria-label="قفسه‌ها">
      {groups.map((group, i) => {
        const count = cards.filter(card => card.group === group.id).length;
        const on = group.id === active;
        return <button key={group.id} ref={el => { tabs.current[i] = el; }} role="tab" id={`tab-${group.hash}`} aria-controls={`panel-${group.hash}`}
          aria-selected={on} tabIndex={on ? 0 : -1} className={s.tab} onClick={() => choose(group.id)} onKeyDown={event => onTabKey(event, i)}>
          {group.title} <span className={s.tabCount}>{fa(count)}</span>
        </button>;
      })}
    </div>

    {groups.map(group => <section key={group.id} role="tabpanel" id={`panel-${group.hash}`} aria-labelledby={`tab-${group.hash}`}
      hidden={group.id !== active} className={s.panel}>
      <p className={s.panelLede}>{group.lede}</p>
      <ol className={s.grid}>
        {cards.filter(card => card.group === group.id).map((card, i) =>
          <li key={card.slug}><Card card={card} n={i + 1} progress={progress[card.slug]} /></li>)}
      </ol>
    </section>)}

    <p className={s.foot}><Lock size={13} aria-hidden /> درس‌هایی که قفل دارن اسمت رو صدا می‌زنن، پس اول باید وارد بشی.</p>
  </main>;
}

function Avatar({ character, className }: { character: CharacterId; className?: string }) {
  const { Face } = PERSONAS[character];
  return <span className={`${s.avatar} ${className ?? ""}`} aria-hidden><Face mood="happy" className={s.face} /></span>;
}

function Bar({ pct, label }: { pct: number; label: string }) {
  return <span className={s.bar} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
    <span style={{ inlineSize: `${pct}%` }} />
  </span>;
}

function Card({ card, n, progress }: { card: LessonCard; n: number; progress?: Progress }) {
  return <Link href={`/learn/${card.slug}`} className={`${lx.palette} ${s.card}`} data-lesson={card.character} data-done={progress?.done || undefined}>
    <Avatar character={card.character} />
    <div className={s.cardBody}>
      <div className={s.cardHead}>
        <span className={s.num}>{two(n)}</span>
        <h2 className={s.cardTitle}>{card.title}</h2>
        {card.needsName && <Lock size={13} className={s.lock} aria-label="ورود لازم است" />}
      </div>
      <p className={s.tagline}>{card.tagline}</p>
      <div className={s.meta}>
        <span><Layers3 size={13} aria-hidden /> {fa(card.chapters)} فصل</span>
        <span><Clock3 size={13} aria-hidden /> حدودِ {fa(card.minutes)} دقیقه</span>
        {progress?.done
          ? <span className={s.done}><Check size={13} aria-hidden /> تمومه</span>
          : progress && <span className={s.pct}>{fa(progress.pct)}٪</span>}
      </div>
      {progress && !progress.done && <Bar pct={progress.pct} label={`پیشرفتِ ${card.title}`} />}
    </div>
    <ArrowLeft size={18} className={s.chev} aria-hidden />
  </Link>;
}
