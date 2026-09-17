import { GraduationCap, MessageSquareQuote } from "lucide-react";
import { Card, CardContent } from "@/components/UI/kit/card";
import { FEEDBACK_CATEGORY_LABEL, type FeedbackCategory } from "@/lib/teacher/feedback-rules";
import type { FeedbackEntry } from "@/lib/teacher/feedback";
import { fa, jalali, relativeDay } from "@/lib/panel/format";
import { cn } from "@/lib/cn";

/**
 * بازخوردهای دبیران، از دیدِ دانش‌آموز.
 *
 * =============================================================================
 * ⚠️ چرا از یک `<ul>`ِ ساده بیرون کشیده شد
 * =============================================================================
 *
 * پیش از این همهٔ بازخوردها یک فهرستِ تخت با خطِ جداکننده بودند و سرتیترِ
 * هر ردیف چهار چیزِ بی‌ربط را در یک خط کنارِ هم می‌گذاشت: نامِ دبیر،
 * برچسبِ دسته، نامِ کلاس، و تاریخ. روی موبایل همان خط می‌شکست و آن‌وقت
 * تاریخِ یک بازخورد دقیقاً زیرِ نامِ دبیرِ بعدی می‌نشست.
 *
 * نتیجه‌اش این بود که خواندنِ «چه کسی، دربارهٔ چه چیزی، کِی» — یعنی تمامِ
 * چیزی که این کارت باید بگوید — به دقت نیاز داشت.
 *
 * حالا سه چیز تفکیک شده است:
 *
 *   • **چه کسی** — نامِ دبیر با حرفِ اولش در یک دایره، در ردیفِ خودش.
 *   • **دربارهٔ چه چیزی** — دستهٔ بازخورد، با رنگِ مخصوصِ خودش.
 *   • **چه گفته** — متن در یک بلوکِ نقل‌قول با نوارِ رنگیِ کناری.
 *
 * ⚠️ و گروه‌بندی بر اساسِ **کلاس** انجام می‌شود و نه دبیر. دانش‌آموز
 * می‌تواند دو کلاس از یک دبیر داشته باشد (مثلاً ادبیات و نگارش)، و
 * بازخوردِ کلاسِ نگارش زیرِ عنوانِ ادبیات گمراه‌کننده است. اگر فقط یک کلاس
 * در کار باشد، عنوانِ گروه اصلاً نوشته نمی‌شود — یک تیترِ تکراری برای یک
 * گروه، فقط نویز است.
 */

/**
 * ⚠️ رنگ به ازای هر دسته، و نه یک خاکستریِ مشترک.
 *
 * دانش‌آموزی که ده بازخورد دارد، با یک نگاه باید ببیند کدام‌ها دربارهٔ
 * عروض‌اند. رنگ تنها نشانه نیست — برچسبِ متنی همیشه کنارش هست — ولی چیزی
 * است که پیش از خواندن کار می‌کند.
 *
 * ⚠️ چرا `chart-1…5` و نه رنگ‌های دلخواه: این سایت هفت پالت دارد و کاربر
 * عوضشان می‌کند. `--chart-*` تنها مجموعه‌ای است که در *هر* پالت تعریف شده
 * و عمداً برای تفکیکِ دسته‌ای ساخته شده. یک رنگِ هاردکد در یکی از پالت‌ها
 * بیگانه می‌شد، و `--panel-lilac` و همتاهایش هم به‌درد نمی‌خورند چون
 * متغیرهای یک CSS Module اند و Tailwind کلاسی برایشان نمی‌شناسد.
 *
 * ⚠️⚠️ و متنِ چیپ همیشه `text-foreground` است و نه رنگِ دسته.
 *
 * `npm run check:contrast` صریح می‌گوید `--lapis` در تمِ تیره به‌عنوانِ متن
 * ۲٫۶۷:۱ است و `--primary` هم ۴٫۰۴:۱ — هر دو زیرِ حدِ WCAG. رنگ فقط
 * پس‌زمینهٔ کم‌رمق و نوارِ کناری را می‌گیرد، جایی که کنتراست معنا ندارد.
 *
 * ⚠️ کلاس‌ها کامل نوشته می‌شوند و ساخته نمی‌شوند (`bg-${x}/10` کار
 * نمی‌کند): Tailwind کلاس‌ها را با اسکنِ متنِ سورس پیدا می‌کند و یک نامِ
 * ساخته‌شده در زمانِ اجرا هیچ‌وقت در CSS خروجی نمی‌نشیند.
 */
const CATEGORY_STYLE: Record<FeedbackCategory, { chip: string; bar: string }> = {
  general: { chip: "bg-foreground/8", bar: "bg-foreground/30" },
  aruz: { chip: "bg-chart-1/18", bar: "bg-chart-1" },
  grammar: { chip: "bg-chart-2/18", bar: "bg-chart-2" },
  game: { chip: "bg-chart-3/18", bar: "bg-chart-3" },
  exam: { chip: "bg-chart-4/18", bar: "bg-chart-4" },
  activity: { chip: "bg-chart-5/18", bar: "bg-chart-5" },
};

/** حرفِ اولِ نام، برای دایرهٔ کنارِ نامِ دبیر. */
function initial(name: string | null): string {
  const trimmed = (name ?? "").trim();
  return trimmed ? trimmed[0] : "د";
}

export default function StudentFeedbackList({ feedback }: { feedback: FeedbackEntry[] }) {
  if (feedback.length === 0) return null;

  /* ⚠️ ترتیبِ گروه‌ها از ترتیبِ خودِ فهرست می‌آید (تازه‌ترین اول) و نه از
     الفبا. کلاسی که همین امروز بازخورد گرفته باید بالا باشد. */
  const byClass = new Map<string, FeedbackEntry[]>();
  for (const entry of feedback) {
    const bucket = byClass.get(entry.className);
    if (bucket) bucket.push(entry);
    else byClass.set(entry.className, [entry]);
  }
  const groups = [...byClass.entries()];
  const showGroupTitles = groups.length > 1;

  return (
    /* ⚠️ `id="feedback"` همان لنگری است که لینکِ اعلان به آن می‌آید
       (`/panel/classes#feedback`). عوض کردنش یعنی هر اعلانِ قدیمی به بالای
       صفحه می‌رسد و کاربر خودش باید دنبالش بگردد. */
    <Card id="feedback" data-tone="gold" className="mt-4 scroll-mt-24">
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/15 text-gold">
            <MessageSquareQuote aria-hidden className="size-5" />
          </span>
          <div className="min-w-0">
            <h2 className="font-bold">بازخورد دبیران</h2>
            <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">
              {fa(feedback.length)} بازخورد
              {showGroupTitles ? ` از ${fa(groups.length)} کلاس` : ""}. فقط خودت این‌ها را
              می‌بینی.
            </p>
          </div>
        </div>

        {groups.map(([className, entries]) => (
          <section key={className} className="flex flex-col gap-2.5">
            {showGroupTitles && (
              <h3 className="flex items-center gap-1.5 text-[12px] font-bold text-muted-foreground">
                <GraduationCap aria-hidden className="size-3.5" />
                کلاس {className}
              </h3>
            )}

            {entries.map((entry) => (
              <FeedbackCard key={entry.id} entry={entry} />
            ))}
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

function FeedbackCard({ entry }: { entry: FeedbackEntry }) {
  const style = CATEGORY_STYLE[entry.category] ?? CATEGORY_STYLE.general;

  return (
    <article className="rounded-xl border border-border/70 bg-background/35 p-3.5">
      {/* ── چه کسی، و کِی ─────────────────────────────────────────────── */}
      <header className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid size-7 shrink-0 place-items-center rounded-full bg-foreground/8 text-[12px] font-bold"
        >
          {initial(entry.teacherName)}
        </span>

        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">
          {entry.teacherName ?? "دبیر"}
        </span>

        {/* ⚠️ تاریخِ کامل در `title` می‌ماند و نه فقط «۳ روز پیش».
            «دیروز» برای بازخوردِ تازه خواناتر است و برای بازخوردِ سه ماه
            پیش بی‌فایده — پس هر دو هستند و کاربر خودش انتخاب می‌کند. */}
        <time
          dateTime={entry.createdAt}
          title={jalali(entry.createdAt)}
          className="panel-num shrink-0 text-[11px] text-muted-foreground"
        >
          {relativeDay(entry.createdAt)}
        </time>
      </header>

      {/* ── دربارهٔ چه چیزی ───────────────────────────────────────────── */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium text-foreground/85",
            style.chip,
          )}
        >
          {FEEDBACK_CATEGORY_LABEL[entry.category]}
        </span>
      </div>

      {/* ── چه گفته ──────────────────────────────────────────────────── */}
      {/* ⚠️ `whitespace-pre-wrap` می‌ماند: دبیرها بازخوردِ چندبندی
          می‌نویسند و بدونِ آن، همه‌اش یک بندِ فشرده می‌شد. */}
      <div className="mt-2.5 flex gap-2.5">
        <span aria-hidden className={cn("w-[3px] shrink-0 rounded-full", style.bar)} />
        <p className="min-w-0 whitespace-pre-wrap text-[13px] leading-relaxed">
          {entry.message}
        </p>
      </div>
    </article>
  );
}
