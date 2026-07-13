"use client";

import Link from "next/link";
import { useState } from "react";

type DifficultyType = "easy" | "medium" | "hard" | "default";
type QuestionTypeType = "audio-to-poem" | "poem-to-audio" | "mixed" | "default";

interface QuizSettingsModalProps {
  totalAll: number;
  totalUnanswered: number;
  onStart: (opts: { questionCount: number; excludeRepeated: boolean }) => void;
}

function QuizSettingsModal({
  totalAll,
  totalUnanswered,
  onStart,
}: QuizSettingsModalProps) {
  const [questionCount, setQuestionCount] = useState<number>(0);
  const [excludeRepeated, setExcludeRepeated] = useState<boolean>(false);

  const questionCountOptions = [5, 10, 15, 20];
  const difficultyOptions: { label: string; value: DifficultyType }[] = [
    { label: "آسان", value: "easy" },
    { label: "متوسط", value: "medium" },
    { label: "دشوار", value: "hard" },
  ];

  const questionTypeOptions: { label: string; value: QuestionTypeType }[] = [
    { label: "ضرب", value: "audio-to-poem" },
    { label: "بیت", value: "poem-to-audio" },
    { label: "ترکیبی", value: "mixed" },
  ];

  const availableCount = excludeRepeated ? totalUnanswered : totalAll;
  const notEnoughQuestions =
    questionCount > 0 && questionCount > availableCount;

  const canStart = questionCount > 0 && availableCount > 0;

  return (
    <div
      dir="rtl"
      className=" fixed h-screen w-screen inset-0 
      backdrop-blur-sm z-30 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div
        className="custom-scrollbar w-2xl glass relative z-100 gap-y-6 sm:gap-y-10 rounded-xl flex 
      flex-col  items-center p-5 sm:p-6 max-h-[85vh] max-w-[90%] mx-auto overflow-y-auto my-auto"
      >
        <Link className=" absolute left-4 top-4" href={"/"}>
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
              d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
            />
          </svg>
        </Link>
        <div className=" flex flex-col items-center gap-y-4">
          <div className=" cursor-default flex items-center gap-x-2 text-muted-foreground">
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
                d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
            <h4>تعداد سوالات</h4>
          </div>
          <div className=" w-full flex-wrap justify-center sm:justify-normal flex items-center gap-4 sm:gap-6">
            {questionCountOptions.map((i) => (
              <button
                key={i}
                onClick={() => setQuestionCount(i)}
                className={`${questionCount == i && " brightness-100 bg-primary scale-95 text-white dark:text-lapis"} active:scale-85 shadow-2xl brightness-90 hover:brightness-100 
              transition-all bg-muted  min-w-14.5 rounded flex items-center justify-center py-0.5`}
              >
                {i}
              </button>
            ))}
          </div>
          {notEnoughQuestions && (
            <p className=" sm:hidden text-xs sm:text-sm text-gold text-center">
              {availableCount > 0
                ? `فقط ${availableCount} سوال برای شما باقی مانده است، آزمون با همین تعداد ساخته می‌شود.`
                : "سوال جدیدی برای شما باقی نمانده است."}
            </p>
          )}
        </div>
        <div className=" flex flex-col min-w-full items-start justify-center xs:items-center gap-y-4 opacity-40 pointer-events-none select-none">
          <div className=" cursor-default flex items-center gap-x-2 text-muted-foreground">
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
                d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75"
              />
            </svg>
            <h4>سطح سوالات</h4>
            <span className=" text-[10px] rounded-full px-2 py-0.5 bg-muted-foreground/20">
              به‌زودی
            </span>
          </div>
          <div className=" w-full flex-wrap justify-center  sm:flex-row flex items-center gap-6">
            {difficultyOptions.map((i) => (
              <button
                key={i.value}
                disabled
                className=" w-full xs:w-34 bg-muted rounded scale-95 flex items-center justify-center py-0.5 cursor-not-allowed"
              >
                {i.label}
              </button>
            ))}
          </div>
        </div>
        <div className="w-full flex flex-col items-start sm:items-center gap-y-4">
          <div className=" cursor-default flex items-center gap-x-2 text-muted-foreground">
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
                d="M4.098 19.902a3.75 3.75 0 0 0 5.304 0l6.401-6.402M6.75 21A3.75 3.75 0 0 1 3 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 0 0 3.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008Z"
              />
            </svg>
            <h4>نوع سوالات</h4>
          </div>

          <div className=" flex-wrap w-full justify-center flex items-center gap-6">
            {questionTypeOptions.map((i) => {
              const isMixed = i.value === "mixed";
              return (
                <button
                  key={i.value}
                  disabled={!isMixed}
                  className={`${
                    isMixed
                      ? " brightness-100 bg-primary scale-95 text-white dark:text-lapis"
                      : " bg-muted opacity-40 cursor-not-allowed"
                  } active:scale-85 w-full xs:w-34 hover:brightness-100 transition-all
               rounded scale-95 flex items-center justify-center py-0.5`}
                >
                  {i.label}
                </button>
              );
            })}
          </div>
        </div>
        <div
          className=" bg-muted-foreground/10 text-xs sm:text-sm w-full  py-3 rounded-xl
         justify-start px-3 flex items-center gap-x-2"
        >
          <input
            className=" appearance-none bg-muted-foreground/40 dark:bg-secondary-foreground size-4.5 sm:size-5 
            rounded active:scale-95 checked:bg-primary cursor-pointer"
            type="checkbox"
            checked={excludeRepeated}
            onChange={(e) => setExcludeRepeated(e.target.checked)}
          />
          <label>سوالات تکراری را نمایش نده</label>
          {notEnoughQuestions && (
            <p className=" hidden sm:block text-xs sm:text-sm text-gold text-center">
              *
              {availableCount > 0
                ? `فقط ${availableCount} سوال برای شما باقی مانده است، آزمون با همین تعداد ساخته می‌شود.`
                : "سوال جدیدی برای شما باقی نمانده است."}
            </p>
          )}
        </div>
        <button
          disabled={!canStart}
          onClick={() =>
            canStart &&
            onStart({
              questionCount: Math.min(questionCount, availableCount),
              excludeRepeated,
            })
          }
          className={`font-bold py-2 w-full sm:w-1/3 text-center rounded-xl transition-all text-white ${
            canStart
              ? "bg-primary brightness-90 hover:brightness-100"
              : "bg-primary/40 cursor-not-allowed"
          }`}
        >
          ساخت آزمون
        </button>
      </div>
    </div>
  );
}

export default QuizSettingsModal;
