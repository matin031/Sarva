"use client";

import { Fragment } from "react";
import type { GrammarCircuitToken } from "@/lib/grammar-circuit";

/** صورتِ کاملِ سؤال — مهم‌ترین متنِ آموزشیِ صفحه.
 *
 *  عمداً *بیرونِ* ناحیهٔ اسکرولِ افقی است. دانش‌آموز هیچ‌وقت نباید برای
 *  خواندنِ خودِ سؤال صفحه را کنار بکشد؛ اگر جا کم آمد، متن می‌شکند و به خطِ
 *  دوم (و در نهایت سوم) می‌رود. خوانایی بر جا شدنِ تزئینی مقدم است.
 *
 *  بازسازیِ متن دقیقاً `text + separatorAfter` است — نه `join(" ")` — تا
 *  نیم‌فاصله، ویرگول و نقطه همان‌طور بمانند که در دادهٔ معتبر آمده‌اند.
 *
 *  واژه‌هایی که خانه دارند زیرخط می‌خورند. روی گوشیِ ایستاده ردیفِ تحلیل
 *  فقط همین واژه‌ها را نشان می‌دهد، پس این زیرخط پیوندِ آن فهرست با جمله است.
 *  چیزی لو نمی‌رود: خودِ خانه‌ها هم همین را می‌گویند. */
export default function QuestionRegion({
  tokens,
  attribution,
  hostRef,
}: {
  tokens: readonly GrammarCircuitToken[];
  attribution?: string;
  hostRef?: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <section ref={hostRef} className="gc-question" dir="rtl">
      <p className="gc-question-text">
        {tokens.map((t) => (
          <Fragment key={t.id}>
            {t.roleSlot ? <span className="gc-q-target">{t.text}</span> : t.text}
            {t.separatorAfter}
          </Fragment>
        ))}
      </p>
      {attribution && <p className="gc-question-source">{attribution}</p>}
    </section>
  );
}
