"use client";

import Link from "next/link";
import { ArrowUpLeft, RotateCcw } from "lucide-react";
import type { RoleHuntSummary } from "@/lib/role-hunt/round";

const fa = (n: number) => n.toLocaleString("fa-IR");

/**
 * پایانِ نشست.
 *
 * ⚠️ این صفحه عمداً *تحلیل* نیست و ادعایش را هم نمی‌کند. چند دور برای
 * نتیجه‌گیری دربارهٔ یک مهارت کم است؛ چیزی که اینجا نوشته می‌شود گزارشِ
 * همین نشست است و نه حکم. تحلیلِ واقعی — روی همهٔ بازی‌ها و همهٔ تاریخچه —
 * در «برنامهٔ من» است و دکمهٔ پایین دقیقاً به همان‌جا می‌برد.
 *
 * ⚠️ و متن از *عملکرد* می‌آید و نه یک جملهٔ ثابت. «عالی بود!» بعد از یک
 * نشستِ ۳۰ درصدی، هم دروغ است و هم بی‌اثر: دانش‌آموز می‌فهمد که این جمله
 * برای همه نوشته شده و دیگر هیچ‌کدام از جمله‌های این صفحه را جدی نمی‌گیرد.
 */

/** لحنِ صفحه، از روی دقت. */
function tone(accuracy: number, total: number) {
  if (total === 0) {
    return {
      title: "نشست تمام شد",
      line: "این بار پاسخی ثبت نشد.",
      band: "neutral" as const,
    };
  }
  const pct = accuracy * 100;
  if (pct >= 90) {
    return {
      title: "بی‌نقص بود",
      line: "نقش‌ها را سریع و درست تشخیص می‌دهی.",
      band: "high" as const,
    };
  }
  if (pct >= 70) {
    return {
      title: "خوب پیش رفتی",
      line: "بیشتر نقش‌ها را درست زدی؛ چند مورد مانده که با کمی تمرین جا می‌افتد.",
      band: "high" as const,
    };
  }
  if (pct >= 45) {
    return {
      title: "در مسیر درستی",
      line: "پایه را داری، ولی هنوز روی بعضی نقش‌ها مکث می‌کنی. همان‌ها را هدف بگیر.",
      band: "mid" as const,
    };
  }
  return {
    title: "این نقش‌ها تمرین می‌خواهند",
    line: "نقش‌هایی را که اشتباه کردی دوباره تمرین کن.",
    band: "low" as const,
  };
}

export default function RoleHuntResults({
  summary,
  onRestart,
}: {
  summary: RoleHuntSummary;
  onRestart: () => void;
}) {
  const accuracy = Math.round(summary.accuracy * 100);
  const t = tone(summary.accuracy, summary.total);

  /* ⚠️ نقش‌هایی که *همه* را درست زده هم نشان داده می‌شوند و نه فقط
     اشتباه‌ها. صفحه‌ای که تنها شکست‌ها را فهرست می‌کند، بعد از یک نشستِ خوب
     هم حسِ شکست می‌دهد. */
  const roles = summary.roleBreakdown ?? [];

  return (
    <div dir="rtl" className="rh-result">
      <span className="rh-eyebrow">شکار نقش‌ها · نتیجهٔ این دست</span>
      {/* ── حلقهٔ دقت ───────────────────────────────────────────── */}
      <div className="rh-result-hero">
        <div className="rh-dial" data-band={t.band}>
          <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
            <circle className="rh-dial-track" cx="60" cy="60" r="52" pathLength="1" />
            <circle
              className="rh-dial-fill"
              cx="60"
              cy="60"
              r="52"
              pathLength="1"
              style={{ "--rh-pct": summary.accuracy } as React.CSSProperties}
            />
          </svg>
          <div className="rh-dial-center">
            <span className="game-num rh-dial-num">{fa(accuracy)}</span>
            <span className="rh-dial-unit">درصد دقت</span>
          </div>
        </div>

        <div className="rh-result-copy">
          <h2 className="game-display rh-result-title">{t.title}</h2>
          <p className="rh-result-line">{t.line}</p>
          <p className="rh-result-sub game-num">
            {fa(summary.correct)} از {fa(summary.total)} نقش
            {summary.bestStreak > 1 && <> · بهترین زنجیره {fa(summary.bestStreak)}</>}
          </p>
        </div>
      </div>

      {/* ── نوارِ هر نقش ─────────────────────────────────────────── */}
      {roles.length > 0 && (
        <section className="rh-result-roles">
          <div className="rh-result-section-head"><h3 className="game-title rh-result-h3">نقش به نقش</h3><span>پاسخ‌های درست</span></div>
          <ul>
            {roles.map((r) => {
              const pct = r.total === 0 ? 0 : Math.round((r.correct / r.total) * 100);
              return (
                <li key={r.roleKey}>
                  <div className="rh-bar-head">
                    <span className="rh-bar-name">{r.roleLabel}</span>
                    <span className="game-num rh-bar-num">
                      {fa(r.correct)}/{fa(r.total)}
                    </span>
                  </div>
                  <div className="rh-bar">
                    <span
                      className="rh-bar-fill"
                      data-band={pct >= 70 ? "high" : pct >= 40 ? "mid" : "low"}
                      style={{ "--rh-w": `${pct}%` } as React.CSSProperties}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="rh-result-cta">
        <button type="button" onClick={onRestart} className="rh-btn rh-btn-primary game-display">
          <RotateCcw size={16} aria-hidden="true" />
          یک دست دیگر
        </button>
        <Link href="/panel/analysis" className="rh-btn rh-btn-ghost">
          دیدن تحلیل من
          <ArrowUpLeft size={16} aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
