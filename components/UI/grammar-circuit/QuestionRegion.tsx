"use client";

import type { GrammarCircuitToken } from "@/lib/grammar-circuit";

/** صورتِ کاملِ سؤال — مهم‌ترین متنِ آموزشیِ صفحه.
 *
 *  عمداً *بیرونِ* ناحیهٔ اسکرولِ افقی است. دانش‌آموز هیچ‌وقت نباید برای
 *  خواندنِ خودِ سؤال صفحه را کنار بکشد؛ اگر جا کم آمد، متن می‌شکند و به خطِ
 *  دوم (و در نهایت سوم) می‌رود. خوانایی بر جا شدنِ تزئینی مقدم است.
 *
 *  بازسازیِ متن دقیقاً `text + separatorAfter` است — نه `join(" ")` — تا
 *  نیم‌فاصله، ویرگول و نقطه همان‌طور بمانند که در دادهٔ معتبر آمده‌اند. */
export default function QuestionRegion({
  tokens,
  attribution,
  hostRef,
}: {
  tokens: readonly GrammarCircuitToken[];
  attribution?: string;
  hostRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const text = tokens.map((t) => t.text + t.separatorAfter).join("");
  return (
    <section ref={hostRef} className="gc-question" dir="rtl">
      <p className="gc-question-text">{text}</p>
      {attribution && <p className="gc-question-source">{attribution}</p>}
    </section>
  );
}
