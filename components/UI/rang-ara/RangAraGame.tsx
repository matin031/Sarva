"use client";

import "./rang-ara.css";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { AnimatePresence, MotionConfig, animate, motion, type Variants } from "motion/react";
import MainLogo from "@/components/svgs/mainLogo";
import GameReportButton from "@/components/UI/games/GameReportButton";
import { GameBackButton, gameIconButton } from "@/components/UI/games/GameNav";
import { useRoundGuard } from "@/lib/games/round-guard";
import { apiPost } from "@/lib/api/client";
import { useReducedMotion } from "@/lib/perf/use-perf";
import { useSetReportTarget } from "@/lib/reports/target";
import {
  CONCEPTS,
  DEMO,
  DEMO_RIGHT,
  DEMO_WRONG,
  DIALOGUE,
  GRADE_LABELS,
  type ConceptId,
  type GradeKey,
  type HitZone,
  type Level,
  type Token,
  type TokenId,
} from "@/lib/rang-ara/content";
import {
  canPaint,
  currentStep,
  initialState,
  isLocked,
  isStepDone,
  pickLine,
  reduce,
  stepTokens,
  type Verdict,
} from "@/lib/rang-ara/game";
import { disposeSfx, isSfxOn, playHit, playWipe, setSfxOn, subscribeSfx } from "@/lib/rang-ara/sfx";
import { GRADE_KEYS, isGradeKey, lessonTitle, selectableLessons } from "@/lib/rang-ara/verse";
import Mascot, { type Anchor, type MascotHandle, type Mood } from "./Mascot";

/* ═══════════════════════════════════════════════════════════════════════════
   «رنگ‌آرا» — گردانندهٔ صحنه.
   ═══════════════════════════════════════════════════════════════════════════

   سه صفحه، همه روی همان صحنه (شخصیت پشتِ کارتِ شیشه‌ای):

     آموزش  → خودِ شخصیت داخلِ همین کارت نشان می‌دهد بازی چطور است: رنگ
              برمی‌دارد، واژه رنگ می‌شود، و یک رنگِ اشتباه را واقعاً پاک می‌کند.
     انتخاب → هر سه پایه با همهٔ درس‌های غیرِ آزاد؛ چند درس (حتی از چند
              پایه) و ابیاتِ خارج از کتاب با هم انتخاب می‌شوند. درسی که هنوز
              بیتِ منتشرشده ندارد دیده می‌شود ولی انتخاب نمی‌شود.
     بازی   → ماشینِ حالتِ `lib/rang-ara/game.ts`. هر فاز یک افکت دارد که حرکتِ
              شخصیت و حباب را راه می‌اندازد و — با شناسهٔ همان ضربه — فازِ بعد
              را اعلام می‌کند. ترکِ صفحه وسطِ کار، تایمرها و انیمیشن‌ها را
              متوقف می‌کند و هیچ پیامِ دیررسی به جایی نمی‌رسد.

   ⚠️ همهٔ لحظه‌های بازخورد از `cue` رد می‌شوند؛ صدای شیشه اینجا پخش می‌شود و
   `onCue` درگاهِ بیرونی برای صدای بیشتر است. */

export type RangAraCue = "pick" | "paint" | "correct" | "wrong" | "wipe" | "next" | "finish";

type Tone = "prompt" | "good" | "bad" | "hint" | "teach";
/** `kicker` سطرِ کوچکِ بالای نامِ آرایه در حبابِ «پیدا کن» است. */
type Speech = { id: number; tone: Tone; text: string; concept?: ConceptId; kicker?: string };
type Screen = "tutorial" | "setup" | "play";
/** `grade` فقط زبانهٔ باز است؛ انتخاب خودِ `lessons` است («dahom:5»). */
type Choice = { grade: GradeKey; lessons: string[]; outside: boolean };

const TIMING = {
  sweep: [360, 140],
  celebrate: [700, 600],
  notice: [320, 380],
  exit: [300, 120],
} as const;

const TUTORIAL_KEY = "rang-ara:tutorial-seen";
const CHOICE_KEY = "rang-ara:choice";

const fa = (n: number) => n.toLocaleString("fa-IR");
const lessonKey = (grade: GradeKey, lesson: number) => `${grade}:${lesson}`;

/* ── جناس و سجع ─────────────────────────────────────────────────────────
   هر واژهٔ جفت جدا رنگ می‌شود؛ حباب می‌گوید چند واژه لازم است و بعد از
   اولی، سراغِ جفتش را می‌گیرد. */
const HIT_SOUND: Record<Exclude<HitZone, "cloth">, Parameters<typeof playHit>[0]> = {
  head: "thud",
  eye: "thud",
  cheek: "slap",
  mouth: "thud",
  tuft: "boing",
  belly: "giggle",
  hand: "thud",
};
/** چند ضربه در این بازه، و از چندتا به بعد قهر. */
const POKE_WINDOW = 6000;
const SULK_AT = 7;
const SULK_MS = 4200;

const COUNT = ["", "یکی", "دو تا", "سه تا", "چهار تا"];
function pairKicker(total: number, have: number): string {
  if (!have) return `${COUNT[total] ?? `${fa(total)} تا`} پیدا کن`;
  const left = total - have;
  if (left === 1) return total === 2 ? "جفتش رو پیدا کن" : "یکی دیگه مونده";
  return `${COUNT[left] ?? `${fa(left)} تا`}ی دیگه`;
}

/** خطِ پیوندِ دو واژهٔ جفت: هم‌سطر، کمانی از بالا؛ در دو سطر، منحنیِ S. */
function linkPath(a: DOMRect, b: DOMRect, box: DOMRect): string {
  const ax = a.left + a.width / 2 - box.left;
  const bx = b.left + b.width / 2 - box.left;
  if (Math.abs(a.top - b.top) < a.height / 2) {
    const y = Math.min(a.top, b.top) - box.top + 1;
    const lift = Math.min(18, 7 + Math.abs(ax - bx) * 0.1);
    return `M${ax.toFixed(1)},${y.toFixed(1)} Q${((ax + bx) / 2).toFixed(1)},${(y - lift * 2).toFixed(1)} ${bx.toFixed(1)},${y.toFixed(1)}`;
  }
  const [up, down, ux, dx] = a.top < b.top ? [a, b, ax, bx] : [b, a, bx, ax];
  const y1 = up.bottom - box.top - 1;
  const y2 = down.top - box.top + 1;
  const my = (y1 + y2) / 2;
  return `M${ux.toFixed(1)},${y1.toFixed(1)} C${ux.toFixed(1)},${my.toFixed(1)} ${dx.toFixed(1)},${my.toFixed(1)} ${dx.toFixed(1)},${y2.toFixed(1)}`;
}
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function tone(concept: ConceptId): CSSProperties {
  const c = CONCEPTS[concept].color;
  return { "--c": `var(--ra-${c})`, "--ci": `var(--ra-${c}-ink)` } as CSSProperties;
}

function readStore(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStore(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* حالتِ خصوصی؛ فقط برای همین نشست */
  }
}

const TOKEN_VARIANTS: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 420, damping: 32 } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.16, ease: "easeIn" } },
};

const VERSE_VARIANTS: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.026, delayChildren: 0.05 } },
  exit: { transition: { staggerChildren: 0.01, staggerDirection: -1 } },
};

/* ── آموزش: بیتِ نمونه و پنج قدم ─────────────────────────────────────────
   جمله‌ها از زبانِ خودِ شخصیت‌اند. نمونه همیشه همان بیتِ حافظ است
   (`DEMO`)، مستقل از اینکه بانک چه دارد. */
const DEMO_CONCEPT = DEMO.steps[0].concept;
const TUTORIAL = [
  "سلام! من هر بار یه آرایه ازت می‌خوام؛ مثلاً استعاره.",
  "رنگش رو از پالت پایین بردار.",
  "بعد روی واژهٔ درستش بزن.",
  "اشتباه بزنی، خودم با دستمال پاکش می‌کنم!",
  "همین! بریم سراغ درس‌ها؟",
] as const;

export default function RangAraGame({
  levels,
  onCue,
}: {
  /** بیت‌های منتشرشدهٔ بانک (از سرور). */
  levels: Level[];
  /** درگاهِ بازخوردِ صوتی/لمسیِ بیشتر. */
  onCue?: (cue: RangAraCue) => void;
}) {
  const reduced = useReducedMotion();
  const ms = (t: readonly [number, number]) => (reduced ? t[1] : t[0]);

  /* ── صفحه و انتخاب ──────────────────────────────────────────────────── */
  const tutorialSeen = useSyncExternalStore(
    () => () => {},
    () => readStore(TUTORIAL_KEY) === "1",
    () => false,
  );
  const [screenChoice, setScreen] = useState<Screen | null>(null);
  const screen: Screen = screenChoice ?? (tutorialSeen ? "setup" : "tutorial");

  /* تعدادِ بیتِ منتشرشدهٔ هر درس («dahom:5») و ابیاتِ خارج از کتاب. */
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of levels) if (l.book) m.set(lessonKey(l.book.grade, l.book.lesson), (m.get(lessonKey(l.book.grade, l.book.lesson)) ?? 0) + 1);
    return m;
  }, [levels]);
  const outsideCount = levels.filter((l) => !l.book).length;
  const [choice, setChoice] = useState<Choice>({ grade: GRADE_KEYS[0], lessons: [], outside: false });
  /* آخرین انتخاب، تا جایی که هنوز در بانک معنا دارد؛ وگرنه اولین درسی که بیت دارد. */
  useEffect(() => {
    let saved: Partial<Choice> | null = null;
    try {
      saved = JSON.parse(readStore(CHOICE_KEY) ?? "null") as Partial<Choice> | null;
    } catch {
      saved = null;
    }
    const lessons = Array.isArray(saved?.lessons) ? saved.lessons.filter((k) => (counts.get(k) ?? 0) > 0) : [];
    const outside = saved?.outside === true && outsideCount > 0;
    const first = GRADE_KEYS.flatMap((g) => selectableLessons(g).map((n) => lessonKey(g, n))).find((k) => counts.has(k));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- یک بار، از localStorage
    setChoice(
      lessons.length || outside
        ? { grade: isGradeKey(saved?.grade) ? saved.grade : GRADE_KEYS[0], lessons, outside }
        : first
          ? { grade: first.split(":")[0] as GradeKey, lessons: [first], outside: false }
          : { grade: GRADE_KEYS[0], lessons: [], outside: outsideCount > 0 },
    );
  }, [counts, outsideCount]);

  /** بیت‌های انتخاب؛ ترکیبِ چند منبع بُر می‌خورد، یک درس به ترتیبِ کتاب می‌ماند. */
  const pickSession = (c: Choice): Level[] =>
    levels.filter((l) => (l.book ? c.lessons.includes(lessonKey(l.book.grade, l.book.lesson)) : c.outside));
  const mixed = choice.lessons.length + (choice.outside ? 1 : 0) > 1;
  const [session, setSession] = useState<Level[]>(() => levels.slice(0, 1));
  const chosenCount = pickSession(choice).length;

  const [state, dispatch] = useReducer(
    (s: typeof initialState, a: Parameters<typeof reduce>[2]) => reduce(session, s, a),
    initialState,
  );
  const playing = screen === "play";
  const level = playing ? session[state.levelIndex] ?? DEMO : DEMO;
  const stepIndex = playing ? currentStep(level, state.found) : -1;
  const locked = isLocked(state.phase);
  const finished = playing && state.phase === "finished";

  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const frostRef = useRef<HTMLDivElement>(null);
  const verseRef = useRef<HTMLDivElement | null>(null);
  const paletteRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLButtonElement>(null);
  const mascotRef = useRef<MascotHandle>(null);
  const tokenEls = useRef(new Map<TokenId, HTMLButtonElement>());
  const recent = useRef<Record<string, string[]>>({});
  const speechSeq = useRef(0);
  /* ضربه‌های بیتِ جاری، به ترتیب. آخرِ بیت برای پنل فرستاده می‌شوند و سرور
     خودش نمره می‌دهد (`lib/rang-ara/record.ts`). کلید شناسهٔ ضربه است تا
     اجرای دوبارهٔ effect یک ضربه را دو بار نشمارد. */
  const played = useRef(new Map<number, { concept: string; token: string }>());

  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [speech, setSpeech] = useState<Speech | null>(null);
  const [moodOverride, setMoodOverride] = useState<Mood | null>(null);
  const [nudge, setNudge] = useState(0);

  /* آموزش: قدم و وضعیتِ نمایشیِ کارت. */
  const [beat, setBeat] = useState(0);
  const [demoSel, setDemoSel] = useState<ConceptId | null>(null);
  const [demoPaint, setDemoPaint] = useState<{ id: TokenId; concept: ConceptId; seq: number; live: boolean }[]>([]);

  const cue = useCallback(
    (c: RangAraCue) => {
      onCue?.(c);
    },
    [onCue],
  );
  const line = (key: string, pool: readonly string[]) => pickLine(pool, (recent.current[key] ??= []));
  const say = useCallback((t: Tone, text: string, concept?: ConceptId, kicker?: string) => {
    speechSeq.current += 1;
    setSpeech({ id: speechSeq.current, tone: t, text, concept, kicker });
  }, []);

  useEffect(() => () => disposeSfx(), []);

  const started = playing && (state.levelIndex > 0 || state.found.length > 0 || state.stats.wipes > 0);
  useRoundGuard(started && !finished);

  useSetReportTarget(
    useMemo(
      () =>
        !playing || finished
          ? null
          : {
              area: "other" as const,
              targetId: `rang-ara:${level.id}`,
              snapshot: level.lines.join(" / "),
              targetRef: { game: "rang-ara", level: level.id, step: stepIndex, book: level.book ?? null },
            },
      [playing, finished, level, stepIndex],
    ),
  );

  /* ── اندازه‌گیری: جای شخصیت و جا شدنِ مصراع‌ها ──────────────────────────
     ⚠️ مصراع تا جای ممکن نمی‌شکند: اندازهٔ قلم آن‌قدر کوچک می‌شود (تا ۱۳
     پیکسل) که بلندترین مصراع در یک خط جا شود. همهٔ فاصله‌های واژه‌ها با em
     است، پس عرض دقیقاً به نسبتِ قلم کم می‌شود و یک بار اندازه گرفتن کافی است.
     فقط وقتی حتی ۱۳ پیکسل هم جا نشود، مصراع کنترل‌شده در دو سطر می‌شکند. */
  const fitVerse = useCallback(() => {
    const verse = verseRef.current;
    const card = cardRef.current;
    if (!verse || !card) return;
    const cs = getComputedStyle(card);
    const avail = card.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const lines = [...verse.querySelectorAll<HTMLElement>(".ra-misra")];
    delete verse.dataset.wrap;
    verse.style.setProperty("--fit", "1");
    for (const l of lines) l.style.removeProperty("--ra-gap");
    /* ⚠️ کشیدنِ مصراعِ کوتاه‌تر با فاصلهٔ اندازه‌گرفته و نه با
       `space-between`: هایلایتِ عبارت‌های چندواژه‌ای نصفِ فاصله را از هر طرف
       می‌پوشاند تا یک نوارِ پیوسته شوند، و این فقط وقتی کار می‌کند که فاصله
       معلوم باشد. */
    const em = parseFloat(getComputedStyle(verse).fontSize) || 16;
    /* عرضِ خودِ واژه‌ها، نه عرضِ ردیف: ردیف در grid تا عرضِ ستون کش می‌آید. */
    const widths = lines.map((l) => {
      const kids = [...l.children];
      if (!kids.length) return 0;
      const a = kids[0].getBoundingClientRect();
      const b = kids[kids.length - 1].getBoundingClientRect();
      return Math.max(a.right, b.right) - Math.min(a.left, b.left);
    });
    const widest = Math.max(...widths);
    lines.forEach((l, i) => {
      const words = l.children.length;
      if (words < 2) return;
      const extra = Math.min((widest - widths[i]) / (words - 1) / em, 0.55);
      if (extra > 0.01) l.style.setProperty("--ra-gap", `${(0.3 + extra).toFixed(3)}em`);
    });
    const fit = avail / widest;
    if (fit * em < 13) {
      verse.dataset.wrap = "";
      for (const l of lines) l.style.removeProperty("--ra-gap");
      verse.style.setProperty("--fit", (14 / em).toFixed(3));
      return;
    }
    verse.style.setProperty("--fit", Math.min(fit, 1).toFixed(3));
  }, []);

  /* پیوندِ واژه‌های جناس/سجعِ کامل. مسیرها مستقیم در SVG ساخته می‌شوند، نه
     با state، چون به اندازه‌گیریِ DOM بسته‌اند و با هر تغییرِ اندازه فقط
     `d` عوض می‌شود — انیمیشنِ کشیده‌شدن یک بار، همان اولِ کار. */
  const linkSvg = useRef<SVGSVGElement | null>(null);
  const linksRef = useRef<{ key: string; ids: TokenId[]; concept: ConceptId }[]>([]);
  const drawLinks = useCallback(() => {
    const svg = linkSvg.current;
    const verse = verseRef.current;
    if (!svg || !verse) return;
    const box = verse.getBoundingClientRect();
    const keep = new Set<string>();
    for (const link of linksRef.current) {
      const rects = link.ids
        .map((id) => tokenEls.current.get(id)?.querySelector(".ra-hl")?.getBoundingClientRect())
        .filter((r): r is DOMRect => !!r);
      if (rects.length < 2) continue;
      keep.add(link.key);
      let path = svg.querySelector<SVGPathElement>(`path[data-key="${link.key}"]`);
      if (!path) {
        path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.dataset.key = link.key;
        path.setAttribute("pathLength", "1");
        path.setAttribute("class", "ra-link");
        path.style.setProperty("--ci", `var(--ra-${CONCEPTS[link.concept].color}-ink)`);
        svg.appendChild(path);
      }
      path.setAttribute("d", rects.slice(1).map((r, k) => linkPath(rects[k], r, box)).join(" "));
    }
    for (const p of svg.querySelectorAll<SVGPathElement>("path[data-key]")) {
      if (!keep.has(p.dataset.key ?? "")) p.remove();
    }
  }, []);

  const measure = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    const w = card.offsetWidth;
    const s = clamp(0.6 + w / 1900, 0.78, 1);
    const next = { x: card.offsetLeft + w * (w < 520 ? 0.7 : 0.72), y: card.offsetTop, s };
    setAnchor((prev) =>
      prev && Math.abs(prev.x - next.x) < 0.5 && Math.abs(prev.y - next.y) < 0.5 && prev.s === next.s ? prev : next,
    );
    fitVerse();
    drawLinks();
  }, [fitVerse, drawLinks]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (stageRef.current) ro.observe(stageRef.current);
    if (cardRef.current) ro.observe(cardRef.current);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [measure]);

  const setVerseRef = useCallback(
    (el: HTMLDivElement | null) => {
      verseRef.current = el;
      if (el) fitVerse();
    },
    [fitVerse],
  );

  /* ── شیشه: جای پاک‌شده کمی شفاف می‌ماند و بعد دوباره بخار می‌گیرد ─────── */
  const fogAnim = useRef<ReturnType<typeof animate> | null>(null);
  const clearGlass = useCallback((rect: DOMRect, p: number) => {
    const frost = frostRef.current;
    const card = cardRef.current;
    if (!frost || !card) return;
    fogAnim.current?.stop();
    const c = card.getBoundingClientRect();
    frost.style.setProperty("--wx", `${rect.left + rect.width / 2 - c.left}px`);
    frost.style.setProperty("--wy", `${rect.top + rect.height / 2 - c.top}px`);
    frost.style.setProperty("--wrx", `${((rect.width / 2 + 22) * Math.min(1, p * 1.15)).toFixed(1)}px`);
    frost.style.setProperty("--wry", `${(rect.height * 0.85 * Math.min(1, p * 2.5)).toFixed(1)}px`);
  }, []);
  const refog = useCallback(() => {
    const frost = frostRef.current;
    if (!frost) return;
    const rx = parseFloat(frost.style.getPropertyValue("--wrx")) || 0;
    const ry = parseFloat(frost.style.getPropertyValue("--wry")) || 0;
    fogAnim.current = animate(1, 0, {
      duration: 1.8,
      delay: 0.5,
      ease: [0.4, 0, 0.6, 1],
      onUpdate: (k) => {
        frost.style.setProperty("--wrx", `${(rx * k).toFixed(1)}px`);
        frost.style.setProperty("--wry", `${(ry * k).toFixed(1)}px`);
      },
    });
  }, []);
  useEffect(() => () => fogAnim.current?.stop(), []);

  /** پاک کردنِ یک واژه با دستمال — مشترکِ بازی و آموزش. */
  const wipeToken = useCallback(
    (id: TokenId, concept: ConceptId) => {
      const el = tokenEls.current.get(id);
      const ink = el?.querySelector<HTMLElement>(".ra-ink");
      const hl = el?.querySelector<HTMLElement>(".ra-hl[data-live]") ?? el?.querySelector<HTMLElement>(".ra-hl");
      const mascot = mascotRef.current;
      if (!el || !ink || !hl || !mascot) return Promise.resolve();
      const rect = ink.getBoundingClientRect();
      if (reduced) playWipe(0.32, 3);
      return mascot
        .wipe(rect, {
          stain: `var(--ra-${CONCEPTS[concept].color})`,
          onContact: () => {
            el.setAttribute("data-rubbed", "");
            playWipe();
          },
          onProgress: (p, dir) => {
            hl.style.setProperty("--erase", p.toFixed(3));
            hl.dataset.dir = dir;
            clearGlass(rect, p);
          },
        })
        .then(() => {
          el.removeAttribute("data-rubbed");
          refog();
        });
    },
    [reduced, clearGlass, refog],
  );

  /* پیامِ صفحه‌خوان از خودِ وضعیت ساخته می‌شود، نه از حباب: جمله‌های حباب
     شوخی‌اند و «ایول!» به کسی که صفحه را نمی‌بیند چیزی نمی‌گوید. */
  /* حباب اول سراغِ جفتِ نیمه‌کاره را می‌گیرد، بعد گامِ جاری. */
  const pendingPair = playing
    ? level.steps.findIndex(
        (st, i) => CONCEPTS[st.concept].pair && stepTokens(state.found, i).length > 0 && !isStepDone(level, state.found, i),
      )
    : -1;
  const askIndex = pendingPair !== -1 ? pendingPair : stepIndex;
  const ask = askIndex >= 0 ? level.steps[askIndex] : null;
  const kicker =
    ask && CONCEPTS[ask.concept].pair ? pairKicker(ask.answer.length, stepTokens(state.found, askIndex).length) : undefined;

  const announce = (() => {
    if (screen === "tutorial") return TUTORIAL[beat];
    if (screen === "setup") return "پایه و درس را انتخاب کن.";
    const text = (ids: TokenId[]) => ids.map((id) => level.tokens.find((t) => t.id === id)?.text).join(" ");
    const v = state.stroke?.verdict;
    if (finished) return "همهٔ بیت‌ها تمام شد.";
    if (state.phase === "correct" && v?.kind === "correct") {
      const label = CONCEPTS[level.steps[v.step].concept].label;
      return v.partial
        ? `درست است. «${text(v.tokens)}» یکی از واژه‌های ${label} است؛ جفتش را پیدا کن.`
        : `درست است. «${text(v.tokens)}»: ${label}.`;
    }
    if ((state.phase === "wrong" || state.phase === "wiping") && v)
      return v.kind === "wrong-color"
        ? `واژهٔ «${text(v.tokens)}» درست است ولی رنگش نه.`
        : v.kind === "wrong-pair"
          ? `«${text(v.tokens)}» جفتِ این ${CONCEPTS[level.steps[v.step].concept].label} نیست.`
          : `«${text(v.tokens)}» نیست.`;
    if (state.phase === "explanation") return "همهٔ آرایه‌های این بیت پیدا شد.";
    if (!ask) return "";
    return CONCEPTS[ask.concept].pair
      ? `پیدا کن: ${CONCEPTS[ask.concept].label}؛ ${fa(ask.answer.length)} واژه، هر کدام جدا.`
      : `پیدا کن: ${CONCEPTS[ask.concept].label}`;
  })();

  /* ── حال‌وهوای شخصیت ─────────────────────────────────────────────────── */
  const verdict: Verdict | undefined = state.stroke?.verdict;
  const baseMood: Mood = !playing
    ? "neutral"
    : state.phase === "correct" || finished
      ? "happy"
      : state.phase === "wrong"
        ? verdict?.kind === "wrong-color" || verdict?.kind === "wrong-pair"
          ? "skeptic"
          : "annoyed"
        : state.phase === "wiping"
          ? "focused"
          : state.phase === "explanation"
            ? "proud"
            : state.phase === "checking"
              ? "curious"
              : "neutral";
  /* حالتِ موقتی (پرسیدنِ «رنگ کو؟»، یا «تمیزش کردم» بعد از پاک کردن) فقط در
     فازهای آرام دیده می‌شود؛ هر واکنشِ تازه خودش جایش را می‌گیرد. */
  const calm = !playing || state.phase === "idle" || state.phase === "color-selected";
  /* ضربه (درد/قلقلک) و قهر از هر فازی جلوترند: خودشان واکنشِ تازه‌اند. */
  const [pain, setPain] = useState<{ mood: Mood; id: number } | null>(null);
  const [sulking, setSulking] = useState(false);
  const mood: Mood = sulking ? "sulky" : pain?.mood ?? ((calm && moodOverride) || baseMood);

  useEffect(() => {
    if (!moodOverride) return;
    const t = window.setTimeout(() => setMoodOverride(null), 1100);
    return () => window.clearTimeout(t);
  }, [moodOverride]);
  useEffect(() => {
    if (!pain) return;
    const t = window.setTimeout(() => setPain(null), 1000);
    return () => window.clearTimeout(t);
  }, [pain]);

  const lookAtEl = useCallback((el: Element | null | undefined) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    mascotRef.current?.lookAt(r.left + r.width / 2, r.top + r.height / 2);
  }, []);

  /* ── آموزش ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (screen !== "tutorial") return;
    const timers: number[] = [];
    const later = (fn: () => void, t: number) => timers.push(window.setTimeout(fn, t));
    say("teach", TUTORIAL[beat], beat === 0 ? DEMO_CONCEPT : undefined);
    /* هر تغییرِ صحنهٔ نمایشی از تایمر می‌آید و نه از خودِ بدنهٔ افکت؛ رفتن به
       قدمِ بعد تایمرهای قدمِ قبل را پاک می‌کند، پس کلیکِ سریع روی «بعدی»
       هیچ صحنهٔ نیمه‌کاره‌ای جا نمی‌گذارد. */
    switch (beat) {
      case 0:
        later(() => {
          setDemoSel(null);
          setDemoPaint([]);
        }, 0);
        break;
      case 1:
        later(() => {
          setDemoSel(DEMO_CONCEPT);
          lookAtEl(paletteRef.current);
        }, 450);
        break;
      case 2:
        later(() => setDemoSel(DEMO_CONCEPT), 0);
        later(() => {
          lookAtEl(tokenEls.current.get(DEMO_RIGHT));
          setDemoPaint([{ id: DEMO_RIGHT, concept: DEMO_CONCEPT, seq: 1, live: true }]);
        }, 500);
        later(() => {
          mascotRef.current?.cheer();
          setMoodOverride("happy");
        }, 900);
        break;
      case 3:
        later(() => {
          setDemoSel(DEMO_CONCEPT);
          setDemoPaint([
            { id: DEMO_RIGHT, concept: DEMO_CONCEPT, seq: 1, live: false },
            { id: DEMO_WRONG, concept: DEMO_CONCEPT, seq: 2, live: true },
          ]);
        }, 0);
        later(() => {
          mascotRef.current?.startle();
          setMoodOverride("annoyed");
        }, 500);
        later(() => {
          setMoodOverride(null);
          void wipeToken(DEMO_WRONG, DEMO_CONCEPT).then(() => {
            setDemoPaint((p) => p.filter((x) => x.id !== DEMO_WRONG));
            setMoodOverride("smug");
          });
        }, 900);
        break;
      case 4:
        later(() => setMoodOverride("proud"), 100);
        break;
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, beat]);

  /* ── ضربه به شخصیت ─────────────────────────────────────────────────────
     هر جا بخورد جملهٔ خودش را دارد؛ چند ضربهٔ پشتِ هم عصبانی‌اش می‌کند و
     از هفتمی قهر می‌کند. در آموزش و انتخابِ درس، بعد از جمله‌اش حرفِ اصلی
     برمی‌گردد تا راهنما گم نشود. */
  const pokes = useRef<number[]>([]);
  const pokeTimers = useRef({ sulk: 0, restore: 0 });
  const live = useRef({ screen, beat });
  useEffect(() => {
    live.current = { screen, beat };
  });
  useEffect(() => {
    const timers = pokeTimers.current;
    return () => {
      window.clearTimeout(timers.sulk);
      window.clearTimeout(timers.restore);
    };
  }, []);
  const restoreTeach = (after: number) => {
    window.clearTimeout(pokeTimers.current.restore);
    pokeTimers.current.restore = window.setTimeout(() => {
      const now = live.current;
      if (now.screen === "tutorial") say("teach", TUTORIAL[now.beat], now.beat === 0 ? DEMO_CONCEPT : undefined);
      else if (now.screen === "setup") say("teach", levels.length ? "کدوم درس رو تمرین کنیم؟" : "هنوز بیتی برای بازی نیست.");
    }, after);
  };
  const onPoke = (zone: HitZone) => {
    if (zone === "cloth") playWipe(0.24, 2);
    else playHit(HIT_SOUND[zone]);
    const now = performance.now();
    pokes.current = [...pokes.current.filter((t) => now - t < POKE_WINDOW), now];
    const n = pokes.current.length;
    if (sulking) {
      if (n % 2 === 0) say("bad", line("pokeSulk", DIALOGUE.pokeSulk));
      return;
    }
    if (n >= SULK_AT) {
      pokes.current = [];
      setPain(null);
      setSulking(true);
      say("bad", line("sulk", DIALOGUE.sulk));
      mascotRef.current?.sulk(SULK_MS);
      window.clearTimeout(pokeTimers.current.sulk);
      pokeTimers.current.sulk = window.setTimeout(() => {
        setSulking(false);
        say("good", line("makeup", DIALOGUE.makeup));
        restoreTeach(1800);
      }, SULK_MS);
      return;
    }
    setPain({ mood: zone === "belly" ? "tickled" : "hurt", id: now });
    const angry = n >= 4 && Math.random() < 0.55;
    say(
      zone === "belly" ? "good" : "bad",
      angry ? line("pokeAngry", DIALOGUE.pokeAngry) : line(`poke-${zone}`, DIALOGUE.poke[zone]),
    );
    restoreTeach(1900);
  };

  const finishTutorial = () => {
    writeStore(TUTORIAL_KEY, "1");
    setScreen("setup");
    setDemoPaint([]);
    setDemoSel(null);
  };

  /* ── انتخابِ درس ──────────────────────────────────────────────────────── */
  useEffect(() => {
    if (screen === "setup") say("teach", levels.length ? "کدوم درس رو تمرین کنیم؟" : "هنوز بیتی برای بازی نیست.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  const startSession = () => {
    const s = pickSession(choice);
    if (!s.length) return;
    writeStore(CHOICE_KEY, JSON.stringify(choice));
    if (mixed) {
      for (let i = s.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [s[i], s[j]] = [s[j], s[i]];
      }
    }
    setSession(s);
    played.current.clear();
    dispatch({ type: "restart" });
    setSpeech(null);
    setScreen("play");
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  /* ── فازهای بازی ─────────────────────────────────────────────────────── */
  const stroke = state.stroke;
  useEffect(() => {
    if (!playing) return;
    const timers: number[] = [];
    const later = (fn: () => void, t: number) => timers.push(window.setTimeout(fn, t));
    let cancelled = false;

    switch (state.phase) {
      case "checking":
        if (!stroke) break;
        played.current.set(stroke.id, { concept: stroke.concept, token: stroke.token });
        later(() => dispatch({ type: "resolve", id: stroke.id }), ms(TIMING.sweep));
        break;

      case "correct": {
        if (!stroke || stroke.verdict.kind !== "correct") break;
        const v = stroke.verdict;
        const before = currentStep(level, state.found.filter((f) => f.strokeId !== stroke.id));
        const complete = currentStep(level, state.found) === -1;
        if (v.partial) {
          say("good", line("pairHalf", DIALOGUE.pairHalf));
        } else if (!complete && v.step !== before && level.steps[before].concept !== level.steps[v.step].concept) {
          const wanted = CONCEPTS[level.steps[before].concept].label;
          say("good", line("early", DIALOGUE.early).replace("{concept}", wanted));
        } else {
          say("good", line("positive", level.dialogue?.positive ?? DIALOGUE.positive));
        }
        mascotRef.current?.cheer();
        cue("correct");
        later(() => dispatch({ type: "settled", id: stroke.id }), ms(TIMING.celebrate));
        break;
      }

      case "wrong": {
        if (!stroke) break;
        const kind = stroke.verdict.kind;
        say(
          "bad",
          kind === "wrong-pair"
            ? line("notPair", DIALOGUE.notPair)
            : kind === "wrong-color"
              ? line("wrongColor", DIALOGUE.wrongColor)
              : line("negative", level.dialogue?.negative ?? DIALOGUE.negative),
        );
        mascotRef.current?.startle();
        cue("wrong");
        later(() => dispatch({ type: "wipe", id: stroke.id }), ms(TIMING.notice));
        break;
      }

      case "wiping": {
        if (!stroke) break;
        cue("wipe");
        void wipeToken(stroke.verdict.tokens[0], stroke.concept).then(() => {
          if (cancelled) return;
          dispatch({ type: "wiped", id: stroke.id });
          setMoodOverride("smug");
        });
        break;
      }

      case "explanation": {
        const strokes = [...played.current.values()];
        played.current.clear();
        // مهمان هم می‌فرستد و سرور `saved: false` برمی‌گرداند؛ شکستِ شبکه بازی را نگه نمی‌دارد.
        if (strokes.length) void apiPost("/api/v1/rang-ara/answers", { playId: crypto.randomUUID(), verseId: level.id, strokes });
        later(() => say("good", line("verseDone", DIALOGUE.verseDone)), 900);
        later(() => {
          const cta = ctaRef.current;
          if (!cta) return;
          cta.focus({ preventScroll: true });
          cta.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" });
        }, 520);
        break;
      }

      case "transition-next":
        cue("next");
        /* شخصیت رفتنِ بیت را تماشا می‌کند. */
        lookAtEl(cardRef.current);
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
        later(() => dispatch({ type: "enter" }), ms(TIMING.exit));
        break;

      case "finished":
        say("good", DIALOGUE.finished);
        cue("finish");
        break;
    }

    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
    // فقط تغییرِ فاز، ضربه یا بیت باید این را دوباره اجرا کند.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, state.phase, stroke?.id, state.levelIndex]);

  /* حباب بعد از هر واکنش به همان چیزی برمی‌گردد که شخصیت می‌خواهد. */
  const wanted = ask?.concept;
  useEffect(() => {
    if (!playing || (state.phase !== "idle" && state.phase !== "color-selected")) return;
    if (!wanted) return;
    if (speech?.tone === "prompt" && speech.concept === wanted && speech.kicker === kicker) return;
    const delay = !speech
      ? 500
      : speech.tone === "good"
        ? state.found.length === 0
          ? 520
          : 700
        : speech.tone === "hint"
          ? 1500
          : 900;
    const t = window.setTimeout(() => say("prompt", CONCEPTS[wanted].label, wanted, kicker), delay);
    return () => window.clearTimeout(t);
  }, [playing, state.phase, wanted, kicker, speech, state.found.length, say]);

  /* ── ورودی‌ها ──────────────────────────────────────────────────────────── */
  const pickable = playing && !finished && state.phase !== "explanation" && state.phase !== "transition-next";

  const pick = useCallback(
    (concept: ConceptId | null) => {
      if (!pickable) return;
      dispatch({ type: "pick", concept });
      if (concept) cue("pick");
    },
    [pickable, cue],
  );

  const onToken = (id: TokenId) => {
    if (locked || !pickable) return;
    lookAtEl(tokenEls.current.get(id));
    if (!canPaint(level, state.found, id)) {
      say("hint", line("already", DIALOGUE.already));
      setMoodOverride("curious");
      return;
    }
    if (!state.concept) {
      say("hint", line("noColor", DIALOGUE.noColor));
      setMoodOverride("curious");
      setNudge((n) => n + 1);
      window.setTimeout(() => lookAtEl(paletteRef.current), 160);
      return;
    }
    cue("paint");
    dispatch({ type: "paint", token: id });
  };

  /* میان‌بر: رقم‌های ۱ تا ۷ (فارسی یا لاتین) رنگ برمی‌دارند؛ Esc رنگ را زمین می‌گذارد. */
  useEffect(() => {
    if (!playing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable], [role='dialog']")) return;
      const n = "۱۲۳۴۵۶۷۸۹".indexOf(e.key) + 1 || Number(/^[1-9]$/.test(e.key) ? e.key : 0);
      if (n && n <= level.palette.length) {
        e.preventDefault();
        pick(level.palette[n - 1]);
      } else if (e.key === "Escape" && state.concept) {
        pick(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, level, pick, state.concept]);

  /* نگاهِ شخصیت دنبالِ نشانگر — یک بار در هر فریم. */
  const gazeFrame = useRef(0);
  const gazePoint = useRef<[number, number]>([0, 0]);
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    gazePoint.current = [e.clientX, e.clientY];
    if (gazeFrame.current) return;
    gazeFrame.current = requestAnimationFrame(() => {
      gazeFrame.current = 0;
      mascotRef.current?.lookAt(...gazePoint.current);
    });
  };
  useEffect(() => () => cancelAnimationFrame(gazeFrame.current), []);

  /* ── نقاشی ────────────────────────────────────────────────────────────── */
  /* هر واژه می‌تواند چند لایه رنگ داشته باشد: کنایه‌ای که واژه‌ای مجاز در دلش
     دارد، یا ضربهٔ تازه روی واژه‌ای که قبلاً رنگ خورده. */
  const paints = useMemo(() => {
    const map = new Map<TokenId, Paint[]>();
    const add = (id: TokenId, p: Paint) => map.set(id, [...(map.get(id) ?? []), p]);
    if (screen === "tutorial") {
      for (const d of demoPaint) add(d.id, { concept: d.concept, strokeId: d.seq, order: 0, group: [d.id], live: d.live });
      return map;
    }
    if (!playing) return map;
    for (const f of state.found) {
      const concept = level.steps[f.step].concept;
      /* نیمهٔ یک جفت آرام می‌تپد تا بازیکن بداند هنوز منتظرِ لنگه‌اش است. */
      const waiting = CONCEPTS[concept].pair && !isStepDone(level, state.found, f.step);
      f.tokens.forEach((id, order) => add(id, { concept, strokeId: f.strokeId, order, group: f.tokens, live: false, waiting }));
    }
    if (stroke && (state.phase === "checking" || state.phase === "correct" || state.phase === "wrong" || state.phase === "wiping")) {
      const live = state.found.some((f) => f.strokeId === stroke.id);
      if (!live) {
        stroke.verdict.tokens.forEach((id, order) =>
          add(id, { concept: stroke.concept, strokeId: stroke.id, order, group: stroke.verdict.tokens, live: true }),
        );
      } else {
        for (const id of stroke.verdict.tokens) {
          const layer = map.get(id)?.find((x) => x.strokeId === stroke.id);
          if (layer) layer.live = true;
        }
      }
    }
    return map;
  }, [screen, demoPaint, playing, state.found, state.phase, stroke, level]);

  const selConcept = playing ? state.concept : screen === "tutorial" ? demoSel : null;
  const selTone = selConcept
    ? ({
        "--sel-c": `var(--ra-${CONCEPTS[selConcept].color})`,
        "--sel-ci": `var(--ra-${CONCEPTS[selConcept].color}-ink)`,
      } as CSSProperties)
    : undefined;
  const armed = playing && Boolean(state.concept) && !locked && pickable;
  /* گام‌های تمام‌شده، تازه‌ترین اول — هم برای توضیح‌ها و هم برای پیوندِ جفت‌ها. */
  const doneSteps = useMemo(() => {
    if (!playing) return [];
    return level.steps
      .map((st, i) => ({
        st,
        i,
        ids: level.tokens.filter((t) => stepTokens(state.found, i).includes(t.id)).map((t) => t.id),
        last: Math.max(-1, ...state.found.filter((f) => f.step === i).map((f) => f.strokeId)),
      }))
      .filter(({ i }) => isStepDone(level, state.found, i))
      .sort((a, b) => b.last - a.last);
  }, [playing, level, state.found]);
  const links = useMemo(
    () =>
      doneSteps
        .filter(({ st }) => CONCEPTS[st.concept].pair)
        .map(({ st, i, ids }) => ({ key: String(i), ids, concept: st.concept })),
    [doneSteps],
  );
  useLayoutEffect(() => {
    linksRef.current = links;
    drawLinks();
  }, [links, drawLinks]);
  const notesOpen = playing && doneSteps.length > 0 && state.phase !== "transition-next" && !finished;
  const isLast = state.levelIndex === session.length - 1;
  const showVerse = screen === "tutorial" || (playing && !finished);
  const verseKey = screen === "tutorial" ? "demo" : level.id;
  const complete = playing && state.phase === "explanation";

  return (
    <MotionConfig reducedMotion="user">
      <div className="ra-root" dir="rtl" onPointerMove={onPointerMove} onPointerLeave={() => mascotRef.current?.lookAway()}>
        <header className="ra-bar">
          <GameBackButton href="/game" />
          <p className="ra-bar-progress">
            <span className="ra-bar-name">رنگ‌آرا</span>
            {playing && !finished && (
              <>
                <span className="ra-bar-dot" aria-hidden />
                <span className="sr-only">بیت</span>
                <span className="game-num ra-bar-num">{fa(Math.min(state.levelIndex + 1, session.length))}</span>
                <span className="ra-bar-sep" aria-hidden />
                <span className="sr-only">از</span>
                <span className="game-num">{fa(session.length)}</span>
              </>
            )}
          </p>
          <div className="ra-bar-side">
            <SfxToggle />
            <GameReportButton />
          </div>
        </header>

        <div className="ra-play">
          <div ref={stageRef} className="ra-stage" style={{ "--ra-s": anchor?.s } as CSSProperties}>
            {anchor && (
              <Mascot
                ref={mascotRef}
                anchor={anchor}
                stageRef={stageRef}
                mood={mood}
                reduced={reduced}
                bubble={<Bubble speech={speech} />}
                onPoke={onPoke}
              />
            )}

            <div ref={cardRef} className="ra-card" data-armed={armed || undefined} style={selTone}>
              {/* شیشهٔ مات با نشانِ سروا پشتش. جایی که دستمال می‌کشد، بخارِ
                  شیشه کنار می‌رود و نشان واضح دیده می‌شود. */}
              <div ref={frostRef} className="ra-glass" aria-hidden>
                <div className="ra-glass-logo">
                  <MainLogo />
                </div>
                <div className="ra-glass-frost" />
                <div className="ra-glass-shine" />
                <div className="ra-glass-sheen" />
              </div>

              <AnimatePresence mode="wait" initial={false}>
                {finished ? (
                  <Summary key="summary" levels={session.length} stats={state.stats} reduced={reduced} />
                ) : screen === "setup" ? (
                  <Setup key="setup" counts={counts} outsideCount={outsideCount} choice={choice} onChange={setChoice} />
                ) : showVerse ? (
                  <motion.div
                    key={verseKey}
                    className="ra-verse-wrap"
                    initial="hidden"
                    /* ⚠️ خروجِ واژه‌ها همان لحظهٔ «بیت بعدی» شروع می‌شود و منتظرِ
                       عوض شدنِ بیت نمی‌ماند. */
                    animate={playing && state.phase === "transition-next" ? "exit" : "show"}
                    exit="exit"
                    variants={VERSE_VARIANTS}
                  >
                    <figure className="ra-figure">
                      <div ref={setVerseRef} className="ra-verse" lang="fa">
                        <motion.svg ref={linkSvg} className="ra-links" variants={TOKEN_VARIANTS} aria-hidden />
                        {([0, 1] as const).map((ln) => (
                          <p key={ln} className="ra-misra">
                            {level.tokens
                              .filter((t) => t.line === ln)
                              .map((t) => (
                                <TokenButton
                                  key={t.id}
                                  token={t}
                                  layers={paints.get(t.id) ?? []}
                                  settle={
                                    screen === "tutorial"
                                      ? !!paints.get(t.id)?.some((x) => x.live) && t.id === DEMO_RIGHT
                                      : !!paints.get(t.id)?.some((x) => x.live) && state.phase === "correct"
                                  }
                                  interactive={playing && !locked && pickable}
                                  register={(el) => {
                                    if (el) tokenEls.current.set(t.id, el);
                                    else tokenEls.current.delete(t.id);
                                  }}
                                  onPick={() => onToken(t.id)}
                                  onFocus={(el) => lookAtEl(el)}
                                />
                              ))}
                          </p>
                        ))}
                      </div>
                      {screen === "tutorial" ? (
                        <div className="ra-card-foot">
                          <ol className="ra-steps" aria-label="قدم‌های آموزش">
                            {TUTORIAL.map((_, i) => (
                              <li key={i} data-state={i < beat ? "done" : i === beat ? "now" : "todo"} style={tone(DEMO_CONCEPT)} />
                            ))}
                          </ol>
                          <button type="button" className="ra-link" onClick={finishTutorial}>
                            رد شو
                          </button>
                        </div>
                      ) : (
                        <figcaption className="ra-card-foot">
                          <span className="ra-poet">
                            {level.poet}
                            {level.source && (
                              <span className="ra-source">
                                {level.book ? `${GRADE_LABELS[level.book.grade]} · ${level.source}` : level.source}
                              </span>
                            )}
                          </span>
                          <ol className="ra-steps" aria-label="آرایه‌های این بیت">
                            {level.steps.map((st, i) => {
                              const done = isStepDone(level, state.found, i);
                              const half = !done && state.found.some((f) => f.step === i);
                              return (
                                <li
                                  key={i}
                                  data-state={done ? "done" : half ? "half" : i === stepIndex ? "now" : "todo"}
                                  style={tone(st.concept)}
                                >
                                  <span className="sr-only">
                                    {CONCEPTS[st.concept].label}، {done ? "پیدا شد" : "مانده"}
                                  </span>
                                </li>
                              );
                            })}
                          </ol>
                        </figcaption>
                      )}
                    </figure>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <div className="ra-dock" data-sticky={screen === "setup" || undefined}>
            <AnimatePresence mode="wait" initial={false}>
              {screen === "tutorial" ? (
                <motion.div key="tutorial" className="ra-dock-col" {...DOCK_MOTION}>
                  <div className="ra-demo-palette" data-show={beat >= 1 || undefined} aria-hidden>
                    <Palette ids={DEMO.palette} selected={demoSel} nudge={0} onPick={() => {}} onFocusSwatch={() => {}} inert />
                  </div>
                  <button
                    type="button"
                    className="ra-cta ra-cta-small"
                    onClick={() => (beat < TUTORIAL.length - 1 ? setBeat(beat + 1) : finishTutorial())}
                  >
                    <span>{beat < TUTORIAL.length - 1 ? "بعدی" : "بریم"}</span>
                    <CtaArrow />
                  </button>
                </motion.div>
              ) : screen === "setup" ? (
                <motion.div key="setup" className="ra-dock-row" {...DOCK_MOTION}>
                  <button type="button" className="ra-cta" disabled={!chosenCount} onClick={() => startSession()}>
                    <span>
                      شروع
                      {chosenCount > 0 && (
                        <span className="ra-cta-count game-num">
                          {" "}
                          · {fa(chosenCount)} بیت{mixed ? " · ترکیبی" : ""}
                        </span>
                      )}
                    </span>
                    <CtaArrow />
                  </button>
                  <button
                    type="button"
                    className="ra-ghost"
                    onClick={() => {
                      setBeat(0);
                      setScreen("tutorial");
                    }}
                  >
                    آموزش
                  </button>
                </motion.div>
              ) : finished ? (
                <motion.div key="again" className="ra-dock-row" {...DOCK_MOTION}>
                  <button type="button" className="ra-cta" onClick={() => startSession()}>
                    <span>از اول</span>
                    <CtaArrow />
                  </button>
                  <button type="button" className="ra-ghost" onClick={() => setScreen("setup")}>
                    درس دیگر
                  </button>
                </motion.div>
              ) : complete || state.phase === "transition-next" ? (
                <motion.div key="next" className="ra-dock-row" {...DOCK_MOTION}>
                  <button
                    ref={ctaRef}
                    type="button"
                    className="ra-cta"
                    onClick={() => dispatch({ type: "next" })}
                    disabled={!complete}
                  >
                    <span>{isLast ? "پایان" : "بیت بعدی"}</span>
                    <CtaArrow />
                  </button>
                </motion.div>
              ) : (
                <motion.div key={`palette-${level.id}`} className="ra-dock-col" {...DOCK_MOTION}>
                  <Palette
                    ref={paletteRef}
                    ids={level.palette}
                    selected={state.concept}
                    nudge={nudge}
                    onPick={pick}
                    onFocusSwatch={lookAtEl}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence initial={false}>
            {notesOpen && (
              <motion.section
                key={level.id}
                className="ra-notes"
                aria-label="توضیح"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0, transition: { duration: 0.24, ease: "easeIn" } }}
                transition={{ duration: 0.46, ease: [0.2, 0.8, 0.2, 1] }}
              >
                <div className="ra-notes-inner">
                  <header className="ra-notes-head">
                    <h2 className="ra-notes-title">پاسخ‌ها</h2>
                    <span className="ra-notes-dots" aria-hidden>
                      {level.steps.map((st, i) => (
                        <i key={i} data-on={isStepDone(level, state.found, i) || undefined} style={tone(st.concept)} />
                      ))}
                    </span>
                    <span className="ra-notes-count game-num">
                      {fa(doneSteps.length)} از {fa(level.steps.length)}
                    </span>
                  </header>
                  <AnimatePresence initial={false}>
                    {complete && level.meaning && (
                      <motion.div
                        key="meaning"
                        className="ra-note-clip"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
                      >
                        <div className="ra-meaning">
                          <span className="ra-meaning-mark" aria-hidden>
                            «
                          </span>
                          <h3 className="ra-meaning-label">معنی بیت</h3>
                          <motion.p
                            className="ra-meaning-text"
                            initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            transition={{ duration: 0.6, delay: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
                          >
                            {level.meaning}
                          </motion.p>
                        </div>
                      </motion.div>
                    )}
                    {doneSteps.map(({ st, i, ids }) => {
                      const c = CONCEPTS[st.concept];
                      const phrase = ids
                        .map((id) => level.tokens.find((t) => t.id === id)?.text)
                        .join(c.pair ? " · " : " ");
                      return (
                        <motion.div
                          key={i}
                          className="ra-note-clip"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          transition={{ duration: 0.42, ease: [0.2, 0.8, 0.2, 1] }}
                        >
                          <motion.article
                            className="ra-note"
                            style={tone(st.concept)}
                            initial={{ scale: 0.97, y: -10, filter: "blur(4px)" }}
                            animate={{ scale: 1, y: 0, filter: "blur(0px)" }}
                            transition={{ type: "spring", stiffness: 360, damping: 30 }}
                          >
                            <span className="ra-note-rail" aria-hidden />
                            <h3 className="ra-note-top">
                              <span className="ra-note-chip">
                                <i aria-hidden />
                                {c.label}
                              </span>
                              <span className="ra-note-quote">{phrase}</span>
                            </h3>
                            <p className="ra-note-text">{st.explanation}</p>
                            {st.tip && (
                              <p className="ra-note-tip">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3Z"
                                  />
                                </svg>
                                <span>
                                  <b>نکته</b> {st.tip}
                                </span>
                              </p>
                            )}
                          </motion.article>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </div>
    </MotionConfig>
  );
}

type Paint = {
  concept: ConceptId;
  strokeId: number;
  order: number;
  group: TokenId[];
  live: boolean;
  /** نیمهٔ جناس/سجعی که لنگه‌اش هنوز پیدا نشده. */
  waiting?: boolean;
};

const DOCK_MOTION = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.16, ease: "easeIn" } },
} as const;

function CtaArrow() {
  return (
    <span className="ra-cta-arrow" aria-hidden>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth={2.1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 6 4 12l6 6M20 12H4.5" />
      </svg>
    </span>
  );
}

/* ── صدا ───────────────────────────────────────────────────────────────── */

function SfxToggle() {
  const on = useSyncExternalStore(subscribeSfx, isSfxOn, () => true);
  return (
    <button
      type="button"
      className={`${gameIconButton} game-nav-toggle`}
      aria-pressed={on}
      aria-label={on ? "بی‌صدا" : "صدادار"}
      title={on ? "صدا روشن است" : "صدا خاموش است"}
      onClick={() => setSfxOn(!on)}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H3v6h3l5 4V5Z" />
        {on ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="m16 9 5 6M21 9l-5 6" />
        )}
      </svg>
    </button>
  );
}

/* ── انتخابِ درس ──────────────────────────────────────────────────────── */

function Setup({
  counts,
  outsideCount,
  choice,
  onChange,
}: {
  counts: Map<string, number>;
  outsideCount: number;
  choice: Choice;
  onChange: (c: Choice) => void;
}) {
  const grade = choice.grade;
  const lessons = selectableLessons(grade).map((n) => {
    const key = lessonKey(grade, n);
    return { n, key, title: lessonTitle(grade, n), count: counts.get(key) ?? 0 };
  });
  const open = lessons.filter((l) => l.count > 0).map((l) => l.key);
  const allOn = open.length > 0 && open.every((k) => choice.lessons.includes(k));
  const picked = (g: GradeKey) => choice.lessons.filter((k) => k.startsWith(`${g}:`)).length;

  const toggle = (key: string) =>
    onChange({
      ...choice,
      lessons: choice.lessons.includes(key) ? choice.lessons.filter((k) => k !== key) : [...choice.lessons, key],
    });
  const toggleAll = () =>
    onChange({
      ...choice,
      lessons: allOn ? choice.lessons.filter((k) => !open.includes(k)) : [...new Set([...choice.lessons, ...open])],
    });

  return (
    <motion.div
      className="ra-setup"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.2, 0.8, 0.2, 1] } }}
      exit={{ opacity: 0, y: -6, transition: { duration: 0.16 } }}
    >
      <div className="ra-seg" role="tablist" aria-label="پایه">
        {GRADE_KEYS.map((g) => (
          <button
            key={g}
            type="button"
            role="tab"
            aria-selected={grade === g}
            data-on={grade === g || undefined}
            onClick={() => onChange({ ...choice, grade: g })}
          >
            {GRADE_LABELS[g]}
            {picked(g) > 0 && <span className="ra-seg-badge game-num">{fa(picked(g))}</span>}
          </button>
        ))}
      </div>

      <div className="ra-lessons-wrap" role="tabpanel" aria-label={`درس‌های ${GRADE_LABELS[grade]}`}>
        <div className="ra-lessons-head">
          <span>درس‌ها</span>
          {open.length > 1 && (
            <button type="button" className="ra-link" onClick={toggleAll}>
              {allOn ? "برداشتن همه" : "انتخاب همه"}
            </button>
          )}
        </div>
        <div className="ra-lessons">
          {lessons.map((l) => {
            const on = choice.lessons.includes(l.key);
            return (
              <button
                key={l.key}
                type="button"
                aria-pressed={on}
                aria-label={`درس ${fa(l.n)}، ${l.title}، ${l.count ? `${fa(l.count)} بیت` : "به‌زودی"}`}
                title={l.title}
                data-on={on || undefined}
                disabled={!l.count}
                onClick={() => toggle(l.key)}
              >
                <span className="ra-lesson-num game-num">{fa(l.n)}</span>
                <span className="ra-lesson-title">{l.title}</span>
                {l.count > 0 && <span className="ra-lesson-count game-num">{fa(l.count)}</span>}
              </button>
            );
          })}
        </div>
      </div>

      <OutsideToggle
        count={outsideCount}
        on={choice.outside}
        onToggle={() => onChange({ ...choice, outside: !choice.outside })}
      />
    </motion.div>
  );
}

const SPARK = "M12 1.5C12.7 7.3 16.7 11.3 22.5 12 16.7 12.7 12.7 16.7 12 22.5 11.3 16.7 7.3 12.7 1.5 12 7.3 11.3 11.3 7.3 12 1.5Z";

/** «ابیات خارج از کتاب»: قابی از رنگ‌های خودِ پالت دورش می‌چرخد و هر چند
 *  ثانیه برقی از رویش رد می‌شود؛ روشن که باشد، رنگ‌ها داخلش هم می‌نشینند. */
function OutsideToggle({ count, on, onToggle }: { count: number; on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="ra-outside"
      aria-pressed={on}
      data-on={on || undefined}
      disabled={!count}
      onClick={onToggle}
    >
      <span className="ra-outside-spark" aria-hidden>
        <svg viewBox="0 0 24 24">
          <path d={SPARK} />
        </svg>
        <svg viewBox="0 0 24 24">
          <path d={SPARK} />
        </svg>
      </span>
      <span className="ra-outside-text">
        <span className="ra-outside-title">ابیات خارج از کتاب</span>
        <span className="ra-outside-sub game-num">{count ? `${fa(count)} بیت` : "به‌زودی"}</span>
      </span>
      <span className="ra-outside-mark" aria-hidden>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
          {on ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="m5.5 12.5 4 4 9-9" />
          ) : (
            <path strokeLinecap="round" d="M12 6.5v11M6.5 12h11" />
          )}
        </svg>
      </span>
    </button>
  );
}

/* ── واژه ──────────────────────────────────────────────────────────────── */

function TokenButton({
  token,
  layers,
  settle,
  interactive,
  register,
  onPick,
  onFocus,
}: {
  token: Token;
  layers: Paint[];
  settle: boolean;
  interactive: boolean;
  register: (el: HTMLButtonElement | null) => void;
  onPick: () => void;
  onFocus: (el: HTMLElement) => void;
}) {
  const [line, index] = token.id.split("-").map(Number);
  /* عبارتِ بلندتر بیرون، واژهٔ تکی درونش — مجازِ داخلِ کنایه قرصی درونِ
     نوارِ کنایه می‌شود. */
  const sorted = [...layers].sort((a, b) => b.group.length - a.group.length || a.strokeId - b.strokeId);
  const paint = sorted.find((x) => x.live) ?? sorted[0];
  const labels = sorted.filter((x) => !x.live).map((x) => CONCEPTS[x.concept].label);

  return (
    <motion.button
      ref={register}
      type="button"
      variants={TOKEN_VARIANTS}
      className="ra-token"
      data-painted={paint ? "" : undefined}
      aria-disabled={!interactive || undefined}
      aria-label={labels.length ? `${token.text}، ${labels.join(" و ")}` : token.text}
      style={paint ? tone(paint.concept) : undefined}
      onClick={onPick}
      onFocus={(e) => onFocus(e.currentTarget)}
    >
      {token.pre && <span className="ra-punct">{token.pre}</span>}
      {/* ⚠️ هایلایت فقط خودِ واژه را می‌پوشاند، نه ویرگول و گیومه را. */}
      <span className="ra-ink">
        {sorted.map((p, layer) => (
          <span
            key={p.strokeId}
            className="ra-hl"
            data-layer={layer || undefined}
            data-live={p.live || undefined}
            data-waiting={p.waiting || undefined}
            data-join-prev={p.group.includes(`${line}-${index - 1}` as TokenId) || undefined}
            data-join-next={p.group.includes(`${line}-${index + 1}` as TokenId) || undefined}
            style={{ ...tone(p.concept), "--d": `${p.order * 55}ms` } as CSSProperties}
          />
        ))}
        {settle && paint && <span key={`b${paint.strokeId}`} className="ra-bloom" aria-hidden />}
        <span className="ra-word" data-settle={settle || undefined}>
          {token.text}
        </span>
      </span>
      {token.post && <span className="ra-punct">{token.post}</span>}
    </motion.button>
  );
}

/* ── حباب ──────────────────────────────────────────────────────────────── */

function Bubble({ speech }: { speech: Speech | null }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {speech && (
        <motion.div
          key={speech.id}
          className="ra-bubble"
          data-tone={speech.tone}
          style={speech.concept ? tone(speech.concept) : undefined}
          initial={{ opacity: 0, scale: 0.86, x: 6 }}
          animate={{ opacity: 1, scale: 1, x: 0, transition: { type: "spring", stiffness: 520, damping: 30, mass: 0.7 } }}
          exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.12, ease: "easeIn" } }}
        >
          {speech.tone === "prompt" ? (
            <>
              <span className="ra-bubble-kicker">{speech.kicker ?? "پیدا کن"}</span>
              <span className="ra-bubble-text ra-bubble-concept game-display">{speech.text}</span>
            </>
          ) : (
            <span className="ra-bubble-text game-display">{speech.text}</span>
          )}
          <svg className="ra-bubble-tail" viewBox="0 0 10 18" aria-hidden>
            <path className="ra-bubble-tail-fill" d="M0 0L9.5 9L0 18Z" />
            <path className="ra-bubble-tail-edge" d="M0 0.5L9 9L0 17.5" />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── پالت ──────────────────────────────────────────────────────────────── */

function Palette({
  ref,
  ids,
  selected,
  nudge,
  onPick,
  onFocusSwatch,
  inert = false,
}: {
  ref?: React.Ref<HTMLDivElement>;
  ids: ConceptId[];
  selected: ConceptId | null;
  nudge: number;
  onPick: (c: ConceptId) => void;
  onFocusSwatch: (el: Element) => void;
  /** نمایشی (آموزش): دیده می‌شود ولی کلیک و فوکوس نمی‌گیرد. */
  inert?: boolean;
}) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const active = selected ? ids.indexOf(selected) : -1;

  /* گروهِ رادیویی: پیکان‌ها بینِ رنگ‌ها می‌چرخند و همان لحظه انتخاب می‌کنند.
     در راست‌به‌چپ، پیکانِ چپ یعنی «بعدی». */
  const onKeyDown = (e: ReactKeyboardEvent, i: number) => {
    const delta = e.key === "ArrowLeft" || e.key === "ArrowDown" ? 1 : e.key === "ArrowRight" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const n = (i + delta + ids.length) % ids.length;
    buttons.current[n]?.focus();
    onPick(ids[n]);
  };

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-label="رنگ‌ها"
      className="ra-palette"
      data-nudge={nudge ? (nudge % 2 ? "a" : "b") : undefined}
      inert={inert || undefined}
    >
      {ids.map((id, i) => {
        const c = CONCEPTS[id];
        const on = id === selected;
        return (
          <button
            key={id}
            ref={(el) => {
              buttons.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={(active === -1 ? i === 0 : on) ? 0 : -1}
            className="ra-swatch"
            data-on={on || undefined}
            style={{ ...tone(id), "--i": i } as CSSProperties}
            title={c.hint}
            aria-label={`${c.label}؛ ${c.hint}`}
            aria-keyshortcuts={String(i + 1)}
            onClick={() => onPick(id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            onFocus={(e) => onFocusSwatch(e.currentTarget)}
          >
            <span className="ra-swatch-dot">
              {on && (
                <motion.span
                  layoutId={inert ? "ra-ring-demo" : "ra-ring"}
                  className="ra-swatch-ring"
                  transition={{ type: "spring", stiffness: 520, damping: 36 }}
                />
              )}
            </span>
            <span className="ra-swatch-label">{c.short ?? c.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── پایان ─────────────────────────────────────────────────────────────── */

/** عددی که از صفر تا مقدارش بالا می‌رود. */
function CountUp({ to, suffix = "", reduced, delay = 0 }: { to: number; suffix?: string; reduced: boolean; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const write = (v: number) => {
      el.textContent = `${fa(Math.round(v))}${suffix}`;
    };
    if (reduced) {
      write(to);
      return;
    }
    const c = animate(0, to, { duration: 0.9, delay, ease: [0.2, 0.8, 0.2, 1], onUpdate: write });
    return () => c.stop();
  }, [to, suffix, reduced, delay]);
  return (
    <span ref={ref}>
      {fa(reduced ? to : 0)}
      {suffix}
    </span>
  );
}

function Summary({
  levels,
  stats,
  reduced,
}: {
  levels: number;
  stats: { found: number; wipes: number; clean: number };
  reduced: boolean;
}) {
  /* دقت: از همهٔ ضربه‌های رنگی، چندتا درست نشست. */
  const strokes = stats.found + stats.wipes;
  const accuracy = strokes ? Math.round((stats.found / strokes) * 100) : 100;
  const items = [
    ["بیت", levels, "sky"],
    ["آرایه", stats.found, "butter"],
    ["بی‌اشتباه", stats.clean, "sage"],
    ["پاک‌شده", stats.wipes, "rose"],
  ] as const;
  return (
    <motion.div
      className="ra-summary"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] } }}
      exit={{ opacity: 0 }}
    >
      <div className="ra-ring" role="img" aria-label={`دقت ${fa(accuracy)} درصد`}>
        <svg viewBox="0 0 120 120" aria-hidden>
          <defs>
            <linearGradient id="ra-ring-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--ra-sky-ink)" />
              <stop offset="0.5" stopColor="var(--ra-lilac-ink)" />
              <stop offset="1" stopColor="var(--ra-rose-ink)" />
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="50" className="ra-ring-track" />
          <motion.circle
            cx="60"
            cy="60"
            r="50"
            className="ra-ring-bar"
            stroke="url(#ra-ring-grad)"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: accuracy / 100 }}
            transition={{ duration: 1.1, delay: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </svg>
        <span className="ra-ring-value game-num">
          <CountUp to={accuracy} suffix="٪" reduced={reduced} delay={0.2} />
        </span>
        <span className="ra-ring-label">دقت</span>
      </div>
      <h2 className="ra-summary-title game-title">همهٔ بیت‌ها رنگ شد</h2>
      <dl className="ra-summary-stats">
        {items.map(([label, n, color], i) => (
          <motion.div
            key={label}
            style={{ "--c": `var(--ra-${color})`, "--ci": `var(--ra-${color}-ink)` } as CSSProperties}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 28, delay: 0.25 + i * 0.07 }}
          >
            <dt>{label}</dt>
            <dd className="game-num">
              <CountUp to={n} reduced={reduced} delay={0.3 + i * 0.07} />
            </dd>
          </motion.div>
        ))}
      </dl>
    </motion.div>
  );
}
