"use client";
import WaveSurfer from "wavesurfer.js";
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
  const containerRef = useRef<HTMLDivElement>(null);

  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  // فایل صوتی بارگذاری نشد — گزینه می‌ماند، ولی به‌جای کرش می‌گوید چه شده.
  const [failed, setFailed] = useState(false);

  // فقط در این سه نوع، *گزینه‌ها* صوت‌اند. در audio-to-poem و
  // audio-to-weight صوت در صورتِ سؤال است و گزینه‌ها متن‌اند — آنجا
  // audio_urlِ خالی طبیعی است، نه خرابی.
  const optionsAreAudio =
    quizType === "poem-to-audio" ||
    quizType === "pattern-to-audio" ||
    quizType === "weight-to-audio";

  const hasAudio = optionsAreAudio && !!audioUrl?.trim();

  useEffect(() => {
    // ⚠️ بدون این شرط، برای گزینه‌ای که مسیر ندارد هم WaveSurfer با
    // `url: ""` ساخته می‌شد. مسیر خالی به آدرسِ خودِ صفحه resolve می‌شود،
    // پس مرورگر HTML می‌گرفت و NotSupportedError می‌داد. حالا اصلاً ساخته
    // نمی‌شود.
    if (!hasAudio) return;
    if (!containerRef.current) return;

    setFailed(false);

    wavesurferRef.current = WaveSurfer.create({
      container: containerRef.current,
      url: audioUrl,
      waveColor: "#64748b",
      progressColor: "#14b8a6",
      height: 80,
      barWidth: 3,
      barGap: 2,
      barRadius: 999,
      cursorWidth: 0,
    });

    wavesurferRef.current.on("play", () => {
      setIsPlaying(true);
    });

    wavesurferRef.current.on("pause", () => {
      setIsPlaying(false);
    });

    wavesurferRef.current.on("finish", () => {
      setIsPlaying(false);
    });

    // ⚠️ اگر فایل صوتی روی سرور نباشد، مرورگر برای url یک صفحهٔ ۴۰۴ (HTML)
    // می‌گیرد و رمزگشایی شکست می‌خورد. بدون این، خطا بی‌صاحب می‌ماند و
    // به کرشِ کلِ صفحه تبدیل می‌شود — یک ردیفِ خرابِ دیتابیس تمام آزمون را
    // می‌خواباند.
    //
    // برای پیدا کردنِ ردیفِ مقصر: npm run db:check-audio
    wavesurferRef.current.on("error", () => {
      setFailed(true);
      setIsPlaying(false);
    });

    return () => {
      wavesurferRef.current?.destroy();
    };
  }, [audioUrl, title, hasAudio]);

  const handlePlay = () => {
    if (failed) return; // چیزی برای پخش نیست
    if (isPlaying) {
      wavesurferRef.current?.pause();
      setPlayingId(null);
    } else {
      // play() یک promise برمی‌گرداند؛ رد شدنش باید همین‌جا بماند.
      void wavesurferRef.current?.play()?.catch(() => setFailed(true));
      setPlayingId(id);
    }
  };
  useEffect(() => {
    if (playingId !== id && isPlaying) {
      wavesurferRef.current?.pause();
    }
  }, [playingId]);

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
            {/* دو حالتِ خرابی: مسیر از اول خالی بوده (hasAudio نادرست)، یا
                مسیر بوده و بارگذاری شکست خورده (failed). هر دو یک پیام
                می‌گیرند و دکمهٔ پخش را هم نشان نمی‌دهند، چون چیزی برای پخش
                نیست. */}
            <div className="w-full" ref={containerRef} hidden={!hasAudio || failed}></div>
            {(!hasAudio || failed) && (
              <p className="w-full text-center text-xs text-rose-400">
                فایل صوتی این گزینه در دسترس نیست.
              </p>
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
