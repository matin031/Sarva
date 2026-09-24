"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Clock3, Infinity as InfinityIcon, SlidersHorizontal } from "lucide-react";
import styles from "./jasoos.module.css";

export type JasoosSettings = { questionCount: number; timeLimitMinutes: number | null };

export default function JasoosSettingsModal({ maxQuestions, onStart, onBack }: {
  maxQuestions: number;
  onStart: (settings: JasoosSettings) => void;
  onBack: () => void;
}) {
  const countOptions = Array.from(new Set([5, 7, 10, maxQuestions].filter((n) => n > 0 && n <= maxQuestions)));
  const [questionCount, setQuestionCount] = useState(countOptions[0] ?? maxQuestions);
  const [timeMode, setTimeMode] = useState<"unlimited" | "custom">("unlimited");
  const [minutes, setMinutes] = useState(5);
  const validMinutes = Number.isFinite(minutes) && minutes > 0 && minutes <= 180;
  const canStart = questionCount > 0 && (timeMode === "unlimited" || validMinutes);

  return (
    <div className={styles.setup}>
      <button type="button" onClick={onBack} className={styles.backButton}><ArrowRight size={16} /> بازگشت به معرفی</button>
      <section className={styles.panel} aria-labelledby="setup-title">
        <div className={styles.panelHeading}>
          <span className={styles.eyebrow}><SlidersHorizontal size={16} /> قبل از شروع</span>
          <h2 id="setup-title">مأموریتت را بچین</h2>
          <p>یک دور کوتاه برای گرم شدن یا یک چالش کامل؟ انتخاب با توست.</p>
        </div>
        <div className={styles.setupFields}>
          <fieldset className={styles.fieldset}>
            <legend>چند پرونده را بررسی می‌کنی؟</legend>
            <div className={styles.options}>
              {countOptions.map((n) => (
                <button key={n} type="button" onClick={() => setQuestionCount(n)} className={styles.option} aria-pressed={questionCount === n}>
                  <strong>{n.toLocaleString("fa-IR")}</strong><span>{n === maxQuestions ? "همهٔ پرونده‌ها" : "پرونده"}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className={styles.fieldset}>
            <legend>با چه ریتمی بازی می‌کنی؟</legend>
            <div className={styles.options}>
              <button type="button" onClick={() => setTimeMode("unlimited")} className={`${styles.option} ${styles.timeOption}`} aria-pressed={timeMode === "unlimited"}>
                <InfinityIcon size={25} /><div><strong>با خیال راحت</strong><span>بدون محدودیت زمان</span></div>
              </button>
              <button type="button" onClick={() => setTimeMode("custom")} className={`${styles.option} ${styles.timeOption}`} aria-pressed={timeMode === "custom"}>
                <Clock3 size={25} /><div><strong>رقابت با زمان</strong><span>یک چالش هیجان‌انگیز</span></div>
              </button>
            </div>
            {timeMode === "custom" && (
              <div className={styles.timeInput}>
                <label htmlFor="jasoos-minutes">زمان کل مأموریت</label>
                <input id="jasoos-minutes" type="number" min={1} max={180} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}
                  aria-invalid={!validMinutes} aria-describedby={!validMinutes ? "jasoos-time-error" : undefined} />
                <span>دقیقه</span>
              </div>
            )}
            {timeMode === "custom" && !validMinutes && <p id="jasoos-time-error" className={styles.error}>یک عدد بین ۱ تا ۱۸۰ وارد کن.</p>}
          </fieldset>
        </div>
        <div className={styles.setupFooter}>
          <p>{questionCount.toLocaleString("fa-IR")} پرونده · ۳ جان · {timeMode === "unlimited" ? "بدون عجله" : "زمان‌دار"}</p>
          <button type="button" disabled={!canStart} className={styles.primaryButton}
            onClick={() => canStart && onStart({ questionCount, timeLimitMinutes: timeMode === "custom" ? minutes : null })}>
            شروع مأموریت <ArrowLeft size={18} />
          </button>
        </div>
      </section>
    </div>
  );
}
