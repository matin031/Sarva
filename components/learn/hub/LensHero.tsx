"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { Glasses, Sparkles } from "lucide-react";
import s from "./hub.module.css";

/** «یه جمله، دو تا عینک»: یک جمله که با عینکِ دستور نقشِ هر کلمه را نشان
 *  می‌دهد و با عینکِ آرایه همان کلمه‌ها چهار رکنِ تشبیه می‌شوند. فرقِ دو
 *  قفسهٔ صفحه را پیش از هر توضیحی نشان می‌دهد (یاد دادن با انجام دادن).
 *
 *  تحلیل: «دلم» نهاد (گروهِ نهادی)، «مثلِ» حرف اضافه، «دریا» متمم، «طوفانی»
 *  مسند، «است» فعلِ اسنادی؛ و در لایهٔ ادبی: دل مشبه، مثلِ ادات، دریا مشبه‌به،
 *  طوفانی وجه‌شبه. */

type Lens = "grammar" | "figures";
const WORDS: { text: string; grammar: string; figures: string | null }[] = [
  { text: "دلم", grammar: "نهاد", figures: "مشبه" },
  { text: "مثلِ", grammar: "حرف اضافه", figures: "ادات" },
  { text: "دریا", grammar: "متمم", figures: "مشبه‌به" },
  { text: "طوفانی", grammar: "مسند", figures: "وجه‌شبه" },
  { text: "است", grammar: "فعل", figures: null },
];
const CAPTION: Record<Lens, string> = {
  grammar: "عینکِ دستور: هر کلمه توی جمله چه‌کاره‌ست؟",
  figures: "عینکِ آرایه: همون کلمه‌ها، چهار رکنِ یه تشبیه.",
};

export default function LensHero() {
  const reduced = useReducedMotion() ?? false;
  const [lens, setLens] = useState<Lens>("grammar");
  const [auto, setAuto] = useState(true);

  // تا وقتی شاگرد خودش دست نزده، عینک‌ها خودشان عوض می‌شوند.
  useEffect(() => {
    if (!auto || reduced) return;
    const id = setInterval(() => setLens(l => l === "grammar" ? "figures" : "grammar"), 3600);
    return () => clearInterval(id);
  }, [auto, reduced]);

  const pick = (next: Lens) => { setAuto(false); setLens(next); };

  return <div className={s.lens} data-lens={lens} onPointerEnter={() => setAuto(false)}>
    <div className={s.lensSwitch} role="group" aria-label="عینک">
      <button type="button" aria-pressed={lens === "grammar"} onClick={() => pick("grammar")}><Glasses size={15} aria-hidden /> عینکِ دستور</button>
      <button type="button" aria-pressed={lens === "figures"} onClick={() => pick("figures")}><Sparkles size={15} aria-hidden /> عینکِ آرایه</button>
      <motion.span className={s.lensThumb} layout transition={{ type: "spring", stiffness: 420, damping: 34 }} data-side={lens} aria-hidden />
    </div>

    <p className={s.lensLine} aria-label="دلم مثلِ دریا طوفانی است">
      {WORDS.map((word, i) => {
        const label = word[lens];
        return <span key={word.text} className={s.lensWord} data-role={label ? i : "none"} aria-hidden>
          <span className={s.lensTag}>
            <AnimatePresence mode="popLayout" initial={false}>
              {label && <motion.span key={`${lens}-${i}`} className={s.lensChip}
                initial={reduced ? false : { opacity: 0, y: 10, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduced ? undefined : { opacity: 0, y: -10, filter: "blur(6px)" }}
                transition={{ duration: .35, delay: reduced ? 0 : i * .06 }}>{label}</motion.span>}
            </AnimatePresence>
          </span>
          <span className={s.lensText}>{word.text}</span>
        </span>;
      })}
    </p>

    <AnimatePresence mode="wait" initial={false}>
      <motion.p key={lens} className={s.lensCaption} initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reduced ? undefined : { opacity: 0 }} transition={{ duration: .25 }}>
        {CAPTION[lens]}
      </motion.p>
    </AnimatePresence>
  </div>;
}
