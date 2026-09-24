"use client";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import GuestLimitModal from "@/components/UI/GuestLimitModal";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import {
  MEMORY_GRADES,
  MEMORY_TERMS,
  buildMemoryDeck,
  buildMemoryRounds,
  memoryGridColumns,
  memoryRoundSizes,
  type LiteraryPair,
  type MemoryCard,
  type MemoryDecks,
  type MemoryGrade,
  type MemoryTerm,
} from "@/lib/literary-pairs";
import { useSetReportTarget } from "@/lib/reports/target";
import { useRoundGuard } from "@/lib/games/round-guard";

// اول پایه، بعد نوبت، بعد نقشهٔ دست‌ها، بعد مرورِ آثارِ همان دست، بعد خودِ
// بازی. دو صفحهٔ اول همان چیزی است که آزمون‌های واقعی دارند: دانش‌آموزِ دهم
// قرار نیست کتاب دوازدهم را جفت کند.
//
// ⚠️ «plan» تازه است و بی‌آن کلِ این بازی یک دروغِ کوچک داشت: آزمونی با هجده
// جفت، هر بار شش‌تای تصادفی نشان می‌داد و هیچ‌جا نمی‌گفت بقیه کجا رفتند.
// حالا نشست از اولش معلوم است — «سه دست» — و دانش‌آموز می‌داند کجای کار است.
type Phase = "grade" | "term" | "plan" | "study" | "playing";

const fa = (n: number) => n.toLocaleString("fa-IR");

const ORDINALS = [
  "اول",
  "دوم",
  "سوم",
  "چهارم",
  "پنجم",
  "ششم",
  "هفتم",
  "هشتم",
  "نهم",
  "دهم",
] as const;

/** «دستِ سوم» تا جایی که فارسی کوتاه است؛ بعد از آن «دستِ ۱۱». */
const ordinal = (index: number) => ORDINALS[index] ?? fa(index + 1);

function BookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 5.5A1.5 1.5 0 0 1 5.5 4H17a1 1 0 0 1 1 1v12.5H5.5A1.5 1.5 0 0 0 4 19V5.5ZM18 17.5v2.5H5.5"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4.5 4.5L19 7" />
    </svg>
  );
}

/**
 * جایگزینِ نگاره، وقتی جفتی هنوز تصویری ندارد.
 *
 * ⚠️ عمداً یک «جای خالی» نیست. یک قابِ خاکستری با آیکنِ تصویر، به دانش‌آموز
 * می‌گوید «اینجا چیزی کم است»؛ ولی این کتابِ کوچک خودش یک تصویر است و ردیف را
 * نمی‌شکند. مدیر در پنل می‌بیند کدام جفت بی‌نگاره مانده — این تنها جایی است
 * که آن کمبود باید دیده شود.
 *
 * ⚠️ و رنگ‌هایش با تم عوض نمی‌شوند، چون این یک *شیء* است و نه یک سطحِ رابط
 * کاربری: جلدِ سبزِ تیره با خطوطِ طلایی در هر دو تم همان جلد است — دقیقاً
 * مثل کتابی که در نگاره‌های واقعی کنار دستِ شاعر است.
 */
function BookPlate({ title }: { title: string }) {
  return (
    <div className="absolute inset-0 flex items-end justify-center pb-3">
      <div className="relative h-[76%] w-[56%] -rotate-3 rounded-md rounded-s-[3px] bg-[linear-gradient(145deg,#14585c,#0a3336)] p-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.6)] ring-1 ring-[#d9b25f]/35 transition-transform duration-500 group-hover:-rotate-1 group-hover:scale-[1.03]">
        <span aria-hidden className="absolute inset-y-0 end-1.5 w-px bg-[#d9b25f]/25" />
        <span aria-hidden className="absolute inset-x-2.5 top-2.5 h-px bg-[#d9b25f]/40" />
        <span aria-hidden className="absolute inset-x-2.5 bottom-2.5 h-px bg-[#d9b25f]/40" />
        <span className="flex size-full items-center justify-center text-balance px-1 text-center text-[11px] leading-tight font-black text-[#e8c887] sm:text-xs">
          {title}
        </span>
      </div>
    </div>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L12 16.77l-5.2 2.73.99-5.79-4.21-4.1 5.82-.85L12 3.5Z"
      />
    </svg>
  );
}

/** «کجای نشست هستیم» — یک برچسب و یک نوارِ قطعه‌قطعه.
 *
 *  در سرِ صفحهٔ مرور و سرِ زمین، هر دو، تکرار می‌شود: دانش‌آموزی که وسطِ دستِ
 *  دوم است نباید برای فهمیدنِ اینکه چند دست مانده به صفحهٔ دیگری برگردد. */
function RoundProgress({
  index,
  total,
  done,
}: {
  index: number;
  total: number;
  done: Set<number>;
}) {
  if (total <= 1) return null;
  return (
    <div className="flex items-center gap-2.5">
      <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold whitespace-nowrap text-secondary-foreground">
        دستِ {ordinal(index)} از {fa(total)}
      </span>
      <span className="flex items-center gap-1" aria-hidden>
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === index
                ? "w-5 bg-primary"
                : done.has(i)
                  ? "w-1.5 bg-primary/50"
                  : "w-1.5 bg-border"
            }`}
          />
        ))}
      </span>
    </div>
  );
}

function PairsGame({ decks }: { decks: MemoryDecks }) {
  /* «نیمهٔ اولِ کتاب» در این بازی از قبل یک مفهومِ صریح است: آزمونِ دی.
     پس قفلِ مهمان دقیقاً روی همان می‌نشیند و لازم نیست نیمه را حساب کنیم. */
  const { user } = useCurrentUser();
  const [guestPrompt, setGuestPrompt] = useState(false);
  const termLockedForGuest = (id: MemoryTerm) => user === null && id !== "dey";

  const [phase, setPhase] = useState<Phase>("grade");
  const [grade, setGrade] = useState<MemoryGrade | null>(null);
  const [term, setTerm] = useState<MemoryTerm | null>(null);

  /* نشستِ جاری: کلِ آزمون، افراز‌شده به دست‌ها. ← buildMemoryRounds */
  const [rounds, setRounds] = useState<LiteraryPair[][]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [totalMoves, setTotalMoves] = useState(0);

  const [deck, setDeck] = useState<MemoryCard[]>([]);
  const [flipped, setFlipped] = useState<number[]>([]); // indices face-up, unmatched
  const [matched, setMatched] = useState<Set<number>>(new Set()); // matched pairIds
  const [moves, setMoves] = useState(0);
  const [locked, setLocked] = useState(false);

  const pairs = grade && term ? decks[grade][term] : [];

  /** یک نشستِ تازه از همین آزمون: افرازِ تازه، پیشرفتِ صفر. */
  const openSession = (list: LiteraryPair[]) => {
    const built = buildMemoryRounds(list);
    setRounds(built);
    setRoundIndex(0);
    setDone(new Set());
    setTotalMoves(0);
    setDeck(built.length > 0 ? buildMemoryDeck(built[0]) : []);
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setLocked(false);
    return built;
  };

  // نشست وقتی ساخته می‌شود که آزمون عوض شود. بُر زدن تصادفی است، پس باید
  // روی کلاینت و بعد از mount انجام شود.
  useEffect(() => {
    if (!grade || !term) return;
    // ⚠️ openSession عمداً در وابستگی‌ها نیست: هر رندر یکی تازه ساخته می‌شود
    // و آوردنش یعنی یک نشستِ نو در هر رندر. setState هم اینجا ناگزیر است،
    // چون بُر زدن تصادفی است و روی سرور نتیجهٔ دیگری می‌دهد.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    openSession(decks[grade][term]);
  }, [decks, grade, term]);

  /** شروعِ یک دست — از نقشه، از دکمهٔ «دستِ بعد»، یا دوباره‌زدنِ همین دست. */
  const startRound = (index: number) => {
    const round = rounds[index];
    if (!round) return;
    setRoundIndex(index);
    setDeck(buildMemoryDeck(round));
    setFlipped([]);
    setMatched(new Set());
    setMoves(0);
    setLocked(false);
    setPhase("study");
  };

  // reconstruct the {work, author} pairs from the dealt deck for the study
  // screen (so the player learns them before the memory round)
  const studyPairs = useMemo(() => {
    const map = new Map<number, { work: string; author: string; image: string }>();
    deck.forEach((c) => {
      const e = map.get(c.pairId) ?? { work: "", author: "", image: "" };
      e[c.kind] = c.text;
      // هر دو کارتِ یک جفت همان نگاره را حمل می‌کنند، پس این انتساب بی‌ضرر
      // تکراری است و نه یک بازنویسی.
      e.image = c.image;
      map.set(c.pairId, e);
    });
    return [...map.values()];
  }, [deck]);

  const pairCount = deck.length / 2;
  const won = deck.length > 0 && matched.size === pairCount;
  const seriesDone = rounds.length > 0 && done.size === rounds.length;
  /** دستِ بعدی‌ای که هنوز تمام نشده — همان که دکمهٔ اصلیِ نقشه پیشنهاد می‌دهد. */
  const nextUp = rounds.findIndex((_, i) => !done.has(i));

  /* گزارش روی *دستهٔ* اثر–پدیدآور است: یک جفتِ غلط با همان پایه و نوبت پیدا
     می‌شود، و چند جفتِ اولِ دور در snapshot می‌ماند تا حتی بعدِ ویرایش هم
     بشود موردش را با جست‌وجوی متن یافت. */
  /* این بازی پیشرفتش را ذخیره نمی‌کند، پس ترکِ صفحه در میانهٔ نشست واقعاً
     آن را می‌سوزاند — و حالا «نشست» می‌تواند چند دست باشد، پس نقشه هم وقتی
     دستی تمام شده باشد زیرِ نگهبان است. */
  useRoundGuard(phase === "study" || phase === "playing" || (phase === "plan" && done.size > 0));

  useSetReportTarget(
    (phase === "study" || phase === "playing") && grade && term
      ? {
          area: "pairs",
          targetId: `${grade}:${term}`,
          snapshot: studyPairs
            .slice(0, 4)
            .map((p) => `${p.work} — ${p.author}`)
            .join(" / "),
          targetRef: { grade, term },
        }
      : null,
  );

  const handleFlip = (index: number) => {
    if (locked) return;
    const card = deck[index];
    if (!card || matched.has(card.pairId) || flipped.includes(index)) return;

    const next = [...flipped, index];
    setFlipped(next);
    if (next.length !== 2) return;

    const moveCount = moves + 1;
    setMoves(moveCount);

    const [a, b] = next.map((i) => deck[i]);
    if (a.pairId !== b.pairId) {
      setLocked(true);
      setTimeout(() => {
        setFlipped([]);
        setLocked(false);
      }, 850);
      return;
    }

    const found = new Set(matched).add(a.pairId);
    setMatched(found);
    setFlipped([]);

    /* پایانِ دست همین‌جا حساب می‌شود و نه در یک effect: اینجا `moveCount`
       را در دست داریم، و حرکتِ آخر وگرنه در جمعِ کلِ نشست گم می‌شد.
       دستی که دوباره بازی شود دوباره شمرده نمی‌شود. */
    if (found.size === pairCount) {
      setDone((prev) => new Set(prev).add(roundIndex));
      if (!done.has(roundIndex)) setTotalMoves((m) => m + moveCount);
    }
  };

  /** چند ستون، و آیا کارت‌ها آن‌قدر ریز شده‌اند که متنشان باید کوچک‌تر شود.
   *  هر دست حداکثر شش جفت است، ولی دستِ آخر می‌تواند کوچک‌تر باشد، پس شبکه
   *  باز هم خودش را با تعدادِ کارت جور می‌کند. */
  const columns = useMemo(() => memoryGridColumns(deck.length), [deck.length]);
  const dense = columns.wide >= 5;

  const gridStyle = {
    "--cols-base": columns.base,
    "--cols-wide": columns.wide,
  } as CSSProperties;

  const gradeTitle = MEMORY_GRADES.find((g) => g.id === grade)?.title ?? "";
  const termTitle = MEMORY_TERMS.find((t) => t.id === term)?.title ?? "";

  // ---- pick a grade ----
  if (phase === "grade") {
    return (
      <Chooser
        title="جفت‌های ادبی"
        subtitle="اول پایه‌ات را انتخاب کن."
        options={MEMORY_GRADES.map((g) => ({
          key: g.id,
          title: `فارسی ${g.title}`,
          hint: "",
          onClick: () => {
            setGrade(g.id);
            setPhase("term");
          },
        }))}
      />
    );
  }

  // ---- pick a term ----
  if (phase === "term" && grade) {
    return (
      <>
        {guestPrompt && (
          <GuestLimitModal section="pairs" onDismiss={() => setGuestPrompt(false)} />
        )}
        <Chooser
          title={`فارسی ${gradeTitle}`}
          subtitle="کدام آزمون؟"
          onBack={() => {
            setGrade(null);
            setTerm(null);
            setPhase("grade");
          }}
          options={MEMORY_TERMS.map((t) => {
            const n = decks[grade][t.id].length;
            // همین‌جا هم تعدادِ دست‌ها گفته می‌شود: انتخابِ آزمون یعنی انتخابِ
            // یک نشستِ چنددستی، و طولش نباید بعد از کلیک معلوم شود.
            const roundCount = memoryRoundSizes(n).length;
            return {
              key: t.id,
              title: t.title,
              disabled: n === 0,
              hint:
                n === 0
                  ? "هنوز آماده نیست"
                  : termLockedForGuest(t.id)
                    ? `${t.hint} · 🔒 نیازمند ورود`
                    : `${fa(n)} جفت · ${fa(roundCount)} دست`,
              onClick: () => {
                if (termLockedForGuest(t.id)) {
                  setGuestPrompt(true);
                  return;
                }
                setTerm(t.id);
                setPhase("plan");
              },
            };
          })}
        />
      </>
    );
  }

  const backToTerms = () => {
    setTerm(null);
    setPhase("term");
  };

  const restartSession = () => {
    openSession(pairs);
    setPhase("plan");
  };

  // ---- plan screen: how long this exam is, and where you are in it ----
  //
  // ⚠️ این صفحه پاسخِ سؤالی است که دانش‌آموز حق دارد *قبل* از شروع بپرسد:
  // «چقدر طول می‌کشد؟». شش جفت در هر دست یعنی یک زمینِ کوتاه، ولی یک آزمونِ
  // هجده‌جفتی سه دست است و این را باید از اول دید، نه بعد از دستِ اول فهمید.
  if (phase === "plan" && rounds.length > 0) {
    return (
      <div dir="rtl" className="container mx-auto my-8 max-w-xl sm:my-12">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/12 px-3 py-1 text-[11px] font-bold text-gold-ink">
            <BookIcon className="size-3.5" />
            فارسی {gradeTitle} · {termTitle}
          </span>
          <h1 className="mt-3 text-xl font-bold text-primary sm:text-2xl">
            {seriesDone ? "این آزمون را کامل کردی" : `این آزمون ${fa(rounds.length)} دست است`}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            {seriesDone
              ? `هر ${fa(pairs.length)} جفتِ این آزمون را جفت کردی — روی هم ${fa(totalMoves)} حرکت.`
              : `${fa(pairs.length)} جفتِ این آزمون بین ${fa(rounds.length)} دست پخش شده؛ هر دست کوتاه است و هیچ اثری دو بار نمی‌آید.`}
          </p>
        </div>

        <ol className="flex flex-col gap-2.5">
          {rounds.map((round, i) => {
            const finished = done.has(i);
            const current = i === nextUp && !seriesDone;
            return (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <button
                  onClick={() => startRound(i)}
                  className={`relative z-20 flex min-h-16 w-full items-center gap-3 rounded-2xl border px-4 text-right transition-all active:scale-[0.99] ${
                    current
                      ? "border-primary/60 bg-primary/8 shadow-md shadow-primary/10"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                      finished
                        ? "bg-primary/15 text-primary"
                        : current
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {finished ? <CheckIcon className="size-4" /> : fa(i + 1)}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-bold">دستِ {ordinal(i)}</span>
                    <span className="text-xs text-muted-foreground">
                      {fa(round.length)} جفت · {fa(round.length * 2)} کارت
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${
                      finished
                        ? "bg-primary/12 text-primary"
                        : current
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {finished ? "تمام شد" : current ? "شروع" : "در نوبت"}
                  </span>
                </button>
              </motion.li>
            );
          })}
        </ol>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={backToTerms}
            className="min-h-11 rounded-xl border border-border bg-card px-5 text-sm text-muted-foreground transition-all hover:border-primary/50"
          >
            تغییر آزمون
          </button>
          <button
            onClick={restartSession}
            className="min-h-11 rounded-xl border border-border bg-card px-5 text-sm text-muted-foreground transition-all hover:border-primary/50"
          >
            چیدنِ دوباره
          </button>
          <button
            onClick={() => startRound(seriesDone ? 0 : nextUp)}
            className="min-h-11 rounded-xl bg-primary px-8 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-90 active:scale-95"
          >
            {seriesDone
              ? "دوباره از دستِ اول"
              : done.size === 0
                ? "شروع دستِ اول"
                : `ادامه با دستِ ${ordinal(nextUp)}`}
          </button>
        </div>
      </div>
    );
  }

  // ---- study screen: the gallery you memorise before the round ----
  //
  // ⚠️ این صفحه پیش از این یک فهرستِ متنی بود: «اثر ← پدیدآورنده»، یکی زیر
  // دیگری. کار می‌کرد و هیچ‌کس نگاهش نمی‌کرد.
  //
  // چیزی که حافظه واقعاً با آن کار می‌کند چهره است، نه ردیفِ متن. حالا هر جفت
  // یک قاب است — نگارهٔ پدیدآورنده، نامش، و اثری که به او وصل است — و همان
  // چند ثانیه‌ای که دانش‌آموز روی این صفحه می‌ماند، همان چیزی است که در زمینِ
  // بازی به کارش می‌آید.
  if (phase === "study") {
    return (
      <div dir="rtl" className="container mx-auto my-8 max-w-3xl sm:my-12">
        <div className="mb-6 flex flex-col items-center gap-3 text-center sm:mb-8">
          <RoundProgress index={roundIndex} total={rounds.length} done={done} />
          <div>
            <h1 className="text-xl font-bold text-primary sm:text-2xl">جفت‌های ادبی</h1>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              این {fa(studyPairs.length)} اثر و پدیدآورنده‌شان را به‌خاطر بسپار؛ در
              بازی همین‌ها را از حافظه جفت می‌کنی.
            </p>
          </div>
        </div>

        {/* چیدمانِ flex و نه grid: دستِ آخر می‌تواند چهار یا پنج جفت باشد و
            ردیفِ ناتمامِ *وسط‌چین* یک خطِ کوتاهِ عمدی به نظر می‌رسد، نه یک
            خانهٔ خالی در شبکه.

            ⚠️ روی موبایل **سه‌تایی** و نه دوتایی.
            دوتایی یعنی هر قاب ۱۷۰ پیکسل عرض و ۲۷۰ پیکسل ارتفاع داشت، و شش
            جفت سه ردیف می‌شد: بیش از هزار پیکسل اسکرول برای صفحه‌ای که کلِ
            کارش «همهٔ این‌ها را با هم ببین و به‌خاطر بسپار» است. صفحه‌ای که
            یک‌جا دیده نمی‌شود، حفظ هم نمی‌شود.

            سه‌تایی همان شش جفت را در دو ردیف و حدودِ ۳۸۰ پیکسل جا می‌دهد —
            یک صفحه، یک نگاه. */}
        <motion.ul
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
          className="flex flex-wrap justify-center gap-3 sm:gap-4"
        >
          {studyPairs.map((p, i) => (
            <motion.li
              key={`${p.work}-${i}`}
              variants={{
                hidden: { opacity: 0, y: 18 },
                visible: { opacity: 1, y: 0 },
              }}
              className="group relative z-20 w-[calc(33.333%-0.5rem)] overflow-hidden rounded-2xl border border-border bg-linear-to-b from-surface to-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-gold/45 hover:shadow-xl sm:w-[calc(33.333%-0.667rem)] sm:rounded-3xl"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-l from-transparent via-gold/40 to-transparent"
              />
              <span className="absolute top-1.5 right-1.5 z-10 flex size-5 items-center justify-center rounded-full bg-background/70 text-[10px] font-bold text-muted-foreground backdrop-blur-sm sm:top-3 sm:right-3 sm:size-6 sm:text-[11px]">
                {fa(i + 1)}
              </span>

              {/* نگاره — object-contain و نه cover: این‌ها تصویرِ برش‌خوردهٔ یک
                  صحنه نیستند، یک شکلِ کاملِ بی‌پس‌زمینه‌اند و بریدنشان یعنی
                  نصفِ شاعر. هالهٔ پشتشان جای سایه را می‌گیرد تا روی زمینهٔ
                  روشن هم شناور به نظر برسند. */}
              {/* ⚠️ روی موبایل مربع و نه ۴:۵. با سه ستون، ۴:۵ همان ارتفاعی را
                  برمی‌گرداند که تازه از دو ستون گرفته شده بود. تصویرها
                  `object-contain` اند، پس قابِ کوتاه‌تر آن‌ها را نمی‌بُرد —
                  فقط کوچک‌ترشان می‌کند. */}
              <div className="relative aspect-square overflow-hidden sm:aspect-4/5">
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-5 top-8 bottom-1 rounded-[45%] bg-primary/12 blur-2xl transition-all duration-500 group-hover:bg-gold/20"
                />
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt={p.author}
                    loading="lazy"
                    decoding="async"
                    className="absolute inset-0 size-full object-contain object-bottom p-2 transition-transform duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <BookPlate title={p.work} />
                )}
              </div>

              {/* ⚠️ `truncate` رفت و جایش `text-balance` آمد.
                  در سه ستون، «نصرالله منشی» و «کلیله و دمنه» هر دو بریده
                  می‌شدند — روی صفحه‌ای که کاربر آمده تا همین دو نام را
                  حفظ کند. نامِ بریده بدتر از نامِ دوخطی است. */}
              <div className="relative border-t border-border/60 bg-card/50 px-1.5 py-2 text-center sm:px-2.5 sm:py-3">
                <p className="text-balance text-[11px] leading-tight font-black text-foreground sm:text-base">
                  {p.author}
                </p>
                <span className="mt-1 inline-flex max-w-full items-center gap-1 rounded-lg bg-gold/12 px-1.5 py-0.5 text-[10px] leading-snug font-bold text-gold-ink sm:mt-1.5 sm:rounded-full sm:px-2.5 sm:py-1 sm:text-[11px]">
                  <BookIcon className="size-3 shrink-0" />
                  <span className="text-balance">{p.work}</span>
                </span>
              </div>
            </motion.li>
          ))}
        </motion.ul>

        {rounds.length > 1 && (
          <p className="mt-5 text-center text-xs text-muted-foreground">
            این دست {fa(studyPairs.length)} جفت از {fa(pairs.length)} جفتِ این آزمون
            است. بعد از آن {fa(rounds.length - roundIndex - 1)} دستِ دیگر مانده.
          </p>
        )}

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setPhase("plan")}
            className="min-h-11 rounded-xl border border-border bg-card px-5 text-sm text-muted-foreground transition-all hover:border-primary/50"
          >
            {rounds.length > 1 ? "فهرست دست‌ها" : "تغییر آزمون"}
          </button>
          <button
            onClick={() => startRound(roundIndex)}
            className="min-h-11 rounded-xl border border-border bg-card px-5 text-sm text-muted-foreground transition-all hover:border-primary/50"
          >
            چیدنِ دوباره
          </button>
          <button
            onClick={() => setPhase("playing")}
            className="min-h-11 rounded-xl bg-primary px-8 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-90 active:scale-95"
          >
            شروع دست
          </button>
        </div>
      </div>
    );
  }

  // ---- round finished (and maybe the whole session) ----
  if (won) {
    const hasNext = roundIndex + 1 < rounds.length;
    return (
      <div className="container mx-auto my-10 max-w-2xl text-center sm:my-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass relative z-20 rounded-2xl p-8 sm:p-12"
        >
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/15 text-3xl">
            {seriesDone ? "🏆" : "🎉"}
          </div>
          <h2 className="game-display text-2xl font-bold text-primary">
            {seriesDone
              ? "همهٔ دست‌ها تمام شد"
              : rounds.length > 1
                ? `دستِ ${ordinal(roundIndex)} تمام شد`
                : "آفرین! همه را جفت کردی"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {seriesDone && rounds.length > 1
              ? `هر ${fa(pairs.length)} جفتِ این آزمون را از حافظه جفت کردی — روی هم ${fa(totalMoves)} حرکت.`
              : `با ${fa(moves)} حرکت همهٔ آثارِ این دست را به پدیدآورنده‌شان رساندی.`}
          </p>

          {rounds.length > 1 && (
            <div className="mt-5 flex justify-center">
              <RoundProgress index={roundIndex} total={rounds.length} done={done} />
            </div>
          )}

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {hasNext && !seriesDone ? (
              <button
                onClick={() => startRound(roundIndex + 1)}
                className="min-h-11 rounded-xl bg-primary px-8 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-90 active:scale-95"
              >
                دستِ {ordinal(roundIndex + 1)}
              </button>
            ) : (
              <button
                onClick={restartSession}
                className="min-h-11 rounded-xl bg-primary px-8 font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-90 active:scale-95"
              >
                {rounds.length > 1 ? "یک نشستِ تازه" : "یک دور دیگر"}
              </button>
            )}
            {rounds.length > 1 && (
              <button
                onClick={() => setPhase("plan")}
                className="min-h-11 rounded-xl border border-border bg-card px-5 text-sm text-muted-foreground transition-all hover:border-primary/50"
              >
                فهرست دست‌ها
              </button>
            )}
            <button
              onClick={backToTerms}
              className="min-h-11 rounded-xl border border-border bg-card px-5 text-sm text-muted-foreground transition-all hover:border-primary/50"
            >
              تغییر آزمون
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ---- memory board ----
  return (
    <div dir="rtl" className="container mx-auto my-8 max-w-2xl sm:my-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h1 className="text-xl font-bold text-primary sm:text-2xl">جفت‌های ادبی</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            هر اثر را به پدیدآورنده‌اش جفت کن.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RoundProgress index={roundIndex} total={rounds.length} done={done} />
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {fa(matched.size)} / {fa(pairCount)}
          </span>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {fa(moves)} حرکت
          </span>
        </div>
      </div>

      {/* ⚠️ `flex` و نه `grid` — همان انتخابی که صفحهٔ مرور از اول کرده بود.
          زمینِ موبایل حالا می‌تواند ردیفِ آخرِ ناتمام داشته باشد (ده کارت در
          چهار ستون: ۴+۴+۲) و `justify-center` آن را به یک خطِ کوتاهِ عمدی
          تبدیل می‌کند و نه یک خانهٔ خالی. چراییِ کاملش بالای `mobileColumns`
          در `lib/literary-pairs.ts`.

          ⚠️ عرضِ هر کارت از روی همان متغیرها حساب می‌شود و نه با
          `basis-1/4`: تعدادِ ستون در زمانِ اجرا معلوم می‌شود و Tailwind
          کلاسِ پویا نمی‌سازد. کسرِ فاصله‌ها لازم است، وگرنه چهار کارتِ
          ۲۵٪ به‌اضافهٔ سه فاصله از عرض بیرون می‌زند و یکی به خطِ بعد
          می‌افتد. */}
      <div style={gridStyle} className="flex flex-wrap justify-center gap-2 sm:gap-3.5">
        {deck.map((card, index) => {
          const isMatched = matched.has(card.pairId);
          const isUp = isMatched || flipped.includes(index);
          const isWork = card.kind === "work";
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleFlip(index)}
              disabled={isUp || locked}
              className="group relative z-20 aspect-3/4 basis-[calc((100%-(var(--cols-base)-1)*0.5rem)/var(--cols-base))] [perspective:900px] focus:outline-none sm:basis-[calc((100%-(var(--cols-wide)-1)*0.875rem)/var(--cols-wide))]"
            >
              <motion.div
                className="relative h-full w-full [transform-style:preserve-3d]"
                animate={{ rotateY: isUp ? 180 : 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* پشتِ کارت.
                    ⚠️ اینجا تا امروز دو هگزِ ثابت بود (#1a2130 → #0b0f18) و یک
                    حلقهٔ سفید. یعنی زمینِ بازی در تمِ روشن هم شب بود: یک
                    مستطیلِ تیره وسطِ صفحهٔ کرم، که نه با پالت‌های سایت عوض
                    می‌شد و نه با تمِ کاربر. حالا از همان توکن‌هایی ساخته شده
                    که کارت‌های بقیهٔ سایت — surface و border — پس هر تم و هر
                    پالتی که انتخاب شود، پشتِ کارت هم با آن می‌رود. */}
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl bg-linear-to-br from-surface-2 to-card text-foreground shadow-md ring-1 ring-border ring-inset transition-all duration-300 group-enabled:group-hover:-translate-y-0.5 group-enabled:group-hover:ring-gold/45 group-active:scale-[0.97] [backface-visibility:hidden]">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -inset-6 opacity-[0.07] [background-image:radial-gradient(currentColor_0.5px,transparent_1px)] [background-size:13px_13px]"
                  />
                  <StarIcon className={dense ? "size-4 text-gold/45" : "size-6 text-gold/45 transition-colors duration-300 group-enabled:group-hover:text-gold"} />
                  {!dense && (
                    <span className="text-[10px] font-bold tracking-[0.35em] text-muted-foreground/60">سَروا</span>
                  )}
                </span>

                {/* رویِ کارت — همان دو دستهٔ رنگی (طلایی برای اثر، فیروزه‌ای
                    برای پدیدآورنده)، ولی حالا روی سطحِ خودِ سایت. درخششِ دورِ
                    کارت می‌ماند چون نقشِ معنایی دارد: از آن‌طرفِ صفحه می‌گوید
                    این کارت از کدام دسته است. */}
                <span
                  className={`absolute inset-0 flex flex-col items-center justify-center gap-1.5 overflow-hidden rounded-2xl bg-linear-to-br from-card to-surface p-1.5 text-center ring-1 [transform:rotateY(180deg)] [backface-visibility:hidden] ${
                    isWork
                      ? "ring-gold/70 shadow-[0_0_28px_-8px_var(--color-gold)]"
                      : "ring-primary/70 shadow-[0_0_28px_-8px_var(--color-primary)]"
                  } ${isMatched ? "opacity-90" : ""}`}
                >
                  <span
                    className={`text-[9px] font-bold tracking-[0.2em] ${isWork ? "text-gold-ink" : "text-primary"}`}
                  >
                    {isWork ? "اثر" : "پدیدآورنده"}
                  </span>
                  <span
                    className={`text-balance px-0.5 leading-tight font-black text-foreground ${
                      dense ? "text-[10px] sm:text-xs" : "text-xs sm:text-sm"
                    }`}
                  >
                    {card.text}
                  </span>
                  {isMatched && (
                    <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-green-500/20 text-[9px] text-green-600 dark:text-green-400">
                      ✓
                    </span>
                  )}
                </span>
              </motion.div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          onClick={() => setPhase("study")}
          className="min-h-10 rounded-xl border border-border bg-card px-5 text-sm text-muted-foreground transition-all hover:border-primary/50"
        >
          مرور آثار
        </button>
        <button
          onClick={() => startRound(roundIndex)}
          className="min-h-10 rounded-xl border border-border bg-card px-5 text-sm text-muted-foreground transition-all hover:border-primary/50"
        >
          چیدنِ دوباره
        </button>
        {rounds.length > 1 ? (
          <button
            onClick={() => setPhase("plan")}
            className="min-h-10 rounded-xl border border-border bg-card px-5 text-sm text-muted-foreground transition-all hover:border-primary/50"
          >
            فهرست دست‌ها
          </button>
        ) : (
          <button
            onClick={backToTerms}
            className="min-h-10 rounded-xl border border-border bg-card px-5 text-sm text-muted-foreground transition-all hover:border-primary/50"
          >
            تغییر آزمون
          </button>
        )}
      </div>
    </div>
  );
}

type ChooserOption = {
  key: string;
  title: string;
  hint: string;
  disabled?: boolean;
  onClick: () => void;
};

/** صفحهٔ انتخاب — یک بار برای پایه و یک بار برای نوبت. */
function Chooser({
  title,
  subtitle,
  options,
  onBack,
}: {
  title: string;
  subtitle: string;
  options: ChooserOption[];
  onBack?: () => void;
}) {
  return (
    <div dir="rtl" className="container mx-auto my-10 max-w-xl sm:my-16">
      <div className="mb-6 text-center">
        <h1 className="text-xl font-bold text-primary sm:text-2xl">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      </div>

      <div className="flex flex-col gap-3">
        {options.map((o) => (
          <button
            key={o.key}
            onClick={o.onClick}
            disabled={o.disabled}
            className={`glass relative z-20 flex min-h-14 items-center justify-between gap-3 rounded-2xl px-5 text-right transition-all ${
              o.disabled
                ? "cursor-not-allowed opacity-50"
                : "hover:brightness-110 active:scale-[0.99]"
            }`}
          >
            <span className="font-bold">{o.title}</span>
            {o.hint && (
              <span className="text-xs text-muted-foreground">{o.hint}</span>
            )}
          </button>
        ))}
      </div>

      {onBack && (
        <div className="mt-6 text-center">
          <button
            onClick={onBack}
            className="min-h-10 rounded-xl border border-border bg-card px-5 text-sm text-muted-foreground transition-all hover:border-primary/50"
          >
            بازگشت
          </button>
        </div>
      )}
    </div>
  );
}

export default PairsGame;
