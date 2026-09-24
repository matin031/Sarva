"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowDown, ArrowLeft, ArrowUpLeft, Bookmark, BookOpen, Check, ChevronLeft, Clock3, FileCheck2, GraduationCap, Layers3, Lightbulb, LibraryBig, RotateCcw, Search, Sparkles, Stamp, WalletCards, X } from "lucide-react";
import { ERAS, ERA_NOTES, ERA_STAGE, EXAM_FACTS, HERO_LINES, WALKER_LINES, SOURCE, WORKS, PORTRAITS, fa, normalizeSearch, peopleForEra, personByName, type Era, type Person, type Detail } from "@/lib/literary-timeline/data";
import { Highlighter } from "@/components/home/Highlighter";
import { EraBadge } from "./EraBadge";
import { Flashcards } from "./Flashcards";
import { JourneyRoad } from "./JourneyRoad";
import { Marked } from "./Marked";
import { CartoonFigure } from "./CartoonFigure";
import { Mascot } from "./Mascot";
import { PoetStage } from "./PoetStage";
import { Portrait, portraitFor } from "./Portrait";
import s from "./timeline.module.css";

type Panel = { kind: "person"; person: Person } | { kind: "era"; era: Era } | { kind: "library" } | { kind: "sources" } | { kind: "compare" } | { kind: "cards" } | null;
type Feature = "language" | "literary" | "thought";
const FEATURE_LABELS: Record<Feature, string> = { language: "زبانی", literary: "ادبی", thought: "فکری" };
const STORAGE_KEY = "sarva-literary-timeline-bookmarks-v1";
const PASSPORT_KEY = "sarva-literary-timeline-passport-v2";
const OLD_PASSPORT_KEY = "sarva-literary-timeline-passport-v1";
/** Answers are stored per question as `era:index`. */
type Answers = Record<string, number>;
const answerKey = (era: string, index: number) => `${era}:${index}`;
const TOTAL_QUESTIONS = ERAS.reduce((sum, era) => sum + era.quizzes.length, 0);
/** A chapter's stamp: every question right, or at least one tried. */
function eraState(era: Era, answers: Answers): "right" | "tried" | "empty" {
  const given = era.quizzes.map((quiz, i) => answers[answerKey(era.id, i)]);
  if (given.every((answer, i) => answer === era.quizzes[i].correct)) return "right";
  return given.some(answer => answer !== undefined) ? "tried" : "empty";
}
const colorStyle = (color: string): CSSProperties => ({ "--era-color": color }) as CSSProperties;
const sourceWording = (text: string) => text.replace(/PDFهای/g, "منابع").replace(/PDFها/g, "منابع").replace(/PDF/g, "منبع");
const BOUNCE = { type: "spring", stiffness: 260, damping: 20 } as const;
/** Small, stable tilts so stickers look hand-placed without shifting between renders. */
const TILTS = [-3, 2.5, -1.5, 3, -2.5, 1.5];

function Reveal({ children, className = "", delay = 0, tilt = 0, style }: { children: ReactNode; className?: string; delay?: number; tilt?: number; style?: CSSProperties }) {
  const reduced = useReducedMotion();
  return <motion.div className={className} style={style} initial={reduced ? false : { opacity: 0, y: 46, scale: .94, rotate: tilt * 2 }} whileInView={{ opacity: 1, y: 0, scale: 1, rotate: tilt }} viewport={{ once: true, amount: 0.15 }} transition={reduced ? { duration: 0 } : { ...BOUNCE, delay }}>{children}</motion.div>;
}

function HeroArt({ onPerson }: { onPerson: (person: Person) => void }) {
  const reduced = useReducedMotion();
  const [say, setSay] = useState(0);
  useEffect(() => {
    if (reduced) return;
    const timer = window.setInterval(() => setSay(i => (i + 1) % HERO_LINES.length), 3400);
    return () => window.clearInterval(timer);
  }, [reduced]);
  const names = ["فردوسی", "حافظ", "صائب تبریزی", "پروین اعتصامی"];
  const labels = ["حماسه", "غزل", "سبک هندی", "مناظره"];
  return <div className={s.heroArt}>
    <div className={s.heroIsland} />
    <svg className={s.heroRoad} viewBox="0 0 480 520" fill="none" aria-hidden="true">
      <path d="M70 40C250 30 420 90 360 180S90 230 120 320s290 40 280 130-150 70-140 70" className={s.heroRoadBed} />
      <path d="M70 40C250 30 420 90 360 180S90 230 120 320s290 40 280 130-150 70-140 70" className={s.heroRoadDash} />
    </svg>
    <span className={`${s.doodle} ${s.doodleStar}`} aria-hidden="true">✦</span>
    <span className={`${s.doodle} ${s.doodleStar2}`} aria-hidden="true">✧</span>
    <span className={`${s.doodle} ${s.doodleCloud}`} aria-hidden="true" />
    <span className={`${s.doodle} ${s.doodleCloud2}`} aria-hidden="true" />
    <div className={s.heroMascot}><Mascot waving /><AnimatePresence mode="wait" initial={false}><motion.span key={say} className={s.heroMascotSay} initial={{ opacity: 0, scale: .6, rotate: -8 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: .8 }} transition={{ type: "spring", stiffness: 420, damping: 22 }}>{HERO_LINES[say]}</motion.span></AnimatePresence></div>
    {names.map((name, i) => {
      const person = personByName(name)!;
      return <button key={name} className={`${s.heroPoet} ${s[`heroPoet${i}`]}`} onClick={() => onPerson(person)} aria-label={name}>
        <span className={s.heroPoetSticker}><Portrait person={person} priority /></span>
        <span className={s.heroPoetLabel}>{name}<small>{labels[i]}</small></span>
      </button>;
    })}
  </div>;
}

function Burst() {
  const colors = ["#f5b84c", "#ff8fa3", "#7fd1c7", "#a99af0", "#9ed27f"];
  return <span className={s.burst} aria-hidden="true">{Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const distance = 70 + (i % 3) * 22;
    return <motion.i key={i} style={{ background: colors[i % colors.length], borderRadius: i % 2 ? "50%" : 3 }} initial={{ x: 0, y: 0, scale: 0, rotate: 0 }} animate={{ x: Math.cos(angle) * distance, y: Math.sin(angle) * distance, scale: [0, 1.2, 0], rotate: 220 }} transition={{ duration: .9, ease: "easeOut" }} />;
  })}</span>;
}

function EraQuiz({ era, answers, onAnswer, reduced }: { era: Era; answers: Answers; onAnswer: (index: number, answer: number) => void; reduced: boolean }) {
  // Open on the first question not yet answered correctly.
  const [index, setIndex] = useState(() => Math.max(0, era.quizzes.findIndex((quiz, i) => answers[answerKey(era.id, i)] !== quiz.correct)));
  const quiz = era.quizzes[index];
  const answer = answers[answerKey(era.id, index)];
  const answered = answer !== undefined;
  const right = answer === quiz.correct;
  const count = era.quizzes.length;
  return <div className={s.quiz}>
    <div className={s.quizHead}>
      <span className={s.smallLabel}><Sparkles size={15} /> سؤال{count > 1 && <> {fa(index + 1)} از {fa(count)}</>}</span>
      {quiz.exam && <span className={s.examChip} title="این سؤال در امتحان نهایی آمده"><FileCheck2 size={13} /> نهایی {quiz.exam}</span>}
    </div>
    {count > 1 && <div className={s.quizSteps} role="group" aria-label="سؤال‌ها">{era.quizzes.map((q, i) => {
      const given = answers[answerKey(era.id, i)];
      return <button key={i} aria-label={`سؤال ${fa(i + 1)}`} aria-current={i === index || undefined} data-state={given === undefined ? "empty" : given === q.correct ? "right" : "wrong"} onClick={() => setIndex(i)} />;
    })}</div>}
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={index} initial={reduced ? false : { opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={reduced ? undefined : { opacity: 0, x: 24 }} transition={{ duration: .2 }}>
        <p className={s.quizQuestion}>{quiz.question}</p>
        <div className={s.quizOptions}>{quiz.options.map((option, i) => {
          const state = answered ? i === quiz.correct ? "correct" : i === answer ? "incorrect" : "idle" : "open";
          return <motion.button key={option} onClick={() => onAnswer(index, i)} disabled={answered} data-state={state}
            animate={!reduced && state === "incorrect" ? { x: [0, -9, 8, -6, 4, 0] } : { x: 0 }} transition={{ duration: .45 }}
            whileHover={answered || reduced ? undefined : { scale: 1.02, rotate: -.5 }} whileTap={answered || reduced ? undefined : { scale: .97 }}>
            <span>{answered && i === quiz.correct ? <Check size={14} /> : fa(i + 1)}</span>{option}
          </motion.button>;
        })}</div>
        <AnimatePresence>{answered && <motion.div className={s.quizExplanation} role="status" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
          {right && !reduced && <Burst />}
          <motion.span className={s.quizStamp} data-right={right || undefined} initial={reduced ? false : { scale: 2.4, rotate: -30, opacity: 0 }} animate={{ scale: 1, rotate: -8, opacity: 1 }} transition={{ type: "spring", stiffness: 380, damping: 14 }}>{right ? "آفرین!" : "اشتباه بود"}</motion.span>
          <p>{quiz.explanation}</p>
          <div className={s.quizActions}>
            <button onClick={() => onAnswer(index, -1)}><RotateCcw size={14} /> دوباره</button>
            {index < count - 1 && <button className={s.quizNext} onClick={() => setIndex(index + 1)}>سؤال بعد <ChevronLeft size={15} /></button>}
          </div>
        </motion.div>}</AnimatePresence>
      </motion.div>
    </AnimatePresence>
  </div>;
}

function FeatureTabs({ era }: { era: Era }) {
  const [feature, setFeature] = useState<Feature>("language");
  const reduced = useReducedMotion();
  const keys = Object.keys(FEATURE_LABELS) as Feature[];
  return <div className={s.styleNotes}>
    <div className={s.smallLabel}><Layers3 size={15} /> ویژگی‌های سبک</div>
    <div className={s.featureTabs} role="tablist" aria-label={`ویژگی‌های ${era.name}`}>{keys.map((key, index) => <button role="tab" key={key} id={`${era.id}-tab-${key}`} aria-selected={feature === key} tabIndex={feature === key ? 0 : -1} aria-controls={`${era.id}-feature`} onClick={() => setFeature(key)} onKeyDown={event => {
      const next = event.key === "ArrowLeft" ? (index + 1) % keys.length : event.key === "ArrowRight" ? (index + keys.length - 1) % keys.length : event.key === "Home" ? 0 : event.key === "End" ? keys.length - 1 : -1;
      if (next < 0) return;
      event.preventDefault(); setFeature(keys[next]); document.getElementById(`${era.id}-tab-${keys[next]}`)?.focus();
    }}>{feature === key && <motion.span layoutId={`tab-${era.id}`} className={s.tabPill} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 32 }} />}<span>{FEATURE_LABELS[key]}</span></button>)}</div>
    <AnimatePresence mode="wait" initial={false}>
      <motion.p key={feature} className={s.featureText} role="tabpanel" id={`${era.id}-feature`} aria-labelledby={`${era.id}-tab-${feature}`} initial={reduced ? false : { opacity: 0, y: 10, rotate: -.6 }} animate={{ opacity: 1, y: 0, rotate: 0 }} exit={reduced ? undefined : { opacity: 0, y: -8 }} transition={{ duration: .22 }}>{era.features[feature]}</motion.p>
    </AnimatePresence>
  </div>;
}

/** Kept upright: Rough Notation measures with getBoundingClientRect, which is
 *  off by a few pixels inside a rotated card. */
function NoteCard({ era, delay = 0 }: { era: Era; delay?: number }) {
  return <Reveal className={s.noteCard} delay={delay}>
    <span className={s.tape} aria-hidden="true" />
    <div className={s.smallLabel}><Lightbulb size={15} /> نکته‌ها</div>
    <ul>{ERA_NOTES[era.id].map((note, i) => <li key={i}><Marked text={note} delay={900 + i * 550} /></li>)}</ul>
  </Reveal>;
}

function EraSection({ era, index, reached, onPanel, saved, onSave, answers, onAnswer }: { era: Era; index: number; reached: boolean; onPanel: (panel: Panel) => void; saved: string[]; onSave: (id: string) => void; answers: Answers; onAnswer: (index: number, answer: number) => void }) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const drift = useTransform(scrollYProgress, [0, 1], [90, -90]);
  const people = peopleForEra(era.id);
  const featured = era.featured.map(personByName).filter((p): p is Person => Boolean(p));
  const remaining = people.filter(p => !featured.some(f => f.id === p.id));
  const side = index % 2 === 0 ? "right" : "left";
  return <section ref={ref} className={s.era} id={era.id} data-era={era.id} data-side={side} style={colorStyle(era.color)} aria-labelledby={`${era.id}-title`}>
    <motion.span className={s.eraGhost} style={reduced ? undefined : { y: drift }} aria-hidden="true">{era.numeral}</motion.span>
    <motion.div className={s.stop} data-stop={era.color} data-reached={reached || undefined} initial={reduced ? false : { scale: 0, rotate: -40 }} whileInView={{ scale: 1, rotate: 0 }} viewport={{ once: true, amount: 1 }} transition={{ type: "spring", stiffness: 300, damping: 14 }} aria-hidden="true">
      <EraBadge era={era} size="small" /><span>{era.numeral}</span>
    </motion.div>

    <Reveal className={s.eraHeading}>
      <EraBadge era={era} size="large" />
      <div>
        <h2 id={`${era.id}-title`}>{era.name}</h2>
        <div className={s.period}><Clock3 size={14} />{era.period}<small>{era.calendar}</small></div>
      </div>
    </Reveal>

    <Reveal className={s.eraMain} delay={.05}>
      <p className={s.eraSummary}>{era.summary}</p>
      <div className={s.tags}>{era.tags.map((tag, i) => <motion.span key={tag} initial={reduced ? false : { opacity: 0, scale: .5, rotate: -10 }} whileInView={{ opacity: 1, scale: 1, rotate: TILTS[i % TILTS.length] / 2 }} viewport={{ once: true }} transition={{ ...BOUNCE, delay: .15 + i * .07 }}>{tag}</motion.span>)}</div>
      {featured.length > 0 && <div className={s.peopleBlock}>
        <div className={s.peopleHeading}>چهره‌های این دوره</div>
        <PoetStage people={featured} lines={ERA_STAGE[era.id] ?? []} reduced={reduced} saved={saved} onSave={onSave} onPerson={person => onPanel({ kind: "person", person })} />
      </div>}
      {remaining.length > 0 && <div className={s.otherPeople}>{remaining.slice(0, 6).map(person => <button onClick={() => onPanel({ kind: "person", person })} key={person.id}>{person.name}</button>)}{remaining.length > 6 && <button className={s.morePeople} onClick={() => onPanel({ kind: "era", era })}>+ {fa(remaining.length - 6)} نفر دیگر</button>}</div>}
      {era.id === "roots" && <div className={s.languageSteps}>{[["باستان", "هخامنشیان · خط میخی"], ["میانه", "پارتی و پهلوی"], ["نو", "فارسی دری · الفبای عربی"]].map(([title, detail], i) => <motion.div key={title} initial={reduced ? false : { opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ ...BOUNCE, delay: i * .12 }}><span>{title}</span><small>{detail}</small></motion.div>)}</div>}
      <button className={s.readMore} onClick={() => onPanel({ kind: "era", era })}><BookOpen size={18} /> درسنامهٔ کامل <ArrowLeft size={16} /></button>
      <p className={s.lessonRef}><GraduationCap size={14} />{era.lessons}</p>
    </Reveal>

    <div className={s.eraAside}>
      <NoteCard era={era} delay={.08} />
      <Reveal delay={.1}><FeatureTabs era={era} /></Reveal>
      {era.rangeNote && <Reveal className={s.rangeNote} delay={.1}><Clock3 size={16} /><div><strong>بازهٔ زمانی</strong><p>{era.rangeNote}</p></div></Reveal>}
      <Reveal delay={.12}><EraQuiz era={era} answers={answers} onAnswer={onAnswer} reduced={reduced} /></Reveal>
    </div>
  </section>;
}

function SourceDetails({ details }: { details: Detail[] }) {
  return <div className={s.sourceDetails}>{details.map((detail, i) => {
    if (detail.kind === "heading") return <h4 key={i}>{sourceWording(detail.text ?? "")}</h4>;
    if (detail.kind === "source") return <p className={s.detailCitation} key={i}><GraduationCap size={15} />{detail.text}</p>;
    if (detail.kind === "table" && detail.rows) {
      const [header, ...rows] = detail.rows;
      if (!rows.length) return <p key={i}><strong>{header[0]}: </strong>{header[1]}</p>;
      return <div className={s.tableScroll} key={i} tabIndex={0}><table><thead><tr>{header.map((cell, n) => <th key={n} scope="col">{sourceWording(cell)}</th>)}</tr></thead><tbody>{rows.map((row, n) => <tr key={n}>{row.map((cell, m) => <td key={m}>{sourceWording(cell)}</td>)}</tr>)}</tbody></table></div>;
    }
    return <p className={detail.kind === "highlight" ? s.detailHighlight : undefined} key={i}>{detail.kind === "highlight" && <span aria-hidden="true">✦ </span>}{sourceWording(detail.text ?? "")}</p>;
  })}</div>;
}

function PersonPanel({ person, saved, onSave, onEra }: { person: Person; saved: string[]; onSave: (id: string) => void; onEra: (era: Era) => void }) {
  const reduced = useReducedMotion() ?? false;
  const portrait = PORTRAITS[person.id];
  const { cartoon } = portraitFor(person);
  const eras = ERAS.filter(era => person.entries.some(entry => entry.era === era.id));
  const primary = eras[0];
  const isSaved = saved.includes(person.id);
  return <div className={s.profile} style={colorStyle(primary.color)}>
    <div className={s.profileVisual}><span className={s.profileSticker}>{cartoon ? <CartoonFigure key={person.id} id={person.id} src={portraitFor(person).src!} alt={`تصویرسازی ${person.name}`} active reduced={reduced} /> : <Portrait key={person.id} person={person} large />}</span></div>
    <div className={s.profileBody}>
      <Dialog.Title className={s.profileTitle}>{person.name}</Dialog.Title>
      <Dialog.Description className={s.profileDescription}>{portrait?.century ?? primary.name}</Dialog.Description>
      {portrait?.dates && <p className={s.profileDates}>{portrait.dates}</p>}
      <div className={s.profileEraLinks}>{eras.map(era => <button key={era.id} onClick={() => onEra(era)} style={colorStyle(era.color)}>{era.name}<ArrowUpLeft size={13} /></button>)}</div>
      {person.entries.map((entry, i) => <div key={i} className={s.profileEntry}>
        {entry.note && <><h3>نکته</h3><p>{entry.note}</p></>}
        <h3>آثار</h3><p>{sourceWording(entry.works)}</p>
        <small><GraduationCap size={13} />{ERAS.find(era => era.id === entry.sourceEra)?.lessons}</small>
      </div>)}
      {EXAM_FACTS[person.name] && <div className={s.profileExam}>
        <h3><FileCheck2 size={15} /> در امتحان نهایی</h3>
        <ul>{EXAM_FACTS[person.name].map((fact, i) => <li key={i}>{fact.text}<small>{fact.exam}</small></li>)}</ul>
      </div>}
      <button className={s.softButton} onClick={() => onSave(person.id)} aria-pressed={isSaved}><Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />{isSaved ? "نشان شده" : "نشان کردن"}</button>
      {cartoon ? <p className={s.portraitCredit}>تصویر: سروا (تصویرسازی){portrait && <> · اطلاعات زندگی: <a href={portrait.source} target="_blank" rel="noreferrer">{portrait.sourceName}<ArrowUpLeft size={12} /></a></>}</p>
        : portrait ? <div className={s.portraitCredit}><p>منبع{portrait.image ? " تصویر و" : ""} اطلاعات زندگی: <a href={portrait.source} target="_blank" rel="noreferrer">{portrait.sourceName}<ArrowUpLeft size={12} /></a>{portrait.imageSource && <> · <a href={portrait.imageSource} target="_blank" rel="noreferrer">اصل تصویر</a></>}</p>{portrait.artist && <p>تصویر از: <span dir="auto">{portrait.artist}</span></p>}{portrait.license && <p>مجوز: {portrait.licenseUrl ? <a href={portrait.licenseUrl} target="_blank" rel="noreferrer" dir="ltr">{portrait.license}</a> : portrait.license}</p>}</div>
        : null}
    </div>
  </div>;
}

function LibraryPanel({ saved, onPerson }: { saved: string[]; onPerson: (person: Person) => void }) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"people" | "works" | "saved">("people");
  const [filter, setFilter] = useState("all");
  const needle = normalizeSearch(query);
  const people = SOURCE.people.filter(person => (tab !== "saved" || saved.includes(person.id)) && (filter === "all" || person.entries.some(entry => entry.era === filter)) && normalizeSearch([person.name, ...person.aliases, ...person.entries.map(e => `${e.note} ${e.works}`)].join(" ")).includes(needle));
  const works = WORKS.filter(work => normalizeSearch(work.join(" ")).includes(needle));
  const empty = tab === "works" ? !works.length : !people.length;
  return <div className={s.panelBody}>
    <Dialog.Title className={s.panelTitle}>جست‌وجو</Dialog.Title>
    <Dialog.Description className={s.panelDescription}>شاعران، نویسندگان و آثار</Dialog.Description>
    <div className={s.librarySearch}><Search size={19} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="نام شاعر، نویسنده یا اثر" aria-label="جست‌وجو" autoFocus />{query && <button onClick={() => setQuery("")} aria-label="پاک کردن"><X size={17} /></button>}</div>
    <div className={s.libraryControls}><div className={s.libraryTabs}>{([["people", "چهره‌ها"], ["works", "آثار"], ["saved", `نشان‌شده‌ها (${fa(saved.length)})`]] as const).map(([value, label]) => <button key={value} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</button>)}</div>{tab !== "works" && <select value={filter} onChange={e => setFilter(e.target.value)} aria-label="دوره"><option value="all">همهٔ دوره‌ها</option>{ERAS.filter(e => e.id !== "roots").map(era => <option key={era.id} value={era.id}>{era.name}</option>)}</select>}</div>
    <p className={s.resultCount} aria-live="polite">{fa(tab === "works" ? works.length : people.length)} نتیجه</p>
    {tab === "works" ? <div className={s.worksList}>{works.map(([title, author, period], i) => <article key={`${title}-${i}`}><BookOpen size={20} /><div><h3>{title}</h3><p>{author}</p><small>{period}</small></div></article>)}</div> : <div className={s.libraryGrid}>{people.map(person => { const eras = ERAS.filter(e => person.entries.some(entry => entry.era === e.id)); return <button className={s.libraryPerson} key={person.id} onClick={() => onPerson(person)} style={colorStyle(eras[0]?.color ?? "#dcc08b")}><span className={s.libraryPortrait}><Portrait person={person} /></span><span><strong>{person.name}</strong><small>{eras.map(e => e.name).join(" · ")}</small></span><ArrowUpLeft size={15} /></button>; })}</div>}
    {empty && <div className={s.emptyState}><Mascot className={s.emptyMascot} /><h3>{tab === "saved" && !saved.length ? "هنوز چهره‌ای نشان نکرده‌ای." : "نتیجه‌ای پیدا نشد."}</h3><button className={s.softButton} onClick={() => { setQuery(""); setFilter("all"); setTab("people"); }}>نمایش همه</button></div>}
  </div>;
}

function Passport({ answers, onJump }: { answers: Answers; onJump: (id: string) => void }) {
  return <div className={s.passport}>{ERAS.map((era, i) => {
    const state = eraState(era, answers);
    return <button key={era.id} className={s.passportStamp} data-state={state} style={{ ...colorStyle(era.color), "--tilt": `${TILTS[i % TILTS.length] * 2}deg` } as CSSProperties} onClick={() => onJump(era.id)} aria-label={`${era.name}: ${state === "right" ? "همه درست" : state === "tried" ? "ناتمام" : "پاسخ نداده"}`}>
      <EraBadge era={era} size="small" />
      <span>{era.name}</span>
      {state === "right" && <Check className={s.passportCheck} size={16} />}
    </button>;
  })}</div>;
}

export default function LiteraryTimeline() {
  const [panel, setPanel] = useState<Panel>(null);
  const [active, setActive] = useState("roots");
  const [saved, setSaved] = useState<string[]>([]);
  const [storageNotice, setStorageNotice] = useState("");
  const [answers, setAnswers] = useState<Answers>({});
  const lastTrigger = useRef<HTMLElement | null>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });
  const reduced = useReducedMotion() ?? false;
  const activeIndex = Math.max(0, ERAS.findIndex(era => era.id === active));
  const activeEra = ERAS[activeIndex];
  const studied = Object.keys(answers).length;
  const correct = ERAS.filter(era => eraState(era, answers) === "right").length;

  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
      const passport: unknown = JSON.parse(localStorage.getItem(PASSPORT_KEY) ?? "null")
        // v1 kept one answer per chapter: the chapter's first question.
        ?? Object.fromEntries(Object.entries(JSON.parse(localStorage.getItem(OLD_PASSPORT_KEY) ?? "{}") as Record<string, unknown>).map(([id, value]) => [answerKey(id, 0), value]));
      // Restore browser-only preferences after hydration, never in server render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(stored)) setSaved(stored.filter((id): id is string => typeof id === "string" && SOURCE.people.some(person => person.id === id)));
      if (passport && typeof passport === "object") setAnswers(Object.fromEntries(Object.entries(passport).filter(([key, value]) => {
        const [id, n] = key.split(":");
        const quiz = ERAS.find(era => era.id === id)?.quizzes[Number(n)];
        return quiz !== undefined && typeof value === "number" && value >= 0 && value < quiz.options.length;
      })));
    } catch { /* Reading still works when storage is unavailable. */ }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });
    document.querySelectorAll("[data-era]").forEach(element => observer.observe(element));
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true'], [role='dialog']")) return;
      event.preventDefault();
      lastTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setPanel({ kind: "library" });
    };
    window.addEventListener("keydown", onKey);
    return () => { observer.disconnect(); window.removeEventListener("keydown", onKey); };
  }, []);

  function openPanel(next: Panel) {
    if (!panel) lastTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setPanel(next);
  }

  function toggleSaved(id: string) {
    const next = saved.includes(id) ? saved.filter(item => item !== id) : [...saved, id];
    setSaved(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setStorageNotice(""); }
    catch { setStorageNotice("مرورگر اجازهٔ ذخیره نمی‌دهد؛ نشان‌ها با بستن صفحه پاک می‌شوند."); }
  }

  function jumpTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "instant" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  }

  function saveAnswers(next: Answers) {
    setAnswers(next);
    try { localStorage.setItem(PASSPORT_KEY, JSON.stringify(next)); } catch { /* Stamps still work for this visit. */ }
  }

  function answerQuiz(id: string, index: number, answer: number) {
    const next = { ...answers };
    const key = answerKey(id, index);
    if (answer < 0) delete next[key]; else next[key] = answer;
    saveAnswers(next);
  }

  return <div className={s.page} dir="rtl">
    <motion.div className={s.readingProgress} style={{ scaleX: reduced ? scrollYProgress : progress }} aria-hidden="true" />
    <a className={s.skipLink} href="#timeline">رفتن به خط زمان</a>

    <section className={s.hero} aria-labelledby="timeline-title">
      <Reveal className={s.heroCopy}>
        <h1 id="timeline-title">خط زمان <Highlighter action="circle" color="var(--tl-accent)" strokeWidth={2.4} padding={10} iterations={1} duration={1100} delay={500}>ادبیات</Highlighter> فارسی</h1>
        <p className={s.heroDescription}>سبک‌ها، شاعران و آثار؛ از فارسی باستان تا امروز. بر اساس کتاب <Highlighter action="highlight" color="color-mix(in oklch, var(--tl-accent) 38%, transparent)" delay={1300}>علوم و فنون ادبی</Highlighter> دهم، یازدهم و دوازدهم.</p>
        <div className={s.heroActions}><button className={s.primaryButton} onClick={() => jumpTo("roots")}>شروع <ArrowDown size={18} /></button><button className={s.softButton} onClick={() => openPanel({ kind: "library" })}><LibraryBig size={18} /> شاعران و نویسندگان</button></div>
        <div className={s.heroStats}>{[[fa(ERAS.length), "دوره"], [fa(SOURCE.people.length), "شاعر و نویسنده"], [fa(WORKS.length), "اثر"]].map(([value, label], i) => <motion.div key={label} initial={reduced ? false : { opacity: 0, y: 20, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: TILTS[i] }} transition={{ ...BOUNCE, delay: .5 + i * .1 }}><strong>{value}</strong><span>{label}</span></motion.div>)}</div>
      </Reveal>
      <Reveal className={s.heroArtwork} delay={.15}><HeroArt onPerson={person => openPanel({ kind: "person", person })} /></Reveal>
    </section>

    <div className={s.eraDock} style={colorStyle(activeEra.color)}>
      <div className={s.dockLinks} aria-label="دوره‌ها">{ERAS.map(era => <button key={era.id} onClick={() => jumpTo(era.id)} style={colorStyle(era.color)} aria-current={active === era.id ? "step" : undefined}>{active === era.id && <motion.span layoutId="dock-pill" className={s.dockPill} transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 380, damping: 30 }} />}<i data-stamped={eraState(era, answers) === "right" || undefined} /><span>{era.name}</span></button>)}</div>
      <select className={s.mobileEraSelect} value={active} onChange={e => jumpTo(e.target.value)} aria-label="رفتن به دوره">{ERAS.map(era => <option key={era.id} value={era.id}>{era.name}</option>)}</select>
      <div className={s.dockTools}>
        <span className={s.dockStamps} title="پاسخ‌های درست"><Stamp size={15} />{fa(correct)}/{fa(ERAS.length)}</span>
        <button onClick={() => openPanel({ kind: "library" })} aria-label="جست‌وجو (کلید /)" title="جست‌وجو ( / )"><Search size={17} /></button>
        <button onClick={() => openPanel({ kind: "cards" })} aria-label="کارت‌های مرور" title="کارت‌های مرور"><WalletCards size={17} /></button>
        <button onClick={() => openPanel({ kind: "compare" })} aria-label="مقایسهٔ سبک‌ها" title="مقایسهٔ سبک‌ها"><Layers3 size={17} /></button>
      </div>
    </div>

    <div className={s.timelineIntro} id="timeline">
      <h2>مسیر <Highlighter action="underline" color="var(--tl-accent)" strokeWidth={3} padding={4}>دوره‌ها</Highlighter></h2>
      <p>طول هر بخش به اندازهٔ سال‌های آن دوره نیست و مرز سبک‌ها همیشه قطعی نیست.</p>
    </div>
    <div className={s.timeline} ref={timelineRef}>
      <JourneyRoad containerRef={timelineRef} reduced={reduced} activeName={activeEra.name} activeColor={activeEra.color} activeLine={WALKER_LINES[activeEra.id]} />
      {ERAS.map((era, index) => <EraSection key={era.id} era={era} index={index} reached={index <= activeIndex} onPanel={openPanel} saved={saved} onSave={toggleSaved} answers={answers} onAnswer={(i, answer) => answerQuiz(era.id, i, answer)} />)}
    </div>

    <section className={s.finish} aria-labelledby="finish-title">
      <Reveal>
        <div className={s.finishMascot}><Mascot waving /></div>
        <h2 id="finish-title">مرور پایانی</h2>
        <p>همهٔ سؤال‌های یک دوره را درست جواب بدهی، مهر آن دوره را می‌گیری. روی هر مهر بزن تا به همان دوره برگردی.</p>
        <div className={s.finishProgress}><span>{fa(studied)} از {fa(TOTAL_QUESTIONS)} سؤال</span><div><motion.i animate={{ width: `${studied / TOTAL_QUESTIONS * 100}%` }} transition={BOUNCE} /></div><span>{fa(correct)} مهر</span></div>
        <Passport answers={answers} onJump={jumpTo} />
        <div className={s.finishActions}><button className={s.primaryButton} onClick={() => openPanel({ kind: "cards" })}><WalletCards size={17} /> کارت‌های مرور</button><button className={s.softButton} onClick={() => openPanel({ kind: "compare" })}><Layers3 size={17} /> مقایسهٔ سبک‌ها</button><button className={s.softButton} onClick={() => openPanel({ kind: "library" })}><Bookmark size={17} /> نشان‌شده‌ها</button></div>
        <div className={s.finishLinks}><button className={s.textButton} onClick={() => openPanel({ kind: "sources" })}>منابع <ArrowUpLeft size={14} /></button>{studied > 0 && <button className={s.textButton} onClick={() => saveAnswers({})}><RotateCcw size={14} /> پاک کردن مهرها</button>}</div>
      </Reveal>
    </section>

    {storageNotice && <p className={s.storageNotice} role="status">{storageNotice}<button onClick={() => setStorageNotice("")} aria-label="بستن"><X size={14} /></button></p>}

    <Dialog.Root open={panel !== null} onOpenChange={open => { if (!open) setPanel(null); }}><Dialog.Portal><Dialog.Overlay className={s.overlay} /><Dialog.Content className={`${s.dialog} ${panel?.kind === "person" ? s.personDialog : ""}`} dir="rtl" onCloseAutoFocus={event => { event.preventDefault(); lastTrigger.current?.focus(); }}>
      <Dialog.Close className={s.closeDialog} aria-label="بستن"><X size={20} /></Dialog.Close>
      {panel?.kind === "person" && <PersonPanel person={panel.person} saved={saved} onSave={toggleSaved} onEra={era => setPanel({ kind: "era", era })} />}
      {panel?.kind === "library" && <LibraryPanel saved={saved} onPerson={person => setPanel({ kind: "person", person })} />}
      {panel?.kind === "cards" && <Flashcards reduced={reduced} />}
      {panel?.kind === "era" && <div className={s.panelBody} style={colorStyle(panel.era.color)}>
        <div className={s.panelHead}><EraBadge era={panel.era} size="large" /><div><Dialog.Title className={s.panelTitle}>{panel.era.name}</Dialog.Title><Dialog.Description className={s.panelDescription}>{panel.era.period} · {panel.era.calendar}</Dialog.Description></div></div>
        <p className={s.lessonRef}><GraduationCap size={14} />{panel.era.lessons}</p>
        <NoteCard era={panel.era} />
        {peopleForEra(panel.era.id).length > 0 && <div className={s.chapterPeople}>{peopleForEra(panel.era.id).map(person => <button key={person.id} onClick={() => setPanel({ kind: "person", person })}>{person.name}<ArrowUpLeft size={12} /></button>)}</div>}
        <SourceDetails details={SOURCE.eras.find(era => era.id === panel.era.id)!.details} />
      </div>}
      {panel?.kind === "compare" && <div className={s.panelBody}>
        <Dialog.Title className={s.panelTitle}>مقایسهٔ سبک‌ها</Dialog.Title>
        <Dialog.Description className={s.panelDescription}>زمان، نشانه‌ها و فضای فکری هر سبک</Dialog.Description>
        <div className={s.compareList}>{ERAS.slice(1).map(era => <button style={colorStyle(era.color)} key={era.id} onClick={() => setPanel({ kind: "era", era })}><EraBadge era={era} size="small" /><span className={s.compareEra}><strong>{era.name}</strong><small>{era.period}<br />{era.calendar}</small></span><span><strong>{era.tags.join(" · ")}</strong><small>{era.features.thought}</small></span><ArrowUpLeft size={17} /></button>)}</div>
        <h3 className={s.comparisonHeading}>خراسانی و عراقی در جدول کتاب</h3>
        <SourceDetails details={[{ kind: "table", rows: SOURCE.comparison }]} />
        <p className={s.lessonRef}>یازدهم · درس ۴ · مقایسهٔ سطح فکری دو سبک</p>
      </div>}
      {panel?.kind === "sources" && <div className={s.panelBody}>
        <Dialog.Title className={s.panelTitle}>منابع</Dialog.Title>
        <Dialog.Description className={s.panelDescription}>مطالب این صفحه از کتاب‌های علوم و فنون ادبی دهم، یازدهم و دوازدهم گردآوری شده است.</Dialog.Description>
        <SourceDetails details={[{ kind: "table", rows: [["پایه", "درس", "صفحات کتاب", "موضوع"], ...SOURCE.sources] }]} />
        <h3 className={s.comparisonHeading}>چند نکته</h3>
        <div className={s.sourceDetails}>
          <p>برای سبک عراقی و هندی، هم بازهٔ کلی و هم بازهٔ تفصیلی کتاب آمده است.</p>
          <p>برای کسانی که کتاب اثری از آن‌ها نام نبرده، اثری اضافه نشده است.</p>
          <p>تصویرها و تاریخ‌های زندگی از <a href="https://ganjoor.net" target="_blank" rel="noreferrer">گنجور</a> و <a href="https://fa.wikipedia.org" target="_blank" rel="noreferrer">ویکی‌پدیا</a> است و منبع هر کدام در صفحهٔ همان شخص آمده. چهرهٔ شاعران قدیمی بازنمایی هنری است.</p>
          <p>نشان‌ها و مهرها فقط روی همین مرورگر ذخیره می‌شوند.</p>
        </div>
        <h3 className={s.comparisonHeading}>تقسیم‌بندی نثر در جدول بهار</h3>
        <SourceDetails details={[{ kind: "table", rows: SOURCE.prosePeriods }]} />
      </div>}
    </Dialog.Content></Dialog.Portal></Dialog.Root>
  </div>;
}
