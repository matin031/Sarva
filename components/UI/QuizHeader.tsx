"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toFa } from "@/components/UI/CircularProgress";

interface QuizHeaderType {
  score: number;
  currentIndex: number;
  questionsLength: number;
  answered: boolean;
  onExit: () => void;
}

function QuizHeader({
  score,
  currentIndex,
  questionsLength,
  answered,
  onExit,
}: QuizHeaderType) {
  const [showExitModal, setShowExitModal] = useState(false);

  // how many questions are still unanswered if the quiz ends right now
  const answeredCount = currentIndex + (answered ? 1 : 0);
  const unansweredCount = Math.max(questionsLength - answeredCount, 0);

  return (
    <div dir="rtl" className=" w-full">
      {/* ProgressBar  */}
      <div className=" text-xs sm:text-sm flex justify-between items-center w-full">
        <span>پیشرفت</span>
        <span className=" text-primary">{score} پاسخ صحیح</span>
      </div>
      <div className=" mt-2 rounded-full h-2 bg-muted overflow-hidden w-full">
        <div
          style={{
            width: `${Math.round(((currentIndex + 1) / questionsLength) * 100)}%`,
          }}
          className="h-full bg-linear-to-l from-primary transition-all to-turquoise-light"
        ></div>
      </div>
      {/* ProgressBar  */}

      {/* QuestionCounter  */}
      <div className=" flex items-end justify-between">
        <span className=" mt-10 block text-xs sm:text-sm text-muted-foreground">
          پرسش {currentIndex + 1} از {questionsLength}
        </span>

        <button
          onClick={() => setShowExitModal(true)}
          className=" flex active:scale-90 transition-all justify-between gap-x-2 items-center px-3 py-1 rounded-lg 
          glass text-red-500/90 font-bold
         shadow-2xl hover:bg-destructive text-sm"
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
              d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5"
            />
          </svg>
          خروج از آزمون
        </button>
      </div>

      <AnimatePresence>
        {showExitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowExitModal(false)}
            className=" fixed backdrop-blur inset-0 h-screen w-screen z-99
       flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 12 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className=" relative glass px-6 py-12 rounded-xl text-center max-w-md w-full"
            >
              <div className=" text-red-400 mb-2 bg-red-400/20 flex items-center justify-center size-16 rounded-lg mx-auto">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="size-8"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5"
                  />
                </svg>
              </div>

              <div>
                <h5 className=" font-bold text-3xl ">پایان آزمون؟</h5>
                <p className=" mb-5">
                  آیا مطمئن هستید که می‌خواهید آزمون را همین‌جا به پایان
                  برسانید؟
                </p>
                {unansweredCount > 0 && (
                  <p className=" bg-accent/10 px-3 py-3 rounded-lg text-accent max-w-[90%] mx-auto">
                    <span className="font-bold text-red-600">
                      {toFa(unansweredCount)}
                    </span>{" "}
                    سؤال بدون پاسخ باقی مانده است!! پرسش‌های بی‌پاسخ نادرست
                    محاسبه می‌شوند.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 *:py-3 mt-6">
                <button
                  onClick={() => setShowExitModal(false)}
                  className=" active:scale-90 glass brightness-80 rounded-lg hover:brightness-100
             transition-all  w-full"
                >
                  نه، ادامۀ آزمون
                </button>
                <button
                  onClick={onExit}
                  className=" active:scale-90 bg-red-600 brightness-80 rounded-lg hover:brightness-100 
            transition-all  w-full "
                >
                  بله، پایان آزمون
                </button>
              </div>
              <button
                onClick={() => setShowExitModal(false)}
                aria-label="بستن"
                className=" absolute top-3 left-3 opacity-70 cursor-pointer hover:opacity-100 transition-opacity"
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
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* QuestionCounter  */}
    </div>
  );
}

export default QuizHeader;
