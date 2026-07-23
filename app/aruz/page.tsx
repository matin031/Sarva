"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { defaultViewport } from "@/lib/motion";
import AruzHero from "@/components/UI/aruz/AruzHero";
import AruzFeatures from "@/components/UI/aruz/AruzFeatures";
import OrouzDemo from "@/components/UI/orouz-demo/OrouzDemo";

export default function AruzPage() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="relative overflow-hidden bg-background">
      <AruzHero reduced={reduced} />

      <AruzFeatures reduced={reduced} />

      {/* ---------- interactive demo, framed like a device ---------- */}
      <section dir="rtl" className="container relative py-20">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 24, filter: "blur(6px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={defaultViewport}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-12 max-w-2xl text-center"
        >
          <span className="mb-3 inline-block rounded-full bg-primary/10 px-4 py-1 text-sm font-semibold text-primary">
            یک نگاه به داخل
          </span>
          <h2 className="text-3xl font-black text-foreground sm:text-4xl md:text-5xl">
            آزمون را زنده ببین
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            همین حالا نمونه‌ای از پرسش‌ها را تماشا کن؛ ریتم پخش می‌شود و گزینهٔ
            درست روشن می‌شود.
          </p>
        </motion.div>

        <motion.div
          initial={reduced ? false : { opacity: 0, y: 30, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={defaultViewport}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto max-w-4xl"
        >
          {/* glow behind the frame */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-[2rem] bg-primary/20 blur-3xl"
          />
          <div className="relative rounded-[2rem] border border-border bg-card/50 p-4 shadow-2xl backdrop-blur-md sm:p-8">
            {/* faux window chrome */}
            <div className="mb-6 flex items-center gap-2">
              <span className="size-3 rounded-full bg-destructive/60" />
              <span className="size-3 rounded-full bg-gold/70" />
              <span className="size-3 rounded-full bg-primary/70" />
              <span className="ms-3 text-xs text-muted-foreground">
                عروض سماعی — نمونهٔ زنده
              </span>
            </div>
            <OrouzDemo />
          </div>
        </motion.div>
      </section>

      {/* ---------- final CTA ---------- */}
      <section dir="rtl" className="container relative py-24">
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={defaultViewport}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto max-w-3xl overflow-hidden rounded-[2.5rem] border border-primary/30 bg-gradient-to-br from-card to-card/40 p-10 text-center shadow-2xl backdrop-blur-md sm:p-16"
        >
          <div
            aria-hidden
            className="absolute -right-24 -top-24 size-72 rounded-full bg-primary/25 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -bottom-24 -left-24 size-72 rounded-full bg-gold/20 blur-3xl"
          />
          <h2 className="relative text-3xl font-black text-foreground sm:text-4xl md:text-5xl">
            گوشت را برای وزن آماده کن
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-muted-foreground">
            رایگان شروع کن، بدونِ حفظ‌کردنِ ارکان. فقط گوش بده و وزن‌شناس شو.
          </p>
          <div className="relative mt-8 flex justify-center">
            <Link
              href="/quiz"
              className="group inline-flex min-h-13 items-center gap-2 rounded-2xl bg-primary px-9 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-95 active:scale-95"
            >
              آغاز یادگیریِ رایگان
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="size-5 transition-transform group-hover:-translate-x-1"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 6 5 12l6 6M19 12H5"
                />
              </svg>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
