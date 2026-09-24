"use client";

import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import { defaultViewport } from "@/lib/motion";
import AruzHero from "@/components/UI/aruz/AruzHero";
import AruzFeatures from "@/components/UI/aruz/AruzFeatures";
import AruzGamesSection from "@/components/UI/aruz/AruzGamesSection";
import dynamic from "next/dynamic";
import {
  useReducedMotion,
  useInView,
  useQuality,
  useQualityAttribute,
} from "@/lib/perf/use-perf";

/** The demo runs its own canvas + rAF loop and sits well below the fold, so it
 *  has no business being parsed and mounted during the first paint. Loading it
 *  on demand takes its evaluation off the critical path.
 *
 *  ⚠️ ولی dynamic() به‌تنهایی «تنبل تا viewport» نیست: بلافاصله پس از
 *  hydration دانلود و mount می‌شود. حصارِ زیر است که تا نزدیک شدنِ واقعی
 *  کاربر جلویش را می‌گیرد. */
const OrouzDemo = dynamic(() => import("@/components/UI/orouz-demo/OrouzDemo"), {
  ssr: false,
  loading: () => <DemoPlaceholder />,
});

/** ارتفاعِ ثابت، برابر با ارتفاعِ خودِ دمو — تا جابه‌جاییِ چیدمان نسازد. */
function DemoPlaceholder() {
  return <div className="h-[520px]" aria-hidden />;
}

/** دمو را تا ۴۰۰ پیکسلیِ viewport اصلاً نمی‌سازد. */
function LazyDemo() {
  // once=true: یک بار که ساخته شد نگهش می‌داریم. دور شدنِ کاربر حلقه‌ها را
  // می‌خواباند (کارِ useScrolling/useDocumentVisible داخلِ خودِ دمو)، پس
  // برچیدن و ساختنِ دوباره هزینه‌ای است بی‌دلیل.
  const [ref, near] = useInView<HTMLDivElement>("400px", true);

  return <div ref={ref}>{near ? <OrouzDemo /> : <DemoPlaceholder />}</div>;
}
import styles from "@/components/UI/aruz/aruz.module.css";
import {
  RevealGroup,
  RevealItem,
  RevealWords,
} from "@/components/UI/aruz/reveal";

export default function AruzPage() {
  // ⚠️ useSyncExternalStore و نه useState+useEffect: با الگوی قبلی اولین
  // رندر همیشه «حرکت آزاد» بود و تازه در effect به «کم» می‌رسید، یعنی
  // کاربرِ reduced-motion یک فریم انیمیشنِ کامل می‌دید. خطای
  // set-state-in-effect هم از همان‌جا می‌آمد.
  const reduced = useReducedMotion();
  // سطحِ کیفیت را به CSS می‌رساند تا انیمیشن‌های تزئینی و backdrop-filter
  // روی دستگاهِ ضعیف خودشان کنار بروند.
  const { tier } = useQuality();
  useQualityAttribute(tier);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative overflow-hidden bg-background">
        <AruzHero reduced={reduced} />

        <AruzFeatures reduced={reduced} />

        {/* ---------- the two aruz games ---------- */}
        <AruzGamesSection reduced={reduced} />

        {/* ---------- interactive demo, framed like a device ---------- */}
        <section dir="rtl" className="container relative py-20 cursor-default">
          <RevealGroup
            stagger={0.12}
            className="mx-auto mb-12 max-w-2xl text-center"
          >
            <h2 className="text-3xl font-black text-foreground sm:text-4xl md:text-5xl">
              <RevealWords text="یک پرسش را امتحان کن" inherit />
            </h2>
            <RevealItem>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                درست یا غلط، هر پاسخ گوشت را با یک وزن آشنا می‌کند.
              </p>
            </RevealItem>
          </RevealGroup>

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
              className="glow-soft absolute inset-0 -z-10 rounded-[2rem]"
              style={
                {
                  "--glow":
                    "color-mix(in oklch, var(--color-primary) 26%, transparent)",
                } as React.CSSProperties
              }
            />
            <div className="relative z-20 rounded-[2rem] border border-foreground/10 bg-card/70 p-3 shadow-2xl backdrop-blur-md sm:p-6">
              <LazyDemo />
            </div>
          </motion.div>
        </section>

        {/* ---------- final CTA ---------- */}
        <section dir="rtl" className="container cursor-default relative py-24">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={defaultViewport}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className={`${styles.cta} relative z-30 mx-auto max-w-3xl p-10 text-center sm:p-16`}
          >
            <h2 className="relative text-3xl font-black text-foreground sm:text-4xl md:text-5xl">
              <RevealWords text="وزن را با گوش یاد بگیر" />
            </h2>
            <p className="relative mx-auto mt-4 max-w-lg text-muted-foreground">
              از اولین آزمون صوتی شروع کن.
            </p>
            <div className="relative mt-8 flex justify-center">
              <Link
                href="/quiz"
                className="group inline-flex min-h-13 items-center gap-2 rounded-2xl bg-primary px-9 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-95 active:scale-95"
              >
                شروع آزمون صوتی
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
    </MotionConfig>
  );
}
