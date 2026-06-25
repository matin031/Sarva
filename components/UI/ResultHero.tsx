"use client";
import { motion } from "framer-motion";

function ResultHero({ total, correct }: { total: number; correct: number }) {
  const result = (Math.round(correct) / Math.round(total)) * 100;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, rotate: -30, scale: 0.2 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ type: "spring" }}
        className=" size-24 shrink-0 rounded-full bg-primary flex items-center justify-center"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          className="lucide lucide-trophy w-12 h-12 text-primary-foreground"
          viewBox="0 0 24 24"
        >
          <path d="M10 14.66v1.626a2 2 0 0 1-.976 1.696A5 5 0 0 0 7 21.978M14 14.66v1.626a2 2 0 0 0 .976 1.696A5 5 0 0 1 17 21.978M18 9h1.5a1 1 0 0 0 0-5H18M4 22h16"></path>
          <path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zM6 9H4.5a1 1 0 0 1 0-5H6"></path>
        </svg>
      </motion.div>

      <motion.div className=" -space-y-3">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, rotate: 0, scale: 1, y: 0 }}
          transition={{ type: "spring" }}
          className="text-4xl md:text-5xl font-bold text-foreground"
        >
          {result < 19 && "شروع تازه"}
          {result > 21 && result < 41 && "راه داریم"}
          {result > 39 && result < 59 && "بد نبود"}
          {result > 59 && result < 79 && "!آفرین"}
          {result > 79 && result < 99 && "!عالی"}
          {result == 100 && "!بی نقص"}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, rotate: 0, scale: 1, y: 0 }}
          transition={{ type: "spring" }}
          className="text-lg text-muted-foreground mb-8"
        >
          {result < 19 &&
            "از همین‌جا شروع می‌کنیم؛ مبانی وزن را مرور کنید و باز بیایید"}
          {result > 19 &&
            result < 39 &&
            "نگران نباشید؛ عروض با تکرار جا می‌افتد، دوباره تلاش کنید"}
          {result > 39 &&
            result < 59 &&
            "پایه را دارید؛ مرور دوبارهٔ اوزان کمک زیادی می‌کند"}
          {result > 59 &&
            result < 79 &&
            "دست‌مریزاد؛ فقط چند نکته‌ی ظریف باقی مانده"}
          {result > 79 && result < 99 && "تسلط چشمگیری بر وزن و عروض دارید"}
          {result == 100 && "تمام پاسخ‌ها درست بود؛ شما واقعاً استاد عروضید"}
        </motion.p>
      </motion.div>
    </>
  );
}

export default ResultHero;
