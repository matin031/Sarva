import { cn } from "@/lib/cn";
import type { Badge } from "@/lib/panel/derive";

/**
 * نشان‌ها — کوچک، و عمداً در پایینِ صفحه.
 *
 * ⚠️ نشانِ *نگرفته* هم نشان داده می‌شود، چون کارِ اصلی همان است: «۳ روز
 * دیگر تا این نشان» یک قدمِ مشخص است، در حالی که فهرستی از دستاوردهای
 * گذشته فقط یک تعارف است. برای همین دقیقاً یک نشانِ قفل در ردیف می‌ماند و
 * نه چهارتا — دیوارِ نشان‌های قفل، دلسردکننده است.
 */
export default function BadgeRow({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length;

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-bold">نشان‌های تو</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {earned === 0
            ? "اولین نشانت یک تمرین با تو فاصله دارد"
            : `${["", "یک", "دو", "سه", "چهار"][earned] ?? earned} نشان گرفته‌ای`}
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {badges.map((badge) => (
          <li
            key={badge.id}
            className={cn(
              "flex flex-col items-center gap-2 rounded-2xl border p-4 text-center",
              badge.earned
                ? "border-gold/25 bg-surface"
                : "border-border/60 bg-surface/50",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-13 place-items-center rounded-full border text-2xl",
                badge.earned
                  ? "border-gold/40 bg-gold/12"
                  : "border-border/70 bg-foreground/4 opacity-45 grayscale",
              )}
            >
              {badge.glyph}
            </span>
            <span className={cn("text-[13.5px] font-semibold", !badge.earned && "font-medium text-muted-foreground")}>
              {badge.title}
            </span>
            <span className="panel-num text-[11.5px] text-muted-foreground/85">{badge.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
