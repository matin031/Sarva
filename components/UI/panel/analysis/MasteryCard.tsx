import StatRing from "../StatRing";
import { AnimatedCircularProgress } from "@/components/UI/kit/animated-circular-progress";
import { fa } from "@/lib/panel/format";
import type { Mastery } from "@/lib/plus/topics";

/**
 * شاخصِ تسلط — تنها عددِ خلاصهٔ صفحه.
 *
 * ⚠️ سه جزئش **همیشه** زیرش می‌آیند و اختیاری نیستند. یک عددِ واحدِ
 * بی‌توضیح، هر تفسیری را برمی‌دارد و دانش‌آموزی که ۶۲ می‌بیند نمی‌داند باید
 * بیشتر تمرین کند یا دقیق‌تر. با سه جزء، خودِ عدد می‌گوید کدام پایه لنگ است.
 *
 * ⚠️ وقتی `ready` نیست عددی نشان داده نمی‌شود. یک «۱۲ از ۱۰۰» برای کسی که
 * تازه ثبت‌نام کرده، نه سنجش است و نه انگیزه.
 */
export default function MasteryCard({ mastery }: { mastery: Mastery }) {
  if (!mastery.ready) {
    return (
      <section data-panel-card="" className="rounded-3xl border border-border/70 p-5 sm:p-6">
        <h2 className="text-base font-bold">شاخص تسلط</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          بعد از چند دور تمرین، شاخص تسلط و اجزایش اینجا ساخته می‌شود.
        </p>
      </section>
    );
  }

  return (
    <section data-panel-card="" className="rounded-3xl border border-border/70 p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-5">
        <StatRing percent={mastery.score} label="تسلط" />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold">{mastery.level}</h2>
          <p className="panel-num mt-1 text-[12.5px] text-muted-foreground">
            شاخص تسلط: {fa(mastery.score)} از ۱۰۰
          </p>
        </div>
      </div>

      <dl className="mt-6 grid gap-4 sm:grid-cols-3">
        {mastery.parts.map((part) => (
          <div key={part.key} className="flex items-center gap-3 rounded-2xl border border-border/60 p-3">
            <AnimatedCircularProgress value={part.percent} label={`${part.label}: ${part.percent} درصد`} className="size-12" />
            <div className="min-w-0">
              <dt className="text-sm font-semibold">{part.label}</dt>
              <dd className="panel-num mt-0.5 text-[11.5px] leading-relaxed text-muted-foreground">{fa(part.hint)}</dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}
