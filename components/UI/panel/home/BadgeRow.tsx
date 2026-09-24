import { Award } from "lucide-react";
import styles from "../panel-design.module.css";
import { fa } from "@/lib/panel/format";
import type { Badge } from "@/lib/panel/derive";

/**
 * نشان‌ها — کوچک، و عمداً در پایینِ صفحه.
 *
 * ⚠️ نشانِ *نگرفته* هم نشان داده می‌شود، با نوارِ «چقدر مانده»: یک قدمِ مشخص
 * انگیزه می‌دهد، فهرستی از دستاوردهای گذشته فقط یک تعارف است.
 */
export default function BadgeRow({ badges }: { badges: Badge[] }) {
  const earned = badges.filter((b) => b.earned).length;

  return (
    <section>
      <div className={`mb-4 ${styles.sectionHeading}`}>
        <span className={styles.sectionIcon}>
          <Award aria-hidden className="size-4" />
        </span>
        <div>
          <h2 className="text-base font-bold">نشان‌ها</h2>
          <p className="panel-num mt-0.5 text-[13px] text-muted-foreground">
            {earned === 0 ? "هنوز نشانی نگرفته‌ای." : `${fa(earned)} از ${fa(badges.length)} نشان`}
          </p>
        </div>
      </div>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {badges.map((badge) => (
          <li key={badge.id} className={styles.badge} data-earned={badge.earned || undefined}>
            <span aria-hidden className={styles.badgeGlyph}>
              {badge.glyph}
            </span>
            <span className="text-[13.5px] font-semibold">{badge.title}</span>
            <span className="panel-num text-[11.5px] text-muted-foreground">{badge.detail}</span>
            {!badge.earned && (
              <span
                role="progressbar"
                aria-label={`پیشرفت تا نشان ${badge.title}`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(badge.progress * 100)}
                className={styles.badgeTrack}
              >
                <span style={{ width: `${Math.max(badge.progress * 100, 4)}%` }} />
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
