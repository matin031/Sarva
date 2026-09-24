"use client";

import { toFa } from "@/components/UI/CircularProgress";
import Link from "next/link";
import { motion } from "framer-motion";

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center mt-6 -space-y-10">
      <div className="text-[130px] space-x-2 flex items-center text-primary/50">
        {[
          4,
          <svg
            width="90"
            height="90"
            fill="none"
            data-dc-tpl="18"
            data-om-id="33fea51e:23"
            filter="drop-shadow(0 0 20px color-mix(in oklch, var(--primary) 15%, transparent))"
            style={{ margin: "0 auto" }}
            viewBox="0 0 120 120"
          >
            <circle
              cx="60"
              cy="60"
              r="58"
              stroke="var(--primary)" strokeOpacity={0.2}
              strokeWidth="2"
              data-dc-tpl="19"
              data-om-id="33fea51e:24"
            ></circle>
            <path
              stroke="var(--primary)"
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
              fill="var(--primary)"
              data-dc-tpl="21"
              data-om-id="33fea51e:26"
            ></circle>
            <circle
              cx="70"
              cy="55"
              r="4"
              fill="var(--primary)"
              data-dc-tpl="22"
              data-om-id="33fea51e:27"
            ></circle>
            <path
              stroke="var(--primary)" strokeOpacity={0.4}
              strokeLinecap="round"
              strokeWidth="2"
              d="m35 35 15-5 15 5"
              data-dc-tpl="23"
              data-om-id="33fea51e:28"
            ></path>
            <path
              stroke="var(--primary)" strokeOpacity={0.3}
              strokeLinecap="round"
              strokeWidth="2"
              d="M70 28q5-3 10 0"
              data-dc-tpl="24"
              data-om-id="33fea51e:29"
            ></path>
          </svg>,
          4,
        ].map((item, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: -120 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: i * 0.15,
              type: "spring",
              stiffness: 200,
              damping: 14,
            }}
          >
            {typeof item === "number" ? toFa(item) : item}
          </motion.span>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-center justify-center flex-col"
      >
        <p className=" text-4xl font-bold">گویا راه گم کرده‌اید</p>
        <p>اینجا چیزی برای نمایش وجود ندارد</p>
        <Link
          className="active:scale-95 px-4 py-1 rounded-lg text-sm transition-all
               glass hover:bg-accent/70! overflow-hidden mt-3 flex"
          href={"/"}
        >
          بازگشت به صفحۀ اصلی
        </Link>
      </motion.div>
    </div>
  );
}

export default NotFound;
