"use client";

import { ArrowLeft, Check, DoorOpen, FolderSearch, LockKeyhole } from "lucide-react";
import type { JasoosLevel } from "@/lib/jasoos-data";
import styles from "./jasoos.module.css";

export default function SchoolMap({ levels, clearedCount, onEnter }: {
  levels: JasoosLevel[];
  clearedCount: number;
  onEnter: (index: number) => void;
}) {
  return (
    <section className={styles.panel} aria-labelledby="case-map-title">
      <div className={`${styles.panelHeading} ${styles.mapHeading}`}>
        <div>
          <span className={styles.eyebrow}>مسیر مأموریت</span>
          <h2 id="case-map-title">هر در، یک راز تازه</h2>
          <p>پرونده‌ها را یکی‌یکی حل کن؛ درِ بعدی با پیدا کردن جاسوس باز می‌شود.</p>
        </div>
        <span className={styles.mapBadge}><FolderSearch size={28} /></span>
      </div>
      <div className={styles.caseGrid}>
        {levels.map((level, i) => {
          const state = i < clearedCount ? "cleared" : i === clearedCount ? "active" : "locked";
          return (
            <button key={level.id} type="button" className={styles.case} data-state={state}
              disabled={state !== "active"} onClick={() => onEnter(i)}
              aria-current={state === "active" ? "step" : undefined}
              aria-label={`پرونده ${(i + 1).toLocaleString("fa-IR")}، ${level.title}، ${state === "active" ? "آمادهٔ ورود" : state === "cleared" ? "حل‌شده" : "قفل"}`}>
              <span className={styles.caseNumber}><span>پرونده</span><span>{(i + 1).toLocaleString("fa-IR", { minimumIntegerDigits: 2 })}</span></span>
              <span className={styles.door} aria-hidden="true">{state === "cleared" ? <Check size={22} /> : state === "active" ? <DoorOpen size={22} /> : <LockKeyhole size={18} />}</span>
              <span className={styles.caseTitle}>{level.title}</span>
              <span className={styles.caseCategory}>{level.category === "دستوری" ? "نقش دستوری" : "آرایهٔ ادبی"}</span>
              <span className={styles.caseState}>{state === "cleared" ? "حل شد" : state === "active" ? <>ورود به پرونده <ArrowLeft size={12} /></> : "هنوز باز نشده"}</span>
            </button>
          );
        })}
      </div>
      {clearedCount < levels.length && (
        <div className={styles.mapFooter}>
          <p>{clearedCount === 0 ? "اولین سرنخ منتظر توست. آماده‌ای؟" : `${clearedCount.toLocaleString("fa-IR")} پرونده حل شد؛ ادامه بده، کارآگاه!`}</p>
          <button type="button" className={styles.primaryButton} onClick={() => onEnter(clearedCount)}>
            {clearedCount === 0 ? "باز کردن اولین پرونده" : "باز کردن پروندهٔ بعدی"}<ArrowLeft size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
