"use client";
import { PanelAudioPlayer } from "@/components/UI/PanelAudioPlayer";
import { hasAudioFor } from "@/lib/audioManifest";
import { cardPop, fadeUp, staggerContainer } from "@/lib/motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import z from "zod";
/**
 * موتورِ محلی — در *مرورگر*، و با import پویا.
 *
 * ★ پویا بودنش عمدی است: موتور و وزن‌هایش حدودِ ۹۵ کیلوبایتِ فشرده‌اند و نباید
 *   هنگامِ بارگذاریِ صفحه دانلود شوند. کسی که صفحه را باز می‌کند و وزن‌یابی
 *   نمی‌کند هیچ هزینه‌ای نمی‌دهد؛ فقط اولین جست‌وجو هزینه دارد و بعد در کشِ
 *   مرورگر می‌ماند. (روی build تولیدی سنجیده شد: بازکردنِ صفحه صفر بایت،
 *   اولین جست‌وجو ۹۵.۴ کیلوبایت در دقیقاً یک چانک.)
 *
 *   چرا در مرورگر و نه سرور: اندازه‌گیری شد که هر جست‌وجو ۵۳۹ میلی‌ثانیه CPU و
 *   ~۱۷۶ مگابایت حافظه می‌خواهد، یعنی هر هستهٔ سرور ~۲ درخواست در ثانیه.
 *   این‌جا سهمِ سرور صفر است و دقت تغییری نمی‌کند — همان کد، همان وزن‌ها.
 *
 *   دقت روی ۶۰۰۰ بیتِ کنارگذاشته: ۸۴.۵٪ برای رتبهٔ ۱، ۹۴.۲٪ برای سه نامزدِ اول.
 */
async function findMeterInBrowser(mesra1: string, mesra2?: string) {
  const { findMeterLocally } = await import("@/lib/aruz");
  return findMeterLocally(mesra1, mesra2)?.rhythm;
}

/** Resolve once the browser has actually put a frame on the screen.
 *
 *  Since the engine moved into the browser it runs *synchronously* on the main
 *  thread — about half a second of solid work. `setLoadingFetch(true)` right
 *  before it therefore never reached the screen: React queued the re-render,
 *  the engine seized the thread, and by the time the browser was free to paint
 *  the search was already over. That is why the button and the two result
 *  cards stopped showing any loading state at all.
 *
 *  A single rAF is not enough — it runs *before* the frame is painted. rAF
 *  followed by a task hands control back only after the paint has happened. */
const afterPaint = () =>
  new Promise<void>((done) =>
    requestAnimationFrame(() => setTimeout(done, 0)),
  );

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** below this the loading state is a flash rather than an animation */
const MIN_LOADING_MS = 550;

/** identifies the couplet an answer belongs to */
const coupletKey = (a: string, b: string) =>
  `${(a ?? "").trim()}\n${(b ?? "").trim()}`;

function VaznYabSection() {
  const rhythmToAudioUrl = (rhythm: string) => {
    const clean = rhythm.trim().replace(/\s+/g, "-");
    return `/audio/${clean}.mp3`;
  };

  const [aruzFeet, setAruzFeet] = useState("");
  const [aruzBahr, setAruzBahr] = useState("");
  /** the couplet the answer on screen belongs to */
  const [answeredFor, setAnsweredFor] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [loadingFetch, setLoadingFetch] = useState<boolean>(false);

  /** «بیتِ تصادفی» — a couplet pulled from Ganjoor through our own route. */
  type RandomBeyt = {
    poet: string;
    book: string;
    poem: string;
    couplet: { first: string; second: string };
    url: string;
    poemId: number;
  };
  const [beyt, setBeyt] = useState<RandomBeyt | null>(null);
  const [beytError, setBeytError] = useState<string | null>(null);
  const [loadingBeyt, setLoadingBeyt] = useState(false);
  /** shown when «پیدا کن» is pressed in استادی mode with an empty guess */
  const [guessMissing, setGuessMissing] = useState(false);
  /** حالتِ استادی: guess the metre before revealing it. */
  const [masterMode, setMasterMode] = useState(false);
  const [guess, setGuess] = useState("");
  const [verdict, setVerdict] = useState<"right" | "close" | "wrong" | null>(
    null,
  );
  const searchPoemSchema = z.object({
    poem1: z
      .string()
      .transform((val) => val.trim())
      .pipe(
        z
          .string()
          .min(10, "مصراع را به‌طور کامل وارد نمایید")
          .max(40, "تعداد حروف نمی‌تواند بیشتر از 40 باشد")
          .regex(/^[\u0600-\u06FF\u200C\u200E\u200F\s]+$/, "فقط حروف فارسی پذیرفته هستند"),
      ),
    poem2: z
      .string()
      .transform((val) => val.trim())
      .pipe(
        z
          .string()
          .min(10, "مصراع را به‌طور کامل وارد نمایید")
          .max(40, "تعداد حروف نمی‌تواند بیشتر از 40 باشد")
          .regex(/^[\u0600-\u06FF\u200C\u200E\u200F\s]+$/, "فقط حروف فارسی پذیرفته هستند"),
      ),
  });

  type SerachPoem = z.infer<typeof searchPoemSchema>;

  const searchPoemForm = useForm<SerachPoem>({
    resolver: zodResolver(searchPoemSchema),
    mode: "onChange",
    defaultValues: {
      poem1: "",
      poem2: "",
    },
  });
  const onsubmit = async (data: SerachPoem) => {
    // in استادی mode the whole point is to commit to a guess first — grading a
    // blank one would quietly turn the challenge back into a plain lookup
    if (masterMode && !guess.trim()) {
      setGuessMissing(true);
      return;
    }
    setGuessMissing(false);
    setLoadingFetch(true);

    // let the loading state reach the screen before the engine blocks the thread
    await afterPaint();
    const startedAt = performance.now();

    const result = await findMeterInBrowser(data.poem1, data.poem2);
    const feet = getPureRhythm(result ?? "");

    // and keep it there long enough to be seen — on a fast machine the whole
    // search can be over in under 100ms
    await sleep(Math.max(0, MIN_LOADING_MS - (performance.now() - startedAt)));

    if (!result) setShowModal(true);
    setAruzFeet(feet);
    setAruzBahr(getRhythmDescription(result ?? ""));
    setAnsweredFor(coupletKey(data.poem1, data.poem2));

    // in استادی mode the answer is also a verdict on what the reader guessed
    if (masterMode && guess.trim() && feet) {
      setVerdict(judgeGuess(guess, feet));
    } else {
      setVerdict(null);
    }

    setLoadingFetch(false);
  };

  /** «دوباره» — clear the couplet and everything derived from it, so the next
   *  بیت starts from a blank form rather than the previous one's answer */
  const startOver = () => {
    searchPoemForm.reset({ poem1: "", poem2: "" });
    setAruzFeet("");
    setAruzBahr("");
    setGuess("");
    setVerdict(null);
    setGuessMissing(false);
    setBeyt(null);
    setBeytError(null);
    setAnsweredFor("");
    searchPoemForm.setFocus("poem1");
  };

  /** The button turns into «دوباره» once *this* بیت has been scanned. Tying it
   *  to the couplet rather than to "a result exists" matters: type a new بیت
   *  over the old one and the button goes back to «پیدا کن» on its own, instead
   *  of making the reader clear the form first. */
  const hasResult =
    Boolean(aruzFeet || aruzBahr) &&
    answeredFor !== "" &&
    answeredFor ===
      coupletKey(searchPoemForm.watch("poem1"), searchPoemForm.watch("poem2"));

  const fetchRandomBeyt = async () => {
    if (loadingBeyt) return;
    setLoadingBeyt(true);
    setVerdict(null);
    setBeytError(null);
    try {
      const res = await fetch("/api/random-beyt", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? String(res.status));
      const beytData = data as RandomBeyt;
      setBeyt(beytData);
      searchPoemForm.setValue("poem1", beytData.couplet.first, {
        shouldValidate: true,
      });
      searchPoemForm.setValue("poem2", beytData.couplet.second, {
        shouldValidate: true,
      });
      setAruzFeet("");
      setAruzBahr("");
      setAnsweredFor("");
      setGuess("");
      setGuessMissing(false);
    } catch (err) {
      console.error("random-beyt:", err);
      setBeytError(
        err instanceof Error && err.message
          ? err.message
          : "بیتی از گنجور به دست نیامد.",
      );
    } finally {
      setLoadingBeyt(false);
    }
  };

  const getPureRhythm = (rhythm: string) => {
    return rhythm?.replace(/\s*\([^)]*\)\s*$/, "").trim();
  };
  /** Compare a reader's guess with the metre the engine found.
   *
   *  Comparison is on the ارکان only, with spaces, نیم‌فاصله and the Arabic/
   *  Persian ی و ک folded together — a reader who writes «مفاعیلن مفاعیلن» with
   *  odd spacing has still named the right metre. "close" means every foot is
   *  right but the count is not. */
  const judgeGuess = (raw: string, truth: string): "right" | "close" | "wrong" => {
    const norm = (s: string) =>
      s
        .replace(/[\u200c\u200e\u200f]/g, " ")
        .replace(/ي/g, "ی")
        .replace(/ك/g, "ک")
        .replace(/[\u064b-\u0652]/g, "")
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    const g = norm(raw);
    const t = norm(truth);
    if (!g.length || !t.length) return "wrong";
    if (g.join(" ") === t.join(" ")) return "right";
    const gset = [...new Set(g)].sort().join("|");
    const tset = [...new Set(t)].sort().join("|");
    return gset === tset ? "close" : "wrong";
  };

  const getRhythmDescription = (rhythm: string) => {
    const match = rhythm?.match(/\(([^)]*)\)\s*$/);
    return match ? match[1].trim() : "";
  };

  return (
    <>
      <motion.form
        onSubmit={searchPoemForm.handleSubmit(onsubmit)}
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className=" mx-auto my-12 sm:my-16 md:max-w-4xl p-4 sm:p-8 relative z-50 rounded-3xl glass"
      >
        <div className=" flex flex-wrap items-center justify-between gap-3">
          <label className=" text-xs sm:text-sm text-muted-foreground">
            بیت خود را بنویس — هر مصراع در یک خط
          </label>

          <div className=" flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setMasterMode((v) => !v)}
              aria-pressed={masterMode}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${
                masterMode
                  ? "border-gold bg-gold/15 text-gold"
                  : "border-border bg-card text-muted-foreground hover:border-gold/50 hover:text-gold"
              }`}
            >
              حالتِ استادی
            </button>

            <button
              type="button"
              onClick={fetchRandomBeyt}
              disabled={loadingBeyt || loadingFetch}
              className={`inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary transition-all ${
                loadingBeyt || loadingFetch
                  ? "cursor-not-allowed opacity-60"
                  : "hover:brightness-95 active:scale-95"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                aria-hidden
                className={`size-4 ${loadingBeyt ? "animate-spin" : ""}`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.023 9.348h4.992V4.356m-.001 0-3.181 3.183a8.25 8.25 0 0 0-13.803 3.7M4.031 9.865v4.99m0 0h4.99m-4.99 0 3.181 3.182a8.25 8.25 0 0 0 13.803-3.7"
                />
              </svg>
              {loadingBeyt ? "..." : "بیتِ تصادفی"}
            </button>
          </div>
        </div>

        {beytError && (
          <p className=" mt-2 text-[11px] text-destructive sm:text-xs">
            {beytError}
          </p>
        )}

        {beyt && (
          <p className=" mt-2 text-[11px] text-muted-foreground sm:text-xs">
            از گنجور
            {beyt.poet ? ` — ${beyt.poet}` : ""}
            {beyt.book ? `، ${beyt.book}` : ""}
            {beyt.poem ? `، ${beyt.poem}` : ""}
            {beyt.url && (
              <>
                {" "}
                <a
                  href={beyt.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className=" text-primary underline underline-offset-2"
                >
                  دیدنِ شعر
                </a>
              </>
            )}
          </p>
        )}

        <div className=" relative mt-12 gap-3 sm:gap-x-6 sm:flex-row flex-col items-start flex sm:items-center">
          <span className=" w-18.75 text-center shrink-0 text-xs px-2 py-1 cursor-default  relative z-20 rounded-xl glass border-border! bg-secondary!">
            مصراع اول
          </span>
          <input
            disabled={loadingFetch}
            {...searchPoemForm.register("poem1")}
            placeholder="مثلا: شهر یاران بود و خاک مهربانان این دیار"
            className=" text-sm sm:text-base placeholder:text-muted-foreground/30 text-right w-full relative z-20 glass py-2 px-4 border-border! border-2! rounded-3xl bg-secondary! outline-none focus:border-primary!"
            type="text"
          />
          {searchPoemForm.formState.errors.poem1 && (
            <span className="-bottom-7 left-5 text-red-500  text-xs sm:text-sm absolute z-50">
              {searchPoemForm.formState.errors.poem1?.message}
            </span>
          )}
        </div>

        <div className=" relative mt-12 gap-3 sm:gap-x-6 sm:flex-row flex-col items-start flex sm:items-center">
          <span className=" w-18.75 text-center shrink-0 text-xs px-2 py-1 cursor-default  relative z-20 rounded-xl glass border-border! bg-secondary!">
            مصراع دوم
          </span>
          <input
            disabled={loadingFetch}
            {...searchPoemForm.register("poem2")}
            placeholder="مثلا: مهربانی کی سر آمد؟ شهریاران را چه شد؟"
            className=" text-sm sm:text-base placeholder:text-muted-foreground/30 text-right w-full relative z-20 glass py-2 px-4 border-border! border-2! rounded-3xl bg-secondary! outline-none focus:border-primary!"
            type="text"
          />
          {searchPoemForm.formState.errors.poem2 && (
            <span className=" -bottom-7 left-5 text-red-500  text-xs sm:text-sm absolute z-50">
              {searchPoemForm.formState.errors.poem2?.message}
            </span>
          )}
        </div>

        {masterMode && (
          <div className=" relative mt-12 rounded-3xl border-2 border-gold/40 bg-gold/5 p-4">
            <label className=" text-xs font-bold text-gold sm:text-sm">
              حدست چیست؟ ارکان را بنویس، بعد «پیدا کن» را بزن.
            </label>
            <input
              value={guess}
              onChange={(e) => {
                setGuess(e.target.value);
                if (e.target.value.trim()) setGuessMissing(false);
              }}
              disabled={loadingFetch}
              aria-invalid={guessMissing}
              placeholder="مثلاً: فاعلاتن فاعلاتن فاعلاتن فاعلن"
              className={`mt-3 w-full rounded-3xl border-2 bg-secondary px-4 py-2 text-right text-sm outline-none sm:text-base ${
                guessMissing
                  ? "border-destructive focus:border-destructive"
                  : "border-border focus:border-gold"
              }`}
              type="text"
            />
            {guessMissing && (
              <p className=" mt-2 text-sm font-bold text-destructive">
                اول حدست را بنویس، بعد «پیدا کن» را بزن — یا حالتِ استادی را
                خاموش کن.
              </p>
            )}
            {verdict && (
              <p
                className={`mt-3 text-sm font-bold ${
                  verdict === "right"
                    ? "text-green-600 dark:text-green-400"
                    : verdict === "close"
                      ? "text-gold"
                      : "text-destructive"
                }`}
              >
                {verdict === "right"
                  ? "✓ درست حدس زدی — گوشت تربیت شده است."
                  : verdict === "close"
                    ? "ارکان را درست گفتی، ولی تعدادشان نه. یک بار دیگر بشمار."
                    : "✕ این بار نشد. ارکانِ پیداشده را ببین و دوباره امتحان کن."}
              </p>
            )}
          </div>
        )}

        {/* one button, three jobs: search, then show it is working, then offer
            a clean slate for the next بیت */}
        <button
          type={hasResult && !loadingFetch ? "button" : "submit"}
          onClick={hasResult && !loadingFetch ? startOver : undefined}
          disabled={loadingFetch}
          className={`text-secondary font-bold brightness-85 hover:brightness-100 transition-all
         mt-8 flex items-center rounded-3xl bg-primary sm:text-lg px-4 py-1 gap-x-2 ${loadingFetch ? "cursor-not-allowed!" : ""}`}
        >
          {loadingFetch ? (
            /* the sparkles spin while the engine works, so the button itself
               says something is happening even before the cards below do */
            <motion.svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "linear" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
              />
            </motion.svg>
          ) : hasResult ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.023 9.348h4.992V4.356m-4.992 4.992-2.036-2.036A7.5 7.5 0 1 0 19.5 12M16.023 9.348h.008"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
              />
            </svg>
          )}
          {loadingFetch ? "درحال جستجو" : hasResult ? "دوباره" : "پیدا کن"}
        </button>
      </motion.form>

      <motion.div
        variants={staggerContainer(0.12, 0.15)}
        initial="hidden"
        animate="visible"
        className=" mx-auto md:max-w-4xl grid md:grid-cols-2 gap-6"
      >
        <motion.div
          variants={cardPop}
          className={`${loadingFetch && "pointer-events-none opacity-50"} transition-opacity rounded-3xl relative z-20 glass p-4 sm:p-8`}
        >
          {loadingFetch && <ResultLoadingOverlay />}
          <div className=" flex items-center font-bold text-lg gap-x-3 sm:text-xl">
            <span className=" flex text-primary items-center size-10 justify-center rounded-full bg-primary/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="lucide lucide-ruler size-5"
                viewBox="0 0 24 24"
              >
                <path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0ZM14.5 12.5l2-2M11.5 9.5l2-2M8.5 6.5l2-2M17.5 15.5l2-2"></path>
              </svg>
            </span>
            <h3>وزن و بحر</h3>
          </div>
          <div className=" mt-8">
            <span className=" mb-2 inline-block text-muted-foreground text-xs sm:text-sm">
              ارکان عروضی
            </span>
            <div className=" w-full bg-primary/10 text-center px-2 py-3 text-primary font-bold rounded-3xl">
              {aruzFeet ? aruzFeet : "- - - -"}
            </div>
          </div>
          <div className=" mt-3">
            <span className=" text-muted-foreground text-xs sm:text-sm">
              بحر
            </span>
            <div className=" w-full brightness-75 font-bold ">
              {aruzBahr && aruzBahr}
              {!aruzBahr && !aruzFeet && "- - - -"}
              {!aruzBahr && aruzFeet && "یافت نشد"}
            </div>
          </div>
        </motion.div>
        <motion.div
          variants={cardPop}
          className={`${loadingFetch && "pointer-events-none opacity-50"} transition-opacity flex justify-between flex-col rounded-3xl relative z-20 glass p-4 sm:p-8`}
        >
          {loadingFetch && <ResultLoadingOverlay />}
          <div className=" flex items-center font-bold text-lg gap-x-3 sm:text-xl">
            <span className=" flex text-primary items-center size-10 justify-center rounded-full bg-primary/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                className="lucide lucide-audio-lines size-5"
                viewBox="0 0 24 24"
              >
                <path d="M2 10v3M6 6v11M10 3v18M14 8v7M18 5v13M22 10v3"></path>
              </svg>
            </span>
            <h3>ریتم</h3>
          </div>
          <div className="  flex flex-col justify-between">
            <span className=" mb-2 inline-block text-muted-foreground text-xs sm:text-sm">
              دکمهٔ پخش را بزن تا ضرب‌آهنگِ وزن را بشنوی؛ هجاهای بلند کشیده‌تر و
              بم‌تر نواخته می‌شوند.
            </span>
            <div
              className=" w-full bg-primary/10 text-center
             text-primary font-bold rounded-3xl"
            >
              {aruzFeet && hasAudioFor(aruzFeet) ? (
                <PanelAudioPlayer
                  audioSrc={rhythmToAudioUrl(aruzFeet)}
                  color="main"
                  isPanel={false}
                />
              ) : aruzFeet ? (
                <div className=" py-6 text-sm text-muted-foreground">
                  فایلِ صوتی برای این وزن هنوز آماده نشده
                </div>
              ) : (
                <div className=" py-6">- - - -</div>
              )}
            </div>
          </div>
        </motion.div>

        {/* <div className=" glass relative z-20 p-4 sm:p-8 rounded-3xl md:col-span-2">
          <div className=" flex items-center font-bold text-lg gap-x-3 sm:text-xl">
            <div
              className="  flex relative text-primary
             items-center size-10 justify-center rounded-full bg-primary/20"
            >
              <span className="text-3xl leading-none translate-y-1.25">U</span>
              <span className=" absolute w-[70%] h-1 bg-primary inline-block"></span>
            </div>
            <h3>تقطیع هجایی</h3>
          </div>
          <h4>به‌زودی....</h4>
        </div> */}
      </motion.div>
      {showModal && (
        <div
          className=" flex items-center justify-center fixed backdrop-blur-xs
         top-0 right-0 w-screen h-screen z-50"
        >
          <div
            className=" bg-card p-4 text-center rounded-2xl flex flex-col
         items-center justify-center relative z-30  gap-y-4 max-w-[90%] sm:w-auto"
          >
            <div className=" size-25">
              <svg
                className=" size-full"
                fill="none"
                data-dc-tpl="18"
                data-om-id="33fea51e:23"
                filter="drop-shadow(rgba(20, 184, 166, 0.15) 0px 0px 20px)"
                style={{ margin: "0 auto" }}
                viewBox="0 0 120 120"
              >
                <circle
                  cx="60"
                  cy="60"
                  r="58"
                  stroke="rgba(45,212,191,0.2)"
                  strokeWidth="2"
                  data-dc-tpl="19"
                  data-om-id="33fea51e:24"
                ></circle>
                <path
                  stroke="#2dd4bf"
                  strokeLinecap="round"
                  strokeWidth="3"
                  d="M45 70q15-20 30 0"
                  data-dc-tpl="20"
                  data-om-id="33fea51e:25"
                ></path>
                <circle
                  cx="50"
                  cy="55"
                  r="4"
                  fill="#2dd4bf"
                  data-dc-tpl="21"
                  data-om-id="33fea51e:26"
                ></circle>
                <circle
                  cx="70"
                  cy="55"
                  r="4"
                  fill="#2dd4bf"
                  data-dc-tpl="22"
                  data-om-id="33fea51e:27"
                ></circle>
                <path
                  stroke="rgba(45,212,191,0.4)"
                  strokeLinecap="round"
                  strokeWidth="2"
                  d="m35 35 15-5 15 5"
                  data-dc-tpl="23"
                  data-om-id="33fea51e:28"
                ></path>
                <path
                  stroke="rgba(45,212,191,0.3)"
                  strokeLinecap="round"
                  strokeWidth="2"
                  d="M70 28q5-3 10 0"
                  data-dc-tpl="24"
                  data-om-id="33fea51e:29"
                ></path>
              </svg>
            </div>
            <p className="font-bold text-xl">هیچ نتیجه‌ای پیدا نشد</p>
            <p className="text-muted-foreground text-sm">
              لطفا هر مصراع را با دقت بالا و بدون اشتباه بنویسید و دوباره تلاش
              کنید
            </p>
            <button
              onClick={() => {
                setShowModal(false);
              }}
              className="active:scale-95 px-4 py-1 rounded-lg text-sm transition-all
               glass hover:bg-accent/70! overflow-hidden mt-3 flex"
            >
              تلاش دوباره
            </button>
            <div
              onClick={() => {
                setShowModal(false);
              }}
              className=" text-muted-foreground absolute top-3 left-3 cursor-pointer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="size-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18 18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ResultLoadingOverlay() {
  // an animated equalizer — bars rise and fall in a travelling wave, which
  // reads as "listening to the rhythm" and fits a meter-analysis tool far
  // better than a generic spinner
  const bars = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center rounded-3xl bg-card/50 backdrop-blur-[3px]">
      <div className="flex flex-col items-center gap-y-4">
        <div className="flex h-11 items-center gap-[5px]">
          {bars.map((i) => (
            <motion.span
              key={i}
              className="w-[5px] rounded-full bg-gradient-to-b from-primary to-primary/60 shadow-[0_0_10px_var(--color-primary)]"
              style={{ height: "25%" }}
              animate={{ height: ["25%", "100%", "25%"] }}
              transition={{
                duration: 0.9,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.09,
              }}
            />
          ))}
        </div>
        <motion.span
          className="text-xs sm:text-sm font-medium text-muted-foreground"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          در حال تحلیل وزن…
        </motion.span>
      </div>
    </div>
  );
}

export default VaznYabSection;
