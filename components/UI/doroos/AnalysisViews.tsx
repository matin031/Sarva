"use client";

import { useState } from "react";
import Link from "next/link";
import { Lock, RefreshCw } from "lucide-react";
import type { AnalysisFlags, WordRole } from "@/lib/doroos/types";
import { useLessonAnalysis } from "@/lib/doroos/use-analysis";
import BeytSyntaxMap from "@/components/UI/doroos/BeytSyntaxMap";
import { AiSpark } from "@/components/UI/doroos/BeytAi";
import { usePlusGate, type PlusGate } from "@/lib/plus/use-plus-gate";
import { refreshCurrentUser } from "@/lib/auth/use-current-user";
import styles from "./beyt-ai.module.css";

/**
 * نوارِ نماهای یک واحدِ تحلیل — بیت یا بند — و دروازهٔ سروا پلاسِ پشتِ آن.
 *
 * ⚠️ چرا مشترک و نه دو نسخه: همین نوار هم در `BeytCard` (شعر) است و هم در
 * `PassageCard` (نثر). تا امروز دو کپیِ جدا بودند و وقتی قفلِ پلاس فقط به
 * یکی اضافه شد، کلِ دروازه بی‌اثر می‌شد — دانش‌آموز همان تحلیلِ پولی را در
 * هر درسِ نثری رایگان می‌دید. یک قفل که در یکی از دو در گذاشته شود، قفل
 * نیست. حالا هر دو از همین‌جا می‌آیند و جا ماندن ممکن نیست.
 */

/** چهار نمایی که می‌توان روی متن کشید. «ai» همان «نقش دستوری» است با
 *  منبعِ ماشینی؛ «plain» تنها نمای رایگان است. */
export type ViewId = "syntax" | "devices" | "ai" | "plain";

export type AnalysisView = {
  id: ViewId;
  label: string;
  roles?: WordRole[];
  plus: boolean;
  ai?: boolean;
};

export function useAnalysisViews({
  grade,
  lesson,
  n,
  flags,
  aiAvailable,
  /** نثرِ ساده نمودار ندارد؛ آنجا نوار اصلاً ساخته نمی‌شود. */
  enabled = true,
}: {
  grade: string;
  lesson: number;
  n: number;
  /** کدام نماها برای این واحد وجود دارند — از `toPublicLesson`. */
  flags?: AnalysisFlags;
  aiAvailable: boolean;
  enabled?: boolean;
}) {
  const gate = usePlusGate();

  /* ⚠️ خودِ نقش‌ها دیگر در prop نیستند. صفحهٔ درس فقط `flags` را می‌فرستد و
     داده از `/api/v1/doroos/analysis` می‌آید — آن هم فقط وقتی دسترسی
     قطعی شده. پیش از این، کلِ تحلیلِ پولی در HTML بود و «+» فقط پنهانش
     می‌کرد. */
  const hasPaid = !!flags && (flags.syntax || flags.devices);
  const analysis = useLessonAnalysis({
    grade,
    lesson,
    source: "base",
    enabled: enabled && hasPaid && gate.unlocked,
  });
  const roles = analysis.units?.[n];

  const views: AnalysisView[] = !enabled
    ? []
    : [
        ...(flags?.syntax
          ? [{ id: "syntax" as const, label: "نقش دستوری", roles: roles?.syntax, plus: true }]
          : []),
        ...(flags?.devices
          ? [{ id: "devices" as const, label: "آرایه‌ها", roles: roles?.devices, plus: true }]
          : []),
        /* هوشواره کنارِ همان دو می‌نشیند و نه آخرِ صف: این هم یک نمای «نقش
           دستوری» است، فقط با منبعی دیگر. «ساده» آخر می‌ماند چون راهِ خروج
           است، نه یک تحلیلِ دیگر. */
        ...(aiAvailable
          ? [{ id: "ai" as const, label: "هوشواره", plus: true, ai: true }]
          : []),
        { id: "plain" as const, label: "ساده", plus: false },
      ];

  /* ⚠️ نما **مشتق** می‌شود و در state نمی‌نشیند مگر وقتی کاربر خودش انتخاب
     کند. نسخهٔ اول یک `useState("plain")` داشت و یک افکت که بعد از رسیدنِ
     پاسخِ /me آن را عوض می‌کرد؛ هم ESLint درست اعتراض کرد
     (`set-state-in-effect`) و هم یک رندرِ اضافهٔ آبشاری می‌ساخت.

     ⚠️ و پیش‌فرضِ بسته («ساده») عمدی است. سه نمای دیگر پولی‌اند و تا نرسیدنِ
     پاسخِ /me *نمی‌دانیم* کاربر اشتراک دارد یا نه. بسته شروع می‌کنیم و
     به‌محضِ تأیید باز می‌شود. */
  const [picked, setPicked] = useState<ViewId | null>(null);
  const firstPlusView = views.find((v) => v.plus && !v.ai)?.id;
  const view: ViewId = picked ?? (gate.unlocked && firstPlusView ? firstPlusView : "plain");

  const current = views.find((v) => v.id === view);

  /* ⚠️ قفل از دو جا می‌آید و هر دو لازم‌اند:
       • `/me` می‌گوید اشتراک ندارد → قفل، بدونِ هیچ درخواستی به API؛
       • `/me` گفته دارد ولی API گفته ۴۰۳/۵۰۳ (مثلاً اشتراک همین حالا تمام
         شده) → باز هم قفل. حرفِ آخر را سرور می‌زند، نه کلاینت. */
  const serverSaysNo = analysis.status === "forbidden" || analysis.status === "unavailable";
  const locked = !!current?.plus && ((!gate.unlocked && gate.ready) || serverSaysNo);
  const lockedUnknown = gate.unknown || analysis.status === "unavailable";

  return {
    gate,
    views,
    view,
    current,
    locked,
    lockedUnknown,
    /** «در حالِ آوردنِ نقش‌ها» — نمودار هنوز نیامده. */
    rolesLoading: !!current?.plus && !current.ai && analysis.status === "loading",
    rolesFailed: !!current?.plus && !current.ai && analysis.status === "error",
    pick: setPicked,
  };
}

/* ── نوار ─────────────────────────────────────────────────────────────── */

export function ViewBar({
  views,
  view,
  gate,
  onPick,
  busy = false,
}: {
  views: AnalysisView[];
  view: ViewId;
  gate: PlusGate;
  onPick: (id: ViewId) => void;
  /** نمای هوشواره در حالِ بارگذاری — دکمه‌اش موقتاً قفل می‌شود. */
  busy?: boolean;
}) {
  if (!views.length) return null;

  return (
    <div className={`${styles.aiTint} ${styles.bar}`}>
      {views.map((v) => {
        const on = view === v.id;
        /* ⚠️ سه حالتِ جدا و نه دو تا:
             • قفل  → نشانِ «+» کنارِ برچسب
             • باز  → حلقهٔ طلایی (و روی نمای فعال، چرخان) — ولی فقط برای
                      مشترکِ واقعی؛ وقتی پلاس خاموش است همه‌چیز باز است و
                      جشنی در کار نیست.
             • در حالِ دانستن → هیچ‌کدام؛ دکمه نباید بپرد. */
        const mark = v.plus && gate.gated;
        const ring = v.plus && gate.subscriber;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onPick(v.id)}
            aria-pressed={on}
            data-active={on}
            disabled={v.ai === true && on && busy}
            className={[styles.viewBtn, v.ai ? styles.aiBtn : "", ring ? styles.plusOpen : ""]
              .filter(Boolean)
              .join(" ")}
          >
            {v.ai ? <AiSpark size={12} /> : null}
            {v.label}
            {mark ? (
              /* ⚠️ نشان متن دارد («+») و نه فقط رنگ — همان قاعدهٔ
                 `.plus-badge`. aria-label جمله را کامل می‌گوید، چون یک «+»
                 تنها هیچ وضعیتی را نمی‌رساند. */
              <span
                className={styles.plusMark}
                aria-label="مخصوص سروا پلاس"
                title="مخصوص سروا پلاس"
              >
                +
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ── نمودار ───────────────────────────────────────────────────────────── */

/** ⚠️ `min-w-[30rem]` تنها چیزی است که نگذاشته نمودار روی گوشی بشکند، و این
 *  قاب در چهار جا رندر می‌شود. تکرارش یعنی روزی یکی از آن چهار یادش می‌رفت. */
export function DiagramScroller({
  lines,
  roles,
  viewKey,
}: {
  lines: string[];
  roles: WordRole[];
  viewKey: string;
}) {
  return (
    /* سیم‌ها به عرضِ واقعیِ متن نیاز دارند؛ روی صفحهٔ باریک آن عرض از کارت
       بیشتر است، پس نمودار اسکرول می‌شود و دوباره نمی‌چیند — وگرنه پیکان‌ها
       دیگر به واژه‌ای که نشانه رفته‌اند نمی‌رسند. */
    <div className="mt-8 overflow-x-auto pb-1">
      <div className="min-w-[30rem]">
        <BeytSyntaxMap key={viewKey} lines={lines} roles={roles} />
      </div>
    </div>
  );
}

/* ── دروازه ───────────────────────────────────────────────────────────── */

/**
 * جای نمودار، وقتی نما پولی است و کاربر اشتراک ندارد.
 *
 * ⚠️ دو لحن و نه یکی. `unknown` یعنی *نمی‌دانیم* — دیتابیس جواب نداده. آن
 * حالت هرگز نباید «اشتراک نداری، بخر» ترجمه شود: این جمله به کسی که دیروز
 * پول داده می‌گوید پولش را دور ریخته، و بدتر، ممکن است دوباره بخرد.
 */
export function PlusGatePanel({ unknown }: { unknown: boolean }) {
  return (
    <div className={`${styles.aiTint} ${styles.gate}`}>
      <span className={styles.gateIcon} aria-hidden>
        {unknown ? (
          <RefreshCw size={18} strokeWidth={1.8} />
        ) : (
          <Lock size={18} strokeWidth={1.8} />
        )}
      </span>

      {unknown ? (
        <>
          <p className={styles.gateTitle}>وضعیت اشتراک بررسی نشد</p>
          <button type="button" onClick={() => refreshCurrentUser()} className={styles.gateRetry}>
            تلاش دوباره
          </button>
        </>
      ) : (
        <>
          <p className={styles.gateTitle}>مخصوص مشترکان سروا پلاس</p>
          <p className={styles.gateBody}>
            نقش دستوری، آرایه‌ها و هوشواره با اشتراک پلاس باز می‌شوند.
          </p>
          <Link href="/plus" className={styles.gateCta}>
            خرید اشتراک
          </Link>
        </>
      )}
    </div>
  );
}
