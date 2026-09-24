"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowLeft, Orbit, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/UI/kit/button";
import { ROLE_HUNT_CONFIG } from "@/lib/role-hunt/config";
import {
  isSoundEnabled,
  setSoundEnabled,
  soundServerSnapshot,
  subscribeSound,
} from "@/lib/role-hunt/audio";
import { TokenBurst } from "./OrbitStage";

const fa = (n: number) => n.toLocaleString("fa-IR");

/**
 * صفحهٔ شروعِ «شکار نقش‌ها».
 *
 * ⚠️ همان الگوی «کیمیای وزن»: متن مستقیم روی صفحه و نه داخلِ کارت، و کنارش
 * خودِ بازی که کار می‌کند. قاعدهٔ بازی را پیش‌نمایش نشان می‌دهد و متن فقط
 * یک جمله است — دانش‌آموز پیش از زدنِ دکمه می‌بیند نقش رو می‌شود و ستارهٔ
 * درست روشن می‌شود.
 *
 * ⚠️ «در حالِ آماده‌سازی» صفحهٔ جدایی ندارد: دکمه اسپینر می‌گیرد و برچسبش
 * عوض نمی‌شود، پس هیچ پرشی بینِ کلیک و شروعِ بازی دیده نمی‌شود.
 */
export default function RoleHuntIntro({
  onStart,
  busy,
  reduced,
  immersive,
  portraitPhone,
}: {
  onStart: () => void;
  busy: boolean;
  reduced: boolean;
  /** پوستهٔ سایت برداشته شده (گوشیِ افقی) — راهِ بازگشت باید همین‌جا باشد. */
  immersive: boolean;
  /** گوشیِ عمودی: بازی بعد از شروع قفلِ چرخش می‌گیرد، پس از الان گفته شود. */
  portraitPhone: boolean;
}) {
  const sound = useSyncExternalStore(subscribeSound, isSoundEnabled, soundServerSnapshot);

  return (
    <section className="rh-intro" aria-labelledby="rh-intro-title">
      {immersive && (
        <Link href="/game" className="rh-intro-back">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.9} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          بازی‌ها
        </Link>
      )}

      <div className="rh-intro-copy">
        <span className="rh-eyebrow"><Orbit size={16} aria-hidden="true" /> بازیِ دقت و دستور</span>
        <h1 id="rh-intro-title" className="rh-intro-title game-display">
          شکار <span>نقش‌ها</span>
        </h1>
        <p className="rh-intro-lede">
          هر واژه، یک نقش. بیت را بخوان و از میان واژه‌های چرخان، پاسخ درست را انتخاب کن.
        </p>
      </div>

      <div className="rh-intro-demo-slot" aria-hidden="true">
        <span className="rh-demo-caption"><span /> یک نگاه به بازی</span>
        <IntroDemo reduced={reduced} />
      </div>

      <div className="rh-intro-controls">
        <dl className="rh-intro-facts">
          <div>
            <dt>بیت</dt>
            <dd className="game-num">{fa(ROLE_HUNT_CONFIG.roundsPerSession)}</dd>
          </div>
          <div>
            <dt>ثانیه برای خواندن</dt>
            <dd className="game-num">{fa(ROLE_HUNT_CONFIG.readSeconds)}</dd>
          </div>
          <div>
            <dt>ثانیه برای هر نقش</dt>
            <dd className="game-num">{fa(ROLE_HUNT_CONFIG.answerSeconds)}</dd>
          </div>
        </dl>

        <div className="rh-intro-actions">
          <Button
            type="button"
            size="lg"
            className="rh-intro-cta game-display"
            disabled={busy}
            aria-busy={busy || undefined}
            onClick={onStart}
          >
            <span className="rh-intro-cta-label" data-busy={busy || undefined}>
              شروع بازی
            </span>
            {!busy && <ArrowLeft size={18} aria-hidden="true" />}
            <span className="rh-intro-cta-spin" data-on={busy || undefined} aria-hidden />
          </Button>

          <button
            type="button"
            className="rh-intro-sound"
            aria-pressed={sound}
            aria-label={sound ? "صدا روشن" : "صدا خاموش"}
            title={sound ? "صدا روشن" : "صدا خاموش"}
            onClick={() => setSoundEnabled(!sound)}
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
        </div>

        {portraitPhone && (
          <p className="rh-intro-note">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <rect x="7" y="3" width="10" height="16" rx="2" />
              <path strokeLinecap="round" d="M4 20.5a9 9 0 0 0 7 1.5" strokeDasharray="2 2.5" />
            </svg>
            بازی در حالت افقی گوشی اجرا می‌شود.
          </p>
        )}
      </div>

      <ol className="rh-intro-guide" aria-label="روش بازی">
        <li><span className="game-num">۱</span><p><b>بیت را بخوان</b><small>چند ثانیه برای کشف رابطهٔ واژه‌ها</small></p></li>
        <li><span className="game-num">۲</span><p><b>نقش را ببین</b><small>هر بار، یک نقش در مرکز مدار</small></p></li>
        <li><span className="game-num">۳</span><p><b>واژه را انتخاب کن</b><small>روی پاسخ درست بزن و ادامه بده</small></p></li>
      </ol>
    </section>
  );
}

/* ═══════════════════════════ پیش‌نمایشِ زنده ═══════════════════════════ */

/**
 * یک بیتِ واقعی از بانکِ بازی، با نقش‌هایی که در «مدار دستور» تأیید شده‌اند.
 *
 * ⚠️ ثابت و نه از سرور: پیش‌نمایش نباید منتظرِ شبکه بماند و نباید با
 * سهمیهٔ مهمان یا ثبتِ پاسخ کاری داشته باشد.
 */
const DEMO_WORDS = ["بگیر", "ای", "جوان،", "دست", "درویش", "پیر"] as const;
const DEMO_ASKS: { role: string; word: number }[] = [
  { role: "مفعول", word: 3 },
  { role: "منادا", word: 2 },
  { role: "مضاف‌الیه", word: 4 },
  { role: "صفت", word: 5 },
];
/** ترتیبِ ستاره‌ها روی مدار — عمداً با ترتیبِ مصراع یکی نیست. */
const DEMO_ORBIT = [3, 0, 5, 2, 4, 1];

/** هر پرسش دو گام دارد: نقش رو می‌شود، بعد ستارهٔ درست روشن می‌شود. */
const STEP_MS = 1500;

function IntroDemo({ reduced }: { reduced: boolean }) {
  const [step, setStep] = useState(1);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setStep((s) => (s + 1) % (DEMO_ASKS.length * 2));
    }, STEP_MS);
    return () => window.clearInterval(id);
  }, []);

  const ask = DEMO_ASKS[Math.floor(step / 2)]!;
  const answered = step % 2 === 1;

  return (
    <div className="rh-demo" data-reduced={reduced || undefined}>
      <div className="rh-demo-ring" />
      <div className="rh-demo-ring rh-demo-ring-inner" />

      <div className="rh-orbit">
        {DEMO_ORBIT.map((word, i) => {
          const share = i / DEMO_ORBIT.length;
          const hit = answered && word === ask.word;
          return (
            <div
              key={word}
              className="rh-orbit-item"
              style={
                {
                  "--rh-delay": `${(-share * 34).toFixed(2)}s`,
                  "--rh-angle": `${share.toFixed(4)}turn`,
                } as React.CSSProperties
              }
            >
              <div className="rh-orbit-arm">
                <div className="rh-upright">
                  <span className="rh-token" data-state={hit ? "correct" : undefined}>
                    <span className="rh-token-text">{DEMO_WORDS[word]}</span>
                    {hit && (
                      <>
                        <TokenBurst />
                        <span className="rh-token-mark">✓</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rh-demo-core">
        <p className="rh-demo-verse game-verse">
          {DEMO_WORDS.map((w, i) => (
            <span key={i}>
              <span className="rh-word" data-answer={answered && i === ask.word ? "correct" : undefined}>
                {w}
              </span>
              {i < DEMO_WORDS.length - 1 ? " " : ""}
            </span>
          ))}
        </p>
        <span className="rh-demo-plate">
          <span className="rh-decoder-label">پیدا کن</span>
          <b key={ask.role} className="rh-demo-role game-display">
            {ask.role}
          </b>
        </span>
      </div>
    </div>
  );
}
