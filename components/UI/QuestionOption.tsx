"use client";
import { motion } from "motion/react";

import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";

interface QuestionOptionType {
  audioUrl?: string;
  poem?: string[];
  quizType:
    | "pattern-to-audio"
    | "audio-to-poem"
    | "poem-to-audio"
    | "weight-to-audio"
    | "audio-to-pattern"
    | "audio-to-weight";
  title?: string;
  setSelected: Dispatch<SetStateAction<number | null>>;
  selected: number | null;
  id: number;
  answered: boolean;
  isCorrect: boolean;
  whileInView: number;
  playingId: number | null;
  setPlayingId: Dispatch<SetStateAction<number | null>>;
}

export default function QuestionOption({
  audioUrl,
  setSelected,
  selected,
  id,
  answered,
  isCorrect,
  quizType,
  title,
  poem,
  whileInView,
  playingId,
  setPlayingId,
}: QuestionOptionType) {
  const audioRef = useRef<HTMLAudioElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  /** مسیر بود ولی بارگذاری/پخش شکست خورد — با «اصلاً مسیری نبود» یکی نیست. */
  const [failed, setFailed] = useState(false);

  // فقط در این سه نوع، *گزینه‌ها* صوت‌اند. در audio-to-poem و
  // audio-to-weight صوت در صورتِ سؤال است و گزینه‌ها متن‌اند — آنجا
  // audio_urlِ خالی طبیعی است، نه خرابی.
  const optionsAreAudio =
    quizType === "poem-to-audio" ||
    quizType === "pattern-to-audio" ||
    quizType === "weight-to-audio";

  const src = audioUrl?.trim() ?? "";
  /** نوعش صوتی است و مسیر هم دارد. */
  const hasAudio = optionsAreAudio && src !== "";
  /** نوعش صوتی است ولی اصلاً مسیری نیامده — خرابیِ داده، نه خرابیِ پخش. */
  const missing = optionsAreAudio && src === "";

  // ⚠️ سؤال که عوض می‌شود این کامپوننت unmount می‌شود؛ بدون این، صوتِ
  // گزینهٔ سؤالِ قبلی همچنان پخش می‌ماند.
  useEffect(() => {
    const el = audioRef.current;
    return () => {
      el?.pause();
    };
  }, []);

  // فقط یک گزینه در هر لحظه: هرکس playingId نیست، ساکت می‌شود.
  //
  // ⚠️ isPlaying عمداً در وابستگی‌ها نیست. وقتی بود، این توالی پیش می‌آمد:
  // رویداد play زودتر از setPlayingId(id) می‌رسید، پس افکت لحظه‌ای
  // playingId=null و isPlaying=true می‌دید و همان پخشی را که تازه شروع شده
  // بود pause می‌کرد — و pause وسطِ play یعنی رد شدنِ آن promise با
  // AbortError. یعنی کد پخشِ خودش را قطع می‌کرد.
  //
  // pause روی چیزی که پخش نیست بی‌اثر است، پس شرطِ isPlaying لازم نبود.
  useEffect(() => {
    if (playingId !== id) {
      audioRef.current?.pause();
    }
  }, [playingId, id]);

  const handlePlay = async () => {
    const el = audioRef.current;
    if (!el || !hasAudio || failed) return;

    if (isPlaying) {
      el.pause();
      setPlayingId(null);
      return;
    }

    // نوبت را *پیش از* await می‌گیریم. اگر بعد از آن باشد، افکتِ بالا
    // در فاصلهٔ بین شروعِ پخش و رسیدنِ setPlayingId، این گزینه را بیگانه
    // می‌بیند و ساکتش می‌کند.
    setPlayingId(id);

    try {
      await el.play();
    } catch (err) {
      // AbortError یعنی خودمان وسطِ کار pause کردیم — مثلاً کاربر سریع روی
      // گزینهٔ دیگری زد. این خرابی نیست و نه باید گزارش شود نه فایل را
      // معیوب علامت بزند.
      if (err instanceof DOMException && err.name === "AbortError") return;

      // چرا اینجا و نه فقط onError: پخش می‌تواند به دلایلی جز خرابیِ فایل
      // هم رد شود (مثلاً سیاستِ autoplay)، و آن استثنا به onError نمی‌رسد.
      reportAudioProblem("play() رد شد", err);
      setFailed(true);
    }
  };

  /** هرچه برای فهمیدنِ علت لازم است، یک‌جا. */
  const reportAudioProblem = (what: string, extra?: unknown) => {
    const el = audioRef.current;
    console.error("[صوتِ گزینه] " + what, {
      quizType,
      audioUrl,
      currentSrc: el?.currentSrc,
      errorCode: el?.error?.code,
      errorMessage: el?.error?.message,
      // ⚠️ DOMException خصوصیاتش enumerable نیست، پس مستقیم که چاپش کنی
      // فقط {} می‌بینی. اسم و پیام را دستی بیرون می‌کشیم.
      reason: extra instanceof Error ? `${extra.name}: ${extra.message}` : extra,
    });
  };

  return (
    <motion.div
      whileInView={{ x: 0 }}
      initial={{ x: whileInView }}
      animate={{ x: whileInView }}
      viewport={{ once: true }}
    >
      <div
        dir="rtl"
        onClick={() => {
          !answered && setSelected(id);
        }}
        className={`gap-x-3 h-full px-3 py-6 flex justify-center items-center ${optionsAreAudio && "justify-start p-2 sm:p-4"} 
       rounded-xl bg-card border-2
  relative z-20 hover:scale-[1.02] transition-all duration-300 cursor-pointer w-full 
  ${
    !answered
      ? selected === id
        ? "border-primary border-3 bg-primary/30"
        : "border-border xs:hover:border-primary/50 active:scale-[0.98]"
      : isCorrect
        ? "border-green-500 bg-green-500/10"
        : selected === id
          ? "border-red-500 bg-red-500/10"
          : "border-border"
  }`}
      >
        {!answered && selected == id && (
          <div className=" z-20 left-3 top-3 absolute size-2 rounded-full bg-primary"></div>
        )}
        {answered && isCorrect && (
          <div className=" z-20 left-3 top-3 absolute size-5 sm:size-6 rounded-full text-white flex items-center justify-center bg-green-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className=" size-3 sm:size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m4.5 12.75 6 6 9-13.5"
              />
            </svg>
          </div>
        )}
        {answered && selected == id && !isCorrect && (
          <div
            className=" z-20 left-3 top-3 absolute size-5 sm:size-6 rounded-full
         text-white flex items-center justify-center bg-red-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="size-3 sm:size-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </div>
        )}

        {optionsAreAudio && (
          <>
            {/* دو حالتِ جدا، و عمداً جدا: missing یعنی اصلاً مسیری نیامده
                (خرابیِ داده)، failed یعنی مسیر بود ولی پخش نشد (خرابیِ فایل
                یا مرورگر). یکی‌کردنشان همان چیزی بود که تشخیص را کور می‌کرد. */}
            {missing ? (
              <p className="w-full text-center text-xs text-rose-400">
                فایل صوتی این گزینه در دسترس نیست.
              </p>
            ) : failed ? (
              <p className="w-full text-center text-xs text-amber-400">
                پخش این فایل صوتی ممکن نشد.
              </p>
            ) : (
              // جای موج: یک نوارِ سادهٔ پیشرفت، با همان ارتفاعِ قبلی.
              <div className="w-full h-20 flex items-center px-1">
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-150"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            {hasAudio && (
              <audio
                ref={audioRef}
                src={src}
                preload="metadata"
                // مسیرِ تازه یعنی شانسِ تازه: خطای قبلی نباید بماند.
                onLoadStart={() => {
                  setFailed(false);
                  setProgress(0);
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                  setIsPlaying(false);
                  setProgress(0);
                  setPlayingId(null);
                }}
                onTimeUpdate={(e) => {
                  const el = e.currentTarget;
                  if (el.duration > 0) setProgress((el.currentTime / el.duration) * 100);
                }}
                onError={() => {
                  reportAudioProblem("بارگذاری فایل شکست خورد");
                  setFailed(true);
                }}
              />
            )}
            <div
              hidden={!hasAudio || failed}
              onClick={(event) => {
                handlePlay();
                event.stopPropagation();
              }}
              className={`${isPlaying ? " bg-primary/20 text-primary" : "bg-muted text-muted-foreground "}
         size-6 sm:size-8 shrink-0 rounded-full 
      hover:bg-primary/20  hover:text-primary flex items-center justify-center`}
            >
              {isPlaying ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h9a2.25 2.25 0 0 1 2.25 2.25v9a2.25 2.25 0 0 1-2.25 2.25h-9a2.25 2.25 0 0 1-2.25-2.25v-9Z"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
                  />
                </svg>
              )}
            </div>
          </>
        )}

        {quizType === "audio-to-weight" && title}
        {quizType === "audio-to-poem" && (
          <div className=" w-full flex flex-col text-sm sm:text-base">
            <p>{poem && poem[0]}</p>
            <p className=" mr-auto">{poem && poem[1]}</p>
          </div>
        )}

        {quizType === "audio-to-pattern" && (
          <div
            className=" grid grid-cols-1 grid-rows-2 gap-x-2 rounded-xl gap-y-2 px-3 py-4 md:p-6 bg-card border-border border-2
           relative z-20 xs:hover:border-primary/50 hover:scale-[1.02] 
           active:scale-[0.98] transition-all duration-300 cursor-pointer w-full lg:h-20"
          >
            <div className=" flex items-center gap-x-2">
              <div className=" flex items-center gap-x-1">
                <span
                  className="
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              bg-secondary text-secondary-foreground border border-border"
                >
                  ∪
                </span>
                <span
                  className="
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              bg-secondary text-secondary-foreground border border-border"
                >
                  ∪
                </span>
                <span
                  className="
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              bg-primary text-primary-foreground"
                >
                  <span className=" h-0.5 w-2/5 bg-black block"></span>
                </span>
                <span
                  className="
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              bg-primary text-primary-foreground"
                >
                  <span className=" h-0.5 w-2/5 bg-black block"></span>
                </span>
              </div>
              /
              <div className=" flex items-center gap-x-1">
                <span
                  className="
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              bg-secondary text-secondary-foreground border border-border"
                >
                  ∪
                </span>
                <span
                  className="
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              bg-secondary text-secondary-foreground border border-border"
                >
                  ∪
                </span>
                <span
                  className="
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              bg-primary text-primary-foreground"
                >
                  <span className=" h-0.5 w-2/5 bg-black block"></span>
                </span>
                <span
                  className="
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              bg-primary text-primary-foreground"
                >
                  <span className=" h-0.5 w-2/5 bg-black block"></span>
                </span>
              </div>
            </div>

            <div className=" flex items-center gap-x-2 justify-end w-full">
              <div className=" flex items-center gap-x-1">
                <span
                  className="
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              bg-secondary text-secondary-foreground border border-border"
                >
                  ∪
                </span>
                <span
                  className="
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              bg-secondary text-secondary-foreground border border-border"
                >
                  ∪
                </span>
                <span
                  className="
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              bg-primary text-primary-foreground"
                >
                  <span className=" h-0.5 w-2/5 bg-black block"></span>
                </span>
                <span
                  className="
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              bg-primary text-primary-foreground"
                >
                  <span className=" h-0.5 w-2/5 bg-black block"></span>
                </span>
              </div>
              /
              <div className=" flex items-center gap-x-1">
                <span
                  className="
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              bg-secondary text-secondary-foreground border border-border"
                >
                  ∪
                </span>
                <span
                  className="
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              bg-secondary text-secondary-foreground border border-border"
                >
                  ∪
                </span>
                <span
                  className="
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              bg-primary text-primary-foreground"
                >
                  <span className=" h-0.5 w-2/5 bg-black block"></span>
                </span>
                <span
                  className="
              w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono
              bg-primary text-primary-foreground"
                >
                  <span className=" h-0.5 w-2/5 bg-black block"></span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
