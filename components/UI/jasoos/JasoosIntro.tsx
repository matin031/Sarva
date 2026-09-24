"use client";

import { ArrowLeft, BookOpen, Fingerprint, Heart, ScanSearch, ShieldCheck } from "lucide-react";
import HandsUpFigure from "./HandsUpFigure";
import styles from "./jasoos.module.css";

export default function JasoosIntro({ onStart }: { onStart: () => void }) {
  return (
    <section className={styles.intro} aria-labelledby="jasoos-intro-title">
      <div className={styles.introCopy}>
        <span className={styles.eyebrow}><Fingerprint size={17} /> یک مأموریت ادبی در سروا</span>
        <h2 id="jasoos-intro-title" className="game-display">جاسوسِ <span>نقش‌ها</span></h2>
        <p className={styles.tagline}>همه یک نقش دارند.<br />یکی راست نمی‌گوید!</p>
        <p className={styles.description}>با دقت بخوان، ادعاها را کنار هم بگذار و نقشی را پیدا کن که در متن وجود ندارد.</p>
        <div className={styles.introMeta}>
          <span><Heart size={16} /> ۳ فرصت اشتباه</span>
          <span><BookOpen size={16} /> دستور و آرایه</span>
        </div>
        <button type="button" className={styles.primaryButton} onClick={onStart}>آماده‌ام، بریم! <ArrowLeft size={19} /></button>
      </div>

      <div className={styles.dossier} aria-hidden="true">
        <div className={styles.dossierTop}><span>پروندهٔ محرمانه</span><Fingerprint size={28} /></div>
        <div className={styles.dossierHeading}>چهار مظنون، <strong>یک جاسوس</strong></div>
        <div className={styles.previewLineup}>
          {["نهاد", "صفت", "مفعول", "متمم"].map((role, index) => (
            <div className={styles.previewSuspect} key={role}><div><HandsUpFigure outfit={index} /></div><span>{role}</span></div>
          ))}
        </div>
        <div className={styles.dossierNote}><ScanSearch size={24} /><span>سرنخ، لابه‌لای کلمه‌هاست.</span></div>
        <span className={styles.stamp}>در دست بررسی</span>
      </div>

      <ol className={styles.howTo}>
        <li><BookOpen size={21} /><div><strong>۱. متن را بخوان</strong><span>شعر یا جمله، سرنخ توست.</span></div></li>
        <li><ScanSearch size={21} /><div><strong>۲. جاسوس را پیدا کن</strong><span>کدام نقش در متن نیست؟</span></div></li>
        <li><ShieldCheck size={21} /><div><strong>۳. پرونده را ببند</strong><span>پاسخ و دلیلش را ببین و پیش برو.</span></div></li>
      </ol>
    </section>
  );
}
