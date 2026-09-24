"use client";

import { useRef, useState } from "react";
import { ArrowLeft, BookOpen, CircleCheck, CircleX, Quote, ScanSearch } from "lucide-react";
import type { JasoosLevel, Suspect as SuspectType } from "@/lib/jasoos-data";
import Suspect, { type SuspectVisualState } from "./Suspect";
import { PointerProvider } from "./pointer";
import styles from "./jasoos.module.css";

export default function ShootingScene({ level, onResult }: {
  level: JasoosLevel;
  onResult: (correct: boolean, spy: SuspectType, chosen: SuspectType) => void;
}) {
  const [shotIndex, setShotIndex] = useState<number | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const dingRef = useRef<HTMLAudioElement | null>(null);
  const continueRef = useRef<HTMLButtonElement | null>(null);
  const spy = level.suspects.find((s) => s.isSpy)!;
  const chosen = shotIndex !== null ? level.suspects[shotIndex] : spy;

  const handleShoot = (suspect: SuspectType, index: number) => {
    if (result) return;
    setShotIndex(index);
    setResult(suspect.isSpy ? "correct" : "wrong");
    if (suspect.isSpy && dingRef.current) {
      dingRef.current.currentTime = 0;
      dingRef.current.play().catch(() => {});
    }
    // Move focus past the choices after they become disabled.
    requestAnimationFrame(() => continueRef.current?.focus({ preventScroll: true }));
  };

  const stateFor = (index: number): SuspectVisualState => {
    if (!result) return "idle";
    if (index !== shotIndex) return "dimmed";
    return result === "correct" ? "shot-correct" : "shot-wrong";
  };

  return (
    <PointerProvider>
      <section className={`${styles.panel} ${styles.scene}`} aria-label="بررسی پرونده" data-result={result ?? "pending"}>
        <div className={styles.sceneTop}>
          <span>{level.title}</span>
          <span className={styles.category}><BookOpen size={14} />{level.category === "دستوری" ? "نقش دستوری" : "آرایهٔ ادبی"}</span>
        </div>
        <div className={styles.verse}>
          <Quote aria-hidden="true" />
          {level.contentType === "poem" ? <><p>{level.verseLines[0]}</p><p>{level.verseLines[1]}</p></> : <p className={styles.prose}>{level.verseLines.join(" ")}</p>}
        </div>
        <div className={styles.prompt}>
          <div><h2>کدام نقش در این {level.contentType === "poem" ? "بیت" : "جمله"} وجود ندارد؟</h2><p>سه نفر راست می‌گویند. برای انتخاب جاسوس، روی خود کاراکتر بزن.</p></div>
          <ScanSearch size={27} aria-hidden="true" />
        </div>
        <div className={styles.suspects}>
          {level.suspects.map((s, i) => <Suspect key={i} index={i} role={s.role} state={stateFor(i)} wordInVerse={s.wordInVerse} isSpy={s.isSpy} gloat={result === "wrong"} onShoot={() => handleShoot(s, i)} />)}
        </div>
        {result && (
          <div className={styles.feedback} data-correct={result === "correct"}>
            {result === "correct" ? <CircleCheck size={25} /> : <CircleX size={25} />}
            <div className={styles.feedbackCopy}>
              <div role="status">
                <h3>{result === "correct" ? "آفرین! جاسوس را پیدا کردی." : "این مظنون بی‌گناه بود!"}</h3>
                <p>{result === "correct" ? spy.evidence : `جاسوس واقعی «${spy.role}» بود. ${spy.evidence}`}</p>
              </div>
              <button ref={continueRef} type="button" className={styles.primaryButton} onClick={() => onResult(result === "correct", spy, chosen)}>
                {result === "correct" ? "ادامهٔ مأموریت" : "ادامه"}<ArrowLeft size={17} />
              </button>
            </div>
          </div>
        )}
        <audio ref={dingRef} src="/currectsound.mp3" preload="auto" />
      </section>
    </PointerProvider>
  );
}
