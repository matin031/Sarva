"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { motion, MotionConfig } from "motion/react";
import PlanetStop, { type Stop } from "@/components/UI/galaxy/PlanetStop";
import SpaceCable from "@/components/UI/galaxy/SpaceCable";
import {
  RevealGroup,
  RevealItem,
  RevealLine,
  RevealWords,
} from "@/components/UI/aruz/reveal";

const Starfield = dynamic(() => import("@/components/UI/galaxy/Starfield"), {
  ssr: false,
});
// one shared WebGL context — and one scene — for every planet on the page
const GalaxyScene = dynamic(
  () => import("@/components/UI/galaxy/runtime").then((m) => m.GalaxyScene),
  { ssr: false },
);

/** The games hub as a galaxy map: every game is a planet, and one meandering
 *  space cable threads them together from the top of the page down. */
const STOPS: Stop[] = [
  {
    index: "۰۱",
    tag: "نقش‌ها",
    title: "دروغگو کیست؟",
    desc: "یک بیت، چهار نفر،چهار ادعا!کی داره دروغ میگه؟ بکشش",
    steps: [
      "وارد سالن جاسوس‌یاب شو",
      "یک *در* را انتخاب کن",
      "جاسوسِ دروغگو را نشانه بگیر و شلیک کن",
    ],
    href: "/game/jasoos",
    cta: "شروعِ جاسوسِ نقش‌ها",
    accent: "#7b8fd4",
    planet: { color: "#7b8fd4", moon: true, distort: 0.2 },
  },
  {
    index: "۰۲",
    tag: "دستور زبان یا آب خوردن؟",
    title: "فِرز باش",
    desc: "فقط کلماتی که نقش مورد نظر را دارن بُرِش بزن",
    steps: [
      "دسته‌ای از کلماتی که باید برش بزنی را ببین",
      "مثلا قید؛کلمات پر تکرار قید را در خاطر بسپار",
      "حالا از بین کلماتی که به بالا پرتاب می‌شوند؛فقط قید ها رو برش بزن",
    ],
    href: "/game/ninja",
    cta: "شروعِ نینجای دستور",
    accent: "#00b3ad",
    planet: { color: "#00b3ad", ring: true, distort: 0.24 },
  },
  {
    index: "۰۳",
    tag: "یادگیری تاریخ ادبیات",
    title: "کتاب و نویسنده رو جور کن",
    desc: "چند کارت برعکس هستند و باید با تعداد حرکات کمتر کارت ها را برگردانی و کتاب و نویسنده را جفت کنی",
    steps: [
      "آثار و پدیدآورندگان را مرور کن",
      "کارت‌ها برمی‌گردند؛ جای هرکدام را به یاد بسپار",
      "هر اثر را به خالقش جفت کن",
    ],
    href: "/game/pairs",
    cta: "شروعِ جفت‌های ادبی",
    accent: "#d9a441",
    planet: { color: "#d9a441", ring: true, distort: 0.18 },
  },
  {
    index: "۰۴",
    tag: "تقطیعِ عروضی",
    title: "کوتاه یا بلند؟",
    desc: "یک مصراعِ اعراب‌گذاری‌شده را چند ثانیه می‌بینی، بعد پوشانده می‌شود و باید هجاها را یکی‌یکی تقطیع کنی. یک اشتباه، و از اول.",
    steps: [
      "مصراع را با اعرابِ کامل ببین و در ذهنت تقطیعش کن",
      "متن پوشیده می‌شود و واحدها یکی‌یکی می‌آیند",
      "هر پاسخِ درست کمی از مصراع را باز می‌کند؛ یک اشتباه، و از اول",
    ],
    href: "/game/aruz-rapid",
    cta: "شروعِ تقطیعِ سریع",
    accent: "#e0684a",
    planet: { color: "#e0684a", ring: true, distort: 0.22 },
  },
  {
    index: "۰۵",
    tag: "حفظ واژگان با تصویر",
    title: "واژه‌یاب",
    desc: "تصویر را می‌بینی و از میان سه واژه، واژهٔ درست را انتخاب می‌کنی؛ بعد معنیِ کاملش را یاد می‌گیری.",
    steps: [
      "پایه و درسِ موردنظرت را انتخاب کن",
      "تصویر را ببین و واژهٔ مربوط را بزن",
      "معنیِ کامل را بخوان و اشتباه‌ها را در پنل مرور کن",
    ],
    href: "/game/vocab",
    cta: "شروعِ واژه‌یاب",
    accent: "#c79be0",
    planet: { color: "#c79be0", moon: true, distort: 0.26 },
  },
  {
    index: "۰۶",
    tag: "وزن و عروض",
    title: "پلِ وزن",
    desc: "روی پلِ شیشه‌ای، وزنِ هر واژه را تشخیص بده و روی شیشهٔ امن بپر. اشتباه کنی، شیشه زیرِ پایت می‌شکند.",
    steps: [
      "دو وزن روی دو شیشهٔ پیشِ رو می‌بینی",
      "واژه برای لحظه‌ای نشان داده می‌شود؛ وزنش را تشخیص بده",
      "روی شیشهٔ درست بپر — پیش از آنکه زمان تمام شود",
    ],
    href: "/game/aruz-bridge",
    cta: "شروعِ پلِ وزن",
    accent: "#4fd1c5",
    planet: { color: "#4fd1c5", ring: true, distort: 0.22 },
  },
];

export default function GamesGalaxy() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /** three.js already lives in its own async chunk, so it is not part of this
   *  route's first load. But `next/dynamic` starts fetching that chunk the
   *  moment the component renders — during hydration — so ~870 kB of download,
   *  parse and WebGL context setup competes with making the page interactive.
   *  That is the cost felt on first entry.
   *
   *  Holding the mount until the main thread goes idle guarantees the text, the
   *  buttons and hydration are done first; the scene then fades in over its
   *  already-laid-out placeholder boxes, so nothing shifts.
   *
   *  A viewport gate was tried here and deliberately rejected: the launch pad is
   *  88vh, so the first planet is at the fold on every viewport and an
   *  IntersectionObserver fires at scroll 0 anyway — it cannot gate. Idle is the
   *  only lever that actually moves this work off the critical path.
   *  requestIdleCallback is unavailable in Safari, hence the timeout fallback. */
  const [sceneReady, setSceneReady] = useState(false);
  useEffect(() => {
    type IdleWindow = Window & {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout: number },
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const w = window as IdleWindow;
    const show = () => setSceneReady(true);
    if (typeof w.requestIdleCallback === "function") {
      const id = w.requestIdleCallback(show, { timeout: 1500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(show, 300);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <div ref={rootRef} className="relative overflow-hidden bg-background">
        {/* deep-space wash + drifting stars */}
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_20%_10%,color-mix(in_oklch,var(--color-primary)_14%,transparent),transparent_55%),radial-gradient(ellipse_at_80%_60%,color-mix(in_oklch,var(--color-gold)_10%,transparent),transparent_55%)]"
        />
        {sceneReady && (
          <>
            <Starfield reduced={reduced} />
            <GalaxyScene eventSource={rootRef} reduced={reduced} />
          </>
        )}

        <div className="relative">
          <SpaceCable planets={STOPS.length} reduced={reduced} />

          {/* ---------- launch pad ---------- */}
          <section
            dir="rtl"
            className="relative z-20 container flex min-h-[88vh] items-center justify-center py-24 text-center"
          >
            <RevealGroup stagger={0.12} className="relative z-20">
              <RevealItem>
                <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-card px-4 py-1.5 text-sm font-semibold text-primary shadow-lg">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-70" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                  کهکشانِ سروا
                </span>
              </RevealItem>

              <h1 className="text-4xl leading-[1.15] font-black sm:text-5xl md:text-6xl">
                <RevealLine className="text-foreground" delay={0.08}>
                  هر بازی
                </RevealLine>
                <RevealLine className="aruz-gradient-text" delay={0.2}>
                  یک سیاره است
                </RevealLine>
              </h1>

              <RevealItem>
                <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  اینجا خبری از کتاب نیست! فقط با بازی کردن می‌توانی مهارت‌هایی
                  را کسب کنی که نیازمند ساعت‌ها مطالعست:)
                </p>
              </RevealItem>
            </RevealGroup>
          </section>

          {/* ---------- game planets ---------- */}
          {STOPS.map((s, i) => (
            <PlanetStop
              key={s.index}
              stop={s}
              flip={i % 2 === 1}
              reduced={reduced}
            />
          ))}

          {/* ---------- end of the line ---------- */}
          <section dir="rtl" className="relative z-20 container py-24">
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-20 mx-auto max-w-3xl overflow-hidden rounded-[2.5rem] border border-primary/30 bg-card p-10 text-center shadow-2xl sm:p-16"
            >
              <div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full"
                style={{
                  background:
                    "radial-gradient(closest-side, color-mix(in oklch, var(--color-primary) 28%, transparent), transparent)",
                }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full"
                style={{
                  background:
                    "radial-gradient(closest-side, color-mix(in oklch, var(--color-gold) 22%, transparent), transparent)",
                }}
              />
              <h2 className="relative z-20 text-3xl font-black text-foreground sm:text-4xl">
                <RevealWords text="امتیازت را ثبت کن" />
              </h2>
              <p className="relative z-20 mx-auto mt-4 max-w-lg text-muted-foreground">
                برای پیگیری عملکردت در سایت ثبت نام کن
              </p>
              <div className="relative z-20 mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/auth"
                  className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-primary px-8 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:brightness-95 active:scale-95"
                >
                  ساختِ حساب
                </Link>
              </div>
            </motion.div>
          </section>
        </div>
      </div>
    </MotionConfig>
  );
}
